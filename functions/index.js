const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');

admin.initializeApp();
const db = admin.firestore();

const client = new MercadoPagoConfig({ 
  accessToken: 'TEST-2082807274972579-040613-aed5f6a1cced0244b4bed0b0fac0bd9c-3087415746' 
});

exports.webhookMercadoPago = onRequest(async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // 1. Solo procesamos si es un pago
    if (type === 'payment') {
      const payment = new Payment(client);
      const result = await payment.get({ id: data.id });
      
      // 2. Verificamos que el pago sea aprobado Y tenga metadata
      if (result.status === 'approved' && result.metadata && result.metadata.user_id) {
        const { user_id, plan } = result.metadata;
        
        const planCreditos = { pro: 30, business: 100, elite: 500 };
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        await db.collection('usuarios').doc(user_id.toString()).update({
          plan: plan || 'basic',
          creditosOCR: planCreditos[plan] || 10,
          creditosUsados: 0,
          fechaVencimiento: fechaVencimiento,
          ultimoPago: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Pago real procesado para: ${user_id}`);
      } else {
        console.log("ℹ️ Notificación recibida: Pago de prueba o sin metadata válida.");
      }
    }
    
    // 3. Siempre respondemos 200 a Mercado Pago para que no se queje
    res.status(200).send('Webhook recibido correctamente');

  } catch (error) {
    console.error('❌ Error controlado:', error.message);
    // Respondemos 200 aunque falle internamente para que Mercado Pago deje de intentar
    res.status(200).send('Error interno pero notificado');
  }
});

