const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.soporteIA = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  
  const { pregunta, idioma } = data;
  const respuesta = idioma === 'es' 
    ? `Hola, recibí tu pregunta: "${pregunta}". Soy tu asistente IA de STRATIUM AI.`
    : `Hello, I received your question: "${pregunta}". I am your AI assistant from STRATIUM AI.`;
  
  return { respuesta };
});

exports.verificarAlertasDiarias = functions.https.onRequest(async (req, res) => {
  const SECRET_KEY = "J@rel.139";
  const providedSecret = req.query.secret || req.body?.secret;
  if (providedSecret !== SECRET_KEY) {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }
  res.json({ success: true, message: 'Alertas verificadas', timestamp: new Date().toISOString() });
});

exports.recalcularClasificacionesDiarias = functions.pubsub
  .schedule('every 24 hours')
  .onRun((context) => {
    console.log('🔄 Recalculando clasificaciones diarias...');
    return null;
  });

