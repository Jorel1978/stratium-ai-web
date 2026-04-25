import { useEffect } from 'react';

const ModalUpgrade = ({ isOpen, onClose, funcionNombre, onSeleccionarPlan, moneda, t, onComprarCreditosSoporte }) => {
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

  const paquetesSoporte = [
    { id: 'basico', creditos: 5, precioCOP: 9900, precioUSD: 4.99, nombre: 'Pack Básico' },
    { id: 'frecuente', creditos: 15, precioCOP: 19900, precioUSD: 9.99, nombre: 'Pack Frecuente' },
    { id: 'profesional', creditos: 40, precioCOP: 49900, precioUSD: 19.99, nombre: 'Pack Profesional' },
    { id: 'empresarial', creditos: 100, precioCOP: 99900, precioUSD: 39.99, nombre: 'Pack Empresarial' }
  ];

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
          <h3 className="text-xl font-bold text-white">{t?.upgradeTitle || 'Desbloquea Stratium AI'}</h3>
          <p className="text-gray-400 text-sm mt-2">
            {funcionNombre} - {t?.upgradeDescription || 'Elige el plan que se adapte a tu crecimiento'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          {/* PLAN STARTER */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-green-500/30 flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-xl font-bold text-green-400">Starter</h4>
              <p className="text-2xl font-bold text-white">{moneda?.mostrarCOP ? '$29,900' : '$9.99'}<span className="text-sm text-gray-400">/mes</span></p>
              <p className="text-xs text-green-400 mt-1">Consejero financiero de bolsillo</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-green-400">✓</span> 10 escaneos/mes</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> Registro manual de movimientos</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> Dashboard financiero básico</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> Alertas de riesgo</p>
              <p className="text-gray-300"><span className="text-green-400">✓</span> Soporte IA 20 mensajes/mes</p>
              <p className="text-gray-400"><span className="text-green-400">✗</span> Sin reportes PDF</p>
              <p className="text-gray-400"><span className="text-green-400">✗</span> Sin exportar CSV</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('starter')}
              className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              Pagar {moneda?.mostrarCOP ? '$29,900' : '$9.99'}
            </button>
          </div>
          
          {/* PLAN PRO */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-cyan-500/30 flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-xl font-bold text-cyan-400">Pro</h4>
              <p className="text-2xl font-bold text-white">{moneda?.mostrarCOP ? '$79,900' : '$29.99'}<span className="text-sm text-gray-400">/mes</span></p>
              <p className="text-xs text-cyan-400 mt-1">Digitalización inteligente</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> 30 escaneos/mes</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Registro manual ilimitado</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Reportes PDF completos</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Exportar CSV</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Comparación mensual</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Punto de equilibrio</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Rotación de inventario</p>
              <p className="text-gray-300"><span className="text-cyan-400">✓</span> Soporte IA 50 mensajes/mes</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('pro')}
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              Pagar {moneda?.mostrarCOP ? '$79,900' : '$29.99'}
            </button>
          </div>
          
          {/* PLAN BUSINESS */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/30 relative flex flex-col h-full">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full whitespace-nowrap">
              Más popular
            </div>
            <div className="text-center mb-3 mt-2">
              <h4 className="text-xl font-bold text-purple-400">Business</h4>
              <p className="text-2xl font-bold text-white">{moneda?.mostrarCOP ? '$199,900' : '$79.99'}<span className="text-sm text-gray-400">/mes</span></p>
              <p className="text-xs text-purple-400 mt-1">Auditoría de sobrecostos</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-purple-400">✓</span> 120 escaneos/mes</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> Todo el plan Pro</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> Auditoría forense de gastos</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> Detección de sobrecostos de proveedores</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> 3 usuarios incluidos</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> Historial de eliminaciones</p>
              <p className="text-gray-300"><span className="text-purple-400">✓</span> Soporte IA 200 mensajes/mes</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('business')}
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              Pagar {moneda?.mostrarCOP ? '$199,900' : '$79.99'}
            </button>
          </div>
          
          {/* PLAN ELITE */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-yellow-500/30 flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-xl font-bold text-yellow-400">Elite</h4>
              <p className="text-2xl font-bold text-white">{moneda?.mostrarCOP ? '$499,900' : '$199.99'}<span className="text-sm text-gray-400">/mes</span></p>
              <p className="text-xs text-yellow-400 mt-1">Radar de quiebra</p>
            </div>
            <div className="space-y-2 text-sm flex-grow">
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> 300 escaneos/mes</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> Todo el plan Business</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> Radar de quiebra (90 días)</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> Alertas predictivas WhatsApp</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> Certificado Salud Financiera (QR)</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> 10 usuarios incluidos</p>
              <p className="text-gray-300"><span className="text-yellow-400">✓</span> Soporte IA 500 mensajes/mes</p>
            </div>
            <button
              onClick={() => handleSeleccionarPlan('elite')}
              className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              Pagar {moneda?.mostrarCOP ? '$499,900' : '$199.99'}
            </button>
          </div>
        </div>
        
        {/* PAQUETES ADICIONALES DE ESCANEOS */}
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
          <p className="text-gray-400 text-xs mb-3 text-center">📦 PAQUETES ADICIONALES DE ESCANEOS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/50 p-3 rounded text-center">
              <p className="text-cyan-400 font-bold">Básico</p>
              <p className="text-white text-lg font-bold">{moneda?.mostrarCOP ? '$19,900' : '$9.99'}</p>
              <p className="text-gray-500">+10 escaneos</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded text-center">
              <p className="text-cyan-400 font-bold">Frecuente</p>
              <p className="text-white text-lg font-bold">{moneda?.mostrarCOP ? '$49,900' : '$19.99'}</p>
              <p className="text-gray-500">+30 escaneos</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded text-center">
              <p className="text-cyan-400 font-bold">Profesional</p>
              <p className="text-white text-lg font-bold">{moneda?.mostrarCOP ? '$99,900' : '$39.99'}</p>
              <p className="text-gray-500">+100 escaneos</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded text-center">
              <p className="text-cyan-400 font-bold">Corporativo</p>
              <p className="text-white text-lg font-bold">{moneda?.mostrarCOP ? '$199,900' : '$79.99'}</p>
              <p className="text-gray-500">+300 escaneos</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-3 text-center">💡 Los paquetes se compran dentro de la app y NO están incluidos en el plan mensual</p>
        </div>

        {/* 🆕 PAQUETES ADICIONALES DE CRÉDITOS PARA SOPORTE IA CON BOTONES */}
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
          <p className="text-gray-400 text-xs mb-3 text-center">💬 CRÉDITOS ADICIONALES PARA SOPORTE IA</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {paquetesSoporte.map((paquete) => (
              <div key={paquete.id} className="bg-slate-800/50 p-3 rounded text-center">
                <p className="text-purple-400 font-bold">{paquete.nombre}</p>
                <p className="text-white text-lg font-bold">{moneda?.mostrarCOP ? `$${paquete.precioCOP.toLocaleString()}` : `$${paquete.precioUSD}`}</p>
                <p className="text-gray-500">+{paquete.creditos} consultas IA</p>
                <button
                  onClick={() => onComprarCreditosSoporte?.(paquete.id, paquete)}
                  className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-1.5 px-2 rounded-lg transition-all text-xs"
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3 text-center">💡 Los créditos se suman a tu plan actual y NO caducan mensualmente.</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ModalUpgrade;

