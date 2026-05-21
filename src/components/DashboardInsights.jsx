// src/components/DashboardInsights.jsx
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const DashboardInsights = ({ 
  saldoCaja, 
  ventasTotales, 
  gastosTotales, 
  margenNeto,
  diasInactividad,
  productosEstrella,
  productosHueso,
  gastosFijosMensuales,
  tendenciaVentas,
  idioma 
}) => {
  const { t } = useTranslation();

  // Calcular oxígeno financiero
  const gastoDiario = gastosFijosMensuales > 0 ? gastosFijosMensuales / 30 : 0;
  const diasCubiertos = gastoDiario > 0 ? (saldoCaja / gastoDiario).toFixed(1) : 0;
  const necesitaAccion = diasCubiertos < 5;

  // Determinar mensaje de saludo según hora
  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return t('goodMorning');
    if (hora < 19) return t('goodAfternoon');
    return t('goodEvening');
  };

  // Mensajes dinámicos según estado del negocio
  const getMensajePrincipal = () => {
    if (diasCubiertos < 2) {
      return {
        texto: t('alertaCajaCritica') || `🚨 ¡ALERTA! Tu saldo cubre solo ${diasCubiertos} días. Necesitas acción inmediata.`,
        color: 'text-red-400',
        bg: 'bg-red-900/30',
        icono: '🚨'
      };
    }
    if (diasCubiertos < 5) {
      const montoNecesario = ((5 - diasCubiertos) * gastoDiario).toFixed(0);
      return {
        texto: t('alertaCajaBaja', { dias: diasCubiertos, monto: parseInt(montoNecesario).toLocaleString() }) || `⚠️ Tu saldo cubre solo ${diasCubiertos} días. Necesitas $${parseInt(montoNecesario).toLocaleString()} para llegar a 5 días.`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-900/30',
        icono: '⚠️'
      };
    }
    if (margenNeto < 10 && margenNeto > 0) {
      return {
        texto: t('alertaMargenBajo', { margen: margenNeto }) || `📉 Tu margen neto es ${margenNeto}%. Está por debajo del 15% recomendado. Revisa tus costos.`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-900/30',
        icono: '📉'
      };
    }
    if (diasInactividad > 3) {
      return {
        texto: t('alertaInactividad', { dias: diasInactividad }) || `📢 Llevas ${diasInactividad} días sin registrar movimientos. Registra tus operaciones para tener claridad financiera.`,
        color: 'text-blue-400',
        bg: 'bg-blue-900/30',
        icono: '📢'
      };
    }
    return {
      texto: t('mensajePositivo') || '✅ Todo está en orden. Sigue así para mantener tu negocio saludable.',
      color: 'text-green-400',
      bg: 'bg-green-900/30',
      icono: '✅'
    };
  };

  const mensaje = getMensajePrincipal();
  const saludo = getSaludo();

  return (
    <div className="space-y-4 mb-6">
      {/* Saludo personalizado */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-4 rounded-xl border border-cyan-500/20">
        <p className="text-cyan-400 text-lg font-bold">
          {saludo}, Emprendedor!
        </p>
        <p className="text-gray-300 text-sm mt-1">
          {t('letsTakeCare')}
        </p>
      </div>

      {/* Alerta principal dinámica */}
      <div className={`${mensaje.bg} p-4 rounded-xl border-l-4 ${mensaje.color === 'text-red-400' ? 'border-red-500' : mensaje.color === 'text-yellow-400' ? 'border-yellow-500' : mensaje.color === 'text-blue-400' ? 'border-blue-500' : 'border-green-500'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{mensaje.icono}</span>
          <p className={`text-sm ${mensaje.color}`}>{mensaje.texto}</p>
        </div>
      </div>

      {/* Insights tácticos - Grid de 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Oxígeno financiero */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-indigo-300 text-sm font-bold flex items-center gap-2">
              😴 {t('sleepIndicator') || 'Días de gastos cubiertos'}
            </h4>
            <span className={`text-sm font-bold ${necesitaAccion ? 'text-red-400' : 'text-green-400'}`}>
              {diasCubiertos} / 30 días
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all ${necesitaAccion ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (diasCubiertos / 30) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {t('covered') || 'Cubierto'}: ${saldoCaja.toLocaleString()} | 
            {t('missing') || 'Faltante'}: ${Math.max(0, gastosFijosMensuales - saldoCaja).toLocaleString()}
          </p>
        </div>

        {/* Productos Estrella */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <h4 className="text-green-400 text-sm font-bold mb-2 flex items-center gap-2">
            ⭐ {t('starProducts') || 'Productos Estrella'}
          </h4>
          {productosEstrella.length === 0 ? (
            <p className="text-gray-500 text-xs">{t('noStarProducts') || 'Aún no hay productos estrella. Registra más ventas.'}</p>
          ) : (
            <div className="space-y-2">
              {productosEstrella.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-white text-sm">{p.nombre}</span>
                  <span className="text-green-400 text-sm font-bold">${p.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productos Hueso */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <h4 className="text-red-400 text-sm font-bold mb-2 flex items-center gap-2">
            🦴 {t('boneProducts') || 'Productos Hueso'}
          </h4>
          {productosHueso.length === 0 ? (
            <p className="text-gray-500 text-xs">{t('noBoneProducts') || 'No hay productos hueso en inventario'}</p>
          ) : (
            <div className="space-y-2">
              {productosHueso.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-white text-sm">{p.producto}</span>
                  <span className="text-yellow-400 text-xs">{p.cantidad} und</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tendencia de Ventas */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <h4 className="text-cyan-400 text-sm font-bold mb-2 flex items-center gap-2">
            📈 {t('salesTrend') || 'Tendencia de Ventas'}
          </h4>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">{t('thisWeek') || 'Esta semana'}: ${(tendenciaVentas?.valorActual || 0).toLocaleString()}</span>
            <span className={`text-xs font-bold ${tendenciaVentas?.direccion === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {tendenciaVentas?.direccion === 'up' ? '↑' : '↓'} {tendenciaVentas?.porcentaje || 0}%
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            {t('vsLastWeek') || 'vs semana pasada'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardInsights;

