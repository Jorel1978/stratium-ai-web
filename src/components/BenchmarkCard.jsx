// src/components/BenchmarkCard.jsx
// Inteligencia de Colmena - Comparativa anónima de precios para Stratium AI
// Soporte multi-país con mensajes contextuales y diseño responsive

import React, { useMemo } from 'react';
import { formatMoneyUniversal } from '../util/formatMoneyUniversal';
import { obtenerTexto } from '../locales/index';

/**
 * Componente que muestra comparativa de precios con otros negocios de la zona
 * @param {Object} props
 * @param {string} props.producto - Nombre del producto comparado
 * @param {number} props.precioUsuario - Precio que paga el usuario actual
 * @param {Object} props.benchmark - Datos de benchmark (disponible, promedioZona, rango, totalRegistros, zona)
 * @param {string} props.pais - Código de país (CO, MX, GB, US, etc.)
 * @param {string} props.idioma - Idioma del usuario (es/en)
 * @param {Function} props.onVerDetalles - Callback para ver detalles/oportunidad de mejora
 * @param {Function} props.onMantenerVentaja - Callback para cuando es más barato
 */
const BenchmarkCard = ({ 
  producto, 
  precioUsuario = 0, 
  benchmark = {}, 
  pais = 'CO', 
  idioma = 'es', 
  onVerDetalles,
  onMantenerVentaja
}) => {
  // ============================================================
  // 1. TODOS LOS HOOKS PRIMERO (NUNCA CONDICIONALES)
  // ============================================================
  
  // Normalizar país (UK → GB para consistencia)
  const paisNormalizado = useMemo(() => {
    return pais === 'UK' ? 'GB' : pais;
  }, [pais]);
  
  // Validar datos disponibles (con valores por defecto seguros)
  const disponible = useMemo(() => {
    return benchmark?.disponible === true;
  }, [benchmark?.disponible]);
  
  const promedioZona = useMemo(() => {
    return benchmark?.promedioZona || 0;
  }, [benchmark?.promedioZona]);
  
  const minRango = useMemo(() => {
    return benchmark?.rango?.min || 0;
  }, [benchmark?.rango?.min]);
  
  const maxRango = useMemo(() => {
    return benchmark?.rango?.max || 0;
  }, [benchmark?.rango?.max]);
  
  const totalRegistros = useMemo(() => {
    return benchmark?.totalRegistros || 0;
  }, [benchmark?.totalRegistros]);
  
  const zona = useMemo(() => {
    return benchmark?.zona || 'ciudad';
  }, [benchmark?.zona]);
  
  // Calcular diferencia porcentual
  const diferencia = useMemo(() => {
    if (promedioZona === 0) return 0;
    return ((precioUsuario - promedioZona) / promedioZona) * 100;
  }, [precioUsuario, promedioZona]);
  
  const esMasCaro = useMemo(() => {
    return diferencia > 10;
  }, [diferencia]);
  
  const esMasBarato = useMemo(() => {
    return diferencia < -10;
  }, [diferencia]);
  
  const porcentajeAbs = useMemo(() => {
    return Math.abs(diferencia).toFixed(0);
  }, [diferencia]);
  
  // Colores según situación
  const colorTexto = useMemo(() => {
    if (esMasCaro) return 'text-red-400';
    if (esMasBarato) return 'text-green-400';
    return 'text-gray-400';
  }, [esMasCaro, esMasBarato]);
  
  const colorBorde = useMemo(() => {
    if (esMasCaro) return 'border-red-500/30';
    if (esMasBarato) return 'border-green-500/30';
    return 'border-gray-500/30';
  }, [esMasCaro, esMasBarato]);
  
  const colorBgBoton = useMemo(() => {
    if (esMasCaro) return 'bg-red-900/20 hover:bg-red-900/30 text-red-400';
    if (esMasBarato) return 'bg-green-900/20 hover:bg-green-900/30 text-green-400';
    return 'bg-gray-900/20 text-gray-400';
  }, [esMasCaro, esMasBarato]);
  
  // Obtener mensaje según situación (desde locales)
  const getMensaje = useMemo(() => {
    if (esMasCaro) {
      return obtenerTexto(paisNormalizado, idioma, 'benchmarkMensajeCaro', {
        cantidad: totalRegistros,
        producto: producto,
        porcentaje: porcentajeAbs
      });
    }
    
    if (esMasBarato) {
      return obtenerTexto(paisNormalizado, idioma, 'benchmarkMensajeBarato', {
        cantidad: totalRegistros,
        producto: producto,
        porcentaje: porcentajeAbs
      });
    }
    
    return obtenerTexto(paisNormalizado, idioma, 'benchmarkMensajeAlineado', {
      producto: producto
    });
  }, [esMasCaro, esMasBarato, paisNormalizado, idioma, totalRegistros, producto, porcentajeAbs]);
  
  // Texto de granularidad geográfica
  const textoZona = useMemo(() => {
    if (zona === 'ciudad') {
      return obtenerTexto(paisNormalizado, idioma, 'benchmarkZonaCiudad', {
        default: 'Basado en tu ciudad'
      });
    }
    return obtenerTexto(paisNormalizado, idioma, 'benchmarkZonaPais', {
      default: 'Basado en todo el país'
    });
  }, [zona, paisNormalizado, idioma]);
  
  // Texto de acción para el botón
  const textoAccion = useMemo(() => {
    if (esMasCaro) {
      return obtenerTexto(paisNormalizado, idioma, 'benchmarkAccionCaro', {
        default: '💡 Ver oportunidad de ahorro'
      });
    }
    if (esMasBarato) {
      return obtenerTexto(paisNormalizado, idioma, 'benchmarkAccionBarato', {
        default: '💰 ¿Cómo mantener este margen?'
      });
    }
    return obtenerTexto(paisNormalizado, idioma, 'benchmarkAccionAlineado', {
      default: '📊 Ver comparativa detallada'
    });
  }, [esMasCaro, esMasBarato, paisNormalizado, idioma]);
  
  // ============================================================
  // 2. CONDICIONALES DE SALIDA (DESPUÉS DE LOS HOOKS)
  // ============================================================
  
  // Si no hay datos disponibles, mostrar null
  if (!disponible || promedioZona === 0) {
    return null;
  }
  
  // ============================================================
  // 3. RENDERIZADO (DESPUÉS DE LOS HOOKS Y CONDICIONALES)
  // ============================================================
  
  return (
    <div 
      className={`benchmark-card bg-slate-800/50 p-3 rounded-lg border ${colorBorde} transition-all hover:shadow-md`}
      role="region"
      aria-label={obtenerTexto(paisNormalizado, idioma, 'benchmarkTitulo')}
    >
      {/* Header con título y granularidad */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <p className="text-xs text-cyan-400 font-bold flex items-center gap-1">
          🐝 {obtenerTexto(paisNormalizado, idioma, 'benchmarkTitulo')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {totalRegistros > 0 && (
            <span className="text-xs text-gray-500">
              ({totalRegistros} {obtenerTexto(paisNormalizado, idioma, 'benchmarkRegistros', { default: 'registros' })})
            </span>
          )}
          <span className="text-xs text-gray-500 border-l border-gray-600 pl-2">
            {textoZona}
          </span>
        </div>
      </div>
      
      {/* Mensaje contextual */}
      <p className={`text-sm font-medium ${colorTexto} mb-2 break-words`}>
        {getMensaje}
      </p>
      
      {/* Detalles numéricos - responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-400 mb-3">
        <div className="bg-slate-900/30 p-2 rounded">
          <p className="text-gray-500">
            {obtenerTexto(paisNormalizado, idioma, 'benchmarkTuPrecio', { default: 'Tu precio' })}
          </p>
          <p className="text-white font-medium break-words">
            {formatMoneyUniversal(precioUsuario, paisNormalizado)}
          </p>
        </div>
        <div className="bg-slate-900/30 p-2 rounded">
          <p className="text-gray-500">
            {obtenerTexto(paisNormalizado, idioma, 'benchmarkPromedio', { default: 'Promedio zona' })}
          </p>
          <p className="text-white font-medium break-words">
            {formatMoneyUniversal(promedioZona, paisNormalizado)}
          </p>
        </div>
        <div className="bg-slate-900/30 p-2 rounded">
          <p className="text-gray-500">
            {obtenerTexto(paisNormalizado, idioma, 'benchmarkRango', { default: 'Rango típico' })}
          </p>
          <p className="text-white font-medium break-words">
            {formatMoneyUniversal(minRango, paisNormalizado)} - {formatMoneyUniversal(maxRango, paisNormalizado)}
          </p>
        </div>
      </div>
      
      {/* Acción según situación */}
      {onVerDetalles && (esMasCaro || esMasBarato) && (
        <button 
          onClick={() => onVerDetalles(producto, benchmark, { esMasCaro, esMasBarato, diferencia })}
          className={`w-full text-xs font-medium py-1.5 px-2 rounded ${colorBgBoton} transition-colors`}
        >
          {textoAccion}
        </button>
      )}
      
      {/* Acción adicional para mantener ventaja (si es más barato) */}
      {esMasBarato && onMantenerVentaja && (
        <button 
          onClick={() => onMantenerVentaja(producto, benchmark)}
          className="w-full text-xs text-gray-400 hover:text-gray-300 font-medium py-1 px-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors mt-2"
        >
          {obtenerTexto(paisNormalizado, idioma, 'benchmarkMantenerVentaja', {
            default: '🔒 ¿Cómo mantener esta ventaja?'
          })}
        </button>
      )}
    </div>
  );
};

export default BenchmarkCard;

