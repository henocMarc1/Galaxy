import { auth, database, storage } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, get, push, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import './promo-codes.js';

const adminNavLinks = document.querySelectorAll('.admin-nav-link');
const adminTabContents = document.querySelectorAll('.admin-tab-content');
const productsTable = document.getElementById('productsTable');
const ordersTable = document.getElementById('ordersTable');
const membersTable = document.getElementById('membersTable');
const addProductBtn = document.getElementById('addProductBtn');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const closeProductModal = productModal ? productModal.querySelector('.close') : null;
const productImageFile = document.getElementById('productImageFile');
const imagePreview = document.getElementById('imagePreview');
const uploadProgress = document.getElementById('uploadProgress');
const uploadCloudinaryBtn = document.getElementById('uploadCloudinaryBtn');
const productPriceInput = document.getElementById('productPrice');
const productDiscountInput = document.getElementById('productDiscount');
const discountedPriceDisplay = document.getElementById('discountedPriceDisplay');
const discountedPriceValue = document.getElementById('discountedPriceValue');

// Fonction pour calculer et afficher le prix réduit
function updateDiscountedPrice() {
    const price = parseFloat(productPriceInput?.value || 0);
    const discount = parseFloat(productDiscountInput?.value || 0);
    
    if (price > 0 && discount > 0) {
        const discountedPrice = price * (1 - discount / 100);
        discountedPriceValue.textContent = formatCurrency(discountedPrice);
        discountedPriceDisplay.style.display = 'block';
    } else {
        discountedPriceDisplay.style.display = 'none';
    }
}

let currentUser = null;
let isAdmin = false;
let uploadedImageUrls = [null, null, null];
let cloudinaryWidgets = [null, null, null];

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 FCFA';
    
    let numericValue = amount;
    
    if (typeof amount === 'string') {
        numericValue = amount.replace(/[^0-9.,-]/g, '').replace(',', '.');
        numericValue = parseFloat(numericValue) || 0;
    }
    
    numericValue = Number(numericValue);
    
    if (isNaN(numericValue)) return '0 FCFA';
    
    const formatter = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    return formatter.format(numericValue) + ' FCFA';
}

// =============== EXPORT FUNCTIONS (COMBO B) ===============
function setupExports() {
    console.log("🔧 SETUP EXPORTS - Finding buttons...");
    
    // CSV EXPORT
    const csvBtn = document.getElementById("exportCSV");
    if (csvBtn) {
        csvBtn.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("📊 CSV Export clicked!");
            try {
                const statValues = document.querySelectorAll(".admin-stat-value");
                console.log("Found stat values:", statValues.length);
                
                const data = [
                    ["Métrique", "Valeur"],
                    ["Revenu Total", statValues[0]?.textContent?.trim() || "N/A"],
                    ["Commandes", statValues[1]?.textContent?.trim() || "N/A"],
                    ["Produits", statValues[2]?.textContent?.trim() || "N/A"],
                    ["Clients", statValues[3]?.textContent?.trim() || "N/A"],
                    ["Revenu/Jour", statValues[4]?.textContent?.trim() || "N/A"],
                    ["Top Produit", statValues[5]?.textContent?.trim() || "N/A"]
                ];
                
                const csv = data.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.setAttribute("href", URL.createObjectURL(blob));
                link.setAttribute("download", `analytics-${new Date().toISOString().split("T")[0]}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log("✅ CSV Downloaded!");
                showToast("✅ Analytics exporté en CSV", "success");
            } catch (err) { 
                console.error("❌ CSV Error:", err);
                showToast("❌ Erreur CSV: " + err.message, "error");
            }
        });
        console.log("✅ CSV button listener added");
    } else {
        console.log("❌ exportCSV button not found!");
    }
    
    // PDF EXPORT
    const pdfBtn = document.getElementById("exportPDF");
    if (pdfBtn) {
        pdfBtn.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("📄 PDF Export clicked!");
            try {
                if (!window.html2pdf) {
                    console.error("html2pdf not loaded");
                    showToast("❌ Bibliothèque PDF non chargée", "error");
                    return;
                }
                
                const el = document.getElementById("adminStatsContainer");
                if (!el) {
                    console.error("adminStatsContainer not found");
                    showToast("❌ Contenu PDF non trouvé", "error");
                    return;
                }
                
                console.log("Generating PDF from element...");
                const options = {
                    margin: 10,
                    filename: `analytics-${new Date().toISOString().split("T")[0]}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
                };
                
                window.html2pdf().set(options).from(el).save();
                console.log("✅ PDF Generated!");
                showToast("✅ Analytics exporté en PDF", "success");
            } catch (err) { 
                console.error("❌ PDF Error:", err);
                showToast("❌ Erreur PDF: " + err.message, "error");
            }
        });
        console.log("✅ PDF button listener added");
    } else {
        console.log("❌ exportPDF button not found!");
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await checkAdminAccess();
        if (isAdmin) {
            loadAdminStats();
            setupExports();
            loadAuditLogs();
            loadProducts();
            loadOrders();
            loadMembers();
            initCloudinaryWidget();
            setupDiscountCalculator();
            setupProductFormTabs();
        }
    } else {
        window.location.href = 'auth.html';
    }
});

function initImagesForm() {
    const container = document.getElementById('imagesContainer');
    container.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const imageNum = i + 1;
        const section = document.createElement('div');
        section.style.marginBottom = '1.5rem';
        section.style.padding = '1rem';
        section.style.backgroundColor = '#F8FAFC';
        section.style.borderRadius = '8px';
        section.style.border = '1px solid #E2E8F0';
        
        section.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label style="font-weight: 600;">Photo ${imageNum} ${imageNum === 1 ? '(Principale)' : ''}</label>
                <button type="button" class="cloudinary-upload-btn cloudinary-upload-btn-${i}" style="padding: 0.6rem 1rem; font-size: 0.85rem; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s ease; hover: background: #1E40AF;">
                    ☁️ Upload
                </button>
            </div>
            <input type="url" id="productImage${i}" placeholder="https://..." style="width: 100%; padding: 0.5rem; border: 1px solid #CBD5E1; border-radius: 6px; margin-bottom: 0.5rem;">
            <div id="imagePreview${i}" class="image-upload-preview" style="max-height: 150px; margin-top: 0.5rem;"></div>
        `;
        container.appendChild(section);
    }
    
    initCloudinaryWidgets();
}

function initCloudinaryWidgets() {
    if (typeof cloudinary !== 'undefined') {
        for (let i = 0; i < 3; i++) {
            cloudinaryWidgets[i] = cloudinary.createUploadWidget(
                {
                    cloudName: "dv3ulmei1",
                    uploadPreset: "product_upload"
                },
                (error, result) => {
                    if (!error && result && result.event === "success") {
                        console.log(`Image ${i + 1} uploadée:`, result.info.secure_url);
                        document.getElementById(`productImage${i}`).value = result.info.secure_url;
                        document.getElementById(`imagePreview${i}`).innerHTML = `<img src="${result.info.secure_url}" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: 6px;">`;
                        uploadedImageUrls[i] = result.info.secure_url;
                    }
                }
            );
            
            document.querySelector(`.cloudinary-upload-btn-${i}`).addEventListener('click', function() {
                if (cloudinaryWidgets[i]) {
                    cloudinaryWidgets[i].open();
                }
            });
        }
    }
}


