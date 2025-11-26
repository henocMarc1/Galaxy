import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, get, push, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
const adminTabContents = document.querySelectorAll('.admin-tab-content');
const productsTable = document.getElementById('productsTable');
const ordersTable = document.getElementById('ordersTable');
const membersTable = document.getElementById('membersTable');
const addProductBtn = document.getElementById('addProductBtn');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const closeModal = document.querySelector('.close');

let currentUser = null;
let isAdmin = false;

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

adminTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        adminTabBtns.forEach(b => b.classList.remove('active'));
        adminTabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
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
                                <td>${product.price.toLocaleString()} FCFA</td>
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
                    <h3 style="color: #92400E; margin-bottom: 1rem;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
        }
    }
}

async function loadOrders() {
    try {
        const ordersRef = ref(database, 'orders');
        const snapshot = await get(ordersRef);
        
        if (snapshot.exists()) {
            const orders = [];
            snapshot.forEach((child) => {
                orders.push({ id: child.key, ...child.val() });
            });

            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            ordersTable.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>#${order.id.substring(0, 8)}</td>
                                <td>${order.fullName}<br><small>${order.email}</small></td>
                                <td>${new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                                <td>${order.total.toLocaleString()} FCFA</td>
                                <td>
                                    <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding: 0.5rem; border-radius: 5px;">
                                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
                                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livrée</option>
                                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="action-btn edit-btn" onclick="viewOrderDetails('${order.id}')">Détails</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
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
                            <tr>
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

addProductBtn.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Ajouter un produit';
    productForm.reset();
    document.getElementById('productId').value = '';
    productModal.classList.add('show');
});

closeModal.addEventListener('click', () => {
    productModal.classList.remove('show');
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        discount: parseInt(document.getElementById('productDiscount').value) || 0,
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value,
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
