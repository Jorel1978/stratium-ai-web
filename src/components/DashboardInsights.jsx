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
  usuarioActual,
  idioma 
}) => {
  const { t } = useTranslation();

  const gastoDiario = gastosFijosMensuales > 0 ? gastosFijosMensuales / 30 : 0;
  const diasCubiertos = gastoDiario > 0 ? (saldoCaja / gastoDiario).toFixed(1) : 0;
  const necesitaAccion = diasCubiertos < 5;

  const nombreUsuario = usuarioActual?.displayName?.split(' ')[0] || 
                        usuarioActual?.email?.split('@')[0] || 
                        'Emprendedor';

  const getMensajeBienvenida = () => {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? t('goodMorning') : hora < 19 ? t('goodAfternoon') : t('goodEvening');
    
    if (diasCubiertos < 2) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. 🚨 ALERT! Your balance covers only ${diasCubiertos} days. Immediate action required.`
        : `${saludo}, ${nombreUsuario}. 🚨 ¡ALERTA! Tu saldo cubre solo ${diasCubiertos} días. Necesitas acción inmediata.`;
    }
    if (diasInactividad > 3) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. 📢 You haven't recorded transactions for ${diasInactividad} days.`
        : `${saludo}, ${nombreUsuario}. 📢 Llevas ${diasInactividad} días sin registrar movimientos.`;
    }
    if (margenNeto < 15 && margenNeto > 0) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. 📉 Your net margin is ${margenNeto}%. Review your costs.`
        : `${saludo}, ${nombreUsuario}. 📉 Tu margen neto es ${margenNeto}%. Revisa tus costos.`;
    }
    if (productosHueso.length > 0) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. 🦴 You have ${productosHueso.length} products without rotation.`
        : `${saludo}, ${nombreUsuario}. 🦴 Tienes ${productosHueso.length} productos sin rotación.`;
    }
    if (productosEstrella.length > 0) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. ⭐ Your star products generated $${productosEstrella[0]?.total?.toLocaleString()}.`
        : `${saludo}, ${nombreUsuario}. ⭐ Tus productos estrella generaron $${productosEstrella[0]?.total?.toLocaleString()}.`;
    }
    if (ventasTotales > 0 && ventasTotales > gastosTotales) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. ✅ Your business is generating profit. Keep it up.`
        : `${saludo}, ${nombreUsuario}. ✅ Tu negocio está generando utilidad. Sigue así.`;
    }
    if (ventasTotales > 0) {
      return idioma === 'en'
        ? `${saludo}, ${nombreUsuario}. 📊 You have recorded $${ventasTotales.toLocaleString()} in sales. Good job!`
        : `${saludo}, ${nombreUsuario}. 📊 Ya registraste ventas por $${ventasTotales.toLocaleString()}. ¡Bien!`;
    }
    return `${saludo}, ${nombreUsuario}. ${t('letsTakeCare')}`;
  };

  const mensajeBienvenida = getMensajeBienvenida();

  const getMensajePrincipal = () => {
    if (diasCubiertos < 2) {
      return {
        texto: idioma === 'en'
          ? `🚨 ALERT! Your balance covers only ${diasCubiertos} days. Immediate action required.`
          : `🚨 ¡ALERTA! Tu saldo cubre solo ${diasCubiertos} días. Necesitas acción inmediata.`,
        color: 'text-red-400',
        bg: 'bg-red-900/30',
        icono: '🚨'
      };
    }
    if (diasCubiertos < 5) {
      const montoNecesario = ((5 - diasCubiertos) * gastoDiario).toFixed(0);
      return {
        texto: idioma === 'en'
          ? `⚠️ ALERT! Your balance covers only ${diasCubiertos} days. You need $${parseInt(montoNecesario).toLocaleString()} to reach 5 days.`
          : `⚠️ ¡ALERTA! Tu saldo cubre solo ${diasCubiertos} días. Necesitas $${parseInt(montoNecesario).toLocaleString()} para llegar a 5 días.`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-900/30',
        icono: '⚠️'
      };
    }
    if (margenNeto < 10 && margenNeto > 0) {
      return {
        texto: idioma === 'en'
          ? `📉 Your net margin is ${margenNeto}%. Below the recommended 15%. Review your costs.`
          : `📉 Tu margen neto es ${margenNeto}%. Está por debajo del 15% recomendado. Revisa tus costos.`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-900/30',
        icono: '📉'
      };
    }
    if (diasInactividad > 3) {
      return {
        texto: idioma === 'en'
          ? `📢 You haven't recorded transactions for ${diasInactividad} days. Record your operations to have financial clarity.`
          : `📢 Llevas ${diasInactividad} días sin registrar movimientos. Registra tus operaciones para tener claridad financiera.`,
        color: 'text-blue-400',
        bg: 'bg-blue-900/30',
        icono: '📢'
      };
    }
    return {
      texto: idioma === 'en'
        ? '✅ Everything is in order. Keep it up to maintain a healthy business.'
        : '✅ Todo está en orden. Sigue así para mantener tu negocio saludable.',
      color: 'text-green-400',
      bg: 'bg-green-900/30',
      icono: '✅'
    };
  };

  const mensaje = getMensajePrincipal();

  return (
    <div className="space-y-4 mb-6">
      {/* Saludo personalizado dinámico */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-4 rounded-xl border border-cyan-500/20">
        <p className="text-cyan-400 text-lg font-bold">
          {mensajeBienvenida}
        </p>
      </div>

      {/* Alerta principal dinámica */}
      <div className={`${mensaje.bg} p-4 rounded-xl border-l-4 ${mensaje.color === 'text-red-400' ? 'border-red-500' : mensaje.color === 'text-yellow-400' ? 'border-yellow-500' : mensaje.color === 'text-blue-400' ? 'border-blue-500' : 'border-green-500'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{mensaje.icono}</span>
          <p className={`text-sm ${mensaje.color}`}>{mensaje.texto}</p>
        </div>
      </div>

      {/* Insights tácticos - Grid horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Oxígeno financiero */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-indigo-300 text-sm font-bold flex items-center gap-2">
              😴 {t('sleepIndicator') || 'Días de gastos cubiertos'}
            </h4>
            <span className={`text-sm font-bold ${necesitaAccion ? 'text-red-400' : 'text-green-400'}`}>
              {diasCubiertos} / 30 {t('days') || 'días'}
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

        {/* Alertas del Sargento */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <h4 className="text-red-400 text-sm font-bold mb-2 flex items-center gap-2">
            🚨 {t('alerts') || 'Alertas del Sargento Financiero'}
          </h4>
          <div className="space-y-2">
            {diasCubiertos < 5 && (
              <p className="text-xs text-yellow-400">
                {idioma === 'en'
                  ? `⚠️ ALERT! Your balance covers only ${diasCubiertos} days. Need $${((5 - diasCubiertos) * gastoDiario).toFixed(0)} to reach 5 days.`
                  : `⚠️ ¡ALERTA! Tu saldo cubre solo ${diasCubiertos} días. Necesitas $${((5 - diasCubiertos) * gastoDiario).toFixed(0)} para llegar a 5 días.`}
              </p>
            )}
            {diasInactividad > 3 && (
              <p className="text-xs text-blue-400">
                {idioma === 'en'
                  ? `📢 You haven't recorded transactions for ${diasInactividad} days.`
                  : `📢 Llevas ${diasInactividad} días sin registrar movimientos.`}
              </p>
            )}
            {margenNeto < 15 && margenNeto > 0 && (
              <p className="text-xs text-orange-400">
                {idioma === 'en'
                  ? `📉 Your net margin is ${margenNeto}%. Below the recommended 15%.`
                  : `📉 Tu margen neto es ${margenNeto}%. Está por debajo del 15% recomendado.`}
              </p>
            )}
            {productosHueso.length > 0 && (
              <p className="text-xs text-red-400">🦴 {productosHueso.length} {t('boneProducts')}</p>
            )}
            {diasCubiertos >= 5 && diasInactividad <= 3 && margenNeto >= 15 && productosHueso.length === 0 && (
              <p className="text-xs text-green-400">{t('noCriticalAlerts')}</p>
            )}
          </div>
        </div>

        {/* Recomendaciones Estratégicas */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-blue-900/30">
          <h4 className="text-blue-400 text-sm font-bold mb-2 flex items-center gap-2">
            💡 {t('strategicRecommendations')}
          </h4>
          <div className="space-y-2">
            {ventasTotales === 0 && (
              <p className="text-xs text-yellow-400">
                {idioma === 'en'
                  ? '📢 You haven\'t recorded sales yet. Activate your commercial strategy to start generating revenue.'
                  : '📢 Aún no has registrado ventas. Activa tu estrategia comercial para empezar a generar ingresos.'}
              </p>
            )}
            {productosEstrella.length > 0 && (
              <p className="text-xs text-green-400">
                {idioma === 'en'
                  ? `⭐ Your star product is "${productosEstrella[0]?.nombre}". Allocate marketing budget.`
                  : `⭐ Tu producto estrella es "${productosEstrella[0]?.nombre}". Destina presupuesto de marketing.`}
              </p>
            )}
            {productosHueso.length > 0 && (
              <p className="text-xs text-orange-400">
                {idioma === 'en'
                  ? `🦴 You have ${productosHueso.length} products without rotation. Review prices.`
                  : `🦴 Tienes ${productosHueso.length} productos sin rotación. Revisa precios.`}
              </p>
            )}
            {margenNeto < 20 && margenNeto > 0 && (
              <p className="text-xs text-red-400">
                {idioma === 'en'
                  ? '💰 Your margins are low. Review costs or selling prices.'
                  : '💰 Tus márgenes están bajos. Revisa costos o precios de venta.'}
              </p>
            )}
            {ventasTotales > 0 && productosEstrella.length === 0 && margenNeto >= 20 && (
              <p className="text-xs text-green-400">
                {idioma === 'en'
                  ? '✅ Everything is in order. Keep it up.'
                  : '✅ Todo está en orden. Sigue así.'}
              </p>
            )}
          </div>
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

