// functions/index.js - STRATIUM AI | Auditor Global Estrella/Hueso
// Compatible con firebase-functions@^7.2.5 y Node.js 20

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// 🌍 Salarios mínimos por hora (referencia global)
const SALARIOS_MINIMOS_HORA = {
  'CO': 5800, 'US': 7.25, 'UK': 11.44, 'ES': 8.45, 'MX': 45.00,
  'CA': 15.00, 'AU': 23.23, 'CL': 3500, 'PE': 10.50, 'AR': 1200,
  'default': 10.0
};

// 🔹 Helper: Obtener valorHora efectivo
async function getValorHoraEfectivo(userId, productoData) {
  try {
    if (productoData.valorHora && productoData.valorHora > 0) {
      return { valor: productoData.valorHora, moneda: productoData.moneda || 'USD' };
    }
    const userDoc = await db.collection('usuarios').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.valorHora && userData.valorHora > 0) {
      return { valor: userData.valorHora, moneda: userData.moneda || 'USD' };
    }
    const pais = userData?.pais || 'default';
    const valorPais = SALARIOS_MINIMOS_HORA[pais] || SALARIOS_MINIMOS_HORA.default;
    const monedaPais = { 'CO':'COP', 'UK':'GBP', 'ES':'EUR', 'MX':'MXN', 'CA':'CAD', 'AU':'AUD', 'CL':'CLP', 'PE':'PEN', 'AR':'ARS' }[pais] || 'USD';
    return { valor: valorPais, moneda: monedaPais };
  } catch (error) {
    console.warn('⚠️ Error obteniendo valorHora:', error.message);
    return { valor: SALARIOS_MINIMOS_HORA.default, moneda: 'USD' };
  }
}

// 🔹 Helper: Calcular clasificación
function calcularClasificacion(producto, valorHora) {
  if (!producto.precioVenta || producto.precioVenta <= 0) {
    return { clasificacion: 'NEUTRO', velocidadRetorno: 0, margenAbsoluto: 0, diasEnStock: 0, tiempoProduccionDias: 0 };
  }
  const costoTotal = (producto.precioCompra || 0) + (producto.costoManoObra || 0);
  const margenAbsoluto = producto.precioVenta - costoTotal;
  const fechaRegistro = producto.fechaRegistro?.toDate?.() || new Date();
  const diasEnStock = Math.max(0, Math.floor((Date.now() - fechaRegistro.getTime()) / (1000 * 60 * 60 * 24)));
  const horasProduccion = valorHora > 0 && producto.costoManoObra ? producto.costoManoObra / valorHora : 0;
  const tiempoProduccionDias = horasProduccion / 8;
  const divisor = diasEnStock + tiempoProduccionDias;
  const velocidadRetorno = (divisor > 0 && margenAbsoluto > 0) ? margenAbsoluto / divisor : 0;

  let clasificacion = 'NEUTRO';
  const cantidad = typeof producto.cantidad === 'number' ? producto.cantidad : 0;

  if (diasEnStock > 60 && cantidad > 0) clasificacion = 'HUESO';
  else if (velocidadRetorno > 0 && velocidadRetorno < 10 && cantidad > 0) clasificacion = 'HUESO';
  else if (velocidadRetorno >= 100 && diasEnStock < 15) clasificacion = 'ESTRELLA';
  else if (velocidadRetorno >= 50 && cantidad > 0 && cantidad < 10) clasificacion = 'ESTRELLA';

  return {
    clasificacion,
    velocidadRetorno: parseFloat(velocidadRetorno.toFixed(4)),
    margenAbsoluto: parseFloat(margenAbsoluto.toFixed(2)),
    diasEnStock,
    tiempoProduccionDias: parseFloat(tiempoProduccionDias.toFixed(2))
  };
}