function setupDiscountCalculator() {
    if (!productPriceInput || !productDiscountInput || !discountedPriceDisplay || !discountedPriceValue) {
        return;
    }
    
    function calculateDiscountedPrice() {
        const price = parseFloat(productPriceInput.value) || 0;
        const discount = parseFloat(productDiscountInput.value) || 0;
        
        if (price > 0 && discount > 0) {
            const discountedPrice = price - (price * discount / 100);
            discountedPriceValue.textContent = formatCurrency(discountedPrice);
            discountedPriceDisplay.style.display = 'block';
        } else {
            discountedPriceDisplay.style.display = 'none';
        }
    }
    
    productPriceInput.addEventListener('input', calculateDiscountedPrice);
    productDiscountInput.addEventListener('input', calculateDiscountedPrice);
}

function setupProductFormTabs() {
    const tabButtons = document.querySelectorAll('.product-tab-btn');
    const tabPanels = document.querySelectorAll('.product-tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = button.dataset.tab;
            
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked button and corresponding panel
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function checkAdminAccess() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            isAdmin = userData.role === 'admin';
            
            if (!isAdmin) {
                alert('Accès refusé. Seuls les administrateurs peuvent accéder à cette page.');
                window.location.href = 'index.html';
            }
        } else {
            alert('Utilisateur non trouvé dans la base de données.');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des droits admin:', error);
        window.location.href = 'index.html';
    }
}

adminNavLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetTab = link.dataset.tab;
        
        adminNavLinks.forEach(l => l.classList.remove("active"));
        adminTabContents.forEach(c => c.classList.remove("active"));
        
        link.classList.add("active");
        const targetElement = document.getElementById(targetTab);
        if (targetElement) {
            targetElement.classList.add("active");
            if (targetTab === "analytics") { setTimeout(() => { setupExports(); loadAdminStats(); }, 100); }
            else if (targetTab === "products") { setTimeout(() => { loadProducts(); }, 100); }
            else if (targetTab === "orders") { setTimeout(() => { loadOrders(); }, 100); }
            else if (targetTab === "members") { setTimeout(() => { loadMembers(); }, 100); }
            else if (targetTab === "audit") { setTimeout(() => { loadAuditLogs(); }, 100); }
        }
    });
});

for (let i = 0; i < 3; i++) {
    const input = document.getElementById(`productImage${i}`);
    if (input) {
        input.addEventListener('input', function() {
            if (this.value) {
                document.getElementById(`imagePreview${i}`).innerHTML = `<img src="${this.value}" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: 6px;">`;
                uploadedImageUrls[i] = this.value;
            }
        });
    }
}

async function loadProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const products = [];
            snapshot.forEach((child) => {
                products.push({ id: child.key, ...child.val() });
            });

            // Calculate sales for each product
            const salesCount = await calculateProductSales();

            productsTable.innerHTML = `
                <div class="table-controls">
                    <input type="text" id="productSearchInput" placeholder="Rechercher un produit..." class="search-input">
                    <select id="productCategoryFilter" class="filter-select">
                        <option value="all">Toutes les catégories</option>
                        <option value="Parfums">Parfums</option>
                        <option value="Épicerie">Épicerie</option>
                        <option value="Boissons">Boissons</option>
                        <option value="Hygiène & Beauté">Hygiène & Beauté</option>
                        <option value="Produits ménagers">Produits ménagers</option>
                        <option value="Fruits & Légumes">Fruits & Légumes</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Surgelés">Surgelés</option>
                        <option value="Bébé & Maman">Bébé & Maman</option>
                    </select>
                </div>

                <div id="bulkActionsBar" class="bulk-actions-bar" style="display: none;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span id="selectedCount" style="font-weight: 600;">0 sélectionnés</span>
                        <button id="bulkChangePriceBtn" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem;">💰 Prix</button>
                        <button id="bulkChangeDiscountBtn" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem;">📊 Rabais</button>
                        <button id="bulkChangeCategoryBtn" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem;">🏷️ Catégorie</button>
                        <button id="bulkDeleteBtn" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem; background: #EF4444; color: white;">🗑️ Supprimer</button>
                        <button id="bulkCancelBtn" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem; margin-left: auto;">Annuler</button>
                    </div>
                </div>

                <table class="data-table sortable-table" id="productsDataTable">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllCheckbox" class="bulk-checkbox"></th>
                            <th>Image</th>
                            <th class="sortable" onclick="sortTable(1, 'productsDataTable')">ID ↕</th>
                            <th class="sortable" onclick="sortTable(2, 'productsDataTable')">Nom ↕</th>
                            <th class="sortable" onclick="sortTable(3, 'productsDataTable')">Catégorie ↕</th>
                            <th class="sortable" onclick="sortTable(4, 'productsDataTable')">Prix ↕</th>
                            <th class="sortable" onclick="sortTable(5, 'productsDataTable')">Rabais ↕</th>
                            <th class="sortable" onclick="sortTable(6, 'productsDataTable')">Stock ↕</th>
                            <th class="sortable" onclick="sortTable(7, 'productsDataTable')">Ventes ↕</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr data-name="${product.name.toLowerCase()}" data-category="${product.category}" data-id="${product.id.toLowerCase()}" data-product-id="${product.id}">
                                <td><input type="checkbox" class="product-checkbox" value="${product.id}"></td>
                                <td><img src="${Array.isArray(product.images) ? product.images[0] : product.image}" alt="${product.name}"></td>
                                <td><strong style="color: var(--primary-color);">${product.id}</strong></td>
                                <td>${product.name}</td>
                                <td>${product.category}</td>
                                <td data-value="${product.price}">${formatCurrency(product.price)}</td>
                                <td data-value="${product.discount || 0}">${product.discount || 0}%</td>
                                <td data-value="${product.stock}">${product.stock}</td>
                                <td data-value="${salesCount[product.id] || 0}" style="font-weight: 600; color: var(--primary-color);">${salesCount[product.id] || 0}</td>
                                <td>
                                    <div class="dropdown-wrapper">
                                        <button class="three-dot-menu" onclick="toggleProductMenu('${product.id}')">⋮</button>
                                        <div class="dropdown-menu-actions" id="menu-${product.id}">
                                            <button onclick="editProduct('${product.id}')">Modifier</button>
                                            <button onclick="deleteProduct('${product.id}')" style="color: #EF4444;">Supprimer</button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            setupProductFilters();
            setupBulkActions(products);
        } else {
            productsTable.innerHTML = '<p>Aucun produit dans la base de données.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        if (error.code === 'PERMISSION_DENIED') {
            productsTable.innerHTML = `
                <div style="padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
        }
    }
}

