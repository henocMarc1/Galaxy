console.log("📦 products-page.js: Module loading started...");

import { auth, database } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

console.log("✅ products-page.js: Firebase imports successful");

let allProducts = [];
let filteredProducts = [];
let currentUser = null;
let userFavorites = {};
let currentSort = 'default';
let currentCart = {};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        loadUserFavorites();
        loadCart();
        // Recharger les produits après le chargement du panier
        setTimeout(() => loadProducts(), 500);
    }
});

const productsGrid = document.getElementById('productsGrid');
const productsCount = document.getElementById('productsCount');
const categoryFilters = document.querySelectorAll('.category-filter');
const priceFilters = document.querySelectorAll('.price-filter');
const filterSearch = document.getElementById('filterSearch');
const clearFilters = document.getElementById('clearFilters');
const sortSelect = document.getElementById('sortSelect');

// Price slider
const priceMinSlider = document.getElementById('priceMinSlider');
const priceMaxSlider = document.getElementById('priceMaxSlider');
const priceMin = document.getElementById('priceMin');
const priceMax = document.getElementById('priceMax');

// Breadcrumbs
const breadcrumbs = document.getElementById('breadcrumbs');

// Toggle filters
const toggleFiltersBtn = document.getElementById('toggleFilters');
const filtersSidebar = document.getElementById('filtersSidebar');
const closeFiltersBtn = document.querySelector('.close-filters-btn');

// Quick View Modal
const quickViewModal = document.getElementById('quickViewModal');
const quickViewClose = document.querySelector('.quick-view-close');
const quickViewOverlay = document.querySelector('.quick-view-overlay');

console.log("✅ products-page.js: DOM elements loaded", {
    productsGrid: !!productsGrid,
    toggleFiltersBtn: !!toggleFiltersBtn,
    filtersSidebar: !!filtersSidebar
});

if (window.innerWidth <= 768 && toggleFiltersBtn && filtersSidebar) {
    toggleFiltersBtn.style.display = 'inline-flex';
    filtersSidebar.classList.add('hidden');
}

function toggleFilters() {
    if (filtersSidebar) {
        filtersSidebar.classList.toggle('hidden');
    }
}

toggleFiltersBtn?.addEventListener('click', toggleFilters);
closeFiltersBtn?.addEventListener('click', toggleFilters);

document.querySelectorAll('.filter-group label, .filter-group input[type="text"], #clearFilters')
    .forEach(element => {
        element.addEventListener('click', () => {
            if (window.innerWidth <= 768 && filtersSidebar) {
                filtersSidebar.classList.add('hidden');
            }
        });
    });

// Price slider sync
if (priceMinSlider) {
    priceMinSlider.addEventListener('input', () => {
        if (parseInt(priceMinSlider.value) > parseInt(priceMaxSlider.value)) {
            priceMinSlider.value = priceMaxSlider.value;
        }
        if (priceMin) priceMin.value = priceMinSlider.value;
        applyFilters();
    });
}

if (priceMaxSlider) {
    priceMaxSlider.addEventListener('input', () => {
        if (parseInt(priceMaxSlider.value) < parseInt(priceMinSlider.value)) {
            priceMaxSlider.value = priceMinSlider.value;
        }
        if (priceMax) priceMax.value = priceMaxSlider.value;
        applyFilters();
    });
}

if (priceMin) {
    priceMin.addEventListener('input', () => {
        if (priceMinSlider) priceMinSlider.value = priceMin.value;
        applyFilters();
    });
}

if (priceMax) {
    priceMax.addEventListener('input', () => {
        if (priceMaxSlider) priceMaxSlider.value = priceMax.value;
        applyFilters();
    });
}

// Sort listener
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
    });
}

// Quick View Modal Controls
if (quickViewClose) {
    quickViewClose.addEventListener('click', closeQuickView);
}
if (quickViewOverlay) {
    quickViewOverlay.addEventListener('click', closeQuickView);
}