// 🔥 TRIGGER: onUpdate en inventario del usuario (API v2)
exports.auditorGlobalEstrellaHueso = onDocumentUpdated(
  'usuarios/{userId}/inventario/{productoId}',
  async (event) => {
    try {
      const { userId, productoId } = event.params;
      const afterData = event.data.after.data();
      const beforeData = event.data.before.data();

      const camposRelevantes = ['precioVenta', 'precioCompra', 'costoManoObra', 'valorHora', 'cantidad', 'fechaRegistro'];
      const huboCambio = camposRelevantes.some(campo => afterData[campo] !== beforeData[campo]);
      if (!huboCambio && afterData.clasificacion) return null;

      const { valor: valorHora, moneda } = await getValorHoraEfectivo(userId, afterData);
      const resultado = calcularClasificacion(afterData, valorHora);

      await event.data.after.ref.update({
        clasificacion: resultado.clasificacion,
        velocidadRetorno: resultado.velocidadRetorno,
        margenAbsoluto: resultado.margenAbsoluto,
        diasEnStock: resultado.diasEnStock,
        tiempoProduccionDias: resultado.tiempoProduccionDias,
        valorHoraAplicado: valorHora,
        monedaAplicada: moneda,
        analizadoEl: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Producto ${productoId} clasificado como ${resultado.clasificacion}`);
      return null;
    } catch (error) {
      console.error('❌ Error en auditorGlobalEstrellaHueso:', error);
      return null;
    }
  }
);

// 🔁 CRON: Recálculo diario (API v2)
exports.recalcularClasificacionesDiarias = onSchedule(
  'every day 04:00',
  { timeZone: 'UTC' },
  async () => {
    console.log('🔄 Iniciando recalculo diario de clasificaciones');
    try {
      const usersSnapshot = await db.collection('usuarios').get();
      let totalProcesados = 0;
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const inventarioSnapshot = await db.collection('usuarios').doc(userId).collection('inventario').get();
        if (inventarioSnapshot.empty) continue;
        const { valor: valorHoraDefault } = await getValorHoraEfectivo(userId, {});
        const batch = db.batch();
        let actualizados = 0;
        for (const doc of inventarioSnapshot.docs) {
          const producto = doc.data();
          const ultimoAnalisis = producto.analizadoEl?.toDate?.();
          if (ultimoAnalisis && (Date.now() - ultimoAnalisis.getTime()) < 24 * 60 * 60 * 1000) continue;
          const resultado = calcularClasificacion(producto, valorHoraDefault);
          batch.update(doc.ref, {
            clasificacion: resultado.clasificacion,
            velocidadRetorno: resultado.velocidadRetorno,
            margenAbsoluto: resultado.margenAbsoluto,
            diasEnStock: resultado.diasEnStock,
            tiempoProduccionDias: resultado.tiempoProduccionDias,
            analizadoEl: admin.firestore.FieldValue.serverTimestamp()
          });
          actualizados++;
        }
        if (actualizados > 0) {
          await batch.commit();
          totalProcesados += actualizados;
          console.log(`📦 Usuario ${userId}: ${actualizados} productos actualizados`);
        }
      }
      console.log(`✅ Recalculo completado: ${totalProcesados} productos procesados`);
      return null;
    } catch (error) {
      console.error('❌ Error en recalcularClasificacionesDiarias:', error);
      return null;
    }
  }
);

// ✅ Alertas diarias existentes (HTTP function - API v2)
exports.verificarAlertasDiarias = onRequest(async (req, res) => {
  const SECRET_KEY = process.env.CRON_SECRET || "J@rel.139";
  const providedSecret = req.query.secret || req.body?.secret;
  if (providedSecret !== SECRET_KEY) {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }
  console.log('🔄 Iniciando verificación de alertas...');
  try {
    const inventarioSnapshot = await db.collection('inventario').get();
    const usuariosMap = new Map();
    inventarioSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        if (!usuariosMap.has(data.userId)) usuariosMap.set(data.userId, []);
        usuariosMap.get(data.userId).push({ id: doc.id, ...data });
      }
    });
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (const [userId, productos] of usuariosMap) {
      const productosPorVencer = [], productosStockBajo = [];
      productos.forEach(producto => {
        if (producto.fechaVencimiento && !producto.alertaVencimientoEnviada) {
          const diffDays = Math.ceil((new Date(producto.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3 && producto.cantidad > 0) productosPorVencer.push(producto);
        }
        const cantidad = typeof producto.cantidad === 'number' ? producto.cantidad : 0;
        if (cantidad > 0 && cantidad < 5 && !producto.alertaStockEnviada) productosStockBajo.push(producto);
      });
      const userDoc = await db.collection('usuarios').doc(userId).get();
      const userEmail = userDoc.data()?.email;
      if (!userEmail) continue;
      if (productosPorVencer.length > 0) {
        console.log(`📧 [Vencimiento] ${userEmail}: ${productosPorVencer.length} productos`);
        for (const p of productosPorVencer) {
          await db.collection('inventario').doc(p.id).update({ alertaVencimientoEnviada: true, ultimaAlertaVencimiento: admin.firestore.FieldValue.serverTimestamp() });
        }
      }
      if (productosStockBajo.length > 0) {
        console.log(`📧 [Stock bajo] ${userEmail}: ${productosStockBajo.length} productos`);
        for (const p of productosStockBajo) {
          await db.collection('inventario').doc(p.id).update({ alertaStockEnviada: true, ultimaAlertaStock: admin.firestore.FieldValue.serverTimestamp() });
        }
      }
    }
    res.json({ success: true, message: 'Alertas verificadas', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

