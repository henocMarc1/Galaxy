import { auth, database } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = 'products.html';
}

let currentUser = null;
let userFavorites = {};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        loadUserFavorites();
    }
});

async function loadProduct() {
    try {
        const productRef = ref(database, `products/${productId}`);
        const snapshot = await get(productRef);
        
        if (snapshot.exists()) {
            const product = snapshot.val();
            displayProduct(product);
            
            // Charger les recommandations en arrière-plan (ne pas bloquer l'affichage)
            loadRecommendedProducts(product.category);
        } else {
            document.getElementById('productContent').innerHTML = '<p>Produit non trouvé.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du produit:', error);
        document.getElementById('productContent').innerHTML = '<p>Erreur lors du chargement du produit.</p>';
    }
}

async function loadRecommendedProducts(category) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (!snapshot.exists()) return;
        
        const allProducts = snapshot.val();
        const recommended = Object.entries(allProducts)
            .filter(([id, product]) => {
                return product.category === category && id !== productId;
            })
            .slice(0, 4)
            .map(([id, product]) => ({ dbId: id, ...product }));
        
        if (recommended.length === 0) return;
        
        displayRecommendedProducts(recommended);
    } catch (error) {
        console.error('Erreur chargement produits recommandés:', error);
    }
}

function displayRecommendedProducts(products) {
    const section = document.getElementById('recommendedSection');
    const grid = document.getElementById('recommendedGrid');
    
    grid.innerHTML = products.map(product => {
        const discount = product.discount || 0;
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? Math.round(product.price * (1 - discount / 100)) : product.price;
        
        return `
            <a href="product-detail.html?id=${product.dbId}" class="product-card">
                <div class="product-image">
                    ${hasDiscount ? `<span class="product-badge promo">-${discount}%</span>` : ''}
                    <img src="${Array.isArray(product.images) ? product.images[0] : product.image}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-category">${product.category}</p>
                    ${hasDiscount ? `
                        <p class="product-price-original">${product.price.toLocaleString()} FCFA</p>
                        <p class="product-price">${finalPrice.toLocaleString()} FCFA</p>
                    ` : `
                        <p class="product-price">${product.price.toLocaleString()} FCFA</p>
                    `}
                </div>
            </a>
        `;
    }).join('');
    
    section.style.display = 'block';
}

