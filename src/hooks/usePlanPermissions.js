// src/hooks/usePlanPermissions.js
import { useMemo } from 'react';
import { obtenerPermisos, puedeAcceder, getTextoFuncionalidad } from '../config/permisos';
import { useTranslation } from './useTranslation';

export const usePlanPermissions = (usuarioActual) => {
  const { t, idioma } = useTranslation();
  const lang = idioma === 'en' ? 'en' : 'es';
  
  const plan = useMemo(() => {
    if (!usuarioActual?.plan) return 'starter';
    const planUsuario = usuarioActual.plan.toLowerCase();
    if (planUsuario === 'gratis') return 'starter';
    return planUsuario;
  }, [usuarioActual?.plan]);
  
  const permisos = useMemo(() => obtenerPermisos(plan), [plan]);
  
  const puede = (funcionalidad) => {
    return puedeAcceder(plan, funcionalidad, lang);
  };
  
  const getTexto = (funcionalidad) => {
    return getTextoFuncionalidad(plan, funcionalidad, lang);
  };
  
  const getLimite = (funcionalidad) => {
    const valor = permisos[funcionalidad];
    if (typeof valor === 'object' && valor !== null) {
      if (valor.limite) return valor.limite;
      if (valor.maxProductos) return valor.maxProductos;
      if (valor.meses) return valor.meses;
      if (valor.dias) return valor.dias;
    }
    return null;
  };
  
  const getMensajeUpgrade = (funcionalidad) => {
    const textoFunc = getTexto(funcionalidad);
    if (lang === 'en') {
      return `🔒 Upgrade to ${permisos.nombre.en} to unlock: ${textoFunc}`;
    }
    return `🔒 Actualiza a ${permisos.nombre.es} para desbloquear: ${textoFunc}`;
  };
  
  return {
    plan,
    permisos,
    puede,
    getTexto,
    getLimite,
    getMensajeUpgrade,
    isProductionBlocked: !permisos.produccion,
    isBotBlocked: !permisos.bot?.nivel,
    isExportBlocked: !permisos.exportarCSV,
    isReportBlocked: !permisos.reportesPDF?.disponible
  };
};

