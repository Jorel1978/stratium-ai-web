const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();

// ============================================================
// WEBHOOK SHOPIFY CON VALIDACIÓN HMAC
// ============================================================
exports.webhookShopify = functions.https.onRequest({
  rawBody: true
}, async (req, res) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const secret = functions.config().shopify?.secret || 'TU_SECRETO_SHOPIFY';
    
    const hash = crypto.createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('base64');
    
    if (hash !== hmac) {
      console.error('Firma HMAC inválida');
      res.status(401).send('Unauthorized');
      return;
    }
    
    const order = req.body;
    const userId = req.query.userId;
    
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }
    
    await admin.firestore().collection('ventasAutomaticas').add({
      userId,
      total: parseFloat(order.total_price),
      items: order.line_items.map(item => ({
        sku: item.sku || item.variant_id,
        nombre: item.title,
        cantidad: item.quantity,
        precio: parseFloat(item.price)
      })),
      fecha: new Date(order.created_at),
      origen: 'shopify',
      procesado: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook Shopify:', error);
    res.status(500).send('Error');
  }
});

// ============================================================
// WEBHOOK MERCADO LIBRE
// ============================================================
exports.webhookMercadoLibre = functions.https.onRequest({
  rawBody: true
}, async (req, res) => {
  try {
    const topic = req.headers['x-topic'];
    if (!topic || topic !== 'orders_v2') {
      res.status(401).send('Unauthorized');
      return;
    }
    
    const order = req.body;
    const userId = req.query.userId;
    
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }
    
    await admin.firestore().collection('ventasAutomaticas').add({
      userId,
      total: parseFloat(order.total_amount),
      items: order.order_items?.map(item => ({
        sku: item.item?.seller_sku || item.item?.id,
        nombre: item.item?.title,
        cantidad: item.quantity,
        precio: parseFloat(item.unit_price)
      })) || [],
      fecha: new Date(order.date_created),
      origen: 'mercadolibre',
      procesado: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook MercadoLibre:', error);
    res.status(500).send('Error');
  }
});

// ============================================================
// PROCESAR VENTAS AUTOMÁTICAS (CADA 5 MINUTOS) - V2
// ============================================================
exports.procesarVentasAutomaticas = onSchedule({
  schedule: 'every 5 minutes',
  memory: '256MiB',
  timeoutSeconds: 540,
  region: 'us-central1'
}, async (event) => {
  try {
    const ventasPendientes = await admin.firestore()
      .collection('ventasAutomaticas')
      .where('procesado', '==', false)
      .limit(30)
      .get();
    
    if (ventasPendientes.empty) {
      console.log('No hay ventas pendientes');
      return;
    }
    
    const batch = admin.firestore().batch();
    let operacionesEnBatch = 0;
    
    for (const doc of ventasPendientes.docs) {
      const venta = doc.data();
      let operacionesVenta = 0;
      
      for (const item of venta.items) {
        const inventarioQuery = await admin.firestore()
          .collection('inventario')
          .where('userId', '==', venta.userId)
          .where('sku', '==', item.sku)
          .limit(1)
          .get();
        
        if (!inventarioQuery.empty) {
          const producto = inventarioQuery.docs[0];
          const nuevaCantidad = (producto.data().cantidad || 0) - item.cantidad;
          
          batch.update(producto.ref, {
            cantidad: Math.max(0, nuevaCantidad),
            ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp()
          });
          operacionesVenta++;
        }
      }
      
      batch.update(doc.ref, {
        procesado: true,
        procesadoEn: admin.firestore.FieldValue.serverTimestamp()
      });
      operacionesVenta++;
      operacionesEnBatch += operacionesVenta;
      
      if (operacionesEnBatch > 450) {
        await batch.commit();
        operacionesEnBatch = 0;
      }
    }
    
    if (operacionesEnBatch > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Procesadas ${ventasPendientes.size} ventas automáticas`);
    return null;
  } catch (error) {
    console.error('Error procesando ventas:', error);
    return null;
  }
});

