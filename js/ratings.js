// Ratings & Reviews System
import { auth, database } from './firebase-config.js';
import { ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

window.ratingSystem = {
    async addRating(productId, userId, rating, review = '') {
        try {
            const ratingRef = ref(database, `ratings/${productId}/${userId}`);
            await set(ratingRef, {
                rating: parseInt(rating),
                review: review.trim(),
                timestamp: new Date().toISOString(),
                userName: auth.currentUser?.email || 'Anonyme'
            });
            return true;
        } catch (error) {
            console.error('Erreur notation:', error);
            return false;
        }
    },

    async getRatings(productId) {
        try {
            const ratingsRef = ref(database, `ratings/${productId}`);
            const snapshot = await get(ratingsRef);
            if (!snapshot.exists()) return { average: 0, count: 0, ratings: [] };
            
            const ratings = [];
            let totalRating = 0;
            snapshot.forEach(child => {
                ratings.push(child.val());
                totalRating += child.val().rating;
            });
            
            return {
                average: ratings.length > 0 ? totalRating / ratings.length : 0,
                count: ratings.length,
                ratings: ratings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            };
        } catch (error) {
            console.error('Erreur chargement notes:', error);
            return { average: 0, count: 0, ratings: [] };
        }
    },

    renderStars(rating, size = 16) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            const icon = i <= Math.round(rating) ? 'star' : 'star_border';
            html += `<span class="material-icons" style="font-size: ${size}px; color: #F59E0B;">${icon}</span>`;
        }
        return html;
    }
};

window.generateRandomRating = function() {
    return Math.floor(Math.random() * 2) + 4;
};
