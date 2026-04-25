import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection 
} from 'firebase/firestore';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { firebaseConfig } from '../util/constants';

// ============================================================
// INICIALIZACIÓN DE FIREBASE (SINGLETON)
// ============================================================
const app = initializeApp(firebaseConfig);

// ============================================================
// FIRESTORE CON NUEVA PERSISTENCIA OFFLINE (v12.11.0+)
// ============================================================
// ✅ NUEVA SINTAXIS - Reemplaza enableIndexedDbPersistence()
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()  // Soporta múltiples pestañas sin conflictos
  })
});

// ============================================================
// AUTH CON PERSISTENCIA LOCAL (NO SE DESLOGA AL REFRESCAR)
// ============================================================
export const auth = getAuth(app);

// Configurar persistencia a LOCAL (mantiene sesión después de recargar)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Persistencia de autenticación configurada: browserLocalPersistence');
  })
  .catch((err) => {
    console.error('Error configurando persistencia:', err);
    // Fallback a session persistence
    setPersistence(auth, browserSessionPersistence);
  });

// ============================================================
// STORAGE PARA ARCHIVOS
// ============================================================
export const storage = getStorage(app);

// ============================================================
// FUNCTIONS PARA CLOUD FUNCTIONS (WEBHOOKS)
// ============================================================
export const functions = getFunctions(app);

// Configurar emulador para desarrollo local (opcional)
if (window.location.hostname === 'localhost' && process.env.NODE_ENV === 'development') {
  // connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('🔧 Modo desarrollo: Functions emulador disponible');
}

// ============================================================
// REFERENCIAS DE COLECCIONES (Firestore)
// ============================================================
export const registrosCollection = collection(db, 'registros');
export const inventarioCollection = collection(db, 'inventario');
export const cuentasPorPagarCollection = collection(db, 'cuentasPorPagar');
export const logsEliminacionesCollection = collection(db, 'logsEliminaciones');
export const productosCollection = collection(db, 'products');
export const usuariosCollection = collection(db, 'usuarios');
export const documentosCollection = collection(db, 'documentos');
export const enviosReportesCollection = collection(db, 'enviosReportes');
export const webhooksLogsCollection = collection(db, 'webhooksLogs');

// ============================================================
// FUNCIONES CALLABLE PARA WEBHOOKS (Shopify, MercadoLibre, Amazon)
// ============================================================
export const webhookShopify = httpsCallable(functions, 'webhookShopify');
export const webhookMercadoLibre = httpsCallable(functions, 'webhookMercadoLibre');
export const webhookAmazon = httpsCallable(functions, 'webhookAmazon');
export const procesarEscaneoCloud = httpsCallable(functions, 'procesarEscaneoOCR');
export const enviarAlertaWhatsApp = httpsCallable(functions, 'enviarAlertaWhatsApp');

// ============================================================
// UTILIDAD: Verificar estado de conexión
// ============================================================
export const isFirebaseConnected = () => {
  return auth.currentUser !== null;
};

