// components/ModalCreditosSoporte.jsx
import React, { useState } from 'react';
import { PAQUETES_CREDITOS_SOPORTE } from '../hooks/useSoporteIA';
import CheckoutMercadoPago from './CheckoutMercadoPago';

const ModalCreditosSoporte = ({ isOpen, onClose, usuarioActual, moneda, idioma, onCompraExitosa }) => {
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null);

  const textos = {
    es: {
      titulo: '💬 Créditos Adicionales para Soporte IA',
      subtitulo: 'Amplía tus consultas de soporte con IA',
      consultas: 'consultas',
      precio: 'Precio',
      comprar: 'Comprar',
      nota: 'Los créditos se suman a tu plan actual y no caducan mensualmente.'
    },
    en: {
      titulo: '💬 Additional AI Support Credits',
      subtitulo: 'Extend your AI support consultations',
      consultas: 'consultations',
      precio: 'Price',
      comprar: 'Buy',
      nota: 'Credits are added to your current plan and do not expire monthly.'
    }
  };

  const t = textos[idioma === 'es' ? 'es' : 'en'] || textos.es;

  // ✅ PAQUETES CON PRECIOS CORRECTOS
  const paquetes = [
    { id: 'basico', creditos: 5, precioCOP: 9900, precioUSD: 4.99, nombre: 'Pack Básico' },
    { id: 'frecuente', creditos: 15, precioCOP: 19900, precioUSD: 9.99, nombre: 'Pack Frecuente' },
    { id: 'profesional', creditos: 40, precioCOP: 49900, precioUSD: 19.99, nombre: 'Pack Profesional' },
    { id: 'empresarial', creditos: 100, precioCOP: 99900, precioUSD: 39.99, nombre: 'Pack Empresarial' }
  ];

  const handleCompra = (paquete) => {
    setPaqueteSeleccionado(paquete);
    setMostrarCheckout(true);
  };

  const handleSuccess = () => {
    setMostrarCheckout(false);
    if (onCompraExitosa) onCompraExitosa();
    setTimeout(() => window.location.reload(), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[9998] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full border border-blue-900/30" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">💬</div>
            <h3 className="text-xl font-bold text-white">{t.titulo}</h3>
            <p className="text-gray-400 text-sm mt-1">{t.subtitulo}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {paquetes.map((paquete) => (
              <div key={paquete.id} className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/30 text-center">
                <h4 className="text-lg font-bold text-purple-400">{paquete.nombre}</h4>
                <p className="text-2xl font-bold text-white mt-2">{paquete.creditos} {t.consultas}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {moneda.mostrarCOP ? `$${paquete.precioCOP.toLocaleString()}` : `$${paquete.precioUSD} USD`}
                </p>
                <button
                  onClick={() => handleCompra(paquete)}
                  className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                >
                  {t.comprar}
                </button>
              </div>
            ))}
          </div>

          <p className="text-gray-500 text-xs text-center mt-2">{t.nota}</p>

          <button
            onClick={onClose}
            className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>

      {mostrarCheckout && paqueteSeleccionado && (
        <CheckoutMercadoPago
          plan={`creditos_soporte_${paqueteSeleccionado.id}`}
          userEmail={usuarioActual?.email}
          userId={usuarioActual?.uid}
          moneda={moneda}
          onSuccess={handleSuccess}
          onError={(error) => console.error(error)}
          onClose={() => setMostrarCheckout(false)}
        />
      )}
    </>
  );
};

export default ModalCreditosSoporte;