let allOrders = [];

async function loadOrders() {
    try {
        const ordersRef = ref(database, 'orders');
        const snapshot = await get(ordersRef);
        
        if (snapshot.exists()) {
            allOrders = [];
            snapshot.forEach((child) => {
                allOrders.push({ id: child.key, ...child.val() });
            });

            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const pendingOrders = allOrders.filter(o => o.status === 'pending');
            const confirmedOrders = allOrders.filter(o => o.status === 'confirmed');
            const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
            const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');
            
            const pendingCount = pendingOrders.length;
            const confirmedCount = confirmedOrders.length;
            const deliveredCount = deliveredOrders.length;
            const cancelledCount = cancelledOrders.length;
            
            const pendingTotal = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const confirmedTotal = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const deliveredTotal = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const cancelledTotal = cancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0);

            ordersTable.innerHTML = `
                <div class="orders-stats">
                    <div class="stat-card-small">
                        <div class="stat-icon" style="background: #FEF3C7; color: #F59E0B;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">En attente</div>
                            <div class="stat-value">${pendingCount}</div>
                            <div class="stat-sublabel">${formatCurrency(pendingTotal)}</div>
                        </div>
                    </div>
                    <div class="stat-card-small">
                        <div class="stat-icon" style="background: #DBEAFE; color: #3B82F6;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Confirmées</div>
                            <div class="stat-value">${confirmedCount}</div>
                            <div class="stat-sublabel">${formatCurrency(confirmedTotal)}</div>
                        </div>
                    </div>
                    <div class="stat-card-small">
                        <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Livrées</div>
                            <div class="stat-value">${deliveredCount}</div>
                            <div class="stat-sublabel">${formatCurrency(deliveredTotal)}</div>
                        </div>
                    </div>
                    <div class="stat-card-small">
                        <div class="stat-icon" style="background: #FEE2E2; color: #EF4444;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Annulées</div>
                            <div class="stat-value">${cancelledCount}</div>
                            <div class="stat-sublabel">${formatCurrency(cancelledTotal)}</div>
                        </div>
                    </div>
                </div>

                <div class="orders-filters">
                    <div class="search-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" id="orderSearch" placeholder="Rechercher par client, produit ou numéro de commande...">
                    </div>
                    <select id="statusFilter" class="filter-select">
                        <option value="all">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmées</option>
                        <option value="delivered">Livrées</option>
                        <option value="cancelled">Annulées</option>
                    </select>
                    <div class="date-range-filter">
                        <label style="font-size: 0.85rem; color: #6B7280;">Du:</label>
                        <input type="date" id="dateFilterStart" class="filter-select" style="width: auto;">
                        <label style="font-size: 0.85rem; color: #6B7280;">Au:</label>
                        <input type="date" id="dateFilterEnd" class="filter-select" style="width: auto;">
                    </div>
                </div>

                <div class="orders-table-wrapper">
                    <table class="modern-table sortable-table" id="ordersDataTable">
                        <thead>
                            <tr>
                                <th class="sortable" onclick="sortTable(0, 'ordersDataTable')">N° Commande ↕</th>
                                <th class="sortable" onclick="sortTable(1, 'ordersDataTable')">Date ↕</th>
                                <th class="sortable" onclick="sortTable(2, 'ordersDataTable')">Client ↕</th>
                                <th>Article</th>
                                <th class="sortable" onclick="sortTable(4, 'ordersDataTable')">Montant ↕</th>
                                <th>Paiement</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderOrderRows(allOrders)}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('orderSearch').addEventListener('input', filterOrders);
            document.getElementById('statusFilter').addEventListener('change', filterOrders);
            document.getElementById('dateFilterStart').addEventListener('change', filterOrders);
            document.getElementById('dateFilterEnd').addEventListener('change', filterOrders);

        } else {
            ordersTable.innerHTML = '<p>Aucune commande.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        if (error.code === 'PERMISSION_DENIED') {
            ordersTable.innerHTML = `
                <div style="padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
        }
    }
}

