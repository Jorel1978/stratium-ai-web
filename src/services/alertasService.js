// src/services/alertasService.js
// ✅ Servicio de alertas con mitigaciones de seguridad aplicadas
// Auditoría: Abril 2026 | Estado: PRODUCCIÓN-SEGURO
// 🔧 Corregido: Eliminada dependencia de 'batch' y 'import.meta' para compatibilidad con CRA

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import emailjs from '@emailjs/browser';

const db = getFirestore();

// ============================================================
// 🔐 CONFIGURACIÓN SEGURA - Variables de Entorno
// ============================================================
// ✅ CORREGIDO: Usar process.env (estándar Create React App) en lugar de import.meta (Vite)
const EMAILJS_CONFIG = {
  userId: process.env.REACT_APP_EMAILJS_USER_ID || "",
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || "",
  templateIdVencimiento: process.env.REACT_APP_EMAILJS_TEMPLATE_VENCIMIENTO || "",
  templateIdStock: process.env.REACT_APP_EMAILJS_TEMPLATE_STOCK || ""
};

const APP_URL = process.env.REACT_APP_APP_URL || 'https://agente-financiero-ia-8548f.web.app';

if (process.env.NODE_ENV === 'development') {
  if (!EMAILJS_CONFIG.userId || !EMAILJS_CONFIG.serviceId) {
    console.warn('⚠️ ADVERTENCIA: Configuración de EmailJS incompleta. Revisa tus variables de entorno.');
  }
}

if (EMAILJS_CONFIG.userId) {
  emailjs.init(EMAILJS_CONFIG.userId);
}

// ============================================================
// 🔐 FUNCIONES AUXILIARES DE SEGURIDAD
// ============================================================

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/[\r\n]/g, '');
};

const validarEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
};

const aFechaLocal = (fecha) => {
  if (!fecha) return null;
  const f = new Date(fecha);
  if (isNaN(f.getTime())) return null;
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
};

// ✅ CRÍTICA #1: Obtener usuario autenticado con validación estricta
const getUsuarioSeguro = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('USUARIO_NO_AUTENTICADO: Se requiere sesión activa para operar con datos sensibles');
  }
  
  return {
    uid: currentUser.uid,
    email: currentUser.email
  };
};

