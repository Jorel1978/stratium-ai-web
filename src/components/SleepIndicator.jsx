// src/components/SleepIndicator.jsx
// Indicador visual de días de gastos fijos cubiertos para Stratium AI
// Calcula días reales del mes actual y muestra progreso con precisión financiera

import React, { useMemo } from 'react';
import { formatMoneyUniversal } from '../util/formatMoneyUniversal';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Obtener número de días del mes actual
 * @returns {number} Días del mes actual (28-31)
 */
const getDaysInCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Componente que muestra cuántos días de gastos fijos están cubiertos
 * @param {Object} props
 * @param {number} props.utilidadAcumuladaAuditada - Utilidad neta acumulada (YA descontados costos variables)
 * @param {number} props.gastosFijosMensuales - Total de gastos fijos del mes (arriendo, servicios, nómina)
 * @param {string} props.pais - Código de país (CO, MX, GB, US, etc.)
 * @param {string} props.idioma - Idioma del usuario (es/en)
 */
const SleepIndicator = ({ 
  utilidadAcumuladaAuditada = 0, 
  gastosFijosMensuales = 0, 
  pais = 'CO', 
  idioma = 'es' 
}) => {
  const { t } = useTranslation();
  
  // Normalizar país (UK → GB para consistencia)
  const paisNormalizado = pais === 'UK' ? 'GB' : pais;
  
  // Validar gastos fijos (evitar división por cero)
  const gastosFijosValidos = gastosFijosMensuales > 0 ? gastosFijosMensuales : 1;
  const diasDelMes = getDaysInCurrentMonth();
  const gastosFijosDiarios = gastosFijosValidos / diasDelMes;
  
  // Calcular días cubiertos (con 1 decimal para precisión)
  const diasCubiertosExactos = utilidadAcumuladaAuditada / gastosFijosDiarios;
  const diasCubiertos = Math.floor(diasCubiertosExactos * 10) / 10; // 1 decimal
  const porcentaje = Math.min(100, (utilidadAcumuladaAuditada / gastosFijosValidos) * 100);
  
  // Determinar estado para colores
  const estado = porcentaje >= 100 ? 'completo' : porcentaje >= 50 ? 'parcial' : 'alerta';
  const colorBarra = estado === 'completo' 
    ? 'bg-green-500' 
    : estado === 'parcial' 
      ? 'bg-yellow-500' 
      : 'bg-red-500';
  const colorTexto = estado === 'completo' 
    ? 'text-green-400' 
    : estado === 'parcial' 
      ? 'text-yellow-400' 
      : 'text-red-400';
  
  // Obtener mensaje contextual
  const mensajeContextual = useMemo(() => {
    if (porcentaje >= 100) {
      return t('mensajeSueñoExcelente') || '🎉 Excelente. Tus gastos fijos del mes ya están cubiertos.';
    }
    
    const diasRestantes = Math.max(0, diasDelMes - diasCubiertos);
    
    if (porcentaje >= 50) {
      return t('mensajeSueñoBueno', { dias: diasRestantes }) || `Te faltan ${diasRestantes} días para cubrir los gastos fijos del mes.`;
    }
    
    if (porcentaje > 0) {
      return t('mensajeSueñoRegular', { dias: diasCubiertos }) || `Cubres ${diasCubiertos} días de gastos fijos.`;
    }
    
    return t('mensajeSueñoCritico') || '🚨 No has generado utilidad suficiente para cubrir gastos fijos.';
  }, [porcentaje, diasCubiertos, diasDelMes, t]);
  
  // Formatear texto de días cubiertos
  const textoDiasCubiertos = t('daysCovered', { dias: diasCubiertos, total: diasDelMes }) || `${diasCubiertos}/${diasDelMes} días`;
  
  // Si no hay utilidad acumulada y no hay gastos configurados, mostrar estado inicial
  if (utilidadAcumuladaAuditada === 0 && gastosFijosMensuales === 0) {
    return (
      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-4 rounded-xl border border-indigo-500/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-indigo-300 font-bold text-sm flex items-center gap-2">
            😴 {t('sleepIndicator') || 'Días de gastos cubiertos'}
          </span>
          <span className="text-gray-400 text-sm">
            {t('noData') || 'Sin datos'}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
          <div className="bg-gray-500 h-3 rounded-full" style={{ width: '0%' }} />
        </div>
        <p className="text-xs text-gray-400">
          {t('mensajeSinDatos') || 'Registra tus gastos fijos y ventas para ver cuántos días cubres.'}
        </p>
      </div>
    );
  }
  
  return (
    <div 
      className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-4 rounded-xl border border-indigo-500/30"
      role="region"
      aria-label={t('sleepIndicatorAria') || 'Indicador de días cubiertos'}
    >
      {/* Header con título y contador */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-indigo-300 font-bold text-sm flex items-center gap-2">
          😴 {t('sleepIndicator') || 'Días de gastos cubiertos'}
        </span>
        <span className={`${colorTexto} text-sm font-bold`}>
          {textoDiasCubiertos}
        </span>
      </div>
      
      {/* Barra de progreso */}
      <div className="w-full bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
        <div 
          className={`${colorBarra} h-3 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${porcentaje}%` }}
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      
      {/* Mensaje contextual */}
      <p className={`text-xs ${colorTexto} font-medium`}>
        {mensajeContextual}
      </p>
      
      {/* Detalle numérico */}
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-400">
        <div>
          <span className="text-gray-500">
            {t('covered') || 'Cubierto:'}
          </span>
          <span className="text-white ml-1">
            {formatMoneyUniversal(utilidadAcumuladaAuditada, paisNormalizado)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-gray-500">
            {t('missing') || 'Faltante:'}
          </span>
          <span className="text-white ml-1">
            {formatMoneyUniversal(Math.max(0, gastosFijosValidos - utilidadAcumuladaAuditada), paisNormalizado)}
          </span>
        </div>
      </div>
      
      {/* Tooltip informativo */}
      <div className="mt-2 text-right">
        <span 
          className="text-[10px] text-gray-500 cursor-help border-b border-dotted border-gray-600"
          title={t('tooltipAuditedProfit') || 'Utilidad neta = Ventas - Costos variables. Los gastos fijos se restan aquí para calcular días cubiertos.'}
        >
          ⓘ {t('auditedNetProfit') || 'Utilidad neta auditada'}
        </span>
      </div>
    </div>
  );
};

export default SleepIndicator;