function renderOrderRows(orders) {
    if (orders.length === 0) {
        return '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Aucune commande trouvée</td></tr>';
    }

    return orders.map(order => {
        const statusColors = {
            'pending': { bg: '#FEF3C7', text: '#92400E', label: 'En attente' },
            'confirmed': { bg: '#DBEAFE', text: '#1E40AF', label: 'Confirmée' },
            'delivered': { bg: '#D1FAE5', text: '#065F46', label: 'Livrée' },
            'cancelled': { bg: '#FEE2E2', text: '#991B1B', label: 'Annulée' }
        };
        
        const statusInfo = statusColors[order.status] || statusColors['pending'];
        
        let itemsCount = 0;
        let firstProduct = 'N/A';
        let firstProductQty = 0;
        
        if (order.items && Array.isArray(order.items)) {
            itemsCount = order.items.length;
            if (order.items.length > 0) {
                firstProduct = order.items[0].name || order.items[0].productName || 'N/A';
                firstProductQty = order.items[0].quantity || 1;
            }
        } else if (order.items && typeof order.items === 'object') {
            const itemsArray = Object.values(order.items);
            itemsCount = itemsArray.length;
            if (itemsArray.length > 0) {
                firstProduct = itemsArray[0].name || itemsArray[0].productName || 'N/A';
                firstProductQty = itemsArray[0].quantity || 1;
            }
        }
        
        const articleDisplay = itemsCount > 1 
            ? `${firstProduct.substring(0, 25)}... +${itemsCount - 1}` 
            : `${firstProduct} (x${firstProductQty})`;
        
        return `
            <tr data-order-id="${order.id}" data-customer="${(order.fullName || '').toLowerCase()}" data-status="${order.status}" data-date="${order.createdAt}" data-product="${firstProduct.toLowerCase()}">
                <td><strong>#${order.id.substring(0, 8)}</strong></td>
                <td data-value="${new Date(order.createdAt).getTime()}">${new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>
                    <div style="cursor: pointer; color: #3B82F6; text-decoration: underline;" onclick="viewMemberDetailFromOrder('${order.userId}')">
                        ${order.fullName || 'N/A'}
                    </div>
                    <small style="color: #6B7280;">${order.email || ''}</small>
                </td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${firstProduct}">${articleDisplay}</td>
                <td data-value="${order.total || 0}"><strong>${formatCurrency(order.total || 0)}</strong></td>
                <td><span class="payment-badge">${order.paymentMethod || 'N/A'}</span></td>
                <td>
                    <span class="status-badge" style="background: ${statusInfo.bg}; color: ${statusInfo.text};">
                        ${statusInfo.label}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button onclick="showOrderDetails('${order.id}')" class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                            <span class="material-icons" style="font-size: 1rem; vertical-align: middle;">description</span> Détails
                        </button>
                        <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select" style="padding: 0.4rem; font-size: 0.85rem;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livrée</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilterStart = document.getElementById('dateFilterStart').value;
    const dateFilterEnd = document.getElementById('dateFilterEnd').value;
    
    const filteredOrders = allOrders.filter(order => {
        let matchesSearch = false;
        
        if (order.fullName && order.fullName.toLowerCase().includes(searchTerm)) matchesSearch = true;
        if (order.email && order.email.toLowerCase().includes(searchTerm)) matchesSearch = true;
        if (order.id && order.id.toLowerCase().includes(searchTerm)) matchesSearch = true;
        
        if (order.items) {
            let itemsArray = Array.isArray(order.items) ? order.items : Object.values(order.items);
            for (let item of itemsArray) {
                const itemName = item.name || item.productName || '';
                if (itemName.toLowerCase().includes(searchTerm)) {
                    matchesSearch = true;
                    break;
                }
            }
        }
        
        if (searchTerm === '') matchesSearch = true;
        
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        let matchesDate = true;
        if (order.createdAt) {
            const orderDate = new Date(order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            
            if (dateFilterStart) {
                const startDate = new Date(dateFilterStart);
                startDate.setHours(0, 0, 0, 0);
                matchesDate = matchesDate && orderDate >= startDate;
            }
            
            if (dateFilterEnd) {
                const endDate = new Date(dateFilterEnd);
                endDate.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && orderDate <= endDate;
            }
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    const tbody = document.querySelector('#ordersDataTable tbody');
    if (tbody) {
        tbody.innerHTML = renderOrderRows(filteredOrders);
    }
}

let allMembers = [];
let membersWithStats = [];

async function loadMembers() {
    try {
        const usersRef = ref(database, 'users');
        const ordersRef = ref(database, 'orders');
        
        const [usersSnapshot, ordersSnapshot] = await Promise.all([
            get(usersRef),
            get(ordersRef)
        ]);
        
        if (usersSnapshot.exists()) {
            const users = [];
            usersSnapshot.forEach((child) => {
                users.push({ id: child.key, ...child.val() });
            });
            
            const ordersData = {};
            if (ordersSnapshot.exists()) {
                ordersSnapshot.forEach((child) => {
                    const order = child.val();
                    if (!ordersData[order.userId]) {
                        ordersData[order.userId] = [];
                    }
                    ordersData[order.userId].push(order);
                });
            }
            
            membersWithStats = users.map(user => {
                const userOrders = ordersData[user.id] || [];
                const totalOrders = userOrders.length;
                const totalAmount = userOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                
                return {
                    ...user,
                    totalOrders,
                    totalAmount
                };
            });
            
            allMembers = [...membersWithStats];
            renderMembersTable(membersWithStats);
        } else {
            membersTable.innerHTML = '<p>Aucun membre.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des membres:', error);
    }
}

function renderMembersTable(members) {
    membersTable.innerHTML = `
        <div class="table-controls">
            <input type="text" id="memberSearchInput" placeholder="Rechercher par nom, email, téléphone..." class="search-input" onkeyup="filterMembers()">
            <select id="memberRoleFilter" class="filter-select" onchange="filterMembers()">
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateur</option>
                <option value="customer">Client</option>
            </select>
        </div>
        <table class="data-table sortable-table" id="membersDataTable">
            <thead>
                <tr>
                    <th class="sortable" onclick="sortMembersTable(0)">Nom ↕</th>
                    <th class="sortable" onclick="sortMembersTable(1)">Email ↕</th>
                    <th class="sortable" onclick="sortMembersTable(2)">Téléphone ↕</th>
                    <th class="sortable" onclick="sortMembersTable(3)">Rôle ↕</th>
                    <th class="sortable" onclick="sortMembersTable(4)">Total Commandes ↕</th>
                    <th class="sortable" onclick="sortMembersTable(5)">Total Montant ↕</th>
                    <th class="sortable" onclick="sortMembersTable(6)">Date d'inscription ↕</th>
                </tr>
            </thead>
            <tbody>
                ${members.map(user => {
                    const roleDisplay = user.role === 'admin' ? 'Administrateur' : 'Client';
                    const roleColor = user.role === 'admin' ? '#3B82F6' : '#10B981';
                    
                    return `
                        <tr class="member-row" onclick="viewMemberDetail('${user.id}')" data-name="${(user.name || '').toLowerCase()}" data-email="${(user.email || '').toLowerCase()}" data-phone="${(user.phone || '').toLowerCase()}" data-role="${user.role}">
                            <td>${user.name || 'N/A'}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td>${user.phone || 'N/A'}</td>
                            <td data-value="${user.role}"><span style="padding: 0.3rem 0.8rem; background: ${roleColor}; color: white; border-radius: 15px; font-size: 0.85rem;">${roleDisplay}</span></td>
                            <td data-value="${user.totalOrders || 0}">${user.totalOrders || 0}</td>
                            <td data-value="${user.totalAmount || 0}"><strong>${formatCurrency(user.totalAmount || 0)}</strong></td>
                            <td data-value="${new Date(user.createdAt).getTime()}">${new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function filterMembers() {
    const searchTerm = document.getElementById('memberSearchInput').value.toLowerCase();
    const roleFilter = document.getElementById('memberRoleFilter').value;
    
    const filtered = allMembers.filter(member => {
        const matchesSearch = 
            (member.name || '').toLowerCase().includes(searchTerm) ||
            (member.email || '').toLowerCase().includes(searchTerm) ||
            (member.phone || '').toLowerCase().includes(searchTerm);
        
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });
    
    const tbody = document.querySelector('#membersDataTable tbody');
    if (tbody) {
        tbody.innerHTML = filtered.map(user => {
            const roleDisplay = user.role === 'admin' ? 'Administrateur' : 'Client';
            const roleColor = user.role === 'admin' ? '#3B82F6' : '#10B981';
            
            return `
                <tr class="member-row" onclick="viewMemberDetail('${user.id}')" data-name="${(user.name || '').toLowerCase()}" data-email="${(user.email || '').toLowerCase()}" data-phone="${(user.phone || '').toLowerCase()}" data-role="${user.role}">
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.phone || 'N/A'}</td>
                    <td data-value="${user.role}"><span style="padding: 0.3rem 0.8rem; background: ${roleColor}; color: white; border-radius: 15px; font-size: 0.85rem;">${roleDisplay}</span></td>
                    <td data-value="${user.totalOrders || 0}">${user.totalOrders || 0}</td>
                    <td data-value="${user.totalAmount || 0}"><strong>${formatCurrency(user.totalAmount || 0)}</strong></td>
                    <td data-value="${new Date(user.createdAt).getTime()}">${new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
            `;
        }).join('');
    }
}

function sortMembersTable(columnIndex) {
    const table = document.getElementById('membersDataTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const aCell = a.children[columnIndex];
        const bCell = b.children[columnIndex];
        
        const aValue = aCell.getAttribute('data-value') || aCell.textContent;
        const bValue = bCell.getAttribute('data-value') || bCell.textContent;
        
        if (!isNaN(aValue) && !isNaN(bValue)) {
            return parseFloat(bValue) - parseFloat(aValue);
        }
        
        return bValue.localeCompare(aValue);
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

window.filterMembers = filterMembers;
window.sortMembersTable = sortMembersTable;

window.viewMemberDetail = async function(userId) {
    try {
        const userRef = ref(database, `users/${userId}`);
        const ordersRef = ref(database, 'orders');
        
        const [userSnapshot, ordersSnapshot] = await Promise.all([
            get(userRef),
            get(ordersRef)
        ]);
        
        if (!userSnapshot.exists()) {
            alert('Utilisateur non trouvé');
            return;
        }
        
        const user = userSnapshot.val();
        let userOrders = [];
        
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach((child) => {
                const order = child.val();
                if (order.userId === userId) {
                    userOrders.push({ id: child.key, ...order });
                }
            });
        }
        
        userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const totalOrders = userOrders.length;
        const totalCost = userOrders.reduce((sum, order) => sum + order.total, 0);
        const completedOrders = userOrders.filter(o => o.status === 'delivered').length;
        const canceledOrders = userOrders.filter(o => o.status === 'cancelled').length;
        const processingOrders = userOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        
        const getStatusText = (status) => {
            const statusMap = {
                'pending': 'En attente',
                'confirmed': 'Confirmée',
                'delivered': 'Livrée',
                'cancelled': 'Annulée'
            };
            return statusMap[status] || status;
        };
        
        const getStatusColor = (status) => {
            const colorMap = {
                'pending': '#F59E0B',
                'confirmed': '#3B82F6',
                'delivered': '#10B981',
                'cancelled': '#EF4444'
            };
            return colorMap[status] || '#6B7280';
        };
        
        const memberDetailContent = `
            <div class="member-detail-view">
                <div class="member-detail-header">
                    <button onclick="backToMembers()">←</button>
                    <h2>${user.name}</h2>
                </div>
                
                <div class="member-stats">
                    <div class="stat-card">
                        <div class="stat-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 6v6l4 2"></path>
                            </svg>
                        </div>
                        <div class="stat-label">Coût Total</div>
                        <div class="stat-value">${formatCurrency(totalCost)}</div>
                        <div class="stat-sublabel">Total des commandes des 365 derniers jours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </div>
                        <div class="stat-label">Total Commandes</div>
                        <div class="stat-value">${totalOrders}</div>
                        <div class="stat-sublabel">Total des commandes des 365 derniers jours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <div class="stat-label">Livrées</div>
                        <div class="stat-value">${completedOrders}</div>
                        <div class="stat-sublabel">Commandes livrées des 365 derniers jours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <div class="stat-label">Annulées</div>
                        <div class="stat-value">${canceledOrders}</div>
                        <div class="stat-sublabel">Commandes annulées des 365 derniers jours</div>
                    </div>
                </div>
                
                <div class="member-detail-content">
                    <div class="member-info-card">
                        <h3>Informations Client</h3>
                        <div class="info-row">
                            <span class="info-label">Nom</span>
                            <div class="info-value">${user.name}</div>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email</span>
                            <div class="info-value">${user.email}</div>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Téléphone</span>
                            <div class="info-value">${user.phone}</div>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Rôle</span>
                            <div class="info-value">${user.role}</div>
                        </div>
                    </div>
                    
                    <div class="member-orders-section">
                        <h3>Commandes</h3>
                        <div class="order-tabs" data-user-id="${userId}">
                            <button class="order-tab-btn active" data-filter="all">Toutes</button>
                            <button class="order-tab-btn" data-filter="processing">En cours</button>
                            <button class="order-tab-btn" data-filter="completed">Livrées</button>
                            <button class="order-tab-btn" data-filter="canceled">Annulées</button>
                        </div>
                        
                        <table class="data-table" id="memberOrdersTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nom du produit</th>
                                    <th>Date</th>
                                    <th>Statut</th>
                                    <th>Paiement</th>
                                    <th>Prix</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userOrders.length > 0 ? userOrders.map(order => `
                                    <tr data-status="${order.status}">
                                        <td>#${order.id.substring(0, 6)}</td>
                                        <td>${order.items && order.items.length > 0 ? order.items[0].name : 'N/A'}</td>
                                        <td>${new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                        <td><span style="color: ${getStatusColor(order.status)}; font-weight: 600;">${getStatusText(order.status)}</span></td>
                                        <td>${order.paymentMethod || 'N/A'}</td>
                                        <td>${formatCurrency(order.total)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="6" style="text-align: center;">Aucune commande</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('memberDetail').innerHTML = memberDetailContent;
        
        adminNavLinks.forEach(l => l.classList.remove('active'));
        adminTabContents.forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });
        
        document.getElementById('memberDetail').classList.add('active');
        document.getElementById('memberDetail').style.display = 'block';
        
        setTimeout(() => {
            const orderTabBtns = document.querySelectorAll('.order-tab-btn');
            const statusMapping = {
                'all': ['pending', 'confirmed', 'delivered', 'cancelled'],
                'processing': ['pending', 'confirmed'],
                'completed': ['delivered'],
                'canceled': ['cancelled']
            };
            
            orderTabBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    orderTabBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    const filter = this.getAttribute('data-filter');
                    const allowedStatuses = statusMapping[filter] || [];
                    const rows = document.querySelectorAll('#memberOrdersTable tbody tr[data-status]');
                    
                    rows.forEach(row => {
                        const status = row.getAttribute('data-status');
                        const shouldShow = allowedStatuses.includes(status);
                        row.style.display = shouldShow ? '' : 'none';
                    });
                });
            });
        }, 100);
        
    } catch (error) {
        console.error('Erreur lors du chargement des détails du membre:', error);
        alert('Erreur lors du chargement des détails');
    }
};

window.backToMembers = function() {
    adminTabContents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    
    document.getElementById('members').classList.add('active');
    document.getElementById('members').style.display = 'block';
    
    const membersLink = document.querySelector('.admin-nav-link[data-tab="members"]');
    adminNavLinks.forEach(l => l.classList.remove('active'));
    if (membersLink) membersLink.classList.add('active');
};

addProductBtn.addEventListener('click', () => {
    document.getElementById("productCode").value = "";
    document.getElementById("productCode").placeholder = "Auto-généré ou personnalisé";
    document.getElementById("generateIdBtn").onclick = () => {
        document.getElementById("productCode").value = generateProductId();
        showNotification("ID généré: " + document.getElementById("productCode").value, "success");
    };
    document.getElementById('modalTitle').textContent = 'Ajouter un produit';
    productForm.reset();
    document.getElementById('productId').value = '';
    uploadedImageUrls = [null, null, null];
    initImagesForm();
    productModal.classList.add('show');
    setupProductFormTabs();
});

if (closeProductModal) {
    closeProductModal.addEventListener('click', () => {
        productModal.classList.remove('show');
    });
}

productModal.addEventListener('click', (e) => {
    if (e.target === productModal) {
        productModal.classList.remove('show');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        productModal.classList.remove('show');
        const orderModal = document.getElementById('orderDetailModal');
        if (orderModal) {
            orderModal.style.display = 'none';
        }
    }
});

async function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const fileName = `products/${timestamp}_${file.name}`;
        const imageRef = storageRef(storage, fileName);
        const uploadTask = uploadBytesResumable(imageRef, file);

        uploadProgress.style.display = 'block';

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadProgress.textContent = `Upload en cours: ${Math.round(progress)}%`;
                uploadProgress.style.color = '#3B82F6';
            },
            (error) => {
                uploadProgress.style.display = 'none';
                console.error('Erreur upload:', error);
                let errorMsg = 'Erreur lors de l\'upload de l\'image.';
                
                if (error.code === 'storage/unauthorized') {
                    errorMsg = '<span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Erreur de permissions Firebase Storage\n\n' +
                               'Les règles de sécurité Firebase Storage ne sont pas configurées.\n' +
                               'Veuillez configurer les règles dans la console Firebase :\n' +
                               '1. Allez dans Firebase Console > Storage > Rules\n' +
                               '2. Ajoutez les règles d\'écriture pour les administrateurs\n\n' +
                               'En attendant, vous pouvez utiliser une URL d\'image externe.';
                } else if (error.code === 'storage/quota-exceeded') {
                    errorMsg = '<span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Quota de stockage dépassé\n\n' +
                               'L\'espace de stockage Firebase est plein.\n' +
                               'Veuillez :\n' +
                               '1. Supprimer des fichiers inutilisés dans Storage\n' +
                               '2. Ou augmenter votre quota dans Firebase Console\n\n' +
                               'Utilisez temporairement une URL d\'image externe.';
                } else if (error.code === 'storage/canceled') {
                    errorMsg = 'Upload annulé par l\'utilisateur.';
                } else if (error.code === 'storage/unknown' || !navigator.onLine) {
                    errorMsg = '<span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Erreur de connexion réseau\n\n' +
                               'Vérifiez votre connexion internet et réessayez.\n' +
                               'Si le problème persiste, utilisez une URL d\'image externe.';
                } else if (error.code === 'storage/retry-limit-exceeded') {
                    errorMsg = '<span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Délai d\'upload dépassé\n\n' +
                               'L\'image est peut-être trop volumineuse ou la connexion trop lente.\n' +
                               'Essayez :\n' +
                               '1. Une image plus légère (< 2 MB)\n' +
                               '2. Ou utilisez une URL d\'image externe';
                } else {
                    errorMsg = `<span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Erreur d'upload (${error.code || 'inconnue'})\n\n` +
                               'Essayez :\n' +
                               '1. Vérifier la taille de l\'image (< 5 MB recommandé)\n' +
                               '2. Utiliser un format commun (JPG, PNG, WebP)\n' +
                               '3. Réessayer dans quelques instants\n' +
                               '4. Utiliser une URL d\'image externe si le problème persiste';
                }
                
                alert(errorMsg);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    uploadProgress.textContent = 'Upload terminé !';
                    uploadProgress.style.color = '#10B981';
                    setTimeout(() => {
                        uploadProgress.style.display = 'none';
                    }, 2000);
                    resolve(downloadURL);
                } catch (error) {
                    uploadProgress.style.display = 'none';
                    console.error('Erreur lors de la récupération de l\'URL:', error);
                    reject(error);
                }
            }
        );
    });
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productCode = document.getElementById('productCode').value.trim();
    if (!productCode) {
        alert('Veuillez générer ou entrer un ID pour le produit');
        return;
    }

    // Récupérer les 3 images
    const images = [];
    for (let i = 0; i < 3; i++) {
        const img = document.getElementById(`productImage${i}`).value.trim();
        if (img) images.push(img);
    }

    // Au minimum une image
    if (images.length === 0) {
        alert('Veuillez fournir au moins une image (max 3)');
        return;
    }

    const productData = {
        id: productCode,
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        discount: parseInt(document.getElementById('productDiscount').value) || 0,
        stock: parseInt(document.getElementById('productStock').value),
        images: images,
        image: images[0],
        featured: document.getElementById('productFeatured').checked,
        isNew: document.getElementById('productNew').checked
    };

    // Add optional extra infos if any field is filled
    const extraInfos = {};
    const brandField = document.getElementById('productBrand');
    const volumeField = document.getElementById('productVolume');
    const formatField = document.getElementById('productFormat');
    const originField = document.getElementById('productOrigin');
    const colorField = document.getElementById('productColor');

    if (brandField) {
        const brand = brandField.value.trim();
        if (brand) extraInfos.brand = brand;
    }
    if (volumeField) {
        const volume = volumeField.value.trim();
        if (volume) extraInfos.volume = volume;
    }
    if (formatField) {
        const format = formatField.value.trim();
        if (format) extraInfos.format = format;
    }
    if (originField) {
        const origin = originField.value.trim();
        if (origin) extraInfos.origin = origin;
    }
    if (colorField) {
        const color = colorField.value.trim();
        if (color) extraInfos.color = color;
    }

    if (Object.keys(extraInfos).length > 0) {
        productData.extraInfos = extraInfos;
    }

    const productId = document.getElementById('productId').value;

    try {
        if (productId) {
            await update(ref(database, `products/${productId}`), productData);
            alert('Produit mis à jour avec succès !');
        } else {
            await push(ref(database, 'products'), productData);
            alert('Produit ajouté avec succès !');
        }

        productModal.classList.remove('show');
        uploadedImageUrls = [null, null, null];
        loadProducts();
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du produit:', error);
        alert('Erreur lors de la sauvegarde du produit.');
    }
});

