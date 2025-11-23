import { auth, database, storage } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, get, push, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

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

let currentUser = null;
let isAdmin = false;
let uploadedImageUrl = null;
let cloudinaryWidget = null;

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await checkAdminAccess();
        if (isAdmin) {
            loadProducts();
            loadOrders();
            loadMembers();
            initCloudinaryWidget();
            setupDiscountCalculator();
        }
    } else {
        window.location.href = 'auth.html';
    }
});

function initCloudinaryWidget() {
    if (typeof cloudinary !== 'undefined') {
        cloudinaryWidget = cloudinary.createUploadWidget(
            {
                cloudName: "dv3ulmei1",
                uploadPreset: "product_upload"
            },
            (error, result) => {
                if (!error && result && result.event === "success") {
                    console.log("Image uploadée :", result.info.secure_url);
                    document.getElementById('productImage').value = result.info.secure_url;
                    imagePreview.innerHTML = `<img src="${result.info.secure_url}" alt="Preview">`;
                    uploadedImageUrl = result.info.secure_url;
                    productImageFile.value = '';
                }
            }
        );
    }
}

if (uploadCloudinaryBtn) {
    uploadCloudinaryBtn.addEventListener('click', function() {
        if (cloudinaryWidget) {
            cloudinaryWidget.open();
        } else {
            alert('Widget Cloudinary non disponible. Veuillez vérifier la connexion.');
        }
    });
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
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = link.dataset.tab;
        
        adminNavLinks.forEach(l => l.classList.remove('active'));
        adminTabContents.forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });
        
        link.classList.add('active');
        const targetElement = document.getElementById(targetTab);
        targetElement.classList.add('active');
        targetElement.style.display = 'block';
    });
});

productImageFile.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
        document.getElementById('productImage').value = '';
    }
});

document.getElementById('productImage').addEventListener('input', function() {
    if (this.value) {
        productImageFile.value = '';
        imagePreview.innerHTML = `<img src="${this.value}" alt="Preview">`;
    }
});

