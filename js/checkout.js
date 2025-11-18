import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, push, get, runTransaction, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const checkoutForm = document.getElementById('checkoutForm');
const orderSummary = document.getElementById('orderSummary');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserInfo();
    } else {
        if (confirm('Vous devez être connecté pour passer une commande. Se connecter maintenant ?')) {
            window.location.href = 'auth.html';
        } else {
            window.location.href = 'index.html';
        }
    }
});

async function loadUserInfo() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            document.getElementById('fullName').value = userData.name || '';
            document.getElementById('phone').value = userData.phone || '';
            document.getElementById('email').value = currentUser.email;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des informations utilisateur:', error);
    }
}

function loadOrderSummary() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        alert('Votre panier est vide');
        window.location.href = 'cart.html';
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    orderSummary.innerHTML = `
        ${cart.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border-color);">
                <span>${item.name} x ${item.quantity}</span>
                <span>${(item.price * item.quantity).toLocaleString()} FCFA</span>
            </div>
        `).join('')}
        <div class="summary-row summary-total" style="margin-top: 1rem;">
            <span>Total:</span>
            <span>${subtotal.toLocaleString()} FCFA</span>
        </div>
    `;
}

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        alert('Vous devez être connecté pour passer une commande');
        return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('Votre panier est vide');
        return;
    }

    const orderData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        notes: document.getElementById('notes').value,
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    try {
        for (const item of cart) {
            const productRef = ref(database, `products/${item.id}`);
            const productSnapshot = await get(productRef);
            
            if (productSnapshot.exists()) {
                const productData = productSnapshot.val();
                const newStock = productData.stock - item.quantity;
                
                if (newStock < 0) {
                    alert(`Stock insuffisant pour "${item.name}". Stock actuel : ${productData.stock}, quantité demandée : ${item.quantity}. Veuillez ajuster votre panier.`);
                    return;
                }
            } else {
                alert(`Le produit "${item.name}" n'existe plus. Veuillez retirer cet article de votre panier.`);
                return;
            }
        }

        const ordersRef = ref(database, 'orders');
        const newOrderRef = await push(ordersRef, orderData);
        const orderId = newOrderRef.key;

        let stockUpdateFailed = false;
        let failedProduct = '';

        for (const item of cart) {
            const productRef = ref(database, `products/${item.id}/stock`);
            
            try {
                await runTransaction(productRef, (currentStock) => {
                    if (currentStock === null) {
                        return currentStock;
                    }
                    
                    const newStock = currentStock - item.quantity;
                    if (newStock < 0) {
                        stockUpdateFailed = true;
                        failedProduct = item.name;
                        return;
                    }
                    
                    return newStock;
                });
                
                if (stockUpdateFailed) {
                    break;
                }
            } catch (error) {
                console.error(`Erreur lors de la mise à jour du stock pour ${item.name}:`, error);
                stockUpdateFailed = true;
                failedProduct = item.name;
                break;
            }
        }

        if (stockUpdateFailed) {
            await remove(ref(database, `orders/${orderId}`));
            alert(`Le stock de "${failedProduct}" a changé pendant le traitement. La commande a été annulée. Veuillez réessayer.`);
            return;
        }

        localStorage.removeItem('cart');
        window.updateCartCount();

        alert('Commande passée avec succès ! Vous allez être redirigé vers votre profil.');
        window.location.href = 'profile.html';
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        alert('Erreur lors de la création de la commande. Veuillez réessayer.');
    }
});

loadOrderSummary();
