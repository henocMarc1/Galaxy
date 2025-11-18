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
    const originalTotal = cart.reduce((sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 0);
    const totalSavings = originalTotal - subtotal;
    const hasDiscounts = totalSavings > 0;

    cartContent.innerHTML = `
        <div class="cart-layout">
            <div class="cart-items">
                <h2>Articles (${cart.length})</h2>
                ${cart.map((item, index) => {
                    const itemDiscount = item.discount || 0;
                    const itemOriginalPrice = item.originalPrice || item.price;
                    const hasItemDiscount = itemDiscount > 0;
                    const itemSavings = (itemOriginalPrice - item.price) * item.quantity;
                    
                    return `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.name}">
                            ${hasItemDiscount ? `<span class="cart-item-discount-badge">-${itemDiscount}%</span>` : ''}
                        </div>
                        <div class="cart-item-info">
                            <h3>${item.name}</h3>
                            ${hasItemDiscount ? `
                                <p class="product-price-original" style="text-decoration: line-through; color: #94A3B8; font-size: 0.9rem;">${itemOriginalPrice.toLocaleString()} FCFA</p>
                                <p class="product-price">${item.price.toLocaleString()} FCFA <span style="color: #10B981; font-size: 0.85rem; font-weight: 600;">(-${Math.round(itemOriginalPrice - item.price).toLocaleString()} FCFA)</span></p>
                            ` : `
                                <p class="product-price">${item.price.toLocaleString()} FCFA</p>
                            `}
                            <div class="quantity-selector">
                                <button onclick="updateQuantity(${index}, -1)">-</button>
                                <input type="number" value="${item.quantity}" min="1" max="${item.stock}" readonly>
                                <button onclick="updateQuantity(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="cart-item-actions">
                            ${hasItemDiscount ? `
                                <p style="font-weight: 700; font-size: 1.2rem;">${(item.price * item.quantity).toLocaleString()} FCFA</p>
                                <p style="color: #10B981; font-size: 0.9rem; font-weight: 600;">Économie: ${itemSavings.toLocaleString()} FCFA</p>
                            ` : `
                                <p style="font-weight: 700; font-size: 1.2rem;">${(item.price * item.quantity).toLocaleString()} FCFA</p>
                            `}
                            <button class="remove-btn" onclick="removeFromCart(${index})">Retirer</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="cart-summary">
                <h2>Résumé</h2>
                ${hasDiscounts ? `
                    <div class="summary-row">
                        <span>Montant original:</span>
                        <span style="text-decoration: line-through; color: #94A3B8;">${originalTotal.toLocaleString()} FCFA</span>
                    </div>
                    <div class="summary-row" style="color: #10B981; font-weight: 600;">
                        <span>🎉 Économies totales:</span>
                        <span>-${totalSavings.toLocaleString()} FCFA</span>
                    </div>
                ` : ''}
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