function closeQuickView() {
    if (quickViewModal) {
        quickViewModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function openQuickView(productId) {
    const product = allProducts.find(p => p.dbId === productId);
    if (!product) return;

    const discount = product.discount || 0;
    const hasDiscount = discount > 0;
    const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
    const images = Array.isArray(product.images) ? product.images : [product.image];

    // Populate modal
    document.getElementById('quickViewCategory').textContent = product.category;
    document.getElementById('quickViewName').textContent = product.name;
    document.getElementById('quickViewDescription').textContent = product.description || '';
    document.getElementById('quickViewPrice').textContent = `${Math.round(discountedPrice).toLocaleString()} FCFA`;
    
    const originalPriceEl = document.getElementById('quickViewOriginalPrice');
    if (hasDiscount) {
        originalPriceEl.textContent = `${product.price.toLocaleString()} FCFA`;
    } else {
        originalPriceEl.textContent = '';
    }

    // Rating
    const rating = product.rating || 0;
    const ratingEl = document.getElementById('quickViewRating');
    ratingEl.innerHTML = rating > 0 ? `
        ${Array(5).fill(0).map((_, i) => `<span class="material-icons" style="color: ${i < Math.floor(rating) ? '#FDB022' : '#CBD5E1'}; font-size: 18px;">star</span>`).join('')}
        <span>(${rating.toFixed(1)})</span>
    ` : '<span style="color: #64748B;">Pas encore noté</span>';

    // Images
    document.getElementById('quickViewMainImage').src = images[0] || 'https://via.placeholder.com/400x300/E2E8F0/64748B?text=Image';
    document.getElementById('quickViewMainImage').onerror = function() {
        this.src = 'https://via.placeholder.com/400x300/E2E8F0/64748B?text=Image+non+disponible';
    };

    // Thumbnails
    const thumbnailsContainer = document.getElementById('quickViewThumbnails');
    thumbnailsContainer.innerHTML = images.map((img, idx) => `
        <div class="quick-view-thumbnail" onclick="document.getElementById('quickViewMainImage').src='${img}'">
            <img src="${img}" alt="Thumbnail ${idx + 1}" onerror="this.src='https://via.placeholder.com/60/E2E8F0/64748B?text=Img'">
        </div>
    `).join('');

    // Quantity
    document.getElementById('quickViewQty').value = 1;

    // Buttons
    document.getElementById('quickViewQtyDecrement').onclick = () => {
        const qtyInput = document.getElementById('quickViewQty');
        const val = parseInt(qtyInput.value) - 1;
        if (val >= 1) qtyInput.value = val;
    };

    document.getElementById('quickViewQtyIncrement').onclick = () => {
        const qtyInput = document.getElementById('quickViewQty');
        qtyInput.value = parseInt(qtyInput.value) + 1;
    };

    document.getElementById('quickViewAddCart').onclick = async () => {
        await addToCartFromQuickView(product);
    };

    document.getElementById('quickViewViewFull').onclick = () => {
        window.location.href = `product-detail.html?id=${productId}`;
    };

    // Show modal
    quickViewModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function addToCartFromQuickView(product) {
    if (!currentUser) {
        showToast('Connectez-vous pour ajouter au panier', 'warning');
        window.location.href = 'auth.html';
        return;
    }

    const qty = parseInt(document.getElementById('quickViewQty').value) || 1;
    
    try {
        const cartRef = ref(database, `users/${currentUser.uid}/cart/${product.dbId}`);
        const currentItem = currentCart[product.dbId] || {};
        const newQuantity = (currentItem.quantity || 0) + qty;

        await set(cartRef, {
            id: product.dbId,
            name: product.name,
            price: product.price,
            discount: product.discount || 0,
            image: Array.isArray(product.images) ? product.images[0] : product.image,
            quantity: newQuantity
        });

        currentCart[product.dbId] = { quantity: newQuantity };
        updateCartCount();
        closeQuickView();
        showToast(`${qty} ${product.name} ajouté au panier`, 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de l\'ajout au panier', 'error');
    }
}

async function loadCart() {
    try {
        if (!currentUser) return;
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        if (snapshot.exists()) {
            currentCart = snapshot.val();
            updateCartCount();
        } else {
            currentCart = {};
        }
    } catch (error) {
        console.error('Erreur chargement panier:', error);
    }
}

function updateCartCount() {
    if (window.updateCartCount) {
        window.updateCartCount();
    }
}

async function loadProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            allProducts = [];
            snapshot.forEach((child) => {
                allProducts.push({ dbId: child.key, ...child.val() });
            });

            const urlParams = new URLSearchParams(window.location.search);
            const category = urlParams.get('category');
            const search = urlParams.get('search');

            if (category) {
                document.querySelector(`input[value="${category}"]`)?.click();
                updateBreadcrumbs(category);
            }

            if (search) {
                filterSearch.value = search;
                updateBreadcrumbs(`Résultats pour: ${search}`);
            }

            applyFilters();
        } else {
            productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; text-align: center;">
                    <p style="color: #92400E;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Aucun produit disponible.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function updateBreadcrumbs(category) {
    if (category) {
        breadcrumbs.innerHTML = `
            <a href="index.html">Accueil</a>
            <span class="separator">/</span>
            <a href="products.html">Produits</a>
            <span class="separator">/</span>
            <span>${category}</span>
        `;
    }
}

function sortProducts(products) {
    const sorted = [...products];
    
    switch(currentSort) {
        case 'price-asc':
            return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        case 'price-desc':
            return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        case 'newest':
            return sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        case 'rating':
            return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'promo':
            return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        default:
            return sorted;
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

    // Price range filter
    const minPrice = priceMin ? parseInt(priceMin.value) || 0 : 0;
    const maxPrice = priceMax ? parseInt(priceMax.value) || 100000 : 100000;
    filteredProducts = filteredProducts.filter(p => {
        const price = p.price || 0;
        return price >= minPrice && price <= maxPrice;
    });

    // Search filter
    const searchTerm = filterSearch ? (filterSearch.value || '').toLowerCase() : '';
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.description && p.description.toLowerCase().includes(searchTerm)) ||
            (p.category && p.category.toLowerCase().includes(searchTerm))
        );
    }

    // Apply sorting
    filteredProducts = sortProducts(filteredProducts);

    displayProducts(filteredProducts);
}

