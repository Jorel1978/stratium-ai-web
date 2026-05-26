// src/components/TrustMeter.jsx
import React, { useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const TrustMeter = ({ 
  registrosCompletos = 0, 
  registrosTotales = 10, 
  pais = 'CO', 
  idioma = 'es',
  configuracion = {}
}) => {
  const { t } = useTranslation();
  
  const totalValido = Math.max(1, registrosTotales);
  const completosValido = Math.min(registrosCompletos, registrosTotales);
  const porcentajeRaw = (completosValido / totalValido) * 100;
  const porcentaje = Math.min(100, Math.max(0, Math.round(porcentajeRaw)));
  
  const umbralAlto = configuracion.umbralConfianzaAlto || 90;
  const umbralMedio = configuracion.umbralConfianzaMedio || 60;
  
  const estado = porcentaje >= umbralAlto 
    ? 'alto' 
    : porcentaje >= umbralMedio 
      ? 'medio' 
      : 'bajo';
  
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
  
  // ✅ CORREGIDO: Usar t() correctamente, NO variables crudas
  const tituloMedidor = t('auditTrustLevel');
  const mensajeConfianza = t(estadoConfig.mensajeKey);
  const textoProgreso = `${registrosCompletos}/${registrosTotales}`;
  
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className={`text-2xl ${estadoConfig.colorTexto} flex-shrink-0`}>
        {estadoConfig.icono}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">
          {tituloMedidor}
        </p>
        <p className={`text-sm font-bold truncate ${estadoConfig.colorTexto}`}>
          {mensajeConfianza}
        </p>
      </div>
      
      <div className="text-right flex-shrink-0 min-w-[70px]">
        <p className="text-lg font-bold text-white">{porcentaje}%</p>
        <p className="text-xs text-gray-500 truncate">
          {textoProgreso}
        </p>
      </div>
      
      <div className="w-20 bg-slate-700 rounded-full h-1.5 flex-shrink-0">
        <div 
          className={`${estadoConfig.colorBarra} h-1.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${porcentaje}%` }}
          role="progressbar"
        />
      </div>
      
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

