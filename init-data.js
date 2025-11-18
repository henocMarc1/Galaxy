import { database } from './firebase-config.js';
import { ref, set, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const sampleProducts = [
    {
        id: 'parfum1',
        name: 'Oud Royal - Parfum Arabe Premium',
        category: 'Parfums',
        description: 'Parfum oriental luxueux aux notes de oud, ambre et musc. Longue tenue garantie. Parfait pour les occasions spéciales.',
        price: 45000,
        stock: 15,
        image: 'images/arabic_perfume_oud_b_fb56bc7f.jpg',
        featured: true,
        isNew: true
    },
    {
        id: 'parfum2',
        name: 'Jasmin de Nuit - Eau de Parfum',
        category: 'Parfums',
        description: 'Fragrance florale élégante avec des notes de jasmin, rose et vanille. Idéal pour la soirée.',
        price: 35000,
        stock: 20,
        image: 'images/luxury_perfume_bottl_adf5c11a.jpg',
        featured: true,
        isNew: false
    },
    {
        id: 'parfum3',
        name: 'Musk Blanc - Parfum Classique',
        category: 'Parfums',
        description: 'Senteur douce et enveloppante de musc blanc pur. Parfait pour un usage quotidien.',
        price: 28000,
        stock: 25,
        image: 'images/luxury_perfume_bottl_3fe6cfb4.jpg',
        featured: false,
        isNew: true
    },
    {
        id: 'epicerie1',
        name: 'Riz Parfumé Premium 5kg',
        category: 'Épicerie',
        description: 'Riz basmati de qualité supérieure, grain long et parfumé. Idéal pour tous vos plats.',
        price: 4500,
        stock: 50,
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
        featured: false,
        isNew: false
    },
    {
        id: 'boisson1',
        name: 'Jus d\'Orange Naturel 1L',
        category: 'Boissons',
        description: 'Jus d\'orange 100% naturel, sans sucre ajouté. Riche en vitamine C.',
        price: 1200,
        stock: 60,
        image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500',
        featured: true,
        isNew: false
    },
    {
        id: 'hygiene1',
        name: 'Crème Hydratante Visage',
        category: 'Hygiène & Beauté',
        description: 'Crème hydratante pour tous types de peau. Formule enrichie en vitamines.',
        price: 8500,
        stock: 30,
        image: 'images/cosmetics_beauty_pro_19f4ed4c.jpg',
        featured: false,
        isNew: true
    },
    {
        id: 'menager1',
        name: 'Détergent Multi-usages',
        category: 'Produits ménagers',
        description: 'Nettoyant puissant pour toutes surfaces. Parfum frais de citron.',
        price: 2500,
        stock: 40,
        image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500',
        featured: false,
        isNew: false
    },
    {
        id: 'fruits1',
        name: 'Pommes Fraîches Bio (1kg)',
        category: 'Fruits & Légumes',
        description: 'Pommes rouges biologiques, croquantes et sucrées. Cultivées localement.',
        price: 3000,
        stock: 35,
        image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=500',
        featured: true,
        isNew: false
    },
    {
        id: 'snack1',
        name: 'Chips Saveur Barbecue',
        category: 'Snacks',
        description: 'Chips croustillantes au goût barbecue intense. Sachet familial 200g.',
        price: 1500,
        stock: 80,
        image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500',
        featured: false,
        isNew: false
    },
    {
        id: 'surgele1',
        name: 'Pizza Margherita Surgelée',
        category: 'Surgelés',
        description: 'Pizza artisanale surgelée, prête en 15 minutes au four. 400g.',
        price: 3500,
        stock: 25,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
        featured: false,
        isNew: true
    },
    {
        id: 'bebe1',
        name: 'Couches Bébé Taille 4 (x40)',
        category: 'Bébé & Maman',
        description: 'Couches ultra-absorbantes pour bébés de 7-18kg. Douceur et confort garantis.',
        price: 6500,
        stock: 20,
        image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500',
        featured: false,
        isNew: false
    },
    {
        id: 'parfum4',
        name: 'Ambre Noir - Collection Prestige',
        category: 'Parfums',
        description: 'Parfum oriental intense aux notes d\'ambre noir, patchouli et bois de santal.',
        price: 52000,
        stock: 10,
        image: 'images/arabic_perfume_oud_b_d333ccf5.jpg',
        featured: true,
        isNew: true
    },
    {
        id: 'parfum5',
        name: 'Velours de Rose - Édition Limitée',
        category: 'Parfums',
        description: 'Fragrance florale raffinée avec des notes de rose turque, iris et poudre de riz.',
        price: 48000,
        stock: 12,
        image: 'images/luxury_perfume_bottl_e7ab8dd1.jpg',
        featured: true,
        isNew: true
    },
    {
        id: 'parfum6',
        name: 'Essence Royale - Luxe Absolu',
        category: 'Parfums',
        description: 'Parfum de luxe aux accords boisés et ambrés. Pour les connaisseurs.',
        price: 62000,
        stock: 8,
        image: 'images/luxury_perfume_bottl_582009d5.jpg',
        featured: false,
        isNew: false
    }
];

async function initializeData() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);

        if (!snapshot.exists()) {
            console.log('Initialisation des produits...');
            
            for (const product of sampleProducts) {
                const productId = product.id;
                delete product.id;
                await set(ref(database, `products/${productId}`), product);
            }

            console.log('Produits initialisés avec succès !');
            alert('Base de données initialisée avec ' + sampleProducts.length + ' produits !');
        } else {
            console.log('Des produits existent déjà dans la base de données.');
            alert('Des produits existent déjà. Aucune initialisation nécessaire.');
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des données:', error);
        alert('Erreur lors de l\'initialisation des données.');
    }
}

document.getElementById('initDataBtn')?.addEventListener('click', initializeData);

window.initializeData = initializeData;
