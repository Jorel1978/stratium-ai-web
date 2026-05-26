// src/services/notifications.js
// Push Notifications para Stratium AI (Firebase - Costo: $0)
// Soporte multi-idioma y gestión robusta de permisos

import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { obtenerTexto } from '../locales';

// Cache local para evitar escrituras innecesarias
const TOKEN_CACHE_KEY = 'stratium_push_token';
const TOKEN_CACHE_TIME_KEY = 'stratium_token_timestamp';

/**
 * Verificar si el Service Worker está registrado correctamente
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
const getServiceWorkerRegistration = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('❌ Service Worker no disponible:', error);
      return null;
    }
  }
  return null;
};

/**
 * Verificar si la VAPID Key está configurada correctamente
 * @returns {boolean}
 */
const isVapidKeyValid = () => {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('❌ VITE_FIREBASE_VAPID_KEY no está configurada en variables de entorno');
    return false;
  }
  // Validación básica: debería ser una clave larga en Base64 URL-safe
  if (vapidKey.length < 50) {
    console.error('❌ VITE_FIREBASE_VAPID_KEY parece inválida (longitud insuficiente)');
    return false;
  }
  return true;
};

/**
 * Configurar notificaciones push para el usuario
 * @param {Object} usuario - Usuario actual (debe tener uid y pais, idioma)
 * @param {Function} onPermissionGranted - Callback cuando se concede permiso
 * @param {Function} onPermissionDenied - Callback cuando se deniega permiso
 * @returns {Promise<string|null>} - Token de notificación o null
 */
export const configurarNotificaciones = async (usuario, onPermissionGranted, onPermissionDenied) => {
  if (!usuario?.uid) {
    console.warn('⚠️ Usuario no autenticado, no se pueden configurar notificaciones');
    return null;
  }
  
  // Verificar VAPID Key antes de continuar
  if (!isVapidKeyValid()) {
    if (onPermissionDenied) {
      onPermissionDenied('🔧 Error de configuración. Contacta al soporte de Stratium Global AI.');
    }
    return null;
  }
  
  try {
    // Verificar soporte del navegador
    if (!('Notification' in window)) {
      console.warn('⚠️ Este navegador no soporta notificaciones');
      if (onPermissionDenied) {
        onPermissionDenied('❌ Tu navegador no soporta notificaciones. Usa Chrome, Edge o Safari.');
      }
      return null;
    }
    
    // Verificar estado actual del permiso
    const currentPermission = Notification.permission;
    
    if (currentPermission === 'denied') {
      console.warn('⚠️ Permiso de notificaciones denegado previamente');
      if (onPermissionDenied) {
        onPermissionDenied(
          '🔕 No podré avisarte si tu margen baja porque bloqueaste las notificaciones. ' +
          'Actívalas manualmente en la configuración de tu navegador.'
        );
      }
      return null;
    }
    
    // Solicitar permiso si no está concedido
    let permission = currentPermission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.warn('⚠️ Permiso de notificaciones denegado por el usuario');
      if (onPermissionDenied) {
        onPermissionDenied(
          '🔕 Para que Stratium Global AI te avise de alertas importantes, ' +
          'necesitas habilitar las notificaciones. Puedes cambiarlo en configuración.'
        );
      }
      return null;
    }
    
    // Obtener Service Worker registration
    const swRegistration = await getServiceWorkerRegistration();
    if (!swRegistration) {
      console.error('❌ No se pudo obtener el Service Worker registration');
      if (onPermissionDenied) {
        onPermissionDenied('❌ Error técnico: Service Worker no disponible.');
      }
      return null;
    }
    
    // Verificar token en cache local
    const cachedToken = localStorage.getItem(TOKEN_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(TOKEN_CACHE_TIME_KEY);
    const isTokenFresh = cachedTimestamp && (Date.now() - parseInt(cachedTimestamp) < 24 * 60 * 60 * 1000);
    
    if (cachedToken && isTokenFresh) {
      console.log('📦 Usando token en cache');
      return cachedToken;
    }
    
    // Obtener nuevo token
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });
    
    if (token) {
      // Guardar en cache local
      localStorage.setItem(TOKEN_CACHE_KEY, token);
      localStorage.setItem(TOKEN_CACHE_TIME_KEY, Date.now().toString());
      
      // Guardar token en Firestore (solo si cambió)
      const db = getFirestore();
      const userRef = doc(db, 'usuarios', usuario.uid);
      const userDoc = await getDoc(userRef);
      const currentToken = userDoc.data()?.pushToken;
      
      if (currentToken !== token) {
        await updateDoc(userRef, {
          pushToken: token,
          notificacionesHabilitadas: true,
          idiomaNotificaciones: usuario.idioma || 'es',
          paisNotificaciones: usuario.pais || 'CO',
          ultimaActualizacionToken: new Date().toISOString()
        });
        console.log('✅ Token guardado en Firestore');
      }
      
      onPermissionGranted?.(token);
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error configurando notificaciones:', error);
    
    // Manejar errores específicos de Firebase Messaging
    if (error.code === 'messaging/unsupported-browser') {
      if (onPermissionDenied) {
        onPermissionDenied('❌ Tu navegador no soporta notificaciones push. Usa Chrome, Edge o Firefox.');
      }
    } else if (error.code === 'messaging/permission-blocked') {
      if (onPermissionDenied) {
        onPermissionDenied('🔕 Las notificaciones están bloqueadas. Actívalas en la configuración de tu navegador.');
      }
    } else {
      if (onPermissionDenied) {
        onPermissionDenied(`❌ Error técnico: ${error.message || 'No se pudieron configurar notificaciones'}`);
      }
    }
    
    return null;
  }
};

