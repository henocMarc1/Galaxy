// Admin Dashboard Statistics ENHANCED
import { database } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

window.loadAdminStats = async function() {
    try {
        // Load orders and analytics
        const ordersRef = ref(database, 'orders');
        const ordersSnapshot = await get(ordersRef);
        let totalRevenue = 0, totalOrders = 0, totalItems = 0;
        const ordersByDate = {};
        const salesCount = {};
        const categoryRevenue = {};
        
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach(child => {
                const order = child.val();
                totalOrders++;
                totalRevenue += order.total || 0;
                if (order.items) {
                    totalItems += order.items.length;
                    order.items.forEach(item => {
                        const productId = item.id;
                        salesCount[productId] = (salesCount[productId] || 0) + (item.quantity || 1);
                        const category = item.category || 'Unknown';
                        categoryRevenue[category] = (categoryRevenue[category] || 0) + ((item.price || 0) * (item.quantity || 1));
                    });
                }
                const date = new Date(order.createdAt).toLocaleDateString('fr-FR');
                ordersByDate[date] = (ordersByDate[date] || 0) + (order.total || 0);
            });
        }
        
        // Load products
        const productsRef = ref(database, 'products');
        const productsSnapshot = await get(productsRef);
        let totalProducts = 0, totalStock = 0;
        const topProducts = [];
        
        if (productsSnapshot.exists()) {
            productsSnapshot.forEach(child => {
                const product = child.val();
                totalProducts++;
                totalStock += product.stock || 0;
                topProducts.push({
                    id: child.key,
                    name: product.name,
                    sales: salesCount[child.key] || 0
                });
            });
        }
        
        topProducts.sort((a, b) => b.sales - a.sales);
        const topProductsList = topProducts.slice(0, 5);
        
        // Load users
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        let totalUsers = 0, totalCustomers = 0;
        
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(child => {
                totalUsers++;
                const user = child.val();
                if (user.role !== 'admin') {
                    totalCustomers++;
                }
            });
        }
        
        // Calculate analytics
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
        const last7Days = Object.values(ordersByDate).slice(-7);
        const avgDailyRevenue = last7Days.length > 0 ? Math.round(last7Days.reduce((a, b) => a + b, 0) / last7Days.length) : 0;
        
        // Render stats
        const statsHTML = `
            <div class="admin-stats-grid">
                <div class="admin-stat-card">
                    <h3><span class="material-icons">show_chart</span> Revenu Total</h3>
                    <div class="admin-stat-value">${totalRevenue.toLocaleString()} F</div>
                    <div class="admin-stat-change" style="color: #10B981;">
                        <span class="material-icons">trending_up</span> ${totalOrders} commandes
                    </div>
                </div>
                <div class="admin-stat-card">
                    <h3><span class="material-icons">shopping_cart</span> Commandes</h3>
                    <div class="admin-stat-value">${totalOrders}</div>
                    <div class="admin-stat-change">Panier moyen: ${avgOrderValue.toLocaleString()} F</div>
                </div>
                <div class="admin-stat-card">
                    <h3><span class="material-icons">inventory_2</span> Produits</h3>
                    <div class="admin-stat-value">${totalProducts}</div>
                    <div class="admin-stat-change">Stock: ${totalStock} unités</div>
                </div>
                <div class="admin-stat-card">
                    <h3><span class="material-icons">people</span> Clients</h3>
                    <div class="admin-stat-value">${totalCustomers}</div>
                    <div class="admin-stat-change">Total: ${totalUsers} comptes</div>
                </div>
                <div class="admin-stat-card">
                    <h3><span class="material-icons">receipt</span> Revenu/Jour</h3>
                    <div class="admin-stat-value">${avgDailyRevenue.toLocaleString()} F</div>
                    <div class="admin-stat-change">7 derniers jours</div>
                </div>
                <div class="admin-stat-card">
                    <h3><span class="material-icons">star</span> Top Produit</h3>
                    <div class="admin-stat-value" style="font-size: 1rem;">${topProductsList[0]?.name?.substring(0, 15) || 'N/A'}</div>
                    <div class="admin-stat-change">${topProductsList[0]?.sales || 0} ventes</div>
                </div>
            </div>
        `;
        
        const statsContainer = document.getElementById('adminStatsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = statsHTML;
        }
        
        // Draw charts
        drawCharts(last7Days, categoryRevenue);
        
    } catch (error) {
        console.error('Erreur stats:', error);
    }
};

function drawCharts(last7Days, categoryRevenue) {
    try {
        // Category Pie Chart
        const ctxCategory = document.getElementById('chartCategory');
        if (ctxCategory && window.Chart) {
            new window.Chart(ctxCategory, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryRevenue),
                    datasets: [{
                        data: Object.values(categoryRevenue),
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
        
        // Revenue Line Chart
        const ctxRevenue = document.getElementById('chartRevenue');
        if (ctxRevenue && window.Chart) {
            const dates = last7Days.map((_, i) => `J${i-6}`);
            new window.Chart(ctxRevenue, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Revenus',
                        data: last7Days,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    } catch (error) {
        console.error('Erreur charts:', error);
    }
}
