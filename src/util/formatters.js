export const formatearValor = (valor, moneda = 'COP') => {
  const opciones = {
    COP: { locale: 'es-CO', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 },
    USD: { locale: 'en-US', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    EUR: { locale: 'es-ES', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }
  };
  const config = opciones[moneda] || opciones.COP;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits
  }).format(Math.abs(valor));
};

export const parseNumberInternational = (numeroStr) => {
  if (!numeroStr || typeof numeroStr !== 'string') return 0;
  let limpio = numeroStr.replace(/[$€£¥\s]/g, '').trim();
  limpio = limpio.replace(/,/g, '.');
  const partes = limpio.split('.');
  if (partes.length > 2) {
    const decimales = partes.pop();
    limpio = partes.join('') + '.' + decimales;
  }
  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : Math.round(numero * 100) / 100;
};

export const formatearFecha = (fecha, locale = 'es-CO') => {
  if (!fecha) return '';
  const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
  return date.toLocaleDateString(locale);
};

