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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Galax démarré sur http://0.0.0.0:${PORT}`);
});
