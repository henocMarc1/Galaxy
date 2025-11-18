import { database } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

async function loadProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const products = [];
            snapshot.forEach((child) => {
                products.push({ id: child.key, ...child.val() });
            });

            const bestSellers = products.filter(p => p.featured && p.stock > 0).slice(0, 4);
            const newArrivals = products.filter(p => p.isNew && p.stock > 0).slice(0, 4);

            displayProducts('bestSellers', bestSellers);
            displayProducts('newArrivals', newArrivals);
        } else {
            const emptyMessage = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; text-align: center;">
                    <p style="color: #92400E;">⚠️ Aucun produit disponible. Veuillez initialiser la base de données via <a href="init.html" style="color: #1E40AF; text-decoration: underline;">init.html</a></p>
                </div>
            `;
            document.getElementById('bestSellers').innerHTML = emptyMessage;
            document.getElementById('newArrivals').innerHTML = emptyMessage;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        if (error.code === 'PERMISSION_DENIED') {
            const errorMessage = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;">⚠️ Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
            document.getElementById('bestSellers').innerHTML = errorMessage;
            document.getElementById('newArrivals').innerHTML = errorMessage;
        }
    }
}

function displayProducts(containerId, products) {
    const container = document.getElementById(containerId);
    
    if (products.length === 0) {
        container.innerHTML = '<p>Aucun produit disponible pour le moment.</p>';
        return;
    }

    container.innerHTML = products.map(product => {
        const discount = product.discount || 0;
        const hasDiscount = discount > 0;
        const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
        
        return `
        <div class="product-card">
            ${product.isNew ? '<span class="product-badge new">Nouveau</span>' : ''}
            ${product.featured ? '<span class="product-badge featured">Populaire</span>' : ''}
            ${hasDiscount ? `<span class="product-badge promo">-${discount}%</span>` : ''}
            <a href="product-detail.html?id=${product.id}">
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x220/E2E8F0/64748B?text=Image+non+disponible'">
                <div class="product-info">
                    <p class="product-category">${product.category}</p>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price-container">
                        ${hasDiscount ? `
                            <p class="product-price-original">${product.price.toLocaleString()} FCFA</p>
                            <p class="product-price">${Math.round(discountedPrice).toLocaleString()} FCFA</p>
                        ` : `
                            <p class="product-price">${product.price.toLocaleString()} FCFA</p>
                        `}
                    </div>
                    <p class="product-stock ${product.stock === 0 ? 'out-of-stock' : ''}">
                        ${product.stock > 0 ? `En stock (${product.stock})` : 'Rupture de stock'}
                    </p>
                </div>
            </a>
            <button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${product.name}', ${hasDiscount ? Math.round(discountedPrice) : product.price}, '${product.image}', ${product.stock})" ${product.stock === 0 ? 'disabled' : ''}>
                ${product.stock > 0 ? 'Ajouter au panier' : 'Indisponible'}
            </button>
        </div>
        `;
    }).join('');
}

window.addToCart = function(id, name, price, image, stock) {
    if (stock === 0) return;

    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        if (existingItem.quantity < stock) {
            existingItem.quantity++;
        } else {
            alert('Stock insuffisant');
            return;
        }
    } else {
        cart.push({ id, name, price, image, quantity: 1, stock });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCount();
    
    alert('Produit ajouté au panier !');
};

loadProducts();
