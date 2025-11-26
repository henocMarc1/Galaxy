// Admin Dashboard Statistics ENHANCED
import { database } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

window.loadAdminStats = async function() {
    try {
        // Load products FIRST to create category map
        const productsRef = ref(database, 'products');
        const productsSnapshot = await get(productsRef);
        let totalProducts = 0, totalStock = 0;
        const topProducts = [];
        const productCategoryMap = {}; // productId → category
        
        if (productsSnapshot.exists()) {
            productsSnapshot.forEach(child => {
                const product = child.val();
                productCategoryMap[child.key] = product.category || 'Sans catégorie';
                totalProducts++;
                totalStock += product.stock || 0;
                topProducts.push({
                    id: child.key,
                    name: product.name,
                    sales: 0
                });
            });
        }
        
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
                        // Use map to get real category
                        const category = productCategoryMap[productId] || 'Sans catégorie';
                        categoryRevenue[category] = (categoryRevenue[category] || 0) + ((item.price || 0) * (item.quantity || 1));
                    });
                }
                const date = new Date(order.createdAt).toLocaleDateString('fr-FR');
                ordersByDate[date] = (ordersByDate[date] || 0) + (order.total || 0);
            });
        }
        
        // Update topProducts sales count
        topProducts.forEach(prod => {
            prod.sales = salesCount[prod.id] || 0;
        });
        
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
        
        // Find products with low stock (< 10)
        const lowStockProducts = [];
        productsSnapshot.forEach(child => {
            const product = child.val();
            if ((product.stock || 0) < 10 && (product.stock || 0) > 0) {
                lowStockProducts.push({
                    name: product.name,
                    stock: product.stock
                });
            }
        });
        lowStockProducts.sort((a, b) => a.stock - b.stock);

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

            <!-- NEW: TOP 5 PRODUCTS TABLE -->
            <div style="background: var(--card-bg); padding: 2rem; border-radius: 12px; margin-top: 2rem;">
                <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <span class="material-icons" style="color: #F59E0B;">local_fire_department</span>
                    Top 5 Produits Les Plus Vendus
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: var(--bg-primary, #F8FAFC); border-bottom: 2px solid var(--text-muted, #CBD5E1);">
                        <tr>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Produit</th>
                            <th style="padding: 0.75rem; text-align: center; font-weight: 600;">Ventes</th>
                            <th style="padding: 0.75rem; text-align: center; font-weight: 600;">% Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topProductsList.map((prod, idx) => `
                            <tr style="border-bottom: 1px solid var(--border-color, #E2E8F0);">
                                <td style="padding: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="display: inline-block; width: 24px; height: 24px; background: #3B82F6; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 0.8rem;">${idx + 1}</span>
                                    ${prod.name?.substring(0, 25) || 'N/A'}
                                </td>
                                <td style="padding: 0.75rem; text-align: center; font-weight: 600;">${prod.sales || 0}</td>
                                <td style="padding: 0.75rem; text-align: center; color: #10B981;">${totalItems > 0 ? Math.round((prod.sales / totalItems) * 100) : 0}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- NEW: LOW STOCK ALERT -->
            ${lowStockProducts.length > 0 ? `
            <div style="background: var(--card-bg); padding: 2rem; border-radius: 12px; margin-top: 2rem; border-left: 4px solid #EF4444;">
                <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #EF4444;">
                    <span class="material-icons">warning</span>
                    ⚠️ Produits en Stock Faible (< 10 unités) - ${lowStockProducts.length} produit(s)
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
                    ${lowStockProducts.map(prod => `
                        <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); padding: 1rem; border-radius: 8px; border: 1px solid #FECACA; flex-shrink: 0;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">${prod.name?.substring(0, 25)}</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #DC2626;">${prod.stock} unités</div>
                            <div style="font-size: 0.8rem; color: #991B1B; margin-top: 0.5rem;">🔴 Réapprovisionnement urgent</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
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
