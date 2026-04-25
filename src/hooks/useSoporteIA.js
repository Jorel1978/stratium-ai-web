// hooks/useSoporteIA.js
// Sistema de créditos para soporte IA - Stratium AI v2.3

import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Límites base por plan (consultas de soporte IA)
const LIMITES_SOPORTE_POR_PLAN = {
  gratis: 3,      // Starter: 3 consultas (solo FAQ)
  starter: 3,     // Starter (alias)
  pro: 15,        // Pro: 15 consultas
  business: 999999, // Business: Ilimitado (número muy alto)
  elite: 999999     // Elite: Ilimitado
};

// Paquetes de créditos adicionales (se compran dentro de la app)
export const PAQUETES_CREDITOS_SOPORTE = {
  basico: { creditos: 5, precioCOP: 9900, precioUSD: 4.99, nombre: 'Pack Básico' },
  frecuente: { creditos: 15, precioCOP: 19900, precioUSD: 9.99, nombre: 'Pack Frecuente' },
  profesional: { creditos: 40, precioCOP: 49900, precioUSD: 19.99, nombre: 'Pack Profesional' },
  empresarial: { creditos: 100, precioCOP: 99900, precioUSD: 39.99, nombre: 'Pack Empresarial' }
};

export const useSoporteIA = (usuarioActual) => {
  const [creditosDisponibles, setCreditosDisponibles] = useState(0);
  const [limitePlan, setLimitePlan] = useState(0);
  const [cargandoCreditos, setCargandoCreditos] = useState(true);
  const [necesitaUpgrade, setNecesitaUpgrade] = useState(false);

  // ============================================================
  // 1. OBTENER CRÉDITOS DISPONIBLES
  // ============================================================
  const obtenerCreditosDisponibles = useCallback(async () => {
    if (!usuarioActual?.uid) return 0;

    try {
      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return 0;

      const userData = userSnap.data();
      const plan = userData.plan || 'gratis';
      
      // Obtener límite según plan
      const limiteBase = LIMITES_SOPORTE_POR_PLAN[plan] || LIMITES_SOPORTE_POR_PLAN.gratis;
      setLimitePlan(limiteBase);
      
      // Obtener créditos usados y extras
      const creditosUsados = userData.creditosUsadosSoporte || 0;
      const creditosExtra = userData.creditosExtraSoporte || 0;
      
      // Para Business y Elite es ilimitado
      if (plan === 'business' || plan === 'elite') {
        setCreditosDisponibles(999999);
        setNecesitaUpgrade(false);
        return 999999;
      }
      
      // Cálculo de créditos disponibles: (límite del plan + créditos extra) - usados
      const disponibles = (limiteBase + creditosExtra) - creditosUsados;
      const disponiblesFinal = Math.max(0, disponibles);
      
      setCreditosDisponibles(disponiblesFinal);
      setNecesitaUpgrade(disponiblesFinal <= 0);
      
      return disponiblesFinal;
      
    } catch (error) {
      console.error('Error obteniendo créditos de soporte:', error);
      return 0;
    } finally {
      setCargandoCreditos(false);
    }
  }, [usuarioActual]);

  // ============================================================
  // 2. VERIFICAR CRÉDITO ANTES DE ENVIAR MENSAJE
  // ============================================================
  const verificarCredito = useCallback(async () => {
    if (!usuarioActual?.uid) {
      return { valido: false, mensaje: 'Debes iniciar sesión', creditosRestantes: 0 };
    }

    const plan = usuarioActual.plan || 'gratis';
    
    // Business y Elite son ilimitados
    if (plan === 'business' || plan === 'elite') {
      return { valido: true, mensaje: 'Consultas ilimitadas', creditosRestantes: 999999 };
    }

    const creditos = await obtenerCreditosDisponibles();
    
    if (creditos <= 0) {
      const mensaje = {
        es: '⚠️ Has agotado tus consultas de soporte IA este mes. Compra créditos adicionales o mejora tu plan.',
        en: '⚠️ You have exhausted your AI support consultations for this month. Buy additional credits or upgrade your plan.'
      };
      return { 
        valido: false, 
        mensaje: mensaje, 
        creditosRestantes: 0,
        necesitaUpgrade: true
      };
    }
    
    return { valido: true, mensaje: `${creditos} consultas disponibles`, creditosRestantes: creditos };
  }, [usuarioActual, obtenerCreditosDisponibles]);

  // ============================================================
  // 3. CONSUMIR CRÉDITO (DESPUÉS DE ENVIAR MENSAJE)
  // ============================================================
  const consumirCredito = useCallback(async () => {
    if (!usuarioActual?.uid) return false;
    
    const plan = usuarioActual.plan || 'gratis';
    
    // Business y Elite no consumen créditos
    if (plan === 'business' || plan === 'elite') {
      return true;
    }
    
    try {
      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      await updateDoc(userRef, {
        creditosUsadosSoporte: increment(1)
      });
      
      // Actualizar estado local
      setCreditosDisponibles(prev => Math.max(0, prev - 1));
      return true;
      
    } catch (error) {
      console.error('Error consumiendo crédito de soporte:', error);
      return false;
    }
  }, [usuarioActual]);

  // ============================================================
  // 4. AGREGAR CRÉDITOS EXTRA (COMPRA DE PAQUETE)
  // ============================================================
  const agregarCreditosExtra = useCallback(async (paqueteId) => {
    if (!usuarioActual?.uid) return false;
    
    const paquete = PAQUETES_CREDITOS_SOPORTE[paqueteId];
    if (!paquete) return false;
    
    try {
      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      await updateDoc(userRef, {
        creditosExtraSoporte: increment(paquete.creditos)
      });
      
      // Actualizar estado local
      setCreditosDisponibles(prev => prev + paquete.creditos);
      setNecesitaUpgrade(false);
      return true;
      
    } catch (error) {
      console.error('Error agregando créditos extra:', error);
      return false;
    }
  }, [usuarioActual]);

  // ============================================================
  // 5. OBTENER MENSAJE DE BLOQUEO (PARA MODAL)
  // ============================================================
  const getMensajeBloqueo = useCallback((idioma = 'es') => {
    const mensajes = {
      es: {
        titulo: '💬 Consultas Agotadas',
        mensaje: 'Has utilizado todas tus consultas de soporte IA este mes.',
        subtitulo: '¿Qué puedes hacer?',
        opciones: [
          '📦 Comprar créditos adicionales (paquetes desde 5 consultas)',
          '🚀 Mejorar tu plan para obtener más consultas mensuales',
          '⏳ Esperar al próximo mes (se reinician las consultas)'
        ],
        botonComprar: 'Comprar Créditos',
        botonMejorar: 'Mejorar Plan',
        botonCerrar: 'Cerrar'
      },
      en: {
        titulo: '💬 Consultations Exhausted',
        mensaje: 'You have used all your AI support consultations this month.',
        subtitulo: 'What can you do?',
        opciones: [
          '📦 Buy additional credits (packs from 5 consultations)',
          '🚀 Upgrade your plan for more monthly consultations',
          '⏳ Wait until next month (consultations reset)'
        ],
        botonComprar: 'Buy Credits',
        botonMejorar: 'Upgrade Plan',
        botonCerrar: 'Close'
      }
    };
    return mensajes[idioma] || mensajes.es;
  }, []);

  // ============================================================
  // 6. ACTUALIZAR EL TEXTO DEL DICTAMEN (ROI y Capital)
  // ============================================================
  const actualizarDictamenConROI = useCallback((textoDictamen, usuarioActual, idioma = 'es') => {
    const aportes = usuarioActual?.aportesPersonales || 0;
    const deuda = usuarioActual?.deudaConDueño || 0;
    const capitalTotal = aportes + deuda;
    
    if (capitalTotal === 0) {
      const mensaje = idioma === 'es'
        ? '\n\n⚠️ Completa tu inversión inicial para calcular tu ROI (Retorno sobre Inversión). Registra tus aportes personales o deudas con el dueño.'
        : '\n\n⚠️ Complete your initial investment to calculate your ROI (Return on Investment). Record your personal contributions or debts to the owner.';
      return textoDictamen + mensaje;
    }
    
    // Si ya hay ROI, no modificar (el cálculo se hace en generarDictamenGeneral)
    return textoDictamen;
  }, []);

  // Cargar créditos al montar
  useEffect(() => {
    if (usuarioActual?.uid) {
      obtenerCreditosDisponibles();
    }
  }, [usuarioActual?.uid, obtenerCreditosDisponibles]);

  return {
    creditosDisponibles,
    limitePlan,
    cargandoCreditos,
    necesitaUpgrade,
    verificarCredito,
    consumirCredito,
    agregarCreditosExtra,
    obtenerCreditosDisponibles,
    getMensajeBloqueo,
    actualizarDictamenConROI,
    paquetesCreditos: PAQUETES_CREDITOS_SOPORTE
  };
};

export default useSoporteIA;
