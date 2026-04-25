import React, { useState } from 'react';

const CheckoutMercadoPago = ({ plan, userEmail, userId, moneda, onSuccess, onError, onClose }) => {
  const [loading, setLoading] = useState(false);

  // ✅ PLANES DE SUSCRIPCIÓN (COP y USD)
  const planData = {
    starter: { title: 'STRATIUM AI - Plan Starter', priceCOP: 29900, priceUSD: 9.99 },
    pro: { title: 'STRATIUM AI - Plan Pro', priceCOP: 79900, priceUSD: 29.99 },
    business: { title: 'STRATIUM AI - Plan Business', priceCOP: 199900, priceUSD: 79.99 },
    elite: { title: 'STRATIUM AI - Plan Elite', priceCOP: 499900, priceUSD: 199.99 }
  };

  // ✅ PAQUETES DE CRÉDITOS PARA SOPORTE IA (COP y USD)
  const paquetesSoporte = {
    'creditos_soporte_basico': { title: 'Pack Básico - Créditos Soporte IA', creditos: 5, priceCOP: 9900, priceUSD: 4.99 },
    'creditos_soporte_frecuente': { title: 'Pack Frecuente - Créditos Soporte IA', creditos: 15, priceCOP: 19900, priceUSD: 9.99 },
    'creditos_soporte_profesional': { title: 'Pack Profesional - Créditos Soporte IA', creditos: 40, priceCOP: 49900, priceUSD: 19.99 },
    'creditos_soporte_empresarial': { title: 'Pack Empresarial - Créditos Soporte IA', creditos: 100, priceCOP: 99900, priceUSD: 39.99 }
  };

  // Detectar si es un paquete de soporte o un plan normal
  const esPaqueteSoporte = plan?.startsWith('creditos_soporte_');
  
  let selectedPlan;
  let selectedPaquete;
  
  if (esPaqueteSoporte) {
    selectedPaquete = paquetesSoporte[plan];
    if (!selectedPaquete) {
      console.error('Paquete de soporte no válido:', plan);
      return null;
    }
  } else {
    selectedPlan = planData[plan];
    if (!selectedPlan) {
      console.error('Plan no válido:', plan);
      return null;
    }
  }

  // ✅ PRECIOS SEGÚN MONEDA DEL USUARIO
  const price = esPaqueteSoporte && selectedPaquete
    ? (moneda?.mostrarCOP ? selectedPaquete.priceCOP : selectedPaquete.priceUSD)
    : (moneda?.mostrarCOP ? selectedPlan?.priceCOP : selectedPlan?.priceUSD);
    
  const currency = moneda?.mostrarCOP ? 'COP' : 'USD';
  
  const productTitle = esPaqueteSoporte && selectedPaquete
    ? selectedPaquete.title
    : selectedPlan?.title;

  // ✅ TEXTO PARA MOSTRAR EN EL MODAL
  let displayPrice = '';
  let displayTitle = '';
  
  if (esPaqueteSoporte && selectedPaquete) {
    displayTitle = selectedPaquete.title;
    displayPrice = moneda?.mostrarCOP 
      ? `$${selectedPaquete.priceCOP.toLocaleString()} COP`
      : `$${selectedPaquete.priceUSD} USD`;
  } else {
    const titles = { starter: 'Starter', pro: 'Pro', business: 'Business', elite: 'Elite' };
    displayTitle = `${titles[plan]} - ${moneda?.mostrarCOP ? `$${selectedPlan?.priceCOP.toLocaleString()} COP/mes` : `$${selectedPlan?.priceUSD} USD/mes`}`;
    displayPrice = moneda?.mostrarCOP ? `$${selectedPlan?.priceCOP.toLocaleString()} COP/mes` : `$${selectedPlan?.priceUSD} USD/mes`;
  }

  const handlePagar = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer TEST-2082807274972579-040613-aed5f6a1cced0244b4bed0b0fac0bd9c-3087415746'
        },
        body: JSON.stringify({
          items: [{
            title: productTitle,
            quantity: 1,
            currency_id: currency,
            unit_price: price
          }],
          payer: { email: userEmail },
          back_urls: {
            success: window.location.origin + '/dashboard',
            failure: window.location.origin + '/upgrade',
            pending: window.location.origin + '/upgrade'
          },
          auto_return: 'approved',
          metadata: { 
            userId, 
            plan: plan,
            esPaqueteSoporte: esPaqueteSoporte,
            creditos: esPaqueteSoporte ? selectedPaquete?.creditos : null
          }
        })
      });

      const data = await response.json();
      window.location.href = data.init_point;
      
    } catch (error) {
      console.error('Error:', error);
      if (onError) onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-blue-900/30" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">💳</div>
          <h3 className="text-xl font-bold text-white">Pagar con Mercado Pago</h3>
          <p className="text-gray-400 text-sm mt-2">
            Serás redirigido a Mercado Pago para completar el pago de forma segura.
          </p>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
          <p className="text-cyan-400 font-bold text-center">
            {displayTitle}
          </p>
          <p className="text-gray-400 text-xs text-center mt-1">
            {displayPrice}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePagar}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Redirigiendo...' : 'Pagar ahora'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            Cancelar
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-500 text-xs">
            Aceptamos tarjetas de crédito, débito, PSE, Nequi y Daviplata
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutMercadoPago;

