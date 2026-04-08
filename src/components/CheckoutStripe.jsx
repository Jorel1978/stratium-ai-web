// ============================================================
// STRIPE - COMPLETAMENTE OCULTO (DESHABILITADO TEMPORALMENTE)
// ============================================================
// Este componente se reactivará cuando tengamos ingresos
// sostenidos y queramos ofrecer Stripe como alternativa de pago.
// ============================================================

/*
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Reemplaza con tu Public Key de Stripe (modo prueba)
const stripePromise = loadStripe('pk_test_TU_PUBLIC_KEY');

const CheckoutForm = ({ plan, userEmail, userId, moneda, onSuccess, onError, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const precios = {
    pro: moneda.mostrarCOP ? 59900 : 1999,
    business: moneda.mostrarCOP ? 99900 : 4999,
    elite: moneda.mostrarCOP ? 199900 : 9990
  };

  const titulos = {
    pro: 'Plan 1 (Pro)',
    business: 'Plan 2 (Business)',
    elite: 'Plan 3 (Elite)'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId, userEmail })
      });
      
      const { clientSecret } = await response.json();
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });
      
      if (error) {
        onError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-blue-900/30">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">💳</div>
          <h3 className="text-xl font-bold text-white">Pagar con Stripe</h3>
          <p className="text-gray-400 text-sm mt-2">
            {titulos[plan]} - {moneda.mostrarCOP ? `$${precios[plan].toLocaleString()} COP` : `$${(precios[plan]/100).toFixed(2)} USD`}
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="bg-[#0f172a] p-4 rounded-lg mb-6">
            <CardElement
              options={{
                style: {
                  base: { color: '#fff', fontSize: '16px', fontFamily: 'sans-serif' },
                  invalid: { color: '#f87171' }
                }
              }}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!stripe || loading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Procesando...' : `Pagar ${moneda.mostrarCOP ? `$${precios[plan].toLocaleString()}` : `$${(precios[plan]/100).toFixed(2)} USD`}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CheckoutStripe = (props) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm {...props} />
  </Elements>
);

export default CheckoutStripe;
*/

// Componente vacío temporal para evitar errores de importación
const CheckoutStripe = () => {
  return null;
};

export default CheckoutStripe;

