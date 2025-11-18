import { database } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = 'products.html';
}

async function loadProduct() {
    try {
        const productRef = ref(database, `products/${productId}`);
        const snapshot = await get(productRef);
        
        if (snapshot.exists()) {
            const product = snapshot.val();
            displayProduct(product);
        } else {
            document.getElementById('productContent').innerHTML = '<p>Produit non trouvé.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du produit:', error);
        document.getElementById('productContent').innerHTML = '<p>Erreur lors du chargement du produit.</p>';
    }
}

function displayProduct(product) {
    const content = document.getElementById('productContent');
    const discount = product.discount || 0;
    const hasDiscount = discount > 0;
    const discountedPrice = hasDiscount ? product.price * (1 - discount / 100) : product.price;
    
    content.innerHTML = `
        <div class="product-detail-layout">
            <div class="product-detail-image">
                ${hasDiscount ? `<span class="product-badge promo" style="font-size: 1.2rem; padding: 0.6rem 1.2rem;">-${discount}%</span>` : ''}
                <img src="${product.image}" alt="${product.name}">
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
                
                <button class="btn-primary btn-full" onclick="addToCartFromDetail('${productId}', '${product.name}', ${hasDiscount ? Math.round(discountedPrice) : product.price}, '${product.image}', ${product.stock})" ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock > 0 ? 'Ajouter au panier' : 'Produit indisponible'}
                </button>
                
                <a href="products.html?category=${product.category}" class="btn-secondary btn-full" style="margin-top: 1rem; text-align: center;">
                    Voir plus de ${product.category}
                </a>
            </div>
        </div>
    `;
}

window.increaseQuantity = function(max) {
    const input = document.getElementById('quantity');
    if (parseInt(input.value) < max) {
        input.value = parseInt(input.value) + 1;
    }
};

window.decreaseQuantity = function() {
    const input = document.getElementById('quantity');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
};

window.addToCartFromDetail = function(id, name, price, image, stock) {
    if (stock === 0) return;

    const quantity = parseInt(document.getElementById('quantity').value);
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= stock) {
            existingItem.quantity = newQuantity;
        } else {
            alert('Stock insuffisant');
            return;
        }
    } else {
        cart.push({ id, name, price, image, quantity, stock });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCount();
    
    alert(`${quantity} produit(s) ajouté(s) au panier !`);
    document.getElementById('quantity').value = 1;
};

loadProduct();