/**
 * Escuchar notificaciones en tiempo real (solo cuando app está en primer plano)
 * @param {Function} onNotification - Callback cuando llega notificación
 * @returns {Function} - Función de cleanup
 */
export const escucharNotificacionesEnTiempoReal = (onNotification) => {
  try {
    const messaging = getMessaging();
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('🔔 Notificación recibida en primer plano:', payload);
      
      const notification = {
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
        timestamp: new Date().toISOString()
      };
      
      // IMPORTANTE: Solo mostrar notificación nativa cuando la app está en segundo plano
      // Firebase Messaging ya maneja las notificaciones en segundo plano a través del Service Worker
      // No duplicamos notificaciones aquí - solo procesamos el payload
      onNotification?.(notification);
    });
    
    return () => {
      unsubscribe?.();
    };
  } catch (error) {
    console.error('❌ Error escuchando notificaciones:', error);
    return () => {};
  }
};

/**
 * Enviar notificación local (solo cuando la app está abierta)
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} options - Opciones adicionales
 */
export const enviarNotificacionLocal = (title, body, options = {}) => {
  // Solo mostrar notificaciones locales cuando la app está en primer plano
  // y el usuario ha interactuado con la página (para evitar bloqueos)
  if (document.visibilityState === 'visible' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: options.icon || '/icon-192.png',
        badge: options.badge || '/icon-96.png',
        tag: options.tag || 'stratium-notification',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      });
    } catch (error) {
      console.error('❌ Error mostrando notificación local:', error);
    }
  }
};

/**
 * Limpiar token de notificaciones (logout o revocación de permisos)
 * @param {string} uid - ID del usuario
 */
export const limpiarTokenNotificaciones = async (uid) => {
  try {
    // Limpiar cache local
    localStorage.removeItem(TOKEN_CACHE_KEY);
    localStorage.removeItem(TOKEN_CACHE_TIME_KEY);
    
    // Limpiar token en Firestore
    const db = getFirestore();
    await updateDoc(doc(db, 'usuarios', uid), {
      pushToken: null,
      notificacionesHabilitadas: false
    });
    
    // Opcional: revocar token en Firebase
    const messaging = getMessaging();
    try {
      await deleteToken(messaging);
    } catch (e) {
      // Ignorar errores de revocación
    }
    
    console.log('✅ Token de notificaciones limpiado');
  } catch (error) {
    console.error('❌ Error limpiando token:', error);
  }
};

/**
 * Verificar estado de las notificaciones
 * @returns {Object} - Estado actual
 */
