import { auth, database } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let currentUser = null;
let userFavorites = {};
let currentCart = {};
let allProducts = [];

// Fonction globale pour mettre à jour le compteur du panier - compte le nombre de produits différents
window.updateCartCount = async function() {
    try {
        if (!currentUser) {
            document.querySelectorAll('.cart-count').forEach(el => el.textContent = '0');
            return;
        }
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        const cartData = snapshot.exists() ? snapshot.val() : {};
        const count = Object.keys(cartData).length;
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
    } catch (error) {
        console.error('Erreur mise à jour compteur:', error);
    }
};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        loadUserFavorites();
        loadCart();
    }
});

async function loadCart() {
    try {
        if (!currentUser) return;
        const cartRef = ref(database, `users/${currentUser.uid}/cart`);
        const snapshot = await get(cartRef);
        if (snapshot.exists()) {
            currentCart = snapshot.val();
            window.updateCartCount();
        }
    } catch (error) {
        console.error('Erreur chargement panier:', error);
    }
}

async function loadUserFavorites() {
    if (!currentUser) return;
    try {
        const favRef = ref(database, `users/${currentUser.uid}/favorites`);
        const snapshot = await get(favRef);
        userFavorites = snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
    }
}

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

let heroProducts = [];
let currentHeroIndex = 0;
let heroRotationInterval = null;

function updateHeroProduct() {
    if (heroProducts.length === 0) return;
    
    const product = heroProducts[currentHeroIndex];
    const discount = product.discount || 0;
    const hasDiscount = discount > 0;
    const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
    
    const heroContainer = document.getElementById('heroProductContainer');
    const priceBadge = document.getElementById('heroPriceBadge');
    
    heroContainer.innerHTML = `
        <a href="product-detail.html?id=${product.dbId}" style="display: block; position: relative;">
            ${hasDiscount ? `<span class="hero-discount-badge">-${discount}%</span>` : ''}
            <img src="${Array.isArray(product.images) ? product.images[0] : product.image}" 
                 alt="${product.name}" 
                 id="heroProductImage" 
                 style="max-width: 350px; cursor: pointer;"
                 onerror="this.src='https://via.placeholder.com/350x350/E2E8F0/64748B?text=${encodeURIComponent(product.name)}'">
        </a>
    `;
    
    priceBadge.innerHTML = `
        <div class="label">Details</div>
        ${hasDiscount ? `
            <div class="price-original" style="text-decoration: line-through; color: #94A3B8; font-size: 0.9rem;">${product.price.toLocaleString()} FCFA</div>
            <div class="price">${Math.round(discountedPrice).toLocaleString()} FCFA</div>
            <div class="savings" style="color: #10B981; font-size: 0.85rem; font-weight: 600;">Économie: ${Math.round(product.price - discountedPrice).toLocaleString()} FCFA</div>
        ` : `
            <div class="price">${product.price.toLocaleString()} FCFA</div>
        `}
        <div class="product-name-hero" style="font-size: 0.9rem; margin-top: 0.5rem;">${product.name}</div>
        <div class="stars">
            <span class="material-icons">star</span><span class="material-icons">star</span><span class="material-icons">star</span><span class="material-icons">star</span><span class="material-icons">star</span>
        </div>
    `;
    
    currentHeroIndex = (currentHeroIndex + 1) % heroProducts.length;
}

function startHeroRotation() {
    if (heroProducts.length > 0) {
        updateHeroProduct();
        if (heroRotationInterval) {
            clearInterval(heroRotationInterval);
        }
        heroRotationInterval = setInterval(updateHeroProduct, 5000);
    }
}

// Get top products based on actual sales data
async function getTopProductsByActualSales(products) {
    try {
        const ordersRef = ref(database, 'orders');
        const ordersSnapshot = await get(ordersRef);
        
        const salesCount = {};
        
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach((orderChild) => {
                const order = orderChild.val();
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const productId = item.id;
                        salesCount[productId] = (salesCount[productId] || 0) + (item.quantity || 1);
                    });
                }
            });
        }
        
        const sortedProducts = products
            .filter(p => p.stock > 0)
            .sort((a, b) => {
                const salesDiff = (salesCount[b.id] || 0) - (salesCount[a.id] || 0);
                if (salesDiff !== 0) return salesDiff;
                
                const aScore = (a.featured ? 2 : 0) + (a.isNew ? 1 : 0);
                const bScore = (b.featured ? 2 : 0) + (b.isNew ? 1 : 0);
                return bScore - aScore;
            })
            .slice(0, 8);
        
        return sortedProducts;
    } catch (error) {
        console.error('Erreur lors du calcul des ventes:', error);
        return products.filter(p => (p.featured || p.isNew) && p.stock > 0).slice(0, 8);
    }
}