function displayProduct(product) {
    const content = document.getElementById('productContent');
    const discount = product.discount || 0;
    const hasDiscount = discount > 0;
    const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
    const isFavorite = userFavorites[productId] || false;
    
    const images = Array.isArray(product.images) ? product.images : [product.image];
    const mainImage = images[0] || product.image;
    
    content.innerHTML = `
        <div class="product-detail-layout">
            <div class="product-detail-image">
                ${hasDiscount ? `<span class="product-badge promo" style="font-size: 1.2rem; padding: 0.6rem 1.2rem;">-${discount}%</span>` : ''}
                <button class="favorite-btn" style="position: absolute; top: 10px; right: 10px; background: ${isFavorite ? '#EF4444' : '#E2E8F0'}; border: none; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: all 0.3s;">
                    <span class="material-icons" style="color: ${isFavorite ? '#FFFFFF' : '#64748B'}; font-size: 28px;">${isFavorite ? 'favorite' : 'favorite_border'}</span>
                </button>
                <img id="mainProductImage" src="${mainImage}" alt="${product.name}">
                ${images.length > 1 ? `
                    <div class="product-thumbnails">
                        ${images.map((img, index) => `
                            <img src="${img}" 
                                 alt="Photo ${index + 1}" 
                                 class="thumbnail ${index === 0 ? 'active' : ''}"
                                 onclick="changeMainImage(this, event)"
                                 style="cursor: pointer; border-radius: 6px; border: 2px solid ${index === 0 ? '#1E40AF' : '#E2E8F0'}; transition: all 0.3s;">
                        `).join('')}
                    </div>
                ` : ''}
                
                ${product.extraInfos && Object.keys(product.extraInfos).length > 0 ? `
                    <div class="collapsible-section" style="margin-top: 1.5rem;">
                        <button type="button" class="collapsible-header" onclick="toggleInfosSection(event)">
                            <span class="collapsible-icon">▼</span>
                            <span>Informations Additionnel</span>
                        </button>
                        <div class="collapsible-content">
                        <table class="product-specs-table">
                            ${product.extraInfos.brand ? `<tr><td><strong>Marque</strong></td><td>${product.extraInfos.brand}</td></tr>` : ''}
                            ${product.extraInfos.volume ? `<tr><td><strong>Volume/Poids</strong></td><td>${product.extraInfos.volume}</td></tr>` : ''}
                            ${product.extraInfos.format ? `<tr><td><strong>Format/Taille</strong></td><td>${product.extraInfos.format}</td></tr>` : ''}
                            ${product.extraInfos.origin ? `<tr><td><strong>Origine</strong></td><td>${product.extraInfos.origin}</td></tr>` : ''}
                            ${product.extraInfos.color ? `<tr><td><strong>Couleur/Variante</strong></td><td>${product.extraInfos.color}</td></tr>` : ''}
                        </table>
                    </div>
                    </div>
                ` : ''}
            </div>
            <div class="product-detail-info">
                <p class="product-category">${product.category}</p>
                <h1>${product.name}</h1>
                ${hasDiscount ? `
                    <p class="product-detail-price-original">${product.price.toLocaleString()} FCFA</p>
                    <p class="product-detail-price">${Math.round(discountedPrice).toLocaleString()} FCFA</p>
                    <p style="color: var(--danger-color); font-weight: 600; margin-top: 0.5rem;">Économisez ${(product.price - Math.round(discountedPrice)).toLocaleString()} FCFA !</p>
                ` : `
                    <p class="product-detail-price">${product.price.toLocaleString()} FCFA</p>
                `}
                <p class="product-stock ${product.stock === 0 ? 'out-of-stock' : ''}">
                    ${product.stock > 0 ? `En stock (${product.stock} disponible(s))` : 'Rupture de stock'}
                </p>
                <p style="margin: 1.5rem 0; line-height: 1.8;">${product.description}</p>
                
                <div class="quantity-selector">
                    <button onclick="decreaseQuantity()">-</button>
                    <input type="number" id="quantity" value="1" min="1" max="${product.stock}" readonly>
                    <button onclick="increaseQuantity(${product.stock})">+</button>
                </div>
                
                <button class="btn-primary btn-full" id="addToCartBtn"
                        data-id="${productId}" 
                        data-name="${product.name}" 
                        data-price="${hasDiscount ? Math.round(discountedPrice) : product.price}" 
                        data-image="${product.image}" 
                        data-stock="${product.stock}" 
                        data-original-price="${product.price}" 
                        data-discount="${discount}"
                        ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock > 0 ? 'Ajouter au panier' : 'Produit indisponible'}
                </button>
                
                <a href="products.html?category=${product.category}" class="btn-secondary btn-full" style="margin-top: 1rem; text-align: center;">
                    Voir plus de ${product.category}
                </a>
            </div>
        </div>
    `;
    
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn && !addToCartBtn.disabled) {
        addToCartBtn.addEventListener('click', function() {
            addToCartFromDetail(
                this.dataset.id,
                this.dataset.name,
                parseFloat(this.dataset.price),
                this.dataset.image,
                parseInt(this.dataset.stock),
                parseFloat(this.dataset.originalPrice),
                parseFloat(this.dataset.discount)
            );
        });
    }

    const favoriteBtn = document.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async () => {
            if (!currentUser) {
                showToast('Connectez-vous pour ajouter aux favoris', 'warning');
                window.location.href = 'auth.html';
                return;
            }
            await toggleFavorite(productId, product.name);
        });
    }
}

window.toggleInfosSection = function(event) {
    event.preventDefault();
    const button = event.target.closest('.collapsible-header');
    const content = button.nextElementSibling;
    
    button.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
};

window.changeMainImage = function(thumbnail, event) {
    event.stopPropagation();
    const mainImage = document.getElementById('mainProductImage');
    mainImage.src = thumbnail.src;
    
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.style.border = '2px solid #E2E8F0';
    });
    thumbnail.style.border = '2px solid #1E40AF';
};

window.decreaseQuantity = function() {
    const quantityInput = document.getElementById('quantity');
    if (parseInt(quantityInput.value) > 1) {
        quantityInput.value = parseInt(quantityInput.value) - 1;
    }
};

window.increaseQuantity = function(max) {
    const quantityInput = document.getElementById('quantity');
    if (parseInt(quantityInput.value) < max) {
        quantityInput.value = parseInt(quantityInput.value) + 1;
    }
};

async function loadUserFavorites() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}/favorites`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            userFavorites = snapshot.val();
        }
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
    }
}

async function toggleFavorite(productId, productName) {
    try {
        if (!currentUser) return;
        
        const isFavorite = userFavorites[productId];
        const favoritesRef = ref(database, `users/${currentUser.uid}/favorites/${productId}`);
        
        if (isFavorite) {
            await set(favoritesRef, null);
            delete userFavorites[productId];
            showToast('Retiré des favoris', 'info');
        } else {
            await set(favoritesRef, { name: productName });
            userFavorites[productId] = { name: productName };
            showToast('Ajouté aux favoris', 'success');
        }
        
        displayProduct(JSON.parse(localStorage.getItem(`product_${productId}`) || '{}'));
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de la mise à jour des favoris', 'error');
    }
}

loadProduct();
