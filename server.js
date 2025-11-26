import sgMail from '@sendgrid/mail';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(__dirname));

let connectionSettings;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email};
}

async function getUncachableSendGridClient() {
  const {apiKey, email} = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

app.post('/send-order-confirmation', async (req, res) => {
  try {
    const { customerEmail, customerName, orderId, items, total, orderDate, address, city, paymentMethod } = req.body;
    
    const {client, fromEmail} = await getUncachableSendGridClient();
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toLocaleString()} FCFA</td>
      </tr>
    `).join('');
    
    const msg = {
      to: customerEmail,
      from: fromEmail,
      subject: `Confirmation de commande #${orderId.substring(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Galax</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Votre supermarché, vos parfums de rêve</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1E40AF; margin-top: 0;">Merci pour votre commande !</h2>
            <p>Bonjour ${customerName},</p>
            <p>Votre commande a été reçue avec succès et est en cours de traitement.</p>
            
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1E40AF;">Détails de la commande</h3>
              <p><strong>Numéro de commande:</strong> #${orderId.substring(0, 8)}</p>
              <p><strong>Date:</strong> ${new Date(orderDate).toLocaleDateString('fr-FR')} à ${new Date(orderDate).toLocaleTimeString('fr-FR')}</p>
              <p><strong>Adresse de livraison:</strong> ${address}, ${city}</p>
              <p><strong>Mode de paiement:</strong> ${paymentMethod}</p>
            </div>
            
            <h3 style="color: #1E40AF;">Articles commandés</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #F8FAFC;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Produit</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #1E40AF;">Quantité</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #1E40AF;">Prix</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #1E40AF;">
              <h2 style="color: #1E40AF; margin: 0;">Total: ${total.toLocaleString()} FCFA</h2>
            </div>
            
            <p style="margin-top: 30px; color: #64748B;">Nous vous tiendrons informé de l'avancement de votre commande. Vous pouvez suivre votre commande dans votre profil sur notre site.</p>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #64748B; font-size: 14px;">© 2025 Galax - Votre supermarché, vos parfums de rêve</p>
          </div>
        </div>
      `
    };
    
    await client.send(msg);
    res.json({ success: true, message: 'Email de confirmation envoyé' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send-admin-notification', async (req, res) => {
  try {
    const { adminEmail, customerEmail, customerName, orderId, items, total, orderDate, address, city, phone, paymentMethod } = req.body;
    
    const {client, fromEmail} = await getUncachableSendGridClient();
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price).toLocaleString()} FCFA</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toLocaleString()} FCFA</td>
      </tr>
    `).join('');
    
    const msg = {
      to: adminEmail,
      from: fromEmail,
      subject: `Nouvelle commande #${orderId.substring(0, 8)} - ${customerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Nouvelle Commande</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 18px;">Galax - Dashboard Admin</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <div style="background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400E; font-weight: bold;">Action requise: Nouvelle commande à traiter</p>
            </div>
            
            <h2 style="color: #DC2626; margin-top: 0;">Informations de la commande</h2>
            
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1E40AF;">Détails Client</h3>
              <p><strong>Nom:</strong> ${customerName}</p>
              <p><strong>Email:</strong> ${customerEmail}</p>
              <p><strong>Téléphone:</strong> ${phone}</p>
              <p><strong>Adresse de livraison:</strong> ${address}, ${city}</p>
            </div>
            
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1E40AF;">Détails de la commande</h3>
              <p><strong>Numéro:</strong> #${orderId.substring(0, 8)}</p>
              <p><strong>Date:</strong> ${new Date(orderDate).toLocaleDateString('fr-FR')} à ${new Date(orderDate).toLocaleTimeString('fr-FR')}</p>
              <p><strong>Mode de paiement:</strong> ${paymentMethod}</p>
            </div>
            
            <h3 style="color: #DC2626;">Articles commandés</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #F8FAFC;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #DC2626;">Produit</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #DC2626;">Quantité</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #DC2626;">Prix unitaire</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #DC2626;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #DC2626;">
              <h2 style="color: #DC2626; margin: 0;">Montant total: ${total.toLocaleString()} FCFA</h2>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #DBEAFE; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #1E40AF; font-weight: bold;">Gérer cette commande</p>
              <a href="${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/admin.html` : 'admin.html'}" 
                 style="display: inline-block; background: #1E40AF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accéder au Dashboard
              </a>
            </div>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #64748B; font-size: 14px;">© 2025 Galax - Dashboard Admin</p>
          </div>
        </div>
      `
    };
    
    await client.send(msg);
    res.json({ success: true, message: 'Email de notification admin envoyé' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== AI DESCRIPTION GENERATION ENDPOINT (GOOGLE GEMINI - GRATUIT) =====
app.post('/api/generate-description', express.json(), async (req, res) => {
  try {
    const { productName } = req.body;
    if (!productName) return res.status(400).json({ error: 'Product name required' });
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Clé API Google Gemini non configurée' });
    
    // Try different model names - Gemini API naming can vary
    const modelNames = [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro'
    ];
    
    let response = null;
    let lastError = null;
    
    for (const modelName of modelNames) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Génère une description COMPLÈTE et détaillée pour le produit: "${productName}"

FORMAT:
- Première ligne: Nom complet du produit avec marque
- Ligne 2-3: Phrase d'accroche professionnelle
- Puis: LES SPÉCIFICATIONS EN PUCES (•)

SI ÉLECTRONIQUE génère:
• Processeur/CPU
• Mémoire RAM
• Stockage
• Batterie/Énergie
• Écran/Résolution
• Caméra
• Poids
• Couleur(s)
• Résistance (eau, poussière)
• Avantages

SI PARFUM génère:
• Volume (ml)
• Type (Eau de Toilette, Eau de Parfum)
• Marque
• Notes (Tête/Cœur/Base)
• Projection durée
• Origine/Pays
• Couleur
• Utilisation

SI ALIMENTAIRE génère:
• Poids/Volume
• Ingrédients principaux
• Origine/Provenance
• Conservation
• Conditions stockage
• Bénéfices

SI MÉNAGER génère:
• Volume (ml ou kg)
• Composition/Matière active
• Mode d'utilisation
• Surface adaptée
• Conservation

Exemple format pour "iPhone 15" (utilise HTML pour les labels en gras):
iPhone 15 - Smartphone Apple haute performance<br>
L'iPhone 15 combine puissance et élégance avec les dernières innovations technologiques.<br>
• <strong>Processeur:</strong> A18<br>
• <strong>Mémoire:</strong> 6GB RAM<br>
• <strong>Stockage:</strong> 128GB/256GB/512GB<br>
• <strong>Batterie:</strong> 3582mAh<br>
• <strong>Écran:</strong> 6.1" OLED Super Retina<br>
• <strong>Caméra:</strong> 48MP principal, 12MP ultra grand-angle<br>
• <strong>Poids:</strong> 171g<br>
• <strong>Couleurs:</strong> Noir, Bleu, Rose, Blanc, Jaune<br>
• <strong>Résistance:</strong> IP69 eau et poussière<br>
• <strong>Avantages:</strong> Processeur ultra-rapide, batterie longue durée, camera professionnelle

IMPORTANT: Utilise <strong>LABEL:</strong> pour TOUS les labels et <br> pour les sauts de ligne. Répondre UNIQUEMENT avec la description HTML.`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7
            }
          })
        });
        
        if (response.ok) {
          console.log(`✅ Modèle Gemini fonctionnant: ${modelName}`);
          break;
        } else {
          lastError = await response.json();
          console.log(`❌ ${modelName} pas disponible, essai suivant...`);
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Erreur ${modelName}: ${error.message}`);
      }
    }
    
    if (!response || !response.ok) {
      const errorMsg = lastError?.error?.message || (typeof lastError === 'string' ? lastError : JSON.stringify(lastError));
      return res.status(500).json({ error: 'Erreur Gemini API: ' + errorMsg });
    }
    
    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!responseText) {
      return res.status(500).json({ error: 'API Gemini a pas retourné de description' });
    }
    
    res.json({ description: responseText.trim() });
  } catch (error) {
    console.error('Erreur génération description:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== FETCH PRODUCT IMAGES - PLACEHOLDER FIABLE =====
app.post('/api/search-images', express.json(), async (req, res) => {
  try {
    const { productName } = req.body;
    if (!productName) return res.status(400).json({ error: 'Product name required' });
    
    console.log(`🔍 Images pour: "${productName}"`);
    
    // Utiliser des URLs placeholder stables qui FONCTIONNENT
    const placeholderImages = [
      `https://via.placeholder.com/500x500?text=${encodeURIComponent(productName)}+1`,
      `https://via.placeholder.com/500x500?text=${encodeURIComponent(productName)}+2`,
      `https://via.placeholder.com/500x500?text=${encodeURIComponent(productName)}+3`
    ];
    
    console.log('✅ Images placeholder retournées');
    res.json({ images: placeholderImages.map(url => ({ url, alt: productName })) });
    
  } catch (error) {
    console.error('Erreur recherche images:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Galax démarré sur http://0.0.0.0:${PORT}`);
});
