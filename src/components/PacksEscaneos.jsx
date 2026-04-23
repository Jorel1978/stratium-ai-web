import React, { useState } from 'react';
import { getFirestore, doc, updateDoc, increment } from 'firebase/firestore';
import CheckoutMercadoPago from './CheckoutMercadoPago';

const PacksEscaneos = ({ usuarioActual, moneda, onPurchase, idioma }) => {
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [packSeleccionado, setPackSeleccionado] = useState(null);
  const db = getFirestore();

  const textos = {
    es: {
      titulo: '📦 Paquetes Adicionales de Escaneos',
      subtitulo: '¿Necesitas más escaneos este mes? Compra paquetes adicionales:',
      escaneos: 'escaneos',
      comprar: 'Comprar',
      exito: '✅ ¡Pago procesado! En unos segundos verás tus {escaneos} nuevos créditos reflejados.'
    },
    en: {
      titulo: '📦 Additional Scan Packages',
      subtitulo: 'Need more scans this month? Buy additional packages:',
      escaneos: 'scans',
      comprar: 'Buy',
      exito: '✅ Payment processed! In a few seconds you will see your {escaneos} new credits reflected.'
    }
  };

  const t = textos[idioma === 'es' ? 'es' : 'en'] || textos.es;

  const packs = [
    { id: 'basico', escaneos: 10, precioCOP: 19900, precioUSD: 9.99, nombre: 'Básico' },
    { id: 'frecuente', escaneos: 30, precioCOP: 49900, precioUSD: 19.99, nombre: 'Frecuente' },
    { id: 'profesional', escaneos: 100, precioCOP: 99900, precioUSD: 39.99, nombre: 'Profesional' },
    { id: 'corporativo', escaneos: 300, precioCOP: 199900, precioUSD: 79.99, nombre: 'Corporativo' }
  ];

  const handlePurchase = (pack) => {
    setPackSeleccionado(pack);
    setMostrarCheckout(true);
  };

  const handleSuccess = () => {
    const mensaje = t.exito.replace('{escaneos}', packSeleccionado.escaneos);
    alert(mensaje);
    setMostrarCheckout(false);
    if (onPurchase) onPurchase(packSeleccionado);
    setTimeout(() => window.location.reload(), 3000);
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>📦</span> {t.titulo}
      </h3>
      <p className="text-gray-400 text-sm mb-4">{t.subtitulo}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packs.map(pack => (
          <div key={pack.id} className="bg-slate-800/50 p-4 rounded-xl border border-cyan-500/30 text-center">
            <h4 className="text-lg font-bold text-cyan-400">{pack.nombre}</h4>
            <p className="text-2xl font-bold text-white mt-2">{pack.escaneos} {t.escaneos}</p>
            <p className="text-gray-400 text-sm mt-1">
              {moneda.mostrarCOP ? `$${pack.precioCOP.toLocaleString()}` : `$${pack.precioUSD} USD`}
            </p>
            <button
              onClick={() => handlePurchase(pack)}
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
              {t.comprar}
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

