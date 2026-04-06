import React, { useState } from 'react';

const CheckoutMercadoPago = ({ plan, userEmail, userId, moneda, onSuccess, onError, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handlePagar = async () => {
    setLoading(true);
    try {
      const planData = {
        pro: { title: 'STRATIUM AI - Plan 1 (Pro)', price: 59900 },
        business: { title: 'STRATIUM AI - Plan 2 (Business)', price: 99900 },
        elite: { title: 'STRATIUM AI - Plan 3 (Elite)', price: 199900 }
      };

      const selected = planData[plan];
      
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer TEST-2082807274972579-040613-aed5f6a1cced0244b4bed0b0fac0bd9c-3087415746'
        },
        body: JSON.stringify({
          items: [{
            title: selected.title,
            quantity: 1,
            currency_id: 'COP',
            unit_price: selected.price
          }],
          payer: { email: userEmail },
          back_urls: {
            success: window.location.origin + '/dashboard',
            failure: window.location.origin + '/upgrade',
            pending: window.location.origin + '/upgrade'
          },
          auto_return: 'approved',
          metadata: { userId, plan }
        })
      });

      const data = await response.json();
      window.location.href = data.init_point;
      
    } catch (error) {
      console.error('Error:', error);
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const precios = {
    pro: moneda.mostrarCOP ? '$59,900' : '$19.99',
    business: moneda.mostrarCOP ? '$99,900' : '$49.99',
    elite: moneda.mostrarCOP ? '$199,900' : '$99.90'
  };

  const titulos = {
    pro: 'Plan 1 (Pro)',
    business: 'Plan 2 (Business)',
    elite: 'Plan 3 (Elite)'
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-blue-900/30">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">💳</div>
          <h3 className="text-xl font-bold text-white">Pagar con Mercado Pago</h3>
          <p className="text-gray-400 text-sm mt-2">
            Serás redirigido a Mercado Pago para completar el pago de forma segura.
          </p>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
          <p className="text-cyan-400 font-bold text-center">
            {titulos[plan]} - {precios[plan]}{moneda.mostrarCOP ? ' COP/mes' : ' USD/mes'}
          </p>
          <p className="text-gray-400 text-xs text-center mt-1">
            Pago seguro a través de Mercado Pago
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

