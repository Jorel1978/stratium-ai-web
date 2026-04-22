import React, { useState } from 'react';
import { getFirestore, doc, updateDoc, increment } from 'firebase/firestore';
import CheckoutMercadoPago from './CheckoutMercadoPago';

const PacksEscaneos = ({ usuarioActual, moneda, onPurchase }) => {
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [packSeleccionado, setPackSeleccionado] = useState(null);
  const db = getFirestore();

  const packs = [
    { id: 'mini', escaneos: 10, precioCOP: 9900, precioUSD: 2.49, nombre: 'Pack Mini' },
    { id: 'standard', escaneos: 30, precioCOP: 24900, precioUSD: 6.29, nombre: 'Pack Standard' },
    { id: 'max', escaneos: 80, precioCOP: 59900, precioUSD: 14.99, nombre: 'Pack Max' },
    { id: 'pro', escaneos: 200, precioCOP: 139900, precioUSD: 34.99, nombre: 'Pack Pro' }
  ];

  const handlePurchase = (pack) => {
    setPackSeleccionado(pack);
    setMostrarCheckout(true);
  };

  // ✅ CORRECCIÓN: NO actualizar créditos desde el frontend
  // La actualización la hace el webhook de Mercado Pago
  const handleSuccess = () => {
    // Solo notificamos al usuario. El Webhook se encarga del dinero y los créditos.
    const mensaje = moneda.mostrarCOP
      ? `✅ ¡Pago procesado! En unos segundos verás tus ${packSeleccionado.escaneos} nuevos créditos reflejados.`
      : `✅ Payment processed! In a few seconds you will see your ${packSeleccionado.escaneos} new credits reflected.`;
    alert(mensaje);
    setMostrarCheckout(false);
    if (onPurchase) onPurchase(packSeleccionado);
    // Recargar para actualizar los créditos
    setTimeout(() => window.location.reload(), 3000);
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>📦</span> Paquetes Adicionales de Escaneos
      </h3>
      <p className="text-gray-400 text-sm mb-4">¿Necesitas más escaneos este mes? Compra paquetes adicionales:</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packs.map(pack => (
          <div key={pack.id} className="bg-slate-800/50 p-4 rounded-xl border border-cyan-500/30 text-center">
            <h4 className="text-lg font-bold text-cyan-400">{pack.nombre}</h4>
            <p className="text-2xl font-bold text-white mt-2">{pack.escaneos} escaneos</p>
            <p className="text-gray-400 text-sm mt-1">
              {/* ✅ CORRECCIÓN: precioCOP (con 'P' mayúscula) */}
              {moneda.mostrarCOP ? `$${pack.precioCOP.toLocaleString()}` : `$${pack.precioUSD}`}
            </p>
            <button
              onClick={() => handlePurchase(pack)}
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              Comprar
            </button>
          </div>
        ))}
      </div>

      {mostrarCheckout && (
        <CheckoutMercadoPago
          plan={`pack_${packSeleccionado.id}`}
          userEmail={usuarioActual?.email}
          userId={usuarioActual?.uid}
          moneda={moneda}
          onSuccess={handleSuccess}
          onError={(error) => console.error(error)}
          onClose={() => setMostrarCheckout(false)}
        />
      )}
    </div>
  );
};

export default PacksEscaneos;