export const verificarEstadoNotificaciones = () => {
  const hasNotificationSupport = 'Notification' in window;
  const permission = hasNotificationSupport ? Notification.permission : 'unsupported';
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasVapidKey = !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
  const cachedToken = localStorage.getItem(TOKEN_CACHE_KEY);
  
  return {
    soportado: hasNotificationSupport && hasServiceWorker,
    permiso: permission,
    serviceWorkerListo: hasServiceWorker,
    vapidKeyConfigurada: hasVapidKey,
    tokenEnCache: !!cachedToken,
    puedeEnviar: permission === 'granted' && hasVapidKey
  };
};

/**
 * Tipos de notificaciones predefinidas (integrado con sistema de localización)
 * @param {string} type - Tipo de notificación
 * @param {string} paisCode - Código del país
 * @param {string} idioma - Idioma (es/en)
 * @param {Object} params - Parámetros adicionales
 * @returns {Object} - { title, body }
 */
export const getNotificationText = (type, paisCode = 'CO', idioma = 'es', params = {}) => {
  const tipos = {
    ALERTA_MARGEN: {
      keyTitle: 'alertaMargenTitle',
      keyBody: 'alertaMargenBody',
      defaultTitle: { es: '⚠️ Margen bajo detectado', en: '⚠️ Low margin detected' },
      defaultBody: { es: 'Una venta deja poco margen. ¿Revisar precio?', en: 'A sale has low margin. Review price?' }
    },
    RECORDATORIO_DIARIO: {
      keyTitle: 'recordatorioDiarioTitle',
      keyBody: 'recordatorioDiarioBody',
      defaultTitle: { es: '🔍 ¿Todo registrado hoy?', en: '🔍 Everything logged today?' },
      defaultBody: { es: '¿Hubo algún gasto hormiga que se nos escapó?', en: 'Any small expenses we missed?' }
    },
    BENCHMARK_DISPONIBLE: {
      keyTitle: 'benchmarkTitle',
      keyBody: 'benchmarkBody',
      defaultTitle: { es: '🐝 Inteligencia de Colmena', en: '🐝 Hive Intelligence' },
      defaultBody: { es: 'Otros negocios consiguen mejores precios.', en: 'Other businesses get better prices.' }
    },
    GASTOS_FIJOS_CUBIERTOS: {
      keyTitle: 'gastosCubiertosTitle',
      keyBody: 'gastosCubiertosBody',
      defaultTitle: { es: '🎉 ¡Felicidades!', en: '🎉 Congratulations!' },
      defaultBody: { es: 'Ya cubriste todos tus gastos fijos del mes.', en: 'You\'ve covered all monthly fixed costs.' }
    },
    ALERTA_COMPRA_CARA: {
      keyTitle: 'compraCaraTitle',
      keyBody: 'compraCaraBody',
      defaultTitle: { es: '⚠️ Precio alto detectado', en: '⚠️ High price detected' },
      defaultBody: (params) => `Otros negocios consiguen "${params.producto}" más barato.`,
    },
    INDICADOR_SUENO: {
      keyTitle: 'indicadorSueñoTitle',
      keyBody: 'indicadorSueñoBody',
      defaultTitle: { es: '😴 Indicador de Sueño', en: '😴 Sleep Indicator' },
      defaultBody: (params) => `Tienes ${params.dias} días de gastos cubiertos.`,
    }
  };
  
  const tipoData = tipos[type];
  if (!tipoData) {
    return { title: 'Stratium Global AI', body: '' };
  }
  
  // Intentar obtener del sistema de localización
  let title = tipoData.defaultTitle[idioma] || tipoData.defaultTitle.es;
  let body = typeof tipoData.defaultBody === 'function' 
    ? tipoData.defaultBody(params) 
    : (tipoData.defaultBody[idioma] || tipoData.defaultBody.es);
  
  // Reemplazar parámetros
  if (params) {
    Object.keys(params).forEach(key => {
      body = body.replace(`{${key}}`, params[key]);
    });
  }
  
  return { title, body };
};

export default {
  configurarNotificaciones,
  escucharNotificacionesEnTiempoReal,
  enviarNotificacionLocal,
  limpiarTokenNotificaciones,
  verificarEstadoNotificaciones,
  getNotificationText
};

