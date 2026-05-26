// components/ModalUpgrade.jsx
import { useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const ModalUpgrade = ({ isOpen, onClose, funcionNombre, onSeleccionarPlan, moneda, onComprarCreditosSoporte, usuarioActual }) => {
  const { t, idioma } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '8px';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSeleccionarPlan = (plan) => {
    if (typeof onSeleccionarPlan === 'function') {
      onSeleccionarPlan(plan);
    } else {
      console.error('onSeleccionarPlan no es una función');
    }
  };

  // ✅ CALCULAR DÍAS RESTANTES
  const getDiasRestantes = () => {
    if (!usuarioActual?.fechaVencimiento) return 0;
    const fechaVenc = usuarioActual.fechaVencimiento?.toDate 
      ? usuarioActual.fechaVencimiento.toDate() 
      : new Date(usuarioActual.fechaVencimiento);
    const dias = Math.ceil((fechaVenc - new Date()) / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
  };

  const diasRestantes = getDiasRestantes();
  const planActual = usuarioActual?.plan || 'starter';
  const esStarterVencido = planActual === 'starter' && diasRestantes <= 0;
  const esStarterActivo = planActual === 'starter' && diasRestantes > 0;

  const paisUsuario = usuarioActual?.pais || 'CO';
  const usarCOP = paisUsuario === 'CO' || moneda?.codigo === 'COP';
  
  const preciosCOP = {
    pro: 79900,
    business: 199900,
    elite: 499900
  };
  
  const preciosUSD = {
    pro: 79.90,
    business: 199.90,
    elite: 499.90
  };

  const paquetesSoporte = [
    { id: 'basico', creditos: 5, precioCOP: 9900, precioUSD: 3.99, nombre: { es: 'Básico', en: 'Basic' } },
    { id: 'frecuente', creditos: 15, precioCOP: 19900, precioUSD: 9.99, nombre: { es: 'Frecuente', en: 'Frequent' } },
    { id: 'profesional', creditos: 40, precioCOP: 49900, precioUSD: 19.99, nombre: { es: 'Profesional', en: 'Professional' } },
    { id: 'corporativo', creditos: 100, precioCOP: 99900, precioUSD: 29.99, nombre: { es: 'Corporativo', en: 'Corporate' } }
  ];

  const lang = idioma === 'en' ? 'en' : 'es';
  
  const formatPrecio = (precioCOP, precioUSD) => {
    if (usarCOP) {
      return `$${precioCOP.toLocaleString('es-CO')}`;
    } else {
      return `$${precioUSD.toFixed(2)}`;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#1e293b] rounded-2xl p-6 max-w-6xl w-full border border-blue-900/30 shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔒</div>
          <h3 className="text-xl font-bold text-white">{t('upgradeTitle') || 'Desbloquea Stratium Global AI'}</h3>
          <p className="text-gray-400 text-sm mt-2">
            {funcionNombre} - {t('upgradeDescription') || 'Elige el plan que se adapte a tu crecimiento'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          {/* ✅ PLAN STARTER CON LÓGICA DE DÍAS RESTANTES */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-green-500/30 flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-xl font-bold text-green-400">Starter</h4>
              <p className="text-2xl font-bold text-white">$0<span className="text-sm text-gray-400"> / {lang === 'en' ? '15 days' : '15 días'}</span></p>
              <p className="text-xs text-green-400 mt-1">
                {esStarterVencido 
                  ? (lang === 'en' ? 'Trial expired' : 'Prueba vencida')
                  : esStarterActivo
                    ? (lang === 'en' ? 'Active trial' : 'Prueba activa')
                    : (lang === 'en' ? 'Free trial' : 'Prueba gratis')}
              </p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-green-400">✓</span> {lang === 'en' ? 'Manual transaction entry' : 'Registro manual de movimientos'}</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> {lang === 'en' ? 'Basic financial dashboard' : 'Dashboard financiero básico'}</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> {lang === 'en' ? 'Risk alerts' : 'Alertas de riesgo'}</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> {lang === 'en' ? '20 AI messages/month' : 'Soporte IA 20 mensajes/mes'}</p>
              <p className="text-gray-400"><span className="text-green-400">✗</span> {lang === 'en' ? 'No PDF reports' : 'Sin reportes PDF'}</p>
              <p className="text-gray-400"><span className="text-green-400">✗</span> {lang === 'en' ? 'No CSV export' : 'Sin exportar CSV'}</p>
            </div>
            
            {/* ✅ BOTÓN STARTER SEGÚN ESTADO */}
            {esStarterVencido ? (
              <div className="w-full mt-4 bg-red-900/50 text-red-400 font-bold py-2 px-4 rounded-lg text-sm text-center border border-red-500/30">
                {lang === 'en' ? 'Trial Expired' : 'Prueba Vencida'}
              </div>
            ) : esStarterActivo ? (
              <div className="w-full mt-4 bg-slate-700/50 text-gray-500 font-bold py-2 px-4 rounded-lg text-sm text-center">
                {lang === 'en' ? 'Current Plan' : 'Plan Actual'}
              </div>
            ) : (
              <button
                onClick={() => handleSeleccionarPlan('starter')}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
              >
                {lang === 'en' ? 'Start Free Trial' : 'Comenzar prueba'}
              </button>
            )}
          </div>
          
          {/* PLAN PRO */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-cyan-500/30 flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-xl font-bold text-cyan-400">Pro</h4>
              <p className="text-2xl font-bold text-white">{formatPrecio(preciosCOP.pro, preciosUSD.pro)}<span className="text-sm text-gray-400"> / {lang === 'en' ? 'month' : 'mes'}</span></p>
              <p className="text-xs text-cyan-400 mt-1">{lang === 'en' ? 'Smart digitization' : 'Digitalización inteligente'}</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? 'Unlimited manual entry' : 'Registro manual ilimitado'}</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? 'Complete PDF reports' : 'Reportes PDF completos'}</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? 'CSV export' : 'Exportar CSV'}</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? 'Monthly comparison' : 'Comparación mensual'}</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? 'Break-even point' : 'Punto de equilibrio'}</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? 'Inventory turnover' : 'Rotación de inventario'}</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> {lang === 'en' ? '50 AI messages/month' : 'Soporte IA 50 mensajes/mes'}</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('pro')}
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              {lang === 'en' ? 'Upgrade' : 'Actualizar'} {formatPrecio(preciosCOP.pro, preciosUSD.pro)}
            </button>
          </div>
          
          {/* PLAN BUSINESS - MÁS POPULAR */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/30 relative flex flex-col h-full">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full whitespace-nowrap">
              {lang === 'en' ? 'MOST POPULAR' : 'MÁS POPULAR'}
            </div>
            <div className="text-center mb-3 mt-2">
              <h4 className="text-xl font-bold text-purple-400">Business</h4>
              <p className="text-2xl font-bold text-white">{formatPrecio(preciosCOP.business, preciosUSD.business)}<span className="text-sm text-gray-400"> / {lang === 'en' ? 'month' : 'mes'}</span></p>
              <p className="text-xs text-purple-400 mt-1">{lang === 'en' ? 'Overcost audit' : 'Auditoría de sobrecostos'}</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? 'Everything in Pro' : 'Todo el plan Pro'}</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? 'Forensic expense audit' : 'Auditoría forense de gastos'}</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? 'Supplier overcost detection' : 'Detección de sobrecostos de proveedores'}</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? 'Production Module' : 'Módulo de Producción'}</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? '3 users included' : '3 usuarios incluidos'}</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? 'Deletion history' : 'Historial de eliminaciones'}</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> {lang === 'en' ? '200 AI messages/month' : 'Soporte IA 200 mensajes/mes'}</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('business')}
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              {lang === 'en' ? 'Upgrade' : 'Actualizar'} {formatPrecio(preciosCOP.business, preciosUSD.business)}
            </button>
          </div>
          
          {/* PLAN ELITE */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-yellow-500/30 flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-xl font-bold text-yellow-400">Elite</h4>
              <p className="text-2xl font-bold text-white">{formatPrecio(preciosCOP.elite, preciosUSD.elite)}<span className="text-sm text-gray-400"> / {lang === 'en' ? 'month' : 'mes'}</span></p>
              <p className="text-xs text-yellow-400 mt-1">{lang === 'en' ? 'Bankruptcy radar' : 'Radar de quiebra'}</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? 'Everything in Business' : 'Todo el plan Business'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? 'Bankruptcy radar (90 days)' : 'Radar de quiebra (90 días)'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? 'WhatsApp predictive alerts' : 'Alertas predictivas WhatsApp'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? 'Financial Health Certificate (QR)' : 'Certificado Salud Financiera (QR)'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? 'Advanced Discord Bot' : 'Bot Discord avanzado'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? 'Executive Reports (12+ types)' : 'Reportes ejecutivos (12+ tipos)'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? '30/60/90 day projections' : 'Proyecciones 30/60/90 días'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? '10 users included' : '10 usuarios incluidos'}</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> {lang === 'en' ? '500 AI messages/month' : 'Soporte IA 500 mensajes/mes'}</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('elite')}
              className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              {lang === 'en' ? 'Upgrade' : 'Actualizar'} {formatPrecio(preciosCOP.elite, preciosUSD.elite)}
            </button>
          </div>
        </div>
        
        {/* PAQUETES ADICIONALES DE CRÉDITOS PARA SOPORTE IA */}
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
          <p className="text-gray-400 text-xs mb-3 text-center">
            💬 {lang === 'en' ? 'ADDITIONAL CREDITS FOR AI SUPPORT' : 'CRÉDITOS ADICIONALES PARA SOPORTE IA'}
          </p>
          <p className="text-center text-xs text-yellow-400 mb-3">
            ⚡ {lang === 'en' ? 'One-time payment • Valid for 30 days' : 'Pago único • Vigencia 30 días'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {paquetesSoporte.map((paquete) => (
              <div key={paquete.id} className="bg-slate-800/50 p-3 rounded text-center">
                <p className="text-purple-400 font-bold">{paquete.nombre[lang]}</p>
                <p className="text-white text-lg font-bold">{usarCOP ? `$${paquete.precioCOP.toLocaleString('es-CO')}` : `$${paquete.precioUSD.toFixed(2)}`}</p>
                <p className="text-gray-500">+{paquete.creditos} {lang === 'en' ? 'AI queries' : 'consultas IA'}</p>
                <p className="text-gray-600 text-[10px] mt-1">{lang === 'en' ? 'valid 30 days' : 'vigencia 30 días'}</p>
                <button
                  onClick={() => onComprarCreditosSoporte?.(paquete.id, paquete)}
                  className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-1.5 px-2 rounded-lg transition-all text-xs"
                >
                  {lang === 'en' ? 'Buy' : 'Comprar'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3 text-center">
            💡 {lang === 'en' 
              ? 'One-time purchase. Credits are NOT cumulative and expire after 30 days.' 
              : 'Compra única. Los créditos NO son acumulativos y caducan a los 30 días.'}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
        >
          {lang === 'en' ? 'Cancel' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
};

export default ModalUpgrade;