window.editProduct = async function(productId) {
    try {
        const productRef = ref(database, `products/${productId}`);
        const snapshot = await get(productRef);
        
        if (snapshot.exists()) {
            const product = snapshot.val();
            
            document.getElementById('modalTitle').textContent = 'Modifier le produit';
            document.getElementById('productId').value = productId;
            document.getElementById('productCode').value = product.id || productId;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productDiscount').value = product.discount || 0;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productFeatured').checked = product.featured || false;
            document.getElementById('productNew').checked = product.isNew || false;
            
            // Afficher le prix réduit si applicable
            updateDiscountedPrice();
            
            // Load extra infos if they exist
            if (product.extraInfos) {
                if (document.getElementById('productBrand')) document.getElementById('productBrand').value = product.extraInfos.brand || '';
                if (document.getElementById('productVolume')) document.getElementById('productVolume').value = product.extraInfos.volume || '';
                if (document.getElementById('productFormat')) document.getElementById('productFormat').value = product.extraInfos.format || '';
                if (document.getElementById('productOrigin')) document.getElementById('productOrigin').value = product.extraInfos.origin || '';
                if (document.getElementById('productColor')) document.getElementById('productColor').value = product.extraInfos.color || '';
            } else {
                if (document.getElementById('productBrand')) document.getElementById('productBrand').value = '';
                if (document.getElementById('productVolume')) document.getElementById('productVolume').value = '';
                if (document.getElementById('productFormat')) document.getElementById('productFormat').value = '';
                if (document.getElementById('productOrigin')) document.getElementById('productOrigin').value = '';
                if (document.getElementById('productColor')) document.getElementById('productColor').value = '';
            }
            
            // Charger les 3 images
            uploadedImageUrls = [null, null, null];
            if (product.images && Array.isArray(product.images)) {
                product.images.forEach((img, idx) => {
                    if (idx < 3) {
                        document.getElementById(`productImage${idx}`).value = img;
                        uploadedImageUrls[idx] = img;
                    }
                });
            } else if (product.image) {
                // Compatibilité avec les anciens produits (une seule image)
                document.getElementById('productImage0').value = product.image;
                uploadedImageUrls[0] = product.image;
            }
            
            // Rafraîchir les previews
            initCloudinaryWidgets();
            
            productModal.classList.add('show');
            setupProductFormTabs();
            
            // Ajouter les event listeners pour les changements prix/rabais
            productPriceInput?.addEventListener('input', updateDiscountedPrice);
            productDiscountInput?.addEventListener('input', updateDiscountedPrice);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du produit:', error);
    }
};


