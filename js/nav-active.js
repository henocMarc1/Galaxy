// Gérer l'indicateur actif sur la navigation mobile
function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Mapper les pages aux icônes
    const pageMap = {
        '': 'home',
        'index.html': 'home',
        'cart.html': 'shopping_cart',
        'products.html': 'shopping_bags',
        'profile.html': 'person',
        'auth.html': 'login'
    };
    
    const navItems = document.querySelectorAll('.nav-link-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        const icon = item.querySelector('.material-icons');
        if (icon) {
            const iconText = icon.textContent.trim();
            if (pageMap[currentPage] && pageMap[currentPage] === iconText) {
                item.classList.add('active');
            }
        }
    });
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', updateActiveNavLink);

// Réinitialiser lors de la navigation (utile si SPA)
window.addEventListener('popstate', updateActiveNavLink);