async function loadProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const products = [];
            snapshot.forEach((child) => {
                products.push({ id: child.key, ...child.val() });
            });

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
                <table class="data-table sortable-table" id="productsDataTable">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th class="sortable" onclick="sortTable(1, 'productsDataTable')">Nom ↕</th>
                            <th class="sortable" onclick="sortTable(2, 'productsDataTable')">Catégorie ↕</th>
                            <th class="sortable" onclick="sortTable(3, 'productsDataTable')">Prix ↕</th>
                            <th class="sortable" onclick="sortTable(4, 'productsDataTable')">Rabais ↕</th>
                            <th class="sortable" onclick="sortTable(5, 'productsDataTable')">Stock ↕</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr data-name="${product.name.toLowerCase()}" data-category="${product.category}">
                                <td><img src="${product.image}" alt="${product.name}"></td>
                                <td>${product.name}</td>
                                <td>${product.category}</td>
                                <td data-value="${product.price}">${formatCurrency(product.price)}</td>
                                <td data-value="${product.discount || 0}">${product.discount || 0}%</td>
                                <td data-value="${product.stock}">${product.stock}</td>
                                <td>
                                    <div class="dropdown-wrapper">
                                        <button class="three-dot-menu" onclick="toggleProductMenu('${product.id}')">⋮</button>
                                        <div class="dropdown-menu-actions" id="menu-${product.id}">
                                            <button onclick="editProduct('${product.id}')">✏️ Modifier</button>
                                            <button onclick="deleteProduct('${product.id}')" style="color: #EF4444;">🗑️ Supprimer</button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            setupProductFilters();
        } else {
            productsTable.innerHTML = '<p>Aucun produit dans la base de données.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        if (error.code === 'PERMISSION_DENIED') {
            productsTable.innerHTML = `
                <div style="padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;">⚠️ Configuration Firebase requise</h3>
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
                    <h3 style="color: #92400E; margin-bottom: 1rem;">⚠️ Configuration Firebase requise</h3>
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
                            📋 Détails
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

async function loadMembers() {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const users = [];
            snapshot.forEach((child) => {
                users.push({ id: child.key, ...child.val() });
            });

            membersTable.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Téléphone</th>
                            <th>Rôle</th>
                            <th>Date d'inscription</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr class="member-row" onclick="viewMemberDetail('${user.id}')">
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>${user.phone}</td>
                                <td><span style="padding: 0.3rem 0.8rem; background: ${user.role === 'admin' ? '#3B82F6' : '#10B981'}; color: white; border-radius: 15px; font-size: 0.85rem;">${user.role}</span></td>
                                <td>${new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            membersTable.innerHTML = '<p>Aucun membre.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des membres:', error);
    }
}

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
    document.getElementById('modalTitle').textContent = 'Ajouter un produit';
    productForm.reset();
    document.getElementById('productId').value = '';
    imagePreview.innerHTML = '';
    uploadedImageUrl = null;
    productModal.classList.add('show');
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
                    errorMsg = '⚠️ Erreur de permissions Firebase Storage\n\n' +
                               'Les règles de sécurité Firebase Storage ne sont pas configurées.\n' +
                               'Veuillez configurer les règles dans la console Firebase :\n' +
                               '1. Allez dans Firebase Console > Storage > Rules\n' +
                               '2. Ajoutez les règles d\'écriture pour les administrateurs\n\n' +
                               'En attendant, vous pouvez utiliser une URL d\'image externe.';
                } else if (error.code === 'storage/quota-exceeded') {
                    errorMsg = '⚠️ Quota de stockage dépassé\n\n' +
                               'L\'espace de stockage Firebase est plein.\n' +
                               'Veuillez :\n' +
                               '1. Supprimer des fichiers inutilisés dans Storage\n' +
                               '2. Ou augmenter votre quota dans Firebase Console\n\n' +
                               'Utilisez temporairement une URL d\'image externe.';
                } else if (error.code === 'storage/canceled') {
                    errorMsg = 'Upload annulé par l\'utilisateur.';
                } else if (error.code === 'storage/unknown' || !navigator.onLine) {
                    errorMsg = '⚠️ Erreur de connexion réseau\n\n' +
                               'Vérifiez votre connexion internet et réessayez.\n' +
                               'Si le problème persiste, utilisez une URL d\'image externe.';
                } else if (error.code === 'storage/retry-limit-exceeded') {
                    errorMsg = '⚠️ Délai d\'upload dépassé\n\n' +
                               'L\'image est peut-être trop volumineuse ou la connexion trop lente.\n' +
                               'Essayez :\n' +
                               '1. Une image plus légère (< 2 MB)\n' +
                               '2. Ou utilisez une URL d\'image externe';
                } else {
                    errorMsg = `⚠️ Erreur d'upload (${error.code || 'inconnue'})\n\n` +
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

    let imageUrl = document.getElementById('productImage').value;

    if (productImageFile.files.length > 0) {
        try {
            imageUrl = await uploadImage(productImageFile.files[0]);
        } catch (error) {
            return;
        }
    }

    if (!imageUrl) {
        alert('Veuillez fournir une image (fichier ou URL)');
        return;
    }

    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        discount: parseInt(document.getElementById('productDiscount').value) || 0,
        stock: parseInt(document.getElementById('productStock').value),
        image: imageUrl,
        featured: document.getElementById('productFeatured').checked,
        isNew: document.getElementById('productNew').checked
    };

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
        imagePreview.innerHTML = '';
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
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productDiscount').value = product.discount || 0;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productImage').value = product.image;
            document.getElementById('productFeatured').checked = product.featured || false;
            document.getElementById('productNew').checked = product.isNew || false;
            
            productModal.classList.add('show');
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
                            <h4>📋 Informations client</h4>
                            <div class="info-grid">
                                <div><strong>Nom:</strong> ${order.fullName}</div>
                                <div><strong>Email:</strong> ${order.email}</div>
                                <div><strong>Téléphone:</strong> ${order.phone}</div>
                                <div><strong>Adresse:</strong> ${order.address}, ${order.city}</div>
                            </div>
                        </div>
                        
                        <div class="order-section">
                            <h4>🛍️ Articles commandés</h4>
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
                            <h4>💰 Résumé</h4>
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
                
                const matchesSearch = name.includes(searchTerm);
                const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
                
                row.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
            });
        };
        
        searchInput.addEventListener('input', filterProducts);
        categoryFilter.addEventListener('change', filterProducts);
    }
}

window.viewMemberDetailFromOrder = async function(userId) {
    if (userId) {
        await viewMemberDetail(userId);
    } else {
        alert('Aucun utilisateur associé à cette commande.');
    }
};
