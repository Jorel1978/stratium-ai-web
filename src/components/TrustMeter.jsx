// src/components/TrustMeter.jsx
// Medidor de confianza por registro completo para Stratium AI
// Evalúa la calidad de los datos registrados por el usuario

import React, { useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Componente que muestra el nivel de confianza de la auditoría
 * basado en la cantidad de datos registrados por el usuario
 * @param {Object} props
 * @param {number} props.registrosCompletos - Cantidad de registros completados (ventas, compras, gastos)
 * @param {number} props.registrosTotales - Total esperado de registros (mínimo para confianza alta)
 * @param {string} props.pais - Código de país (CO, MX, GB, US, etc.)
 * @param {string} props.idioma - Idioma del usuario (es/en)
 * @param {Object} props.configuracion - Configuración adicional (opcional)
 */
const TrustMeter = ({ 
  registrosCompletos = 0, 
  registrosTotales = 10, 
  pais = 'CO', 
  idioma = 'es',
  configuracion = {}
}) => {
  const { t } = useTranslation();
  
  // Validar y calcular porcentaje (seguro)
  const totalValido = Math.max(1, registrosTotales);
  const completosValido = Math.min(registrosCompletos, registrosTotales);
  const porcentajeRaw = (completosValido / totalValido) * 100;
  const porcentaje = Math.min(100, Math.max(0, Math.round(porcentajeRaw)));
  
  // Determinar estado basado en porcentaje
  const umbralAlto = configuracion.umbralConfianzaAlto || 90;
  const umbralMedio = configuracion.umbralConfianzaMedio || 60;
  
  const estado = porcentaje >= umbralAlto 
    ? 'alto' 
    : porcentaje >= umbralMedio 
      ? 'medio' 
      : 'bajo';
  
  // Colores e iconos por estado
  const configEstado = {
    alto: {
      colorTexto: 'text-green-400',
      colorBarra: 'bg-green-500',
      icono: '🛡️',
      mensajeKey: 'highConfidence'
    },
    medio: {
      colorTexto: 'text-yellow-400',
      colorBarra: 'bg-yellow-500',
      icono: '⚠️',
      mensajeKey: 'mediumConfidence'
    },
    bajo: {
      colorTexto: 'text-red-400',
      colorBarra: 'bg-red-500',
      icono: '❌',
      mensajeKey: 'lowConfidence'
    }
  };
  
  const estadoConfig = configEstado[estado];
  
  // Obtener título del medidor
  const tituloMedidor = t('auditTrustLevel');
  
  // Obtener mensaje de confianza
  const mensajeConfianza = t(estadoConfig.mensajeKey);
  
  // Texto para el contador
  const textoProgreso = `${registrosCompletos}/${registrosTotales}`;
  
  return (
    <div 
      className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
      role="region"
      aria-label={tituloMedidor}
    >
      {/* Icono de estado */}
      <div 
        className={`text-2xl ${estadoConfig.colorTexto} flex-shrink-0`}
        role="img"
      >
        {estadoConfig.icono}
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">
          {tituloMedidor}
        </p>
        <p className={`text-sm font-bold truncate ${estadoConfig.colorTexto}`}>
          {mensajeConfianza}
        </p>
      </div>
      
      {/* Porcentaje y contador */}
      <div className="text-right flex-shrink-0 min-w-[70px]">
        <p className="text-lg font-bold text-white">{porcentaje}%</p>
        <p className="text-xs text-gray-500 truncate">
          {textoProgreso}
        </p>
      </div>
      
      {/* Mini barra de progreso */}
      <div className="w-20 bg-slate-700 rounded-full h-1.5 flex-shrink-0">
        <div 
          className={`${estadoConfig.colorBarra} h-1.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${porcentaje}%` }}
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      
      {/* Sugerencia para mejorar (solo en estado bajo o medio) */}
      {estado !== 'alto' && (
        <div className="w-full mt-2 pt-2 border-t border-slate-700/50 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            💡 {t('trustMessageLow')}
          </span>
        </div>
      )}
    </div>
  );
};

export default TrustMeter;
