const functions = require('firebase-functions');
const admin = require('firebase-admin');
const mercadopago = require('mercadopago');

admin.initializeApp();
const db = admin.firestore();

// Configurar Mercado Pago con Access Token (PRUEBA)
mercadopago.configure({
  access_token: 'TEST-2082807274972579-040613-aed5f6a1cced0244b4bed0b0fac0bd9c-3087415746'
});

// Webhook para recibir notificaciones de pago
exports.webhookMercadoPago = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Webhook recibido:', req.body);
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('Payment ID:', paymentId);
      
      const payment = await mercadopago.payment.findById(paymentId);
      console.log('Estado del pago:', payment.body.status);
      
      if (payment.body.status === 'approved') {
        const { userId, plan } = payment.body.metadata;
        console.log('Usuario:', userId, 'Plan:', plan);
        
        const planCreditos = {
          pro: 30,
          business: 100,
          elite: 500
        };
        
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        await db.collection('usuarios').doc(userId).update({
          plan: plan,
          creditosOCR: planCreditos[plan],
          creditosUsados: 0,
          fechaVencimiento: fechaVencimiento,
          ultimoPago: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Usuario actualizado correctamente');
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error: ' + error.message);
  }
});

// Endpoint para crear preferencia de pago
exports.crearPreferenciaPago = functions.https.onCall(async (data, context) => {
  try {
    const { plan, userEmail, userId } = data;
    
    const planData = {
      pro: {
        title: 'STRATIUM AI - Plan 1 (Pro)',
        price: 59900,
        description: '30 escaneos/mes, reportes PDF, comparativas'
      },
      business: {
        title: 'STRATIUM AI - Plan 2 (Business)',
        price: 99900,
        description: '100 escaneos/mes, auditoría completa, reportes PDF'
      },
      elite: {
        title: 'STRATIUM AI - Plan 3 (Elite)',
        price: 199900,
        description: '500 escaneos/mes, WhatsApp, soporte prioritario'
      }
    };

    const selected = planData[plan];
    if (!selected) throw new Error('Plan no válido');

    const preference = {
      items: [
        {
          title: selected.title,
          description: selected.description,
          quantity: 1,
          currency_id: 'COP',
          unit_price: selected.price
        }
      ],
      payer: {
        email: userEmail
      },
      metadata: {
        userId: userId,
        plan: plan
      },
      back_urls: {
        success: 'https://stratium-ai-web.vercel.app/dashboard',
        failure: 'https://stratium-ai-web.vercel.app/upgrade',
        pending: 'https://stratium-ai-web.vercel.app/upgrade'
      },
      auto_return: 'approved',
      notification_url: `https://us-central1-agente-financiero-ia-8548f.cloudfunctions.net/webhookMercadoPago`
    };

    const response = await mercadopago.preferences.create(preference);
    return { success: true, checkoutUrl: response.body.init_point };
    
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
});

