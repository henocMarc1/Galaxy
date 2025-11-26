# Galax - Supermarché en ligne

## Overview
**Galax** is a modern e-commerce application for a supermarket, specializing in luxury and Arabic perfumes. Its vision is to offer a seamless online shopping experience, positioning itself as "Your supermarket, your dream perfumes." The project aims to leverage a robust, modern technology stack to provide a wide range of products alongside a curated selection of fragrances, capturing significant market potential. The application is fully functional and deployed, showcasing comprehensive e-commerce capabilities.

## User Preferences
The user prefers to interact with the AI in a way that respects the existing codebase's structure and design principles.
- The user prefers clear and concise explanations.
- The user prefers that the AI maintains the current pure HTML, CSS, and Vanilla JavaScript approach, avoiding frameworks.
- The user wants the AI to prioritize the existing design language (blue/white premium, Mobile First, Material Icons).
- The user prefers iterative development, with clear communication before major changes.
- The user wants the AI to be mindful of the "CRITICAL RULES FOR USER PREFERENCES" mentioned in the prompt.
- The user wants the AI to leverage Firebase as the primary backend solution.
- The user prefers that the AI uses professional and formal language.

## System Architecture
The Galax application is built using a pure client-side architecture with Firebase as the backend.

**UI/UX Decisions:**
- **Design Language:** Modern, minimalist, and elegant with a blue/white color palette (primary: #1E40AF).
- **Responsiveness:** Mobile First design with breakpoints for mobile (< 480px), tablet (480px - 768px), and desktop (> 768px).
- **Iconography:** Material Icons are used exclusively.
- **Components:** Hero sections with automatic product rotation, rounded buttons, soft-shadowed and rounded product cards, sticky navigation, and animated discount badges.
- **Notifications:** Premium toast notifications for user feedback.
- **Accessibility:** Keyboard navigation, ARIA labels, and WCAG-compliant color contrast.

**Technical Implementations:**
- **Frontend:** HTML5 for structure, CSS3 for styling, and Vanilla JavaScript (ES6+) for application logic.
- **Backend Integration:** Firebase SDK is integrated directly into the frontend.
- **State Management:** LocalStorage is used for persisting the shopping cart.
- **Performance:** Code splitting, lazy loading for images, and optimized CSS animations.
- **Modular JavaScript:** Logic is separated into distinct files (e.g., `home.js`, `products-page.js`, `admin.js`).

**Feature Specifications:**
- **Product Management:** Full CRUD operations for products in the admin dashboard, including image uploads via Cloudinary and support for up to 3 images per product, with optional extra information fields.
- **User Authentication:** Email/password authentication via Firebase.
- **Shopping Cart & Checkout:** Persistent cart, discount calculations, various payment method selections, and clickable product names redirecting to product details.
- **Order Management:** Detailed order history for users, advanced order and customer management for admins with filtering and statistics.
- **Promotions System:** Dynamic hero section, discount badges, strike-through pricing, calculated savings, and admin-managed promo codes.
- **Favorites System:** Users can add/remove products from a Firebase-stored favorites list.
- **Admin Dashboard:** Comprehensive dashboard with product, order, and user management, real-time statistics (KPIs, trending metrics), Cloudinary image upload, and promo code creation.
- **Search:** Real-time autocomplete search available on all pages, providing product suggestions by name, category, and description.
- **Ratings System:** Product ratings stored in Firebase, displayed with star icons (though rating input functionality might have been adjusted in recent updates).
- **Email Notifications:** Automated order confirmation emails for customers and notification emails for admins via SendGrid.
- **Delivery Address Management:** Users can manage up to 3 delivery addresses, set a default, and add new ones during checkout, with data stored in Firebase.
- **Product Extra Information:** Optional tabbed interface in admin for adding supplementary product details (brand, volume, format, origin, color).

**System Design Choices:**
- **Single Page Application (SPA) feel:** Achieved without a framework by dynamically updating content.
- **Firebase Realtime Database Structure:** `products/`, `orders/`, `users/` for structured data storage.
- **User Roles:** `customer` and `admin` roles for access control.
- **Security:** Firebase Authentication, client-side role validation, and stock validation. Server-side Firebase security rules are recommended for production.

## External Dependencies
- **Firebase (SDK v12.6.0):**
    - **Authentication:** User registration and login (email/password).
    - **Realtime Database:** Storing product data, orders, user profiles, and favorites.
    - **Storage:** Storing product images.
    - **Analytics:** Tracking user behavior.
- **Material Icons:** All iconography within the application.
- **Node.js + Express:** Used for a simple server to handle SendGrid email endpoints.
- **SendGrid:** Integrated via Replit Connector for transactional emails (order confirmations, admin notifications).
- **Cloudinary:** Used for professional image uploads in the admin dashboard.

---

## 🚀 v4.0 - COMBO C + B - ADMIN PREMIUM (LATEST)

### ✨ COMBO C - UX PREMIUM ADMIN
- ✅ **Dark Mode** : Toggle lune/soleil en navbar, localStorage persistence, CSS variables dark/light
- ✅ **Gestion Images D&D** : Drag & drop zone elegante, thumbnails reorderable, remove buttons fluides
- ✅ **Audit Logs** : Timeline historique complet des actions (ADD/EDIT/DELETE) avec timestamps et admin info

### 📊 COMBO B - FULL ANALYTICS  
- ✅ **Analytics Amélioré** : Dashboard avec KPIs en temps réel (Revenu, Commandes, Produits, Clients, Top Produit)
- ✅ **Graphiques Interactifs** : Pie chart ventes par catégorie, Line chart revenus 7 derniers jours
- ✅ **Export Données** : Boutons CSV + PDF pour exporter analytics et rapports

#### **Modifications v4.0**
- ✅ `admin.html` :
  - Nouvel onglet **Analytics** (page par défaut) avec KPIs + 2 graphiques
  - Nouvel onglet **Audit** pour timeline des actions admin
  - Dark mode toggle button en navbar
  - Images D&D zone modernisée avec visual feedback
- ✅ `css/styles.css` :
  - CSS variables pour dark mode (--bg-primary, --text-primary, etc.)
  - Dark mode styles pour tous les elements (inputs, cards, tables, modals)
  - `.image-drop-zone` avec drag-over effects
  - `.audit-timeline` avec design premium et couleurs par action type
  - Charts responsive styling
- ✅ `js/admin.js` :
  - Export functions pour CSV/PDF avec html2pdf
  - D&D images init et file handling
  - Audit logging integration
- ✅ `js/admin-dark-mode.js` : NEW
  - Dark mode toggle manager avec localStorage persist
  - Theme application sur document.body[data-theme]
- ✅ `js/admin-audit.js` : NEW
  - Audit log viewer avec timeline display
  - Action logging (add/edit/delete) avec timestamps
- ✅ `js/admin-stats.js` : ENHANCED
  - Graphiques Chart.js pour analytics
  - Analytics data enrichis avec categoryRevenue
- ✅ Chart.js & html2pdf libraries intégrées

#### **Features Admin Détaillées**
| Feature | Implementation | Status |
|---------|-----------------|--------|
| 🌙 Dark Mode Toggle | Navbar button + localStorage + CSS variables | ✅ LIVE |
| 🖼️ D&D Images | Drop zone + preview thumbnails + remove buttons | ✅ LIVE |
| 📝 Audit Logs | Timeline + action types (ADD/EDIT/DEL) + admin email | ✅ LIVE |
| 📊 Pie Chart | Ventes par catégorie avec 6 couleurs | ✅ LIVE |
| 📈 Line Chart | Revenus 7 jours avec fill gradient | ✅ LIVE |
| 💾 CSV Export | Analytics → CSV file download | ✅ LIVE |
| 📄 PDF Export | Analytics → PDF file download | ✅ LIVE |

---

## 🎯 RÉSUMÉ COMPLET - GALAXY v4.0

### Front-end Features (Pages Client)
- ✅ Breadcrumbs navigation (Accueil > Produits > Catégorie)
- ✅ Filtres avancés avec Price Range Slider + inputs min/max
- ✅ Tri dynamique 6 options (prix, nouveauté, rating, promo)
- ✅ Quick View Modal (voir détails sans quitter la page)
- ✅ Premium toast notifications avec progress bar
- ✅ Quick View button sur chaque produit card

### Back-end Admin Features
- ✅ Analytics Dashboard avec graphiques
- ✅ Dark Mode UX
- ✅ Gestion Images D&D
- ✅ Audit Logs traçabilité
- ✅ Export CSV/PDF

---

## 🚀 v2.8 - TABBED PRODUCT INFORMATION FORM (EARLIER VERSION)

### ✨ Interface Admin Professionnelle avec Onglets Cliquables

#### **Fonctionnalité Complète**
- ✅ **Onglets cliquables** dans le formulaire admin produit :
  - Tab 1: "Information du produit" (champs obligatoires)
  - Tab 2: "Information additionnel" (champs optionnels)
- ✅ **Navigation fluide** - Onglets animés avec indication visuelle active (bordure bleue)
- ✅ **Champs optionnels** - Admin remplit UNIQUEMENT ce qu'il veut :
  - Marque
  - Volume/Poids
  - Format/Taille
  - Origine/Provenance
  - Couleur/Variante
- ✅ **Affichage dynamique** - Section "Informations Additionnel" sur page détail UNIQUEMENT si données
- ✅ **Design premium** - Tableau professionnel avec séparation visuelle, responsive mobile
- ✅ **UX Intuitive** - Onglets animés fadeIn avec indication d'état actif

#### **Modifications v2.8**
- ✅ `admin.html` :
  - Navbar onglets `.product-form-tabs` avec deux boutons cliquables
  - Tab 1: Information du produit (ID, nom, catégorie, description, prix, rabais, stock, images, options)
  - Tab 2: Information additionnel (5 champs optionnels pour enrichir les produits)
  - Les onglets changent fluidement au clic avec classe active/inactive
- ✅ `admin.js` :
  - `setupProductFormTabs()` - Gestion élégante des clics onglets
  - Sauvegarde conditionnelle dans `extraInfos` object (UNIQUEMENT si remplis)
  - Chargement intelligent des infos lors de la modification d'un produit
- ✅ `product-detail.js` :
  - Affiche section "Informations Additionnel" UNIQUEMENT si données présentes
  - Tableau dynamique s'auto-adapte aux champs remplis
  - Inclut champ Couleur/Variante
- ✅ `css/styles.css` :
  - `.product-form-tabs` - Navigation onglets professionnelle avec flexbox
  - `.product-tab-btn` - Boutons onglets avec hover/active states (bordure bleue)
  - `.product-tab-panel` - Panneaux onglets avec animation fadeIn
  - `.product-specs-table` - Tableau premium avec séparation lignes

#### **Fichiers Modifiés**
- `admin.html` - Onglets cliquables + structure tabs
- `js/admin.js` - Gestion onglets + sauvegarde conditionnelle
- `js/product-detail.js` - Affichage tableau dynamique
- `css/styles.css` - Styles onglets + animations

#### **Comment Utiliser**
1. **Admin Dashboard** → "Ajouter un produit"
2. **Tab 1 - Information du produit** : Remplissez les champs obligatoires (ID, nom, prix, images, etc.)
3. **Tab 2 - Information additionnel** : Cliquez puis remplissez les infos optionnelles que vous voulez
4. **Enregistrer** → Les infos s'affichent automatiquement sur la page produit en tableau professionnel

**Avantages** : Flexible (aucun champ obligatoire), universel (fonctionne pour tous les produits), automatique (affichage intelligente)

---

## 🚀 v2.7 - PRODUCT IMAGE GALLERY WITH THUMBNAILS

### ✨ Galerie de Miniatures pour Sélection d'Images

#### **Fonctionnalité**
- ✅ **Galerie de 3 images** - Produits peuvent avoir jusqu'à 3 photos
- ✅ **Image principale** - Affichée grande sur la page détail
- ✅ **Miniatures cliquables** - Sous l'image principale pour changer rapidement
- ✅ **Navigation fluide** - Clic sur une miniature met à jour la grande image
- ✅ **Compatibilité** - Fonctionne pour anciens produits (une image) et nouveaux (3 images)

#### **Modifications v2.7**
- ✅ `admin.js` :
  - Support de 3 images dans le formulaire admin
  - Cloudinary upload pour chaque image
  - Sauvegarde array `images` dans Firebase
- ✅ `product-detail.js` :
  - Miniatures cliquables sous l'image principale
  - Auto-détecte si produit a 1+ images
  - Navigation facile entre les photos
- ✅ `css/styles.css` :
  - Styles thumbnails cliquables
  - Responsive pour mobile/desktop

#### **Fichiers Modifiés**
- `admin.js` - Support 3 images + Cloudinary
- `product-detail.js` - Galerie miniatures cliquables
- `css/styles.css` - Styles galerie
