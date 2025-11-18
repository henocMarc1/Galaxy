import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const profileInfo = document.getElementById('profileInfo');
const ordersContainer = document.getElementById('ordersContainer');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadUserOrders();
    } else {
        window.location.href = 'auth.html';
    }
});

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
        if (error.code === 'PERMISSION_DENIED') {
            profileInfo.innerHTML = `
                <div style="padding: 1.5rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 0.5rem;">⚠️ Configuration requise</h3>
                    <p style="color: #78350F; font-size: 0.9rem;">Firebase non configuré</p>
                    <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline; font-size: 0.9rem;">Voir le guide</a>
                </div>
            `;
        }
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
        if (error.code === 'PERMISSION_DENIED') {
            ordersContainer.innerHTML = `
                <div style="padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;">⚠️ Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
        } else {
            ordersContainer.innerHTML = '<p>Erreur lors du chargement des commandes. Veuillez réessayer plus tard.</p>';
        }
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
