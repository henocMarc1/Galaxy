import { auth, database } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'index.html';
    } catch (error) {
        loginError.textContent = 'Email ou mot de passe incorrect';
        loginError.classList.add('show');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.classList.remove('show');

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        registerError.textContent = 'Les mots de passe ne correspondent pas';
        registerError.classList.add('show');
        return;
    }

    if (password.length < 6) {
        registerError.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
        registerError.classList.add('show');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await set(ref(database, `users/${user.uid}`), {
            name: name,
            email: email,
            phone: phone,
            role: 'customer',
            createdAt: new Date().toISOString()
        });

        alert('Inscription réussie ! Bienvenue sur Galax.');
        window.location.href = 'index.html';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            registerError.textContent = 'Cet email est déjà utilisé';
        } else {
            registerError.textContent = 'Erreur lors de l\'inscription. Veuillez réessayer.';
        }
        registerError.classList.add('show');
    }
});
