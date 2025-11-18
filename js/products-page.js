import { database } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

let allProducts = [];
let filteredProducts = [];

const productsGrid = document.getElementById('productsGrid');
const productsCount = document.getElementById('productsCount');
const categoryFilters = document.querySelectorAll('.category-filter');
const priceFilters = document.querySelectorAll('.price-filter');
const filterSearch = document.getElementById('filterSearch');
const clearFilters = document.getElementById('clearFilters');

async function loadProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            allProducts = [];
            snapshot.forEach((child) => {
                allProducts.push({ id: child.key, ...child.val() });
            });

            const urlParams = new URLSearchParams(window.location.search);
            const category = urlParams.get('category');
            const search = urlParams.get('search');

            if (category) {
                document.querySelector(`input[value="${category}"]`)?.click();
            }

            if (search) {
                filterSearch.value = search;
            }

            applyFilters();
        } else {
            productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; text-align: center;">
                    <p style="color: #92400E;">⚠️ Aucun produit disponible. Veuillez initialiser la base de données via <a href="init.html" style="color: #1E40AF; text-decoration: underline;">init.html</a></p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        if (error.code === 'PERMISSION_DENIED') {
            productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;">⚠️ Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
        } else {
            productsGrid.innerHTML = '<p>Erreur lors du chargement des produits.</p>';
        }
    }
}

function applyFilters() {
    filteredProducts = allProducts;

    const selectedCategories = Array.from(categoryFilters)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedCategories.length > 0) {
        const hasPromotions = selectedCategories.includes('Promotions');
        const otherCategories = selectedCategories.filter(c => c !== 'Promotions');
        
        filteredProducts = filteredProducts.filter(p => {
            const matchesCategory = otherCategories.length === 0 || otherCategories.includes(p.category);
            const matchesPromotion = !hasPromotions || (p.discount && p.discount > 0);
            
            if (hasPromotions && otherCategories.length > 0) {
                return matchesCategory && matchesPromotion;
            } else if (hasPromotions) {
                return matchesPromotion;
            } else {
                return matchesCategory;
            }
        });
    }

    const selectedPrice = document.querySelector('.price-filter:checked')?.value;
    if (selectedPrice && selectedPrice !== 'all') {
        filteredProducts = filteredProducts.filter(p => {
            if (selectedPrice === '0-5000') return p.price < 5000;
            if (selectedPrice === '5000-10000') return p.price >= 5000 && p.price < 10000;
            if (selectedPrice === '10000-20000') return p.price >= 10000 && p.price < 20000;
            if (selectedPrice === '20000-50000') return p.price >= 20000 && p.price < 50000;
            if (selectedPrice === '50000+') return p.price >= 50000;
            return true;
        });
    }

    const searchQuery = filterSearch.value.toLowerCase().trim();
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchQuery) ||
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }

    displayProducts();
}

function displayProducts() {
    productsCount.textContent = `${filteredProducts.length} produit(s) trouvé(s)`;

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p>Aucun produit ne correspond à vos critères.</p>';
        return;
    }

    productsGrid.innerHTML = filteredProducts.map(product => {
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

categoryFilters.forEach(filter => filter.addEventListener('change', applyFilters));
priceFilters.forEach(filter => filter.addEventListener('change', applyFilters));
filterSearch.addEventListener('input', applyFilters);

clearFilters.addEventListener('click', () => {
    categoryFilters.forEach(cb => cb.checked = false);
    document.querySelector('.price-filter[value="all"]').checked = true;
    filterSearch.value = '';
    applyFilters();
});

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