function displayProducts(products) {
    if (products.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748B;">Aucun produit trouvé.</p>';
        productsCount.textContent = '0 produit';
        return;
    }

    productsCount.textContent = `${products.length} produit${products.length > 1 ? 's' : ''}`;

    productsGrid.innerHTML = products.map(product => {
        const discount = product.discount || 0;
        const hasDiscount = discount > 0;
        const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
        const isFavorite = userFavorites[product.dbId] || false;
        
        return `
        <div class="product-card">
            <button class="favorite-btn-card" data-product-id="${product.dbId}" data-product-name="${product.name}" style="background: ${isFavorite ? '#EF4444' : '#E2E8F0'}; border: none; border-radius: 50%; width: 44px; height: 44px; position: absolute; top: 10px; right: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: all 0.08s;">
                <span class="material-icons" style="color: ${isFavorite ? '#FFFFFF' : '#64748B'}; font-size: 24px;">${isFavorite ? 'favorite' : 'favorite_border'}</span>
            </button>
            <button class="quick-view-btn-card" data-product-id="${product.dbId}" style="background: #E2E8F0; border: none; border-radius: 50%; width: 44px; height: 44px; position: absolute; top: 60px; right: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: all 0.08s;">
                <span class="material-icons" style="color: #64748B; font-size: 24px;">visibility</span>
            </button>
            ${product.isNew ? '<span class="product-badge new"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">star</span> Nouveau</span>' : ''}
            ${product.featured ? '<span class="product-badge featured"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">trending_up</span> Populaire</span>' : ''}
            ${hasDiscount ? `<span class="product-badge promo"><span class="material-icons" style="font-size: 14px; vertical-align: middle;">local_offer</span> -${discount}%</span>` : ''}
            <a href="product-detail.html?id=${product.dbId}">
                <img src="${Array.isArray(product.images) ? product.images[0] : product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x220/E2E8F0/64748B?text=Image+non+disponible'">
                <div class="product-info">
                    <p class="product-category">${product.category}</p>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price-container">
                        ${hasDiscount ? `
                            <span class="product-price-original">${product.price.toLocaleString()} FCFA</span>
                            <span class="product-price">${Math.round(discountedPrice).toLocaleString()} FCFA</span>
                        ` : `
                            <span class="product-price">${product.price.toLocaleString()} FCFA</span>
                        `}
                    </div>
                </div>
            </a>
            ${currentCart[product.dbId] ? `
                <div style="width: 100%; padding: 12px; background: #F0F9FF; border: 2px solid #1E40AF; border-radius: 8px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <button onclick="updateProductQuantity('${product.dbId}', -1)" style="background: #EF4444; color: #FFFFFF; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-weight: 600;">-</button>
                    <span style="font-weight: 600; color: #1E40AF; min-width: 30px; text-align: center;">${currentCart[product.dbId].quantity || 1}</span>
                    <button onclick="updateProductQuantity('${product.dbId}', 1)" style="background: #10B981; color: #FFFFFF; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-weight: 600;">+</button>
                </div>
            ` : `
                <button class="add-to-cart-btn-card" data-product-id="${product.dbId}" data-product-name="${product.name}" data-product-price="${Math.round(discountedPrice)}" data-product-image="${Array.isArray(product.images) ? product.images[0] : product.image}" style="width: 100%; padding: 12px; background: #1E40AF; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s;">
                    <span class="material-icons" style="font-size: 20px;">shopping_cart</span>
                    <span>Ajouter au panier</span>
                </button>
            `}
        </div>
        `;
    }).join('');
    
    // Favorite buttons
    document.querySelectorAll('.favorite-btn-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!currentUser) {
                showToast('Connectez-vous pour ajouter aux favoris', 'warning');
                window.location.href = 'auth.html';
                return;
            }
            
            const productId = btn.dataset.productId;
            const productName = btn.dataset.productName;
            await toggleFavorite(productId, productName, btn);
        });
    });

    // Quick View buttons
    document.querySelectorAll('.quick-view-btn-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openQuickView(btn.dataset.productId);
        });
    });

    // Mettre à jour quantité depuis la carte produit
    window.updateProductQuantity = async function(productId, change) {
        try {
            if (!currentUser) {
                showToast('Connectez-vous', 'warning');
                window.location.href = 'auth.html';
                return;
            }
            const product = allProducts.find(p => p.dbId === productId);
            if (!product) return;

            const currentQty = (currentCart[productId]?.quantity || 0) + change;
            
            const cartRef = ref(database, `users/${currentUser.uid}/cart/${productId}`);
            
            if (currentQty < 1) {
                // Supprimer du panier quand quantité atteint 0
                await set(cartRef, null);
                delete currentCart[productId];
                showToast(`${product.name} retiré du panier`, 'info');
            } else {
                // Mettre à jour la quantité
                await set(cartRef, {
                    id: productId,
                    name: product.name,
                    price: Math.round(product.price * (1 - (product.discount || 0) / 100)),
                    image: Array.isArray(product.images) ? product.images[0] : product.image,
                    quantity: currentQty,
                    discount: product.discount || 0
                });
                currentCart[productId] = { quantity: currentQty };
            }

            updateCartCount();
            displayProducts(filteredProducts);
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    // Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!currentUser) {
                showToast('Connectez-vous pour ajouter au panier', 'warning');
                window.location.href = 'auth.html';
                return;
            }

            const productId = btn.dataset.productId;
            const productName = btn.dataset.productName;
            const productPrice = parseFloat(btn.dataset.productPrice);
            const productImage = btn.dataset.productImage;

            try {
                const cartRef = ref(database, `users/${currentUser.uid}/cart/${productId}`);
                const currentItem = currentCart[productId] || {};
                const newQuantity = (currentItem.quantity || 0) + 1;

                await set(cartRef, {
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage,
                    quantity: newQuantity
                });

                currentCart[productId] = { quantity: newQuantity };
                btn.style.background = '#10B981';
                btn.innerHTML = '<span class="material-icons" style="font-size: 20px;">check</span> <span>Ajouté!</span>';
                
                setTimeout(() => {
                    btn.style.background = '#1E40AF';
                    btn.innerHTML = '<span class="material-icons" style="font-size: 20px;">shopping_cart</span> <span>Ajouter au panier</span>';
                }, 2000);

                showToast(`${productName} ajouté au panier!`, 'success');
                updateCartCount();
            } catch (error) {
                console.error('Erreur ajout panier:', error);
                showToast('Erreur lors de l\'ajout au panier', 'error');
            }
        });
    });
}

