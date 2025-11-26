import { database, auth } from './firebase-config.js';
import { ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const MAX_ADDRESSES = 3;

export const addressSystem = {
    // Charger toutes les adresses de l'utilisateur
    async loadUserAddresses(userId) {
        try {
            const addressesRef = ref(database, `users/${userId}/addresses`);
            const snapshot = await get(addressesRef);
            
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return {};
        } catch (error) {
            console.error('Erreur chargement adresses:', error);
            return {};
        }
    },

    // Obtenir l'adresse par défaut
    async getDefaultAddress(userId) {
        try {
            const addresses = await this.loadUserAddresses(userId);
            for (const [id, address] of Object.entries(addresses)) {
                if (address.isDefault) return { id, ...address };
            }
            // Si pas de défaut, retourner la première
            const firstId = Object.keys(addresses)[0];
            return firstId ? { id: firstId, ...addresses[firstId] } : null;
        } catch (error) {
            console.error('Erreur obtention adresse défaut:', error);
            return null;
        }
    },

    // Ajouter une nouvelle adresse
    async addAddress(userId, addressData) {
        try {
            const addresses = await this.loadUserAddresses(userId);
            
            // Vérifier limite
            if (Object.keys(addresses).length >= MAX_ADDRESSES) {
                return { success: false, message: `Limite de ${MAX_ADDRESSES} adresses atteinte` };
            }

            // Si première adresse, la mettre en défaut
            const isFirstAddress = Object.keys(addresses).length === 0;
            
            const newAddressId = Date.now().toString();
            const newAddress = {
                ...addressData,
                isDefault: isFirstAddress,
                createdAt: new Date().toISOString()
            };

            const addressPath = `users/${userId}/addresses/${newAddressId}`;
            await set(ref(database, addressPath), newAddress);

            return { success: true, id: newAddressId };
        } catch (error) {
            console.error('Erreur ajout adresse:', error);
            return { success: false, message: 'Erreur lors de l\'ajout' };
        }
    },

    // Définir une adresse par défaut
    async setDefaultAddress(userId, addressId) {
        try {
            const addresses = await this.loadUserAddresses(userId);
            const updates = {};

            // Retirer default de tous
            for (const id in addresses) {
                updates[`users/${userId}/addresses/${id}/isDefault`] = false;
            }

            // Ajouter default à la sélectionnée
            updates[`users/${userId}/addresses/${addressId}/isDefault`] = true;

            await update(ref(database), updates);
            return { success: true };
        } catch (error) {
            console.error('Erreur définition adresse défaut:', error);
            return { success: false };
        }
    },

    // Supprimer une adresse
    async deleteAddress(userId, addressId) {
        try {
            const addresses = await this.loadUserAddresses(userId);
            const wasDefault = addresses[addressId]?.isDefault;

            await remove(ref(database, `users/${userId}/addresses/${addressId}`));

            // Si c'était la défaut, en définir une nouvelle
            if (wasDefault) {
                const remainingIds = Object.keys(addresses).filter(id => id !== addressId);
                if (remainingIds.length > 0) {
                    await this.setDefaultAddress(userId, remainingIds[0]);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Erreur suppression adresse:', error);
            return { success: false };
        }
    },

    // Modifier une adresse
    async updateAddress(userId, addressId, addressData) {
        try {
            const updates = {};
            for (const key in addressData) {
                updates[`users/${userId}/addresses/${addressId}/${key}`] = addressData[key];
            }
            await update(ref(database), updates);
            return { success: true };
        } catch (error) {
            console.error('Erreur modification adresse:', error);
            return { success: false };
        }
    }
};
