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
        console.error('Code erreur profil:', error.code);
        console.error('Message erreur profil:', error.message);
        
        let errorMsg = `
            <div style="padding: 1.5rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-bottom: 0.5rem;">⚠️ Erreur de chargement</h3>`;
        
        if (error.code) {
            errorMsg += `<p style="color: #92400E; font-size: 0.85rem;"><strong>Code:</strong> ${error.code}</p>`;
        }
        if (error.message) {
            errorMsg += `<p style="color: #92400E; font-size: 0.85rem;"><strong>Message:</strong> ${error.message}</p>`;
        }
        
        errorMsg += `
                <p style="color: #78350F; font-size: 0.9rem; margin-top: 0.5rem;">Vérifiez la configuration Firebase.</p>
                <a href="CONFIGURATION_FIREBASE.md" target="_blank" style="color: #1E40AF; text-decoration: underline; font-size: 0.9rem; font-weight: bold;">📖 Voir le guide</a>
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
                <h3 style="color: #92400E; margin-bottom: 1rem;">⚠️ Erreur de chargement</h3>
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
                <p style="color: #78350F;">📖 Guide complet : <a href="CONFIGURATION_FIREBASE.md" target="_blank" style="color: #1E40AF; text-decoration: underline; font-weight: bold;">CONFIGURATION_FIREBASE.md</a></p>
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
