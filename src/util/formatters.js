// src/util/formatters.js

export const parseNumberInternational = (valor) => {
  if (!valor) return 0;
  // Elimina cualquier cosa que no sea número, punto o menos
  const limpio = valor.toString().replace(/[^0-9.-]+/g, "");
  return parseFloat(limpio) || 0;
};

export const formatearValor = (valor, moneda = 'COP') => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor || 0);
};

