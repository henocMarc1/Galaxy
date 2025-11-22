# Galax - Supermarché en ligne

## ⚠️ IMPORTANT - Configuration requise

**Avant d'utiliser l'application, vous DEVEZ configurer Firebase :**

1. 📖 **Lisez le guide complet** : [CONFIGURATION_FIREBASE.md](CONFIGURATION_FIREBASE.md)
2. ⚙️ **Configurez les règles de sécurité** dans la console Firebase
3. 🔐 **Activez l'authentification** Email/Password
4. 📊 **Initialisez les données** via [init.html](init.html)

Sans ces étapes, vous verrez une erreur "Permission denied" et l'application ne fonctionnera pas.

---

## 📝 Vue d'ensemble

**Galax** est une application e-commerce moderne pour un supermarché avec mise en avant des parfums (parfums de luxe & arabes). Le site est développé en **HTML, CSS et JavaScript pur** (pas de frameworks) avec Firebase comme backend.

**Slogan:** *Votre supermarché, vos parfums de rêve*

## 🚀 Statut du projet

✅ **Application fonctionnelle et déployée sur Replit**

Date de création: 18 novembre 2024
Date de déploiement Replit: 18 novembre 2025
Dernière mise à jour: 22 novembre 2025 - Upload d'images, sidebar admin, vue détaillée membres, images hero arrondies

## 🔧 Configuration Replit

L'application est configurée pour fonctionner sur Replit avec :
- **Serveur**: Python HTTP Server sur port 5000 (0.0.0.0)
- **Workflow**: "Web Server" - Serveur web automatiquement démarré
- **Déploiement**: Configuré pour déploiement statique (public_dir: ".")
- **Firebase**: Configuré et opérationnel
- **Python**: Version 3.11 installée pour le serveur HTTP

### Démarrage automatique
Le serveur se lance automatiquement au démarrage du Repl. L'application est accessible immédiatement via le panneau Webview.

## 🎨 Technologies utilisées

### Frontend
- **HTML5** - Structure des pages
- **CSS3** - Design bleu/blanc premium, responsive Mobile First
- **JavaScript Vanilla (ES6+)** - Logique applicative
- **Firebase SDK v12.6.0** - Backend as a Service

### Backend (Firebase)
- **Firebase Authentication** - Inscription/Connexion email+password
- **Firebase Realtime Database** - Base de données produits, commandes, utilisateurs
- **Firebase Storage** - Stockage des images produits (configuré)
- **Firebase Analytics** - Suivi des utilisateurs

## 📁 Structure du projet

```
.
├── index.html              # Page d'accueil
├── products.html           # Liste des produits avec filtres
├── product-detail.html     # Fiche produit détaillée
├── cart.html              # Panier d'achats
├── checkout.html          # Page de paiement
├── auth.html              # Connexion/Inscription
├── profile.html           # Profil utilisateur
├── admin.html             # Dashboard admin
├── init.html              # Initialisation base de données
├── css/
│   └── styles.css         # Styles globaux
└── js/
    ├── firebase-config.js # Configuration Firebase
    ├── home.js           # Page d'accueil
    ├── products-page.js  # Liste produits
    ├── product-detail.js # Détail produit
    ├── cart-page.js      # Panier
    ├── checkout.js       # Checkout
    ├── auth-page.js      # Authentification
    ├── profile.js        # Profil utilisateur
    ├── admin.js          # Dashboard admin
    └── init-data.js      # Initialisation données
```

## ✨ Fonctionnalités implémentées

### Pages utilisateur
- ✅ **Accueil** - Hero section avec rotation automatique des produits promo toutes les 5 secondes, recherche, produits en tendance
- ✅ **Liste produits** - Filtres par catégorie, prix, recherche dynamique, affichage des rabais
- ✅ **Fiche produit** - Images, description, prix avec rabais, stock, sélecteur quantité
- ✅ **Panier** - LocalStorage avec gestion des rabais, modification quantités, calcul total avec économies
- ✅ **Checkout** - Formulaire livraison, affichage des rabais et économies totales, choix paiement (Mobile Money, Carte, Cash)
- ✅ **Authentification** - Inscription/Connexion Firebase
- ✅ **Profil** - Informations personnelles, historique commandes

### Système de promotions
- ✅ **Hero dynamique** - Rotation automatique des produits en promo toutes les 5 secondes avec badges de rabais
- ✅ **Badges de réduction** - Affichage visuel des pourcentages de rabais sur les produits
- ✅ **Prix barrés** - Prix originaux affichés avec barré pour montrer la réduction
- ✅ **Économies calculées** - Montant économisé affiché sur chaque produit et dans le résumé total
- ✅ **Persistance des rabais** - Les informations de rabais sont conservées dans le panier via localStorage

### Dashboard Admin
- ✅ **Navigation Sidebar** - Interface moderne avec navigation latérale fixe
- ✅ **Gestion produits** - CRUD complet (Créer, Lire, Modifier, Supprimer)
- ✅ **Upload d'images** - Upload direct depuis téléphone/ordinateur vers Firebase Storage
- ✅ **Gestion stocks** - Mise à jour des stocks et prix
- ✅ **Gestion images** - URLs d'images produits ou upload de fichiers
- ✅ **Gestion commandes** - Liste, modification statuts (En attente, Confirmée, Livrée, Annulée)
- ✅ **Liste membres** - Visualisation tous les utilisateurs inscrits
- ✅ **Vue détaillée membre** - Profil complet avec statistiques et historique des commandes

