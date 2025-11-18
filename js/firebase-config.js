import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZej9YltyxigiDKtmP4JK6bWMxzdZ-L6I",
    authDomain: "tontine-manager-4ca6a.firebaseapp.com",
    databaseURL: "https://tontine-manager-4ca6a-default-rtdb.firebaseio.com",
    projectId: "tontine-manager-4ca6a",
    storageBucket: "tontine-manager-4ca6a.firebasestorage.app",
    messagingSenderId: "301277281975",
    appId: "1:301277281975:web:45081924cae58078c01732",
    measurementId: "G-9ZJYTBME2Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

let analytics = null;
try {
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
        analytics = getAnalytics(app);
    }
} catch (error) {
    console.log('Analytics not available in this environment');
}
export { analytics };

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCounts = document.querySelectorAll('.cart-count');
    cartCounts.forEach(el => el.textContent = count);
}

function updateAuthUI() {
    const authLink = document.getElementById('authLink');
    const profileLink = document.getElementById('profileLink');
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (authLink) authLink.style.display = 'none';
            if (profileLink) profileLink.style.display = 'block';
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
                logoutBtn.onclick = () => {
                    auth.signOut().then(() => {
                        window.location.href = 'index.html';
                    });
                };
            }
        } else {
            if (authLink) authLink.style.display = 'block';
            if (profileLink) profileLink.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateAuthUI();
});

window.updateCartCount = updateCartCount;
