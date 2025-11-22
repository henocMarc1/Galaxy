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
const closeModal = document.querySelector('.close');
const productImageFile = document.getElementById('productImageFile');
const imagePreview = document.getElementById('imagePreview');
const uploadProgress = document.getElementById('uploadProgress');

let currentUser = null;
let isAdmin = false;
let uploadedImageUrl = null;

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
        }
    } else {
        window.location.href = 'auth.html';
    }
});

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
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Nom</th>
                            <th>Catégorie</th>
                            <th>Prix</th>
                            <th>Rabais</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr>
                                <td><img src="${product.image}" alt="${product.name}"></td>
                                <td>${product.name}</td>
                                <td>${product.category}</td>
                                <td>${formatCurrency(product.price)}</td>
                                <td>${product.discount || 0}%</td>
                                <td>${product.stock}</td>
                                <td>
                                    <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">Modifier</button>
                                    <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">Supprimer</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
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

            const pendingCount = allOrders.filter(o => o.status === 'pending').length;
            const confirmedCount = allOrders.filter(o => o.status === 'confirmed').length;
            const deliveredCount = allOrders.filter(o => o.status === 'delivered').length;
            const cancelledCount = allOrders.filter(o => o.status === 'cancelled').length;

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
                    <select id="dateFilter" class="filter-select">
                        <option value="all">Toutes les dates</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                    </select>
                </div>

                <div class="orders-table-wrapper">
                    <table class="modern-table" id="ordersDataTable">
                        <thead>
                            <tr>
                                <th>N° Commande</th>
                                <th>Date création</th>
                                <th>Nom du client</th>
                                <th>Priorité</th>
                                <th>Montant total</th>
                                <th>Paiement</th>
                                <th>Articles</th>
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
            document.getElementById('dateFilter').addEventListener('change', filterOrders);

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
        return '<tr><td colspan="9" style="text-align: center; padding: 2rem;">Aucune commande trouvée</td></tr>';
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
        
        if (order.items && Array.isArray(order.items)) {
            itemsCount = order.items.length;
            if (order.items.length > 0) {
                firstProduct = order.items[0].name || order.items[0].productName || 'N/A';
            }
        } else if (order.items && typeof order.items === 'object') {
            const itemsArray = Object.values(order.items);
            itemsCount = itemsArray.length;
            if (itemsArray.length > 0) {
                firstProduct = itemsArray[0].name || itemsArray[0].productName || 'N/A';
            }
        }
        
        return `
            <tr data-order-id="${order.id}" data-customer="${(order.fullName || '').toLowerCase()}" data-status="${order.status}" data-date="${order.createdAt}" data-product="${firstProduct.toLowerCase()}">
                <td><strong>#${order.id.substring(0, 8)}</strong></td>
                <td>${new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>
                    <div>${order.fullName || 'N/A'}</div>
                    <small style="color: #6B7280;">${order.email || ''}</small>
                </td>
                <td><span class="priority-badge">Normal</span></td>
                <td><strong>${formatCurrency(order.total || 0)}</strong></td>
                <td><span class="payment-badge">${order.paymentMethod || 'N/A'}</span></td>
                <td>${itemsCount} article${itemsCount > 1 ? 's' : ''}</td>
                <td>
                    <span class="status-badge" style="background: ${statusInfo.bg}; color: ${statusInfo.text};">
                        ${statusInfo.label}
                    </span>
                </td>
                <td>
                    <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livrée</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
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
        if (dateFilter !== 'all' && order.createdAt) {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            
            if (dateFilter === 'today') {
                matchesDate = orderDate.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = orderDate >= weekAgo;
            } else if (dateFilter === 'month') {
                matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
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
                        <div class="stat-label">Coût Total</div>
                        <div class="stat-value">${formatCurrency(totalCost)}</div>
                        <div class="stat-sublabel">Total des commandes des 365 derniers jours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Commandes</div>
                        <div class="stat-value">${totalOrders}</div>
                        <div class="stat-sublabel">Total des commandes des 365 derniers jours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Livrées</div>
                        <div class="stat-value">${completedOrders}</div>
                        <div class="stat-sublabel">Commandes livrées des 365 derniers jours</div>
                    </div>
                    <div class="stat-card">
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

closeModal.addEventListener('click', () => {
    productModal.classList.remove('show');
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

window.viewOrderDetails = async function(orderId) {
    try {
        const orderRef = ref(database, `orders/${orderId}`);
        const snapshot = await get(orderRef);
        
        if (snapshot.exists()) {
            const order = snapshot.val();
            const details = `
Commande #${orderId.substring(0, 8)}
Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}

Client: ${order.fullName}
Email: ${order.email}
Téléphone: ${order.phone}

Adresse: ${order.address}, ${order.city}
Paiement: ${order.paymentMethod}

Articles:
${order.items.map(item => `- ${item.name} x ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} FCFA`).join('\n')}

Total: ${order.total.toLocaleString()} FCFA
Statut: ${order.status}

Notes: ${order.notes || 'Aucune'}
            `;
            alert(details);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des détails de la commande:', error);
    }
};
