// Promo Codes System - Admin generates codes
import { auth, database } from './firebase-config.js';
import { ref, get, set, remove, update } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

console.log('✅ promo-codes.js chargé, firebase disponible:', !!database);

window.promoSystem = {
    async createPromoCode(code, discount, applicableProducts, expiryDate) {
        try {
            const codeUpper = code.toUpperCase();
            const discountNum = parseInt(discount);
            
            console.log('Création code:', { codeUpper, discountNum, applicableProducts, expiryDate });
            
            const promoRef = ref(database, `promoCodes/${codeUpper}`);
            const dataToSave = {
                code: codeUpper,
                discount: discountNum,
                applicableProducts: applicableProducts === 'all' ? 'all' : applicableProducts,
                expiryDate: expiryDate || '',
                createdAt: new Date().toISOString(),
                active: true
            };
            
            console.log('Données à sauvegarder:', dataToSave);
            await set(promoRef, dataToSave);
            console.log('✅ Code créé avec succès');
            return { success: true, message: `Code ${codeUpper} créé` };
        } catch (error) {
            console.error('❌ ERREUR FIREBASE:', error);
            console.error('Code erreur:', error.code);
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            // Si erreur permission, conseiller admin de vérifier règles Firebase
            const msg = error.code === 'PERMISSION_DENIED' 
                ? 'Erreur permission Firebase - Contactez admin'
                : error.message || 'Erreur création code';
            return { success: false, message: msg };
        }
    },

    async validatePromoCode(code, productId) {
        try {
            const promoRef = ref(database, `promoCodes/${code.toUpperCase()}`);
            const snapshot = await get(promoRef);
            
            if (!snapshot.exists()) {
                return { valid: false, message: 'Code invalide' };
            }
            
            const promo = snapshot.val();
            
            if (!promo.active) {
                return { valid: false, message: 'Code expiré ou désactivé' };
            }
            
            if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
                return { valid: false, message: 'Code expiré' };
            }
            
            if (promo.applicableProducts !== 'all' && !promo.applicableProducts.includes(productId)) {
                return { valid: false, message: 'Code non applicable pour ce produit' };
            }
            
            return { valid: true, discount: promo.discount, code: code.toUpperCase() };
        } catch (error) {
            console.error('Erreur validation code:', error);
            return { valid: false, message: 'Erreur validation' };
        }
    },

    async getAllPromoCodes() {
        try {
            const promoRef = ref(database, 'promoCodes');
            const snapshot = await get(promoRef);
            if (snapshot.exists()) {
                const codes = [];
                snapshot.forEach(child => {
                    codes.push(child.val());
                });
                return codes;
            }
            return [];
        } catch (error) {
            console.error('Erreur chargement codes:', error);
            return [];
        }
    },

    async deletePromoCode(code) {
        try {
            const promoRef = ref(database, `promoCodes/${code.toUpperCase()}`);
            await remove(promoRef);
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression code:', error);
            return { success: false };
        }
    },

    async deactivatePromoCode(code) {
        try {
            const promoRef = ref(database, `promoCodes/${code.toUpperCase()}`);
            await update(promoRef, { active: false });
            return { success: true };
        } catch (error) {
            console.error('Erreur désactivation code:', error);
            return { success: false };
        }
    }
};
