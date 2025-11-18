# Configuration Firebase pour Galax

## ⚠️ Important - Règles de sécurité Firebase

Pour que l'application fonctionne correctement, vous devez configurer les règles de sécurité Firebase.

### 1. Accéder à la Console Firebase

1. Allez sur https://console.firebase.google.com/
2. Sélectionnez votre projet : **tontine-manager-4ca6a**

### 2. Configurer Realtime Database

#### A. Activer Realtime Database (si pas encore fait)
1. Dans le menu latéral, cliquez sur **Realtime Database**
2. Cliquez sur **Créer une base de données**
3. Choisissez votre région (Europe recommandée)
4. Commencez en mode test (nous allons ajuster les règles)

#### B. Configurer les règles de sécurité

1. Allez dans l'onglet **Règles**
2. Remplacez les règles par défaut par celles-ci :

```json
{
  "rules": {
    "products": {
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "orders": {
      "$orderId": {
        ".read": "auth != null && (data.child('userId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null"
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

3. Cliquez sur **Publier**

#### Explication des règles :
- **products** : 
  - Lecture publique (tous peuvent voir les produits)
  - Écriture réservée aux admins uniquement
  
- **orders** :
  - Lecture : propriétaire de la commande ou admin
  - Écriture : tout utilisateur connecté (pour créer sa commande)
  
- **users** :
  - Lecture : l'utilisateur lui-même ou admin
  - Écriture : l'utilisateur peut modifier ses propres données uniquement

### 3. Configurer Firebase Storage (pour images)

1. Dans le menu latéral, cliquez sur **Storage**
2. Cliquez sur **Commencer**
3. Acceptez les règles par défaut
4. Allez dans l'onglet **Règles**
5. Remplacez par ces règles :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{imageId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Activer Firebase Authentication

1. Dans le menu latéral, cliquez sur **Authentication**
2. Cliquez sur **Commencer**
3. Cliquez sur l'onglet **Sign-in method**
4. Activez **Email/Password**
5. Sauvegardez

### 5. Initialiser les données

1. Ouvrez **init.html** dans votre navigateur
2. Cliquez sur **Initialiser les données**
3. Cela ajoutera 12 produits d'exemple dans la base

### 6. Créer un compte administrateur

#### Option 1 : Via l'interface
1. Allez sur **auth.html**
2. Inscrivez-vous avec un email et mot de passe
3. Notez votre UID (visible dans Authentication > Users)

#### Option 2 : Récupérer l'UID après inscription
1. Après inscription, connectez-vous
2. Ouvrez la console du navigateur (F12)
3. Tapez : `firebase.auth().currentUser.uid`
4. Copiez l'UID

#### Promouvoir en admin :
1. Allez dans **Realtime Database**
2. Naviguez vers : `users > [votre-uid]`
3. Modifiez le champ `role` de `"customer"` à `"admin"`
4. Sauvegardez
5. Déconnectez-vous et reconnectez-vous
6. Vous pouvez maintenant accéder à **admin.html**

### 7. Règles de sécurité RECOMMANDÉES pour la production

Pour une utilisation en production, voici des règles plus strictes :

```json
{
  "rules": {
    "products": {
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".indexOn": ["category", "featured", "isNew"]
    },
    "orders": {
      ".indexOn": ["userId", "status", "createdAt"],
      "$orderId": {
        ".read": "auth != null && (data.child('userId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".validate": "newData.hasChildren(['userId', 'items', 'total', 'status'])"
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && auth.uid === $uid && (!data.exists() || data.child('role').val() === newData.child('role').val())",
        ".validate": "newData.hasChildren(['name', 'email', 'phone', 'role'])"
      }
    }
  }
}
```

Ces règles ajoutent :
- Index pour améliorer les performances
- Validation des données
- Protection contre la modification du rôle par l'utilisateur

### 8. Vérification

Une fois les règles configurées :

1. Rechargez la page d'accueil (**index.html**)
2. Les produits devraient s'afficher
3. Testez l'inscription/connexion
4. Testez l'ajout au panier
5. Passez une commande test
6. Connectez-vous en tant qu'admin et gérez les produits

### 9. Monitoring

Dans la console Firebase, vous pouvez :
- **Authentication** : Voir tous les utilisateurs
- **Realtime Database** : Voir les données en temps réel
- **Analytics** : Statistiques d'utilisation
- **Storage** : Gérer les fichiers uploadés

---

## 🔧 Dépannage

### Erreur "Permission denied"
→ Vérifiez que les règles de sécurité sont bien configurées

### Les produits ne s'affichent pas
→ Initialisez les données via **init.html**

### Impossible de se connecter en admin
→ Vérifiez que le champ `role` est bien défini à `"admin"` dans la base de données

### Images ne s'affichent pas
→ Vérifiez les URLs des images dans les produits. Utilisez des URLs publiques (Unsplash, etc.)

---

**Votre application Galax est maintenant prête à fonctionner ! 🚀**
