import { auth, database } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const cartContent = document.getElementById('cartContent');
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        loadCartFromFirebase();
    } else {
        window.location.href = 'auth.html';
    }
});

async function loadCartFromFirebase() {
    try {
        if (!currentUser) return;
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        const cartData = snapshot.exists() ? snapshot.val() : {};
        
        const cart = Object.values(cartData).map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            discount: item.discount || 0,
            originalPrice: item.price / (1 - (item.discount || 0) / 100),
            stock: 999
        }));
        
        displayCart(cart);
        window.updateCartCount();
    } catch (error) {
        console.error('Erreur chargement panier:', error);
    }
}

function displayCart(cart) {
    
    if (!cart || cart.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-cart">
                <h2>Votre panier est vide</h2>
                <p>Découvrez nos produits et ajoutez-les à votre panier !</p>
                <a href="products.html" class="btn-primary">Voir les produits</a>
            </div>
        `;
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const originalTotal = cart.reduce((sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 0);
    const totalSavings = originalTotal - subtotal;
    const hasDiscounts = totalSavings > 0;

    cartContent.innerHTML = `
        <div class="cart-layout">
            <div class="cart-items">
                <h2>Articles (${cart.length})</h2>
                ${cart.map((item, index) => {
                    const itemDiscount = item.discount || 0;
                    const itemOriginalPrice = item.originalPrice || item.price;
                    const hasItemDiscount = itemDiscount > 0;
                    const itemSavings = (itemOriginalPrice - item.price) * item.quantity;
                    
                    return `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.name}">
                            ${hasItemDiscount ? `<span class="cart-item-discount-badge">-${itemDiscount}%</span>` : ''}
                        </div>
                        <div class="cart-item-info">
                            <h3><a href="product-detail.html?id=${item.id}" style="cursor: pointer; color: #1E40AF; text-decoration: none; font-weight: 600; transition: opacity 0.2s;">${item.name}</a></h3>
                            ${hasItemDiscount ? `
                                <p class="product-price-original" style="text-decoration: line-through; color: #94A3B8; font-size: 0.9rem;">${itemOriginalPrice.toLocaleString()} FCFA</p>
                                <p class="product-price">${item.price.toLocaleString()} FCFA <span style="color: #10B981; font-size: 0.85rem; font-weight: 600;">(-${Math.round(itemOriginalPrice - item.price).toLocaleString()} FCFA)</span></p>
                            ` : `
                                <p class="product-price">${item.price.toLocaleString()} FCFA</p>
                            `}
                            <div class="quantity-selector">
                                <button onclick="updateQuantity(${index}, -1)">-</button>
                                <input type="number" value="${item.quantity}" min="1" max="${item.stock}" readonly>
                                <button onclick="updateQuantity(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="cart-item-actions">
                            ${hasItemDiscount ? `
                                <p style="font-weight: 700; font-size: 1.2rem;">${(item.price * item.quantity).toLocaleString()} FCFA</p>
                                <p style="color: #10B981; font-size: 0.9rem; font-weight: 600;">Économie: ${itemSavings.toLocaleString()} FCFA</p>
                            ` : `
                                <p style="font-weight: 700; font-size: 1.2rem;">${(item.price * item.quantity).toLocaleString()} FCFA</p>
                            `}
                            <button class="remove-btn" onclick="removeFromCart(${index})">Retirer</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="cart-summary">
                <h2>Résumé</h2>
                ${hasDiscounts ? `
                    <div class="summary-row">
                        <span>Montant original:</span>
                        <span style="text-decoration: line-through; color: #94A3B8;">${originalTotal.toLocaleString()} FCFA</span>
                    </div>
                    <div class="summary-row" style="color: #10B981; font-weight: 600;">
                        <span><span class="material-icons" style="vertical-align: middle;">local_offer</span> Économies totales:</span>
                        <span>-${totalSavings.toLocaleString()} FCFA</span>
                    </div>
                ` : ''}
                <div class="summary-row">
                    <span>Sous-total:</span>
                    <span>${subtotal.toLocaleString()} FCFA</span>
                </div>
                <div class="summary-row">
                    <span>Livraison:</span>
                    <span>Calculé au checkout</span>
                </div>
                <div class="summary-row summary-total">
                    <span>Total:</span>
                    <span>${subtotal.toLocaleString()} FCFA</span>
                </div>
                <a href="checkout.html" class="btn-primary btn-full">Passer la commande</a>
                <a href="products.html" class="btn-secondary btn-full" style="margin-top: 1rem;">Continuer mes achats</a>
                <button onclick="clearAllCart()" class="btn-secondary btn-full" style="margin-top: 0.5rem; background: #EF4444; color: white;">
                    <span class="material-icons" style="vertical-align: middle;">delete_sweep</span> Vider le panier
                </button>
            </div>
        </div>
    `;
}

window.updateQuantity = async function(index, change) {
    try {
        if (!currentUser) return;
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        const cartData = snapshot.exists() ? snapshot.val() : {};
        const items = Object.entries(cartData);
        
        if (index < items.length) {
            const [key, item] = items[index];
            const newQuantity = item.quantity + change;
            if (newQuantity < 1) {
                await remove(ref(database, `users/${currentUser.uid}/cart/${key}`));
            } else {
                await set(ref(database, `users/${currentUser.uid}/cart/${key}`), {
                    ...item,
                    quantity: newQuantity
                });
            }
            loadCartFromFirebase();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
};

window.removeFromCart = async function(index) {
    if (!confirm('Voulez-vous vraiment retirer cet article du panier ?')) return;
    try {
        if (!currentUser) return;
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        const cartData = snapshot.exists() ? snapshot.val() : {};
        const items = Object.entries(cartData);
        
        if (index < items.length) {
            const [key] = items[index];
            await remove(ref(database, `users/${currentUser.uid}/cart/${key}`));
            loadCartFromFirebase();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
};

window.clearAllCart = async function() {
    if (!confirm('Êtes-vous sûr de vouloir vider complètement le panier ? Cette action ne peut pas être annulée.')) return;
    try {
        if (!currentUser) return;
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        await remove(cartRef);
        showToast('Panier vidé avec succès !', 'success');
        loadCartFromFirebase();
    } catch (error) {
        console.error('Erreur vidage panier:', error);
        showToast('Erreur lors du vidage du panier', 'error');
    }
};
