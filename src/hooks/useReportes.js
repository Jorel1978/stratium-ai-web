import { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

export const useReportes = (usuarioActual, idioma) => {
  const db = getFirestore();
  const [limites, setLimites] = useState(null);
  const [cargandoLimites, setCargandoLimites] = useState(true);
  
  const plan = usuarioActual?.plan || 'starter';
  const lang = idioma === 'en' ? 'en' : 'es';
  
  // Definición de reportes por plan
  const REPORTES_CONFIG = {
    starter: {
      permitidos: [
        'pyg', 'ventas', 'gastos', 'compras', 'inventario',
        'cuentasPagar', 'cuentasCobrar', 'flujoCaja', 'auditoria',
        'utilidades6', 'kpi', 'comparativoMes', 'roi', 'proyecciones'
      ],
      limiteMensual: 1,
      mensaje: lang === 'en' 
        ? 'You have used your free report. Upgrade to Pro for more reports.'
        : 'Has usado tu reporte gratuito. Actualiza a Pro para más reportes.'
    },
    pro: {
      permitidos: ['pyg', 'ventas', 'gastos', 'compras', 'inventario'],
      limiteMensual: 5,
      mensaje: lang === 'en'
        ? 'You have reached the limit of 5 reports this month. Upgrade to Business for unlimited reports.'
        : 'Has alcanzado el límite de 5 reportes este mes. Actualiza a Business para reportes ilimitados.'
    },
    business: {
      permitidos: [
        'pyg', 'ventas', 'gastos', 'compras', 'inventario',
        'cuentasPagar', 'cuentasCobrar', 'flujoCaja', 'auditoria',
        'kpi', 'comparativoMes', 'roi'
      ],
      limiteMensual: 20,
      mensaje: lang === 'en'
        ? 'You have reached the limit of 20 reports this month. Upgrade to Elite for unlimited reports.'
        : 'Has alcanzado el límite de 20 reportes este mes. Actualiza a Elite para reportes ilimitados.'
    },
    elite: {
      permitidos: 'todos',
      limiteMensual: 'ilimitado',
      mensaje: null
    }
  };
  
  const puedeGenerarReporte = async (tipoReporte) => {
    if (!usuarioActual?.uid) return false;
    
    const config = REPORTES_CONFIG[plan];
    
    // Elite: ilimitado
    if (plan === 'elite') return true;
    
    // Verificar si el tipo de reporte está permitido para este plan
    if (config.permitidos !== 'todos' && !config.permitidos.includes(tipoReporte)) {
      return false;
    }
    
    try {
      // Obtener contador del usuario
      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      
      const hoy = new Date();
      const mesActual = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`;
      const contador = userData?.reportesGenerados?.[mesActual] || 0;
      
      if (contador >= config.limiteMensual) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error verificando límite:', error);
      return false;
    }
  };
  
  const registrarReporteGenerado = async () => {
    if (!usuarioActual?.uid) return;
    if (plan === 'elite') return;
    
    try {
      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      const hoy = new Date();
      const mesActual = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`;
      
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const contadorActual = userData?.reportesGenerados?.[mesActual] || 0;
      
      await updateDoc(userRef, {
        [`reportesGenerados.${mesActual}`]: contadorActual + 1,
        [`ultimoReporte`]: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error registrando reporte:', error);
    }
  };
  
  const getMensajeUpgrade = (tipoReporte) => {
    const config = REPORTES_CONFIG[plan];
    
    if (plan === 'elite') return null;
    
    // Si el tipo no está permitido
    if (config.permitidos !== 'todos' && !config.permitidos.includes(tipoReporte)) {
      if (lang === 'en') {
        return `🔒 This report is available in Business and Elite plans. Upgrade to access.`;
      }
      return `🔒 Este reporte está disponible en planes Business y Elite. Actualiza para acceder.`;
    }
    
    // Si excedió el límite
    return config.mensaje;
  };
  
  const getReportesDisponibles = () => {
    const config = REPORTES_CONFIG[plan];
    if (config.permitidos === 'todos') return 'todos';
    return config.permitidos;
  };
  
  return {
    puedeGenerarReporte,
    registrarReporteGenerado,
    getMensajeUpgrade,
    getReportesDisponibles,
    plan,
    cargandoLimites
  };
};

