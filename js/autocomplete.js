// Autocomplete Search Feature
import { database } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

let allProducts = [];

async function initAutocomplete() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        if (snapshot.exists()) {
            allProducts = [];
            snapshot.forEach(child => {
                allProducts.push({ dbId: child.key, ...child.val() });
            });
        }
    } catch (error) {
        console.error('Erreur chargement produits:', error);
    }
}

window.setupSearchAutocomplete = function(searchInputId, autocompleteContainerId) {
    const searchInput = document.getElementById(searchInputId);
    const autocompleteContainer = document.getElementById(autocompleteContainerId);

    if (!searchInput || !autocompleteContainer) return;

    initAutocomplete();

    searchInput.addEventListener('input', function(e) {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            autocompleteContainer.classList.remove('active');
            return;
        }

        const results = allProducts.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        ).slice(0, 3);

        if (results.length === 0) {
            autocompleteContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #94A3B8;">Aucun produit trouvé</div>';
            autocompleteContainer.classList.add('active');
            return;
        }

        autocompleteContainer.innerHTML = results.map(product => `
            <div class="search-autocomplete-item" onclick="window.location.href='product-detail.html?id=${product.dbId}'">
                <img src="${Array.isArray(product.images) ? product.images[0] : product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/40x40?text=${encodeURIComponent(product.name)}'">
                <div class="search-autocomplete-item-text">
                    <div class="search-autocomplete-item-name">${product.name}</div>
                    <div class="search-autocomplete-item-price">${Math.round(product.price * (1 - (product.discount || 0) / 100)).toLocaleString()} FCFA</div>
                </div>
            </div>
        `).join('');
        autocompleteContainer.classList.add('active');
    });

    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
            autocompleteContainer.classList.remove('active');
        }
    });

    searchInput.addEventListener('focus', function() {
        if (this.value.length >= 2) {
            autocompleteContainer.classList.add('active');
        }
    });

    // Handle search button click
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.toLowerCase().trim();
            if (query.length > 0) {
                window.location.href = `products.html?search=${encodeURIComponent(query)}`;
            }
        });

        // Also handle Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = searchInput.value.toLowerCase().trim();
                if (query.length > 0) {
                    window.location.href = `products.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
};
