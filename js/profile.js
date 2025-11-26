import { auth, database } from './firebase-config.js';
import { addressSystem } from './addresses.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const profileInfo = document.getElementById('profileInfo');
const ordersContainer = document.getElementById('ordersContainer');
const addressesContainer = document.getElementById('addressesContainer');
const favoritesContainer = document.getElementById('favoritesContainer');

let currentUser = null;
let userFavorites = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadUserOrders();
        loadAddresses();
        loadFavorites();
        setupProfileTabs();
    } else {
        window.location.href = 'auth.html';
    }
});

function setupProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.tab-content-profile');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });
}

async function loadUserProfile() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            profileInfo.innerHTML = `
                <h3>Informations personnelles</h3>
                <p><strong>Nom:</strong> ${userData.name}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Téléphone:</strong> ${userData.phone}</p>
                <p><strong>Membre depuis:</strong> ${new Date(userData.createdAt).toLocaleDateString('fr-FR')}</p>
            `;
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        console.error('Code erreur profil:', error.code);
        console.error('Message erreur profil:', error.message);
        
        let errorMsg = `
            <div style="padding: 1.5rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-bottom: 0.5rem;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Erreur de chargement</h3>`;
        
        if (error.code) {
            errorMsg += `<p style="color: #92400E; font-size: 0.85rem;"><strong>Code:</strong> ${error.code}</p>`;
        }
        if (error.message) {
            errorMsg += `<p style="color: #92400E; font-size: 0.85rem;"><strong>Message:</strong> ${error.message}</p>`;
        }
        
        errorMsg += `
                <p style="color: #78350F; font-size: 0.9rem; margin-top: 0.5rem;">Vérifiez la configuration Firebase.</p>
                <a href="CONFIGURATION_FIREBASE.md" target="_blank" style="color: #1E40AF; text-decoration: underline; font-size: 0.9rem; font-weight: bold;"><span class="material-icons" style="vertical-align: middle;">menu_book</span> Voir le guide</a>
            </div>
        `;
        profileInfo.innerHTML = errorMsg;
    }
}