// ============================================================
// 📧 ENVÍO DE CORREO - Con validaciones y sanitización
// ============================================================
const enviarCorreoAlerta = async (email, asunto, mensaje, tipoPlantilla = 'vencimiento') => {
  if (!validarEmail(email)) {
    console.error('❌ Email inválido para alerta:', email);
    return false;
  }
  
  if (!EMAILJS_CONFIG.serviceId) {
    console.error('❌ EmailJS no configurado: serviceId faltante');
    return false;
  }
  
  const templateId = tipoPlantilla === 'stock' 
    ? EMAILJS_CONFIG.templateIdStock 
    : EMAILJS_CONFIG.templateIdVencimiento;
    
  if (!templateId) {
    console.error(`❌ Template ID no configurado para tipo: ${tipoPlantilla}`);
    return false;
  }
  
  const safeAsunto = String(asunto).replace(/[\r\n]/g, '').substring(0, 200);
  
  const templateParams = {
    to_email: email.trim().toLowerCase(),
    asunto: safeAsunto,
    mensaje: mensaje,
    app_url: APP_URL
  };
  
  try {
    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId, 
      templateId, 
      templateParams
    );
    
    console.log(`✅ Correo enviado a ${email} | Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo:', { 
      message: error.text || error.message,
      status: error.status,
      email: email
    });
    return false;
  }
};

// ============================================================
// 📦 VERIFICAR VENCIMIENTO DE PRODUCTOS
// ============================================================
export const verificarVencimientoProductos = async (userEmail) => {
  try {
    const { uid: userId, email: emailAutenticado } = getUsuarioSeguro();
    
    const emailDestino = validarEmail(userEmail) ? userEmail : emailAutenticado;
    if (!validarEmail(emailDestino)) {
      console.error('❌ No hay email válido para enviar alertas');
      return [];
    }
    
    const inventarioRef = collection(db, 'inventario');
    const q = query(inventarioRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const hoy = aFechaLocal(new Date());
    if (!hoy) {
      console.error('❌ Error calculando fecha actual');
      return [];
    }
    
    const productosPorVencer = [];
    
    snapshot.forEach(docSnap => {
      try {
        const producto = docSnap.data();
        
        if (producto.userId && producto.userId !== userId) {
          console.warn(`⚠️ Documento ${docSnap.id} tiene userId mismatch, omitiendo`);
          return;
        }
        
        if (producto.fechaVencimiento && !producto.alertaVencimientoEnviada) {
          const vencimiento = aFechaLocal(producto.fechaVencimiento);
          
          if (vencimiento) {
            const diffDays = Math.round((vencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3 && diffDays >= 0 && producto.cantidad > 0) {
              productosPorVencer.push({
                id: docSnap.id,
                nombre: producto.producto,
                cantidad: producto.cantidad,
                dias: diffDays,
                fechaVencimiento: producto.fechaVencimiento
              });
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️ Error procesando documento ${docSnap.id}:`, err.message);
      }
    });
    
    if (productosPorVencer.length > 0) {
      let mensajeHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">⏰ ALERTA DE VENCIMIENTO</h2>
          <p style="color: #555;">Los siguientes productos están por vencer en tu inventario de STRATIUM GLOBAL AI:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Stock</th>
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Vence</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      productosPorVencer.forEach(p => {
        const fecha = new Date(p.fechaVencimiento).toLocaleDateString('es-CO', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        const urgencia = p.dias === 0 ? '🔴 HOY' : p.dias === 1 ? '🟠 Mañana' : `🟡 En ${p.dias} días`;
        
        mensajeHTML += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 8px; font-weight: 500;">${escapeHtml(p.nombre)}</td>
            <td style="padding: 12px 8px; text-align: center;">
              <span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
                ${escapeHtml(p.cantidad)} uds
              </span>
            </td>
            <td style="padding: 12px 8px;">
              <span style="color: ${p.dias <= 1 ? '#e74c3c' : '#e67e22'}; font-weight: 500;">
                ${escapeHtml(fecha)}
              </span>
              <br><small style="color: #888;">${urgencia}</small>
            </td>
          </tr>
        `;
      });
      
      mensajeHTML += `
            </tbody>
          </table>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #555;">
              <strong>💡 Recomendación STRATIUM GLOBAL AI:</strong> Ofrece descuentos urgentes o promociones flash para liquidar estos productos antes de que venzan.
            </p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${APP_URL}/inventario" 
               style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              📦 Ver inventario completo
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">
            STRATIUM GLOBAL AI - Tu asistente financiero con IA<br>
            <a href="${APP_URL}" style="color: #3498db; text-decoration: none;">agente-financiero-ia.web.app</a>
          </p>
        </div>
      `;
      
      const emailEnviado = await enviarCorreoAlerta(
        emailDestino,
        `⏰ STRATIUM GLOBAL AI: ${productosPorVencer.length} producto${productosPorVencer.length > 1 ? 's' : ''} por vencer`,
        mensajeHTML,
        'vencimiento'
      );
      
      // ✅ ACTUALIZACIONES SECUENCIALES (reemplaza batch para evitar errores)
      if (emailEnviado) {
        for (const p of productosPorVencer) {
          try {
            const productoRef = doc(db, 'inventario', p.id);
            await updateDoc(productoRef, { 
              alertaVencimientoEnviada: true,
              ultimaAlertaVencimiento: new Date().toISOString()
            });
          } catch (err) {
            console.warn(`⚠️ No se pudo actualizar flag para ${p.id}:`, err.message);
          }
        }
        console.log(`✅ Flags actualizados para ${productosPorVencer.length} productos`);
      } else {
        console.warn('⚠️ Email no enviado, flags de alerta NO actualizados (se reintentará)');
      }
    }
    
    return productosPorVencer;
    
  } catch (error) {
    console.error('❌ Error en verificarVencimientoProductos:', {
      code: error.code,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
      userId: process.env.NODE_ENV === 'development' ? getAuth().currentUser?.uid : undefined
    });
    return [];
  }
};

// ============================================================
// 📦 VERIFICAR STOCK BAJO
// ============================================================
export const verificarStockBajo = async (userEmail) => {
  try {
    const { uid: userId, email: emailAutenticado } = getUsuarioSeguro();
    
    const emailDestino = validarEmail(userEmail) ? userEmail : emailAutenticado;
    if (!validarEmail(emailDestino)) {
      console.error('❌ No hay email válido para enviar alertas');
      return [];
    }
    
    const inventarioRef = collection(db, 'inventario');
    const q = query(inventarioRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const productosStockBajo = [];
    
    snapshot.forEach(docSnap => {
      try {
        const producto = docSnap.data();
        
        if (producto.userId && producto.userId !== userId) {
          console.warn(`⚠️ Documento ${docSnap.id} tiene userId mismatch, omitiendo`);
          return;
        }
        
        const cantidad = typeof producto.cantidad === 'number' ? producto.cantidad : 0;
        
        if (cantidad < 5 && cantidad > 0 && !producto.alertaStockEnviada) {
          productosStockBajo.push({
            id: docSnap.id,
            nombre: producto.producto,
            cantidad: cantidad
          });
        }
      } catch (err) {
        console.warn(`⚠️ Error procesando documento ${docSnap.id}:`, err.message);
      }
    });
    
    if (productosStockBajo.length > 0) {
      let mensajeHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e67e22; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">⚠️ ALERTA DE STOCK BAJO</h2>
          <p style="color: #555;">Los siguientes productos tienen inventario crítico en STRATIUM GLOBAL AI:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Stock Actual</th>
                <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Mínimo Recomendado</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      productosStockBajo.forEach(p => {
        const nivelCritico = p.cantidad <= 2 ? '🔴 Crítico' : '🟡 Bajo';
        const colorBadge = p.cantidad <= 2 ? '#e74c3c' : '#e67e22';
        
        mensajeHTML += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 8px; font-weight: 500;">${escapeHtml(p.nombre)}</td>
            <td style="padding: 12px 8px; text-align: center;">
              <span style="background: ${colorBadge}20; color: ${colorBadge}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                ${escapeHtml(p.cantidad)} uds
              </span>
            </td>
            <td style="padding: 12px 8px; text-align: center;">
              <span style="color: #888;">5 uds</span>
            </td>
          </tr>
        `;
      });
      
      mensajeHTML += `
            </tbody>
          </table>
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>💡 Recomendación STRATIUM GLOBAL AI:</strong> Realiza pedidos a tus proveedores lo antes posible para evitar desabastecimiento y pérdida de ventas.
            </p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${APP_URL}/inventario" 
               style="background-color: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              📋 Gestionar inventario
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">
            STRATIUM GLOBAL AI - Tu asistente financiero con IA<br>
            <a href="${APP_URL}" style="color: #3498db; text-decoration: none;">agente-financiero-ia.web.app</a>
          </p>
        </div>
      `;
      
      const emailEnviado = await enviarCorreoAlerta(
        emailDestino,
        `⚠️ STRATIUM GLOBAL AI: ${productosStockBajo.length} producto${productosStockBajo.length > 1 ? 's' : ''} con stock bajo`,
        mensajeHTML,
        'stock'
      );
      
      // ✅ ACTUALIZACIONES SECUENCIALES (reemplaza batch para evitar errores)
      if (emailEnviado) {
        for (const p of productosStockBajo) {
          try {
            const productoRef = doc(db, 'inventario', p.id);
            await updateDoc(productoRef, { 
              alertaStockEnviada: true,
              ultimaAlertaStock: new Date().toISOString()
            });
          } catch (err) {
            console.warn(`⚠️ No se pudo actualizar flag para ${p.id}:`, err.message);
          }
        }
        console.log(`✅ Flags actualizados para ${productosStockBajo.length} productos`);
      } else {
        console.warn('⚠️ Email no enviado, flags de alerta NO actualizados (se reintentará)');
      }
    }
    
    return productosStockBajo;
    
  } catch (error) {
    console.error('❌ Error en verificarStockBajo:', {
      code: error.code,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
    return [];
  }
};

// ============================================================
// 🔄 PROGRAMAR ALERTAS DIARIAS
// ============================================================
export const programarAlertasDiarias = async (userEmail) => {
  try {
    const { uid: userId, email: emailAutenticado } = getUsuarioSeguro();
    
    const emailDestino = validarEmail(userEmail) ? userEmail : emailAutenticado;
    if (!validarEmail(emailDestino)) {
      console.error('❌ No hay email válido para alertas programadas');
      return { ejecutado: false, error: 'EMAIL_INVALIDO' };
    }
    
    const hoy = new Date().toISOString().split('T')[0];
    
    const configRef = doc(db, 'configAlertas', userId);
    const configSnap = await getDoc(configRef);
    const configData = configSnap.data();
    const ultimaEjecucion = configData?.ultimaEjecucion?.split('T')[0];
    
    if (ultimaEjecucion === hoy) {
      console.log(`ℹ️ Alertas ya ejecutadas hoy para usuario ${userId}`);
      return { 
        ejecutado: false, 
        razon: 'YA_EJECUTADO_HOY',
        ultimaEjecucion: configData?.ultimaEjecucion
      };
    }
    
    console.log(`🔄 Ejecutando alertas diarias para usuario ${userId}`);
    
    const [vencimientos, stockBajo] = await Promise.allSettled([
      verificarVencimientoProductos(emailDestino),
      verificarStockBajo(emailDestino)
    ]);
    
    const resultados = {
      vencimientos: vencimientos.status === 'fulfilled' ? vencimientos.value.length : 0,
      stockBajo: stockBajo.status === 'fulfilled' ? stockBajo.value.length : 0,
      errores: []
    };
    
    if (vencimientos.status === 'rejected') {
      resultados.errores.push(`vencimientos: ${vencimientos.reason?.message || 'Error desconocido'}`);
      console.error('❌ Error en verificarVencimientoProductos:', vencimientos.reason);
    }
    
    if (stockBajo.status === 'rejected') {
      resultados.errores.push(`stockBajo: ${stockBajo.reason?.message || 'Error desconocido'}`);
      console.error('❌ Error en verificarStockBajo:', stockBajo.reason);
    }
    
    if (resultados.vencimientos > 0 || resultados.stockBajo > 0 || resultados.errores.length === 2) {
      await setDoc(configRef, {
        ultimaEjecucion: new Date().toISOString(),
        historialEjecuciones: {
          [hoy]: {
            fecha: new Date().toISOString(),
            vencimientos: resultados.vencimientos,
            stockBajo: resultados.stockBajo,
            errores: resultados.errores
          }
        },
        totalAlertasEnviadas: (configData?.totalAlertasEnviadas || 0) + resultados.vencimientos + resultados.stockBajo
      }, { merge: true });
      
      console.log(`✅ Alertas diarias completadas: ${resultados.vencimientos} vencimientos, ${resultados.stockBajo} stock bajo`);
    }
    
    return {
      ejecutado: true,
      ...resultados,
      fecha: hoy
    };
    
  } catch (error) {
    console.error('❌ Error crítico en programarAlertasDiarias:', {
      code: error.code,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
    
    return {
      ejecutado: false,
      error: 'ERROR_CRITICO',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
};

// ============================================================
// 🧹 FUNCIÓN DE LIMPIEZA (Opcional)
// ============================================================
export const resetearFlagsAlerta = async (productIds, tipo = 'ambos') => {
  try {
    const { uid: userId } = getUsuarioSeguro();
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('productIds debe ser un array no vacío');
    }
    
    // ✅ Actualizaciones secuenciales simples
    for (const id of productIds) {
      const ref = doc(db, 'inventario', id);
      const updates = {};
      
      if (tipo === 'vencimiento' || tipo === 'ambos') {
        updates.alertaVencimientoEnviada = false;
      }
      if (tipo === 'stock' || tipo === 'ambos') {
        updates.alertaStockEnviada = false;
      }
      
      await updateDoc(ref, updates);
    }
    
    console.log(`✅ Flags reseteados para ${productIds.length} productos`);
    return true;
    
  } catch (error) {
    console.error('❌ Error en resetearFlagsAlerta:', error.message);
    throw error;
  }
};

// ============================================================
// 📊 OBTENER ESTADÍSTICAS DE ALERTAS
// ============================================================
export const obtenerEstadisticasAlertas = async () => {
  try {
    const { uid: userId } = getUsuarioSeguro();
    
    const configRef = doc(db, 'configAlertas', userId);
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
      return {
        ultimaEjecucion: null,
        totalAlertasEnviadas: 0,
        historial: []
      };
    }
    
    const data = configSnap.data();
    
    const historial = Object.entries(data.historialEjecuciones || {})
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .map(([fecha, datos]) => ({ fecha, ...datos }));
    
    return {
      ultimaEjecucion: data.ultimaEjecucion,
      totalAlertasEnviadas: data.totalAlertasEnviadas || 0,
      historial,
      proximaEjecucion: new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de alertas:', error.message);
    return null;
  }
};