### Catégories de produits
1. ⭐ **Parfums** (catégorie prioritaire)
2. **Épicerie**
3. **Boissons**
4. **Hygiène & Beauté**
5. **Produits ménagers**
6. **Fruits & Légumes**
7. **Snacks**
8. **Surgelés**
9. **Bébé & Maman**

## 🔑 Configuration Firebase

Le projet utilise la configuration Firebase suivante:
- **API Key**: AIzaSyCZej9YltyxigiDKtmP4JK6bWMxzdZ-L6I
- **Auth Domain**: tontine-manager-4ca6a.firebaseapp.com
- **Database URL**: https://tontine-manager-4ca6a-default-rtdb.firebaseio.com
- **Project ID**: tontine-manager-4ca6a
- **Storage Bucket**: tontine-manager-4ca6a.firebasestorage.app

## 🚀 Démarrage rapide

### 1. Initialiser la base de données
Accédez à **init.html** et cliquez sur "Initialiser les données" pour ajouter 12 produits d'exemple.

### 2. Créer un compte admin
1. Inscrivez-vous via **auth.html**
2. Allez dans Firebase Console → Realtime Database → users → [votre UID]
3. Changez `role` de `"customer"` à `"admin"`
4. Reconnectez-vous et accédez à **admin.html**

### 3. Utiliser l'application
- **Visiteurs**: Peuvent naviguer et voir les produits
- **Utilisateurs connectés**: Peuvent ajouter au panier et passer des commandes
- **Admins**: Ont accès au dashboard de gestion complète

## 🎨 Design

**Palette de couleurs:**
- Bleu primaire: #1E40AF (bleu profond et élégant)
- Bleu secondaire: #3B82F6 (bleu vif)
- Bleu accent: #60A5FA (bleu clair)
- Fond clair: #F8FAFC
- Texte: #334155

**Caractéristiques design:**
- Style moderne et minimaliste avec palette bleue raffinée
- Hero section avec rotation automatique des produits et images arrondies (border-radius: 20px)
- Boutons arrondis (pill-shaped)
- Cartes produits avec ombres douces et coins arrondis
- Responsive Mobile First
- Navigation minimaliste avec icônes rondes
- Section catégories disponible uniquement dans le menu dropdown
- Animations et effets de survol modernes
- Badges de rabais animés avec effet pulse
- Dashboard admin avec sidebar fixe et design professionnel

## 💾 Données LocalStorage

L'application utilise LocalStorage pour:
- **Panier**: Sauvegarde du panier même hors connexion
- **Synchronisation**: Le panier est conservé jusqu'à validation de la commande

## 🔒 Sécurité

- Authentification Firebase (email + password)
- Rôles utilisateurs (customer, admin)
- Validation des stocks avant ajout au panier
- Protection des routes admin (vérification côté client)

⚠️ **Note importante**: Pour une application de production, il est recommandé d'ajouter des règles de sécurité Firebase pour protéger la base de données côté serveur.

## 📱 Responsive Design

L'application est entièrement responsive avec breakpoints:
- **Mobile**: < 480px
- **Tablette**: 480px - 768px
- **Desktop**: > 768px

## 🛠️ Développement

**Serveur local:**
```bash
python -m http.server 5000
```

**Accès:** http://localhost:5000

## 🚢 Déploiement

L'application peut être déployée sur:
- Replit (déjà configuré)
- Firebase Hosting
- Netlify
- Vercel
- Tout hébergeur supportant HTML/CSS/JS statique

## 📊 Structure Firebase Database

```
galax-db/
├── products/
│   ├── {productId}/
│   │   ├── name: string
│   │   ├── category: string
│   │   ├── description: string
│   │   ├── price: number
│   │   ├── stock: number
│   │   ├── image: string (URL)
│   │   ├── featured: boolean
│   │   └── isNew: boolean
├── orders/
│   ├── {orderId}/
│   │   ├── userId: string
│   │   ├── userEmail: string
│   │   ├── fullName: string
│   │   ├── phone: string
│   │   ├── address: string
│   │   ├── city: string
│   │   ├── paymentMethod: string
│   │   ├── items: array
│   │   ├── total: number
│   │   ├── status: string
│   │   └── createdAt: string (ISO)
└── users/
    ├── {userId}/
    │   ├── name: string
    │   ├── email: string
    │   ├── phone: string
    │   ├── role: string (customer|admin)
    │   └── createdAt: string (ISO)
```

## 🎯 Prochaines améliorations possibles

1. **Notifications email** - Confirmation de commandes
2. **Système d'avis** - Notes et commentaires produits
3. **Filtres avancés** - Par marque, promotions
4. **Dashboard analytics** - Statistiques ventes pour admin
5. **Intégration paiement réel** - Stripe, PayPal, Mobile Money APIs
6. **Upload images** - Firebase Storage pour upload admin
7. **Chat support** - Assistance client en direct
8. **Programme fidélité** - Points et récompenses

## 📝 Notes de développement

- Toutes les fonctionnalités sont **opérationnelles**
- Code **propre et commenté** en français
- **Pas de dépendances externes** (sauf Firebase)
- Compatible tous navigateurs modernes
- **Pas de code incomplet ou de placeholder**

---

**Développé pour Galax - Votre supermarché, vos parfums de rêve**
