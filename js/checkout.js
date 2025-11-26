import { auth, database } from './firebase-config.js';
import { addressSystem } from './addresses.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, push, get, runTransaction, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const checkoutForm = document.getElementById('checkoutForm');
const orderSummary = document.getElementById('orderSummary');
const addressesContainer = document.getElementById('addressesContainer');
const newAddressSection = document.getElementById('newAddressSection');
const toggleNewAddressBtn = document.getElementById('toggleNewAddressBtn');
const cancelNewAddressBtn = document.getElementById('cancelNewAddress');
const newAddressForm = document.getElementById('newAddressForm');

let currentUser = null;
let selectedAddressId = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserInfo();
        await loadAddresses();
        await loadOrderSummary();
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

async function loadAddresses() {
    const addresses = await addressSystem.loadUserAddresses(currentUser.uid);
    const addressList = Object.entries(addresses);

    if (addressList.length === 0) {
        addressesContainer.innerHTML = `
            <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <p style="margin: 0; color: #92400E;">Vous n'avez pas encore d'adresse de livraison. Créez-en une !</p>
            </div>
        `;
        toggleNewAddressBtn.textContent = '+ Ajouter votre première adresse';
        return;
    }

    // Afficher les adresses existantes
    addressesContainer.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <label style="font-weight: 600; display: block; margin-bottom: 1rem;">Sélectionnez une adresse de livraison *</label>
            ${addressList.map(([id, address]) => `
                <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; padding: 1rem; border: 2px solid ${address.isDefault ? '#1E40AF' : '#E2E8F0'}; border-radius: 8px; background: ${address.isDefault ? '#EFF6FF' : '#F8FAFC'}; transition: all 0.2s;">
                    <div style="flex: 1;">
                        <label class="address-option" style="display: flex; align-items: center; cursor: pointer; margin-bottom: 0.8rem;">
                            <input type="radio" name="selectedAddress" value="${id}" ${address.isDefault ? 'checked' : ''} style="margin-right: 0.8rem; cursor: pointer; width: 18px; height: 18px;">
                            <span style="font-weight: 600; color: #1E40AF;">${address.addressName}</span>
                            ${address.isDefault ? '<span style="margin-left: 0.5rem; background: #10B981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Adresse par défaut</span>' : ''}
                        </label>
                        <div style="margin-left: 1.8rem;">
                            <p style="margin: 0.3rem 0; color: #64748B; font-size: 0.9rem;">${address.street}</p>
                            <p style="margin: 0.3rem 0; color: #64748B; font-size: 0.9rem;">${address.city} - ${address.phone}</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                        ${!address.isDefault ? `<button type="button" class="btn-secondary" style="font-size: 0.75rem; padding: 0.4rem 0.8rem; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;" onclick="setDefaultAddressCheckout('${id}')">Définir défaut</button>` : ''}
                        <button type="button" class="btn-secondary" style="font-size: 0.75rem; padding: 0.4rem 0.8rem; background: #EF4444; color: white; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;" onclick="deleteAddressCheckout('${id}')">Supprimer</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Ajouter event listeners
    document.querySelectorAll('input[name="selectedAddress"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedAddressId = e.target.value;
        });
    });

    if (addressList.length > 0) {
        selectedAddressId = addressList.find(([_, addr]) => addr.isDefault)?.[0] || addressList[0][0];
    }

    // Mettre à jour le bouton - afficher en bas du formulaire
    const hasSpace = addressList.length < 3;
    toggleNewAddressBtn.style.display = hasSpace ? 'block' : 'none';
    if (hasSpace) {
        toggleNewAddressBtn.textContent = `+ Ajouter une nouvelle adresse (${addressList.length}/3)`;
    }
}

function toggleNewAddressForm() {
    newAddressSection.style.display = newAddressSection.style.display === 'none' ? 'block' : 'none';
    if (newAddressSection.style.display === 'block') {
        document.getElementById('newAddressName').focus();
    }
}

cancelNewAddressBtn.addEventListener('click', () => {
    toggleNewAddressForm();
    newAddressForm.reset();
});

toggleNewAddressBtn.addEventListener('click', toggleNewAddressForm);

newAddressForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newAddress = {
        addressName: document.getElementById('newAddressName').value,
        street: document.getElementById('newAddressStreet').value,
        city: document.getElementById('newAddressCity').value,
        phone: document.getElementById('newAddressPhone').value
    };

    const result = await addressSystem.addAddress(currentUser.uid, newAddress);

    if (result.success) {
        showToast('Adresse ajoutée avec succès !', 'success');
        newAddressForm.reset();
        toggleNewAddressForm();
        await loadAddresses();
    } else {
        showToast(result.message, 'error');
    }
});

window.setDefaultAddressCheckout = async function(addressId) {
    try {
        const result = await addressSystem.setDefaultAddress(currentUser.uid, addressId);
        if (result.success) {
            showToast('Adresse par défaut changée !', 'success');
            await loadAddresses();
        } else {
            showToast('Erreur lors du changement d\'adresse par défaut', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors du changement d\'adresse', 'error');
    }
};

window.deleteAddressCheckout = async function(addressId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;
    
    try {
        const result = await addressSystem.deleteAddress(currentUser.uid, addressId);
        if (result.success) {
            showToast('Adresse supprimée !', 'success');
            await loadAddresses();
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de la suppression d\'adresse', 'error');
    }
};

async function loadOrderSummary() {
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
            originalPrice: item.price / (1 - (item.discount || 0) / 100)
        }));
        
        if (cart.length === 0) {
            alert('Votre panier est vide');
            window.location.href = 'cart.html';
            return;
        }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const originalTotal = cart.reduce((sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 0);
    const totalSavings = originalTotal - subtotal;
    const hasDiscounts = totalSavings > 0;

    orderSummary.innerHTML = `
        ${cart.map(item => {
            const itemDiscount = item.discount || 0;
            const itemOriginalPrice = item.originalPrice || item.price;
            const hasItemDiscount = itemDiscount > 0;
            
            return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border-color);">
                <div>
                    <div>${item.name} x ${item.quantity}</div>
                    ${hasItemDiscount ? `
                        <div style="font-size: 0.8rem; color: #10B981; font-weight: 600;">-${itemDiscount}% de réduction</div>
                    ` : ''}
                </div>
                <div style="text-align: right;">
                    ${hasItemDiscount ? `
                        <div style="text-decoration: line-through; color: #94A3B8; font-size: 0.85rem;">${(itemOriginalPrice * item.quantity).toLocaleString()} FCFA</div>
                    ` : ''}
                    <div>${(item.price * item.quantity).toLocaleString()} FCFA</div>
                </div>
            </div>
            `;
        }).join('')}
        ${hasDiscounts ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border-color);">
                <span style="color: #94A3B8;">Montant original:</span>
                <span style="text-decoration: line-through; color: #94A3B8;">${originalTotal.toLocaleString()} FCFA</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); color: #10B981; font-weight: 600;">
                <span><span class="material-icons" style="vertical-align: middle;">local_offer</span> Économies totales:</span>
                <span>-${totalSavings.toLocaleString()} FCFA</span>
            </div>
        ` : ''}
        <div class="summary-row summary-total" style="margin-top: 1rem;">
            <span>Total à payer:</span>
            <span>${subtotal.toLocaleString()} FCFA</span>
        </div>
    `;
    } catch (error) {
        console.error('Erreur chargement résumé:', error);
        orderSummary.innerHTML = '<p>Erreur lors du chargement du panier</p>';
    }
}

async function sendOrderEmails(orderId, orderData) {
    try {
        const paymentMethodText = {
            'mobile_money': 'Mobile Money',
            'card': 'Carte bancaire',
            'cash': 'Paiement à la livraison'
        }[orderData.paymentMethod] || orderData.paymentMethod;

        const itemsList = orderData.items.map(item => {
            const imageUrl = item.image || (Array.isArray(item.images) ? item.images[0] : '');
            return `
            <tr style="vertical-align: top">
              <td style="padding: 16px 8px 0 4px; display: inline-block; width: max-content">
                <img style="height: 64px; border-radius: 4px;" height="64px" src="${imageUrl}" alt="${item.name}" />
              </td>
              <td style="padding: 16px 8px 0 8px; width: 100%">
                <div><strong>${item.name}</strong></div>
                <div style="font-size: 13px; color: #888; padding-top: 4px">QTY: ${item.quantity}</div>
              </td>
              <td style="padding: 16px 4px 0 0; white-space: nowrap; text-align: right">
                <strong>${(item.price * item.quantity).toLocaleString()} FCFA</strong>
              </td>
            </tr>
        `;
        }).join('');

        // Email de confirmation client
        const customerEmailParams = {
            to_email: orderData.email,
            customer_name: orderData.fullName,
            order_id: orderId,
            items_list: itemsList,
            total: orderData.total.toLocaleString(),
            order_date: new Date(orderData.createdAt).toLocaleDateString('fr-FR'),
            address: orderData.address,
            city: orderData.city,
            payment_method: paymentMethodText
        };

        // Email de notification admin
        const adminEmailParams = {
            to_email: 'henocmarc1@gmail.com',
            customer_email: orderData.email,
            customer_name: orderData.fullName,
            phone: orderData.phone,
            order_id: orderId,
            items_list: itemsList,
            total: orderData.total.toLocaleString(),
            order_date: new Date(orderData.createdAt).toLocaleDateString('fr-FR'),
            address: orderData.address,
            city: orderData.city,
            payment_method: paymentMethodText
        };

        console.log('📧 Envoi email client avec params:', customerEmailParams);
        console.log('📧 Envoi email admin avec params:', adminEmailParams);

        // Envoyer les deux emails avec EmailJS
        const results = await Promise.allSettled([
            emailjs.send('service_kdo9g25', 'template_xq0cxxo', customerEmailParams),
            emailjs.send('service_kdo9g25', 'template_xq0cxxo', adminEmailParams)
        ]);

        if (results[0].status === 'fulfilled') {
            console.log('✅ Email client envoyé avec succès');
            showToast('✅ Email de confirmation envoyé!', 'success');
        } else {
            console.error('❌ Erreur email client:', results[0].reason);
        }

        if (results[1].status === 'fulfilled') {
            console.log('✅ Email admin envoyé avec succès');
        } else {
            console.error('❌ Erreur email admin:', results[1].reason);
        }

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi des emails EmailJS:', error);
        showToast('⚠️ Erreur envoi email: ' + error.message, 'warning');
    }
}

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showToast('Vous devez être connecté pour passer une commande', 'warning');
        return;
    }

    const cartRef = ref(database, `users/${currentUser.uid}/cart`);
    const cartSnapshot = await get(cartRef);
    const cartData = cartSnapshot.exists() ? cartSnapshot.val() : {};
    
    const cart = Object.values(cartData).map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        discount: item.discount || 0
    }));
    
    if (cart.length === 0) {
        showToast('Votre panier est vide', 'warning');
        return;
    }

    if (!selectedAddressId) {
        showToast('Sélectionnez une adresse de livraison', 'warning');
        return;
    }

    const addresses = await addressSystem.loadUserAddresses(currentUser.uid);
    const selectedAddress = addresses[selectedAddressId];

    if (!selectedAddress) {
        showToast('Adresse invalide', 'error');
        return;
    }

    const orderData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: selectedAddress.street,
        city: selectedAddress.city,
        addressName: selectedAddress.addressName,
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
                    showToast(`Stock insuffisant pour "${item.name}".`, 'warning');
                    return;
                }
            } else {
                showToast(`Le produit "${item.name}" n'existe plus.`, 'error');
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
            showToast(`Stock insuffisant. La commande a été annulée.`, 'error');
            return;
        }

        await remove(ref(database, `users/${currentUser.uid}/cart`));
        window.updateCartCount();

        sendOrderEmails(orderId, orderData);

        showToast('Commande passée avec succès ! Redirection vers votre profil...', 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 1500);
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        showToast('Erreur lors de la création de la commande. Veuillez réessayer.', 'error');
    }
});