function getFavoriteKey(product) {
    return product.dbId || product.id;
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

            const promoProducts = allProducts.filter(p => p.discount > 0 && p.stock > 0);
            const otherProducts = allProducts.filter(p => (!p.discount || p.discount === 0) && p.stock > 0 && (p.featured || p.isNew));
            
            heroProducts = [...promoProducts, ...otherProducts].slice(0, 6);
            
            if (heroProducts.length > 0) {
                startHeroRotation();
            }

            // AFFICHER RAPIDO les produits featured/isNew SANS ATTENDRE les ventes
            const fastTrendingProducts = allProducts.filter(p => (p.featured || p.isNew) && p.stock > 0).slice(0, 8);
            displayProducts('bestSellers', fastTrendingProducts);

            // Charger les ventes en arrière-plan (sans bloquer)
            getTopProductsByActualSales(allProducts).then(trendingProducts => {
                if (trendingProducts.length > 0) {
                    displayProducts('bestSellers', trendingProducts);
                }
            });
        } else {
            const emptyMessage = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; text-align: center;">
                    <p style="color: #92400E;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Aucun produit disponible. Veuillez initialiser la base de données via <a href="init.html" style="color: #1E40AF; text-decoration: underline;">init.html</a></p>
                </div>
            `;
            document.getElementById('bestSellers').innerHTML = emptyMessage;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        if (error.code === 'PERMISSION_DENIED') {
            const errorMessage = `
                <div style="grid-column: 1/-1; padding: 2rem; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #1E40AF;">
                    <h3 style="color: #92400E; margin-bottom: 1rem;"><span class="material-icons" style="color: #F59E0B; vertical-align: middle;">warning</span> Configuration Firebase requise</h3>
                    <p style="color: #78350F;">Les règles de sécurité Firebase ne sont pas encore configurées.</p>
                    <p style="color: #78350F; margin-top: 0.5rem;">Veuillez suivre le guide : <a href="CONFIGURATION_FIREBASE.md" style="color: #1E40AF; text-decoration: underline;">CONFIGURATION_FIREBASE.md</a></p>
                </div>
            `;
            document.getElementById('bestSellers').innerHTML = errorMessage;
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
        const isFavorite = userFavorites[product.dbId] || false;
        
        return `
        <div class="product-card">
            <button class="favorite-btn-card" data-product-id="${product.dbId}" data-product-name="${product.name}" style="background: ${isFavorite ? '#EF4444' : '#E2E8F0'}; border: none; border-radius: 50%; width: 44px; height: 44px; position: absolute; top: 10px; right: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: all 0.3s;">
                <span class="material-icons" style="color: ${isFavorite ? '#FFFFFF' : '#64748B'}; font-size: 24px;">${isFavorite ? 'favorite' : 'favorite_border'}</span>
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
                    <button onclick="updateProductQuantityHome('${product.dbId}', -1)" style="background: #EF4444; color: #FFFFFF; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-weight: 600;">-</button>
                    <span style="font-weight: 600; color: #1E40AF; min-width: 30px; text-align: center;">${currentCart[product.dbId].quantity || 1}</span>
                    <button onclick="updateProductQuantityHome('${product.dbId}', 1)" style="background: #10B981; color: #FFFFFF; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-weight: 600;">+</button>
                </div>
            ` : `
                <button class="add-to-cart-btn" data-product-id="${product.dbId}" data-product-name="${product.name}" data-product-price="${Math.round(discountedPrice)}" style="width: 100%; padding: 0.75rem; background: #1E40AF; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.75rem; transition: all 0.3s;">
                    <span class="material-icons" style="font-size: 20px;">shopping_cart</span>
                    Ajouter au panier
                </button>
            `}
        </div>
        `;
    }).join('');
    
    // Mettre à jour quantité depuis la carte produit
    window.updateProductQuantityHome = async function(productId, change) {
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

            window.updateCartCount();
            displayProducts('bestSellers', allProducts.filter(p => (p.featured || p.isNew) && p.stock > 0));
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    // Attach favorite button listeners
    container.querySelectorAll('.favorite-btn-card').forEach(btn => {
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
    
    // Attach add to cart button listeners
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const productId = btn.dataset.productId;
            const productName = btn.dataset.productName;
            const productPrice = parseInt(btn.dataset.productPrice);
            
            await addToCart(productId, productName, productPrice, btn);
        });
    });
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
        showToast('Erreur lors de la mise à jour des favoris', 'error');
    }
}

async function addToCart(productId, productName, productPrice, button) {
    try {
        if (!currentUser) {
            showToast('Connectez-vous pour ajouter au panier', 'warning');
            window.location.href = 'auth.html';
            return;
        }
        
        // Get current cart from Firebase or local variable
        const currentQty = (currentCart[productId]?.quantity || 0) + 1;
        const product = allProducts.find(p => p.dbId === productId);
        if (!product) return;
        
        // Add to Firebase
        const cartRef = ref(database, `users/${currentUser.uid}/cart/${productId}`);
        await set(cartRef, {
            id: productId,
            name: productName,
            price: productPrice,
            image: Array.isArray(product.images) ? product.images[0] : product.image,
            quantity: currentQty,
            discount: product.discount || 0
        });
        
        // Update local cache
        currentCart[productId] = { quantity: currentQty };
        updateCartCount();
        
        // Show success message
        showToast(`${productName} ajouté au panier!`, 'success');
        
        // Refresh display to show quantity controls
        displayProducts('bestSellers', allProducts.filter(p => (p.featured || p.isNew) && p.stock > 0));
        
        // Visual feedback
        button.style.background = '#10B981';
        button.innerHTML = '<span class="material-icons" style="font-size: 20px;">check</span> Ajouté!';
        
        setTimeout(() => {
            button.style.background = '#1E40AF';
            button.innerHTML = '<span class="material-icons" style="font-size: 20px;">shopping_cart</span> Ajouter au panier';
        }, 2000);
        
        showToast(`${productName} ajouté au panier!`, 'success');
        
        // Update cart count if exists
        const cartCountEl = document.querySelector('[data-cart-count]');
        if (cartCountEl) {
            const currentCount = parseInt(cartCountEl.textContent) || 0;
            cartCountEl.textContent = currentCount + 1;
        }
    } catch (error) {
        console.error('Erreur ajout panier:', error);
        showToast('Erreur lors de l\'ajout au panier', 'error');
    }
}

loadProducts();