async function loadUserFavorites() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}/favorites`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            userFavorites = snapshot.val();
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function toggleFavorite(productId, productName, button) {
    try {
        if (!currentUser) return;
        
        const isFavorite = userFavorites[productId];
        const favRef = ref(database, `users/${currentUser.uid}/favorites/${productId}`);
        
        if (isFavorite) {
            await set(favRef, null);
            delete userFavorites[productId];
            button.style.background = '#E2E8F0';
            button.querySelector('.material-icons').style.color = '#64748B';
            button.querySelector('.material-icons').textContent = 'favorite_border';
            showToast('Retiré des favoris', 'info');
        } else {
            await set(favRef, { name: productName });
            userFavorites[productId] = { name: productName };
            button.style.background = '#EF4444';
            button.querySelector('.material-icons').style.color = '#FFFFFF';
            button.querySelector('.material-icons').textContent = 'favorite';
            showToast('Ajouté aux favoris', 'success');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

categoryFilters.forEach(filter => filter.addEventListener('change', applyFilters));
priceFilters.forEach(filter => filter.addEventListener('change', applyFilters));
if (filterSearch) filterSearch.addEventListener("input", applyFilters);
if (clearFilters) {
    clearFilters.addEventListener('click', () => {
        categoryFilters.forEach(cb => cb.checked = false);
        priceFilters.forEach(rb => rb.checked = rb.value === 'all');
        if (filterSearch) filterSearch.value = '';
        if (priceMin) priceMin.value = 0;
        if (priceMax) priceMax.value = 100000;
        if (priceMinSlider) priceMinSlider.value = 0;
        if (priceMaxSlider) priceMaxSlider.value = 100000;
        if (sortSelect) sortSelect.value = 'default';
        currentSort = 'default';
        applyFilters();
    });
}

// Initialize products when page is ready
async function initializeProductsPage() {
    console.log("✅ products-page.js: Initializing...");
    
    try {
        await loadProducts();
        updateCartCount();
        console.log("✅ products-page.js: Products loaded successfully!");
    } catch (error) {
        console.error("❌ products-page.js: Error loading products:", error);
        setTimeout(initializeProductsPage, 1000);
    }
}

// Run immediately or wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProductsPage);
} else {
    // DOM already loaded
    initializeProductsPage();
}
