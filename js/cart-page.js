const cartContent = document.getElementById('cartContent');

function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-cart">
                <h2>Votre panier est vide</h2>
                <p>Découvrez nos produits et ajoutez-les à votre panier !</p>
                <a href="products.html" class="btn-primary">Voir les produits</a>
            </div>
        `;
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartContent.innerHTML = `
        <div class="cart-layout">
            <div class="cart-items">
                <h2>Articles (${cart.length})</h2>
                ${cart.map((item, index) => `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.name}">
                        </div>
                        <div class="cart-item-info">
                            <h3>${item.name}</h3>
                            <p class="product-price">${item.price.toLocaleString()} FCFA</p>
                            <div class="quantity-selector">
                                <button onclick="updateQuantity(${index}, -1)">-</button>
                                <input type="number" value="${item.quantity}" min="1" max="${item.stock}" readonly>
                                <button onclick="updateQuantity(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="cart-item-actions">
                            <p style="font-weight: 700; font-size: 1.2rem;">${(item.price * item.quantity).toLocaleString()} FCFA</p>
                            <button class="remove-btn" onclick="removeFromCart(${index})">Retirer</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-summary">
                <h2>Résumé</h2>
                <div class="summary-row">
                    <span>Sous-total:</span>
                    <span>${subtotal.toLocaleString()} FCFA</span>
                </div>
                <div class="summary-row">
                    <span>Livraison:</span>
                    <span>Calculé au checkout</span>
                </div>
                <div class="summary-row summary-total">
                    <span>Total:</span>
                    <span>${subtotal.toLocaleString()} FCFA</span>
                </div>
                <a href="checkout.html" class="btn-primary btn-full">Passer la commande</a>
                <a href="products.html" class="btn-secondary btn-full" style="margin-top: 1rem;">Continuer mes achats</a>
            </div>
        </div>
    `;
}

window.updateQuantity = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const newQuantity = cart[index].quantity + change;

    if (newQuantity < 1) return;
    if (newQuantity > cart[index].stock) {
        alert('Stock insuffisant');
        return;
    }

    cart[index].quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCount();
    loadCart();
};

window.removeFromCart = function(index) {
    if (confirm('Voulez-vous vraiment retirer cet article du panier ?')) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.updateCartCount();
        loadCart();
    }
};

loadCart();