window.deleteProduct = async function(productId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
        try {
            await remove(ref(database, `products/${productId}`));
            alert('Produit supprimé avec succès !');
            loadProducts();
        } catch (error) {
            console.error('Erreur lors de la suppression du produit:', error);
            alert('Erreur lors de la suppression du produit.');
        }
    }
};

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await update(ref(database, `orders/${orderId}`), { status: newStatus });
        alert('Statut de la commande mis à jour !');
        loadOrders();
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        alert('Erreur lors de la mise à jour du statut.');
    }
};

window.showOrderDetails = async function(orderId) {
    try {
        const orderRef = ref(database, `orders/${orderId}`);
        const snapshot = await get(orderRef);
        
        if (snapshot.exists()) {
            const order = snapshot.val();
            
            const statusLabels = {
                'pending': 'En attente',
                'confirmed': 'Confirmée',
                'delivered': 'Livrée',
                'cancelled': 'Annulée'
            };
            
            let itemsHTML = '';
            if (order.items && order.items.length > 0) {
                itemsHTML = order.items.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td><strong>${formatCurrency(item.price * item.quantity)}</strong></td>
                    </tr>
                `).join('');
            }
            
            const detailContent = `
                <div class="order-detail-wrapper">
                    <div class="order-detail-header">
                        <h3>Commande #${orderId.substring(0, 8)}</h3>
                        <p style="color: #6B7280; font-size: 0.9rem;">Créée le ${new Date(order.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    
                    <div class="order-detail-sections">
                        <div class="order-section">
                            <h4><span class="material-icons" style="vertical-align: middle;">person</span> Informations client</h4>
                            <div class="info-grid">
                                <div><strong>Nom:</strong> ${order.fullName}</div>
                                <div><strong>Email:</strong> ${order.email}</div>
                                <div><strong>Téléphone:</strong> ${order.phone}</div>
                                <div><strong>Adresse:</strong> ${order.address}, ${order.city}</div>
                            </div>
                        </div>
                        
                        <div class="order-section">
                            <h4><span class="material-icons" style="vertical-align: middle;">shopping_bag</span> Articles commandés</h4>
                            <table class="data-table" style="margin-top: 1rem;">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Produit</th>
                                        <th>Quantité</th>
                                        <th>Prix unitaire</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHTML}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="order-section">
                            <h4><span class="material-icons" style="vertical-align: middle;">payment</span> Résumé</h4>
                            <div class="info-grid">
                                <div><strong>Méthode de paiement:</strong> ${order.paymentMethod}</div>
                                <div><strong>Statut:</strong> ${statusLabels[order.status] || order.status}</div>
                                <div><strong>Total:</strong> <span style="color: #10B981; font-size: 1.2rem; font-weight: 600;">${formatCurrency(order.total)}</span></div>
                                ${order.notes ? `<div><strong>Notes:</strong> ${order.notes}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('orderDetailContent').innerHTML = detailContent;
            document.getElementById('orderDetailModal').classList.add('show');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des détails de la commande:', error);
        alert('Erreur lors du chargement des détails de la commande.');
    }
};

window.closeOrderDetailModal = function() {
    document.getElementById('orderDetailModal').classList.remove('show');
};

window.toggleProductMenu = function(productId) {
    const menu = document.getElementById(`menu-${productId}`);
    const allMenus = document.querySelectorAll('.dropdown-menu-actions');
    
    allMenus.forEach(m => {
        if (m.id !== `menu-${productId}`) {
            m.classList.remove('show');
        }
    });
    
    menu.classList.toggle('show');
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-wrapper')) {
        const allMenus = document.querySelectorAll('.dropdown-menu-actions');
        allMenus.forEach(m => m.classList.remove('show'));
    }
});

window.sortTable = function(columnIndex, tableId) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    const isNumeric = rows.length > 0 && rows[0].children[columnIndex].dataset.value !== undefined;
    
    rows.sort((a, b) => {
        let aValue, bValue;
        
        if (isNumeric) {
            aValue = parseFloat(a.children[columnIndex].dataset.value) || 0;
            bValue = parseFloat(b.children[columnIndex].dataset.value) || 0;
        } else {
            aValue = a.children[columnIndex].textContent.trim().toLowerCase();
            bValue = b.children[columnIndex].textContent.trim().toLowerCase();
        }
        
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
    });
    
    if (tbody.dataset.lastSortColumn === String(columnIndex)) {
        rows.reverse();
        tbody.dataset.lastSortColumn = '';
    } else {
        tbody.dataset.lastSortColumn = columnIndex;
    }
    
    rows.forEach(row => tbody.appendChild(row));
};

function setupProductFilters() {
    const searchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('productCategoryFilter');
    
    if (searchInput && categoryFilter) {
        const filterProducts = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedCategory = categoryFilter.value;
            
            const rows = document.querySelectorAll('#productsDataTable tbody tr');
            
            rows.forEach(row => {
                const name = row.dataset.name || '';
                const category = row.dataset.category || '';
                const id = row.dataset.id || '';
                
                const matchesSearch = name.includes(searchTerm) || id.includes(searchTerm);
                const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
                
                row.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
            });
        };
        
        searchInput.addEventListener('input', filterProducts);
        categoryFilter.addEventListener('change', filterProducts);
    }
}

// Generate unique product ID
function generateProductId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PROD-${timestamp}${random}`;
}

// Calculate product sales from orders
async function calculateProductSales() {
    try {
        const ordersRef = ref(database, 'orders');
        const snapshot = await get(ordersRef);
        
        const salesCount = {};
        
        if (snapshot.exists()) {
            snapshot.forEach((orderChild) => {
                const order = orderChild.val();
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const productId = item.id;
                        salesCount[productId] = (salesCount[productId] || 0) + (item.quantity || 1);
                    });
                }
            });
        }
        
        return salesCount;
    } catch (error) {
        console.error('Erreur lors du calcul des ventes:', error);
        return {};
    }
}

window.viewMemberDetailFromOrder = async function(userId) {
    if (userId) {
        await viewMemberDetail(userId);
    } else {
        alert('Aucun utilisateur associé à cette commande.');
    }
};

// ===== BULK ACTIONS MANAGEMENT =====
function setupBulkActions(products) {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const productCheckboxes = document.querySelectorAll('.product-checkbox');
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');

    function updateBulkActionsBar() {
        const selectedIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (selectedIds.length > 0) {
            bulkActionsBar.style.display = 'block';
            selectedCount.textContent = `${selectedIds.length} sélectionnés`;
        } else {
            bulkActionsBar.style.display = 'none';
        }
        selectAllCheckbox.checked = selectedIds.length === products.length && products.length > 0;
    }

    selectAllCheckbox?.addEventListener('change', (e) => {
        productCheckboxes.forEach(cb => cb.checked = e.target.checked);
        updateBulkActionsBar();
    });

    productCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateBulkActionsBar);
    });

    // Bouton Prix
    document.getElementById('bulkChangePriceBtn')?.addEventListener('click', () => {
        const newPrice = prompt('Entrez le nouveau prix (FCFA):');
        if (newPrice && !isNaN(newPrice)) {
            const selectedIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            selectedIds.forEach(id => {
                update(ref(database, `products/${id}`), { price: parseFloat(newPrice) });
            });
            showToast(`✅ Prix changé pour ${selectedIds.length} produits`, 'success');
            setTimeout(() => loadProducts(), 500);
        }
    });

    // Bouton Rabais
    document.getElementById('bulkChangeDiscountBtn')?.addEventListener('click', () => {
        const newDiscount = prompt('Entrez le nouveau rabais (%):');
        if (newDiscount && !isNaN(newDiscount) && newDiscount >= 0 && newDiscount <= 100) {
            const selectedIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            selectedIds.forEach(id => {
                update(ref(database, `products/${id}`), { discount: parseInt(newDiscount) });
            });
            showToast(`✅ Rabais changé pour ${selectedIds.length} produits`, 'success');
            setTimeout(() => loadProducts(), 500);
        }
    });

    // Bouton Catégorie
    document.getElementById('bulkChangeCategoryBtn')?.addEventListener('click', () => {
        const categories = ['Parfums', 'Épicerie', 'Boissons', 'Hygiène & Beauté', 'Produits ménagers', 'Fruits & Légumes', 'Snacks', 'Surgelés', 'Bébé & Maman'];
        const categoryList = categories.join('\n');
        const newCategory = prompt(`Sélectionnez une nouvelle catégorie:\n${categoryList}`, categories[0]);
        if (newCategory && categories.includes(newCategory)) {
            const selectedIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            selectedIds.forEach(id => {
                update(ref(database, `products/${id}`), { category: newCategory });
            });
            showToast(`✅ Catégorie changée pour ${selectedIds.length} produits`, 'success');
            setTimeout(() => loadProducts(), 500);
        }
    });

    // Bouton Supprimer
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
        const selectedIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (selectedIds.length > 0 && confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} produits?`)) {
            selectedIds.forEach(id => {
                remove(ref(database, `products/${id}`));
            });
            showToast(`✅ ${selectedIds.length} produits supprimés`, 'success');
            setTimeout(() => loadProducts(), 500);
        }
    });

    // Bouton Annuler
    document.getElementById('bulkCancelBtn')?.addEventListener('click', () => {
        productCheckboxes.forEach(cb => cb.checked = false);
        selectAllCheckbox.checked = false;
        bulkActionsBar.style.display = 'none';
    });
}

// ===== GENERATE DESCRIPTION WITH AI =====
document.getElementById('generateDescBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const productName = document.getElementById('productName').value.trim();
    if (!productName) {
        showToast('Entrez le nom du produit d\'abord', 'warning');
        return;
    }
    
    const btn = e.target.closest('button');
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.innerHTML = '<span class="material-icons" style="font-size: 18px; animation: spin 1s linear infinite;">refresh</span> Génération...';
    
    try {
        const response = await fetch('/api/generate-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName })
        });
        
        if (response.ok) {
            const data = await response.json();
            const descText = data.description || '';
            // Stocker en textarea pour sauvegarde
            document.getElementById('productDescription').value = descText;
            // Afficher en HTML dans la preview
            document.getElementById('productDescriptionPreview').innerHTML = descText;
            document.getElementById('productDescriptionPreview').style.display = 'block';
            
            showToast('✨ Description générée!', 'success');
        } else {
            const error = await response.json();
            showToast('❌ ' + (error.error || 'Erreur génération'), 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('❌ Erreur: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = '<span class="material-icons" style="font-size: 18px;">sparkles</span> Générer';
    }
});