async function loadUserOrders() {
    try {
        const ordersRef = ref(database, 'orders');
        const snapshot = await get(ordersRef);
        
        if (snapshot.exists()) {
            const allOrders = [];
            snapshot.forEach((child) => {
                const order = { id: child.key, ...child.val() };
                if (order.userId === currentUser.uid) {
                    allOrders.push(order);
                }
            });

            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (allOrders.length === 0) {
                ordersContainer.innerHTML = '<p>Vous n\'avez pas encore passé de commande.</p>';
                return;
            }

            ordersContainer.innerHTML = allOrders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <strong>Commande #${order.id.substring(0, 8)}</strong><br>
                            <small>${new Date(order.createdAt).toLocaleDateString('fr-FR')} à ${new Date(order.createdAt).toLocaleTimeString('fr-FR')}</small>
                        </div>
                        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div>
                        <p><strong>Articles:</strong></p>
                        <ul style="margin-left: 1.5rem;">
                            ${order.items.map(item => `<li>${item.name} x ${item.quantity} - ${(item.price * item.quantity).toLocaleString()} FCFA</li>`).join('')}
                        </ul>
                        <p style="margin-top: 1rem;"><strong>Total:</strong> ${order.total.toLocaleString()} FCFA</p>
                        <p><strong>Paiement:</strong> ${getPaymentMethodText(order.paymentMethod)}</p>
                        <p><strong>Adresse de livraison:</strong> ${order.address}, ${order.city}</p>
                    </div>
                </div>
            `).join('');
        } else {
            ordersContainer.innerHTML = '<p>Vous n\'avez pas encore passé de commande.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        console.error('Code erreur:', error.code);
        console.error('Message erreur:', error.message);
        console.error('Détails:', JSON.stringify(error));
        
        let errorMessage = `
            <div style="padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-bottom: 1rem;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Erreur de chargement</h3>
                <p style="color: #78350F; margin-bottom: 1rem;">Impossible de charger vos commandes. Détails de l'erreur :</p>`;
        
        if (error.code) {
            errorMessage += `<p style="color: #92400E; font-size: 0.9rem; margin-bottom: 0.5rem;"><strong>Code:</strong> ${error.code}</p>`;
        }
        if (error.message) {
            errorMessage += `<p style="color: #92400E; font-size: 0.9rem; margin-bottom: 1rem;"><strong>Message:</strong> ${error.message}</p>`;
        }
        
        errorMessage += `
                <hr style="margin: 1rem 0; border: none; border-top: 1px solid #FCD34D;">
                <p style="color: #78350F; margin-bottom: 0.5rem;"><strong>Vérifications à faire :</strong></p>
                <ol style="color: #78350F; margin-left: 1.5rem; margin-bottom: 1rem;">
                    <li>Vérifiez que la <strong>Realtime Database</strong> est créée sur Firebase</li>
                    <li>Vérifiez les <strong>règles de sécurité</strong> dans Firebase</li>
                    <li>Vérifiez que vous êtes bien <strong>connecté</strong> à l'application</li>
                </ol>
                <p style="color: #78350F;"><span class="material-icons" style="vertical-align: middle;">menu_book</span> Guide complet : <a href="CONFIGURATION_FIREBASE.md" target="_blank" style="color: #1E40AF; text-decoration: underline; font-weight: bold;">CONFIGURATION_FIREBASE.md</a></p>
            </div>
        `;
        ordersContainer.innerHTML = errorMessage;
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
}

function getPaymentMethodText(method) {
    const methodMap = {
        'mobile_money': 'Mobile Money',
        'card': 'Carte bancaire',
        'cash': 'Paiement à la livraison'
    };
    return methodMap[method] || method;
}

async function loadFavorites() {
    try {
        if (!currentUser) return;
        
        const favoritesRef = ref(database, `users/${currentUser.uid}/favorites`);
        const productsRef = ref(database, 'products');
        
        const [favoritesSnapshot, productsSnapshot] = await Promise.all([
            get(favoritesRef),
            get(productsRef)
        ]);
        
        userFavorites = [];
        
        if (favoritesSnapshot.exists() && productsSnapshot.exists()) {
            const favoriteIds = favoritesSnapshot.val();
            const allProducts = {};
            
            productsSnapshot.forEach((child) => {
                allProducts[child.key] = { dbId: child.key, ...child.val() };
            });
            
            Object.keys(favoriteIds).forEach(productId => {
                if (allProducts[productId]) {
                    userFavorites.push(allProducts[productId]);
                }
            });
        }
        
        displayFavorites();
    } catch (error) {
        console.error('Erreur lors du chargement des favoris:', error);
        favoritesContainer.innerHTML = '<p>Erreur lors du chargement des favoris.</p>';
    }
}

async function loadAddresses() {
    try {
        const addresses = await addressSystem.loadUserAddresses(currentUser.uid);
        const addressList = Object.entries(addresses);

        if (addressList.length === 0) {
            addressesContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: #F8FAFC; border-radius: 10px;">
                    <span class="material-icons" style="font-size: 64px; color: #CBD5E1;">location_on</span>
                    <p style="margin-top: 1rem; color: #64748B; margin-bottom: 1rem;">Vous n'avez pas encore d'adresses de livraison</p>
                    <a href="checkout.html" class="btn-primary" style="display: inline-block;">Ajouter une adresse</a>
                </div>
            `;
            return;
        }

        addressesContainer.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                ${addressList.map(([id, address]) => `
                    <div class="address-card" style="background: white; border: 2px solid ${address.isDefault ? '#1E40AF' : '#E2E8F0'}; border-radius: 12px; padding: 1.5rem; position: relative;">
                        ${address.isDefault ? '<span style="position: absolute; top: 1rem; right: 1rem; background: #1E40AF; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">Par défaut</span>' : ''}
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">${address.addressName}</h3>
                        <p style="margin: 0.5rem 0; color: #64748B;"><strong>Adresse:</strong> ${address.street}</p>
                        <p style="margin: 0.5rem 0; color: #64748B;"><strong>Ville:</strong> ${address.city}</p>
                        <p style="margin: 0.5rem 0 1rem 0; color: #64748B;"><strong>Téléphone:</strong> ${address.phone}</p>
                        <div style="display: flex; gap: 0.8rem; flex-wrap: wrap;">
                            ${!address.isDefault ? `<button onclick="setAddressDefault('${id}')" style="background: #F0F4FF; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;"><span class="material-icons" style="vertical-align: middle; font-size: 18px;">check</span> Définir par défaut</button>` : ''}
                            <button onclick="deleteAddress('${id}', '${address.addressName}')" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;"><span class="material-icons" style="vertical-align: middle; font-size: 18px;">delete</span> Supprimer</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <a href="checkout.html" class="btn-primary btn-full" style="margin-top: 1.5rem;">+ Ajouter une nouvelle adresse</a>
        `;
    } catch (error) {
        console.error('Erreur lors du chargement des adresses:', error);
        addressesContainer.innerHTML = '<p>Erreur lors du chargement des adresses.</p>';
    }
}

function displayFavorites() {
    if (userFavorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: #F8FAFC; border-radius: 10px;">
                <span class="material-icons" style="font-size: 64px; color: #CBD5E1;">favorite_border</span>
                <p style="margin-top: 1rem; color: #64748B;">Vous n'avez pas encore de produits favoris</p>
                <a href="products.html" class="btn-primary" style="display: inline-block; margin-top: 1rem;">Découvrir nos produits</a>
            </div>
        `;
        return;
    }
    
    favoritesContainer.innerHTML = `
        <div class="products-grid">
            ${userFavorites.map(product => {
                const discount = product.discount || 0;
                const hasDiscount = discount > 0;
                const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
                
                return `
                    <div class="product-card">
                        ${hasDiscount ? `<span class="discount-badge">-${discount}%</span>` : ''}
                        <button class="favorite-btn active" onclick="toggleFavorite('${product.dbId}')" title="Retirer des favoris">
                            <span class="material-icons">favorite</span>
                        </button>
                        <a href="product-detail.html?id=${product.dbId}">
                            <img src="${Array.isArray(product.images) ? product.images[0] : product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x300/E2E8F0/64748B?text=${encodeURIComponent(product.name)}'">
                        </a>
                        <div class="product-info">
                            <h3><a href="product-detail.html?id=${product.dbId}">${product.name}</a></h3>
                            <p class="product-category">${product.category}</p>
                            <div class="product-price">
                                ${hasDiscount ? `
                                    <span class="original-price">${product.price.toLocaleString()} FCFA</span>
                                    <span class="discounted-price">${Math.round(discountedPrice).toLocaleString()} FCFA</span>
                                ` : `
                                    <span>${product.price.toLocaleString()} FCFA</span>
                                `}
                            </div>
                            <button onclick="addToCartFromFavorites('${product.dbId}', '${product.name}', ${hasDiscount ? Math.round(discountedPrice) : product.price}, '${Array.isArray(product.images) ? product.images[0] : product.image}', ${discount}, ${product.price})" class="btn-primary btn-full">
                                <span class="material-icons">shopping_cart</span> Ajouter au panier
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.toggleFavorite = async function(productId) {
    if (!currentUser) {
        alert('Connectez-vous pour ajouter des favoris');
        return;
    }
    
    try {
        const favoriteRef = ref(database, `users/${currentUser.uid}/favorites/${productId}`);
        const snapshot = await get(favoriteRef);
        
        if (snapshot.exists()) {
            await remove(favoriteRef);
            userFavorites = userFavorites.filter(p => p.dbId !== productId);
        } else {
            await set(favoriteRef, true);
            const productRef = ref(database, `products/${productId}`);
            const productSnapshot = await get(productRef);
            if (productSnapshot.exists()) {
                userFavorites.push({ dbId: productId, ...productSnapshot.val() });
            }
        }
        
        displayFavorites();
        updateFavoriteButtons();
    } catch (error) {
        console.error('Erreur lors de la gestion des favoris:', error);
        alert('Erreur lors de la gestion des favoris');
    }
}

function updateFavoriteButtons() {
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(btn => {
        const productId = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        const isFavorite = userFavorites.some(p => p.dbId === productId);
        
        if (isFavorite) {
            btn.classList.add('active');
            btn.querySelector('.material-icons').textContent = 'favorite';
        } else {
            btn.classList.remove('active');
            btn.querySelector('.material-icons').textContent = 'favorite_border';
        }
    });
}

window.addToCartFromFavorites = function(id, name, price, image, discount, originalPrice) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ 
            id, 
            name, 
            price, 
            image, 
            quantity: 1,
            discount: discount || 0,
            originalPrice: originalPrice || price
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCount();
    showToast(`${name} ajouté au panier !`, 'success');
}

window.setAddressDefault = async function(addressId) {
    const result = await addressSystem.setDefaultAddress(currentUser.uid, addressId);
    if (result.success) {
        showToast('Adresse définie par défaut', 'success');
        loadAddresses();
    } else {
        showToast('Erreur lors de la modification', 'error');
    }
}

window.deleteAddress = async function(addressId, addressName) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'adresse "${addressName}" ?`)) {
        const result = await addressSystem.deleteAddress(currentUser.uid, addressId);
        if (result.success) {
            showToast('Adresse supprimée', 'success');
            loadAddresses();
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    }
}

