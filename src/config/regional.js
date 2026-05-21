// src/config/regional.js
// Configuración regional para Stratium AI
// Soporte: Latinoamérica, USA y Europa
// Factores prestacionales reales por país (ninguno es 1.0)

export const REGIONES_SOPORTADAS = {
  // ==================== LATINOAMÉRICA ====================
  CO: { 
    codigo: 'CO',
    pais: 'Colombia', 
    moneda: 'COP', 
    codigoMoneda: 'COP',
    locale: 'es-CO', 
    comisionDefault: 0.271, 
    impuesto: 0.19,
    factorPrestacional: 1.52,  // 52% prestaciones sociales (salud, pensión, ARL, caja, parafiscales)
    simboloMoneda: '$',
    decimales: 0
  },
  MX: { 
    codigo: 'MX',
    pais: 'México', 
    moneda: 'MXN', 
    codigoMoneda: 'MXN',
    locale: 'es-MX', 
    comisionDefault: 0.25, 
    impuesto: 0.16,
    factorPrestacional: 1.35,  // 35% cuotas patronales (IMSS, INFONAVIT, SAR, AFORE)
    simboloMoneda: '$',
    decimales: 2
  },
  AR: { 
    codigo: 'AR',
    pais: 'Argentina', 
    moneda: 'ARS', 
    codigoMoneda: 'ARS',
    locale: 'es-AR', 
    comisionDefault: 0.28, 
    impuesto: 0.21,
    factorPrestacional: 1.48,  // 48% contribuciones patronales (jubilación, PAMI, obra social, ART)
    simboloMoneda: '$',
    decimales: 0  // Argentina tiene alta inflación, se trabaja en pesos sin decimales
  },
  CL: { 
    codigo: 'CL',
    pais: 'Chile', 
    moneda: 'CLP', 
    codigoMoneda: 'CLP',
    locale: 'es-CL', 
    comisionDefault: 0.26, 
    impuesto: 0.19,
    factorPrestacional: 1.40,  // 40% cotizaciones previsionales y de salud (AFP, ISAPRE, seguro cesantía)
    simboloMoneda: '$',
    decimales: 0
  },
  PE: { 
    codigo: 'PE',
    pais: 'Perú', 
    moneda: 'PEN', 
    codigoMoneda: 'PEN',
    locale: 'es-PE', 
    comisionDefault: 0.27, 
    impuesto: 0.18,
    factorPrestacional: 1.42,  // 42% Essalud + ONP + AFP + Senati + SCTR
    simboloMoneda: 'S/',
    decimales: 2
  },
  UY: { 
    codigo: 'UY',
    pais: 'Uruguay', 
    moneda: 'UYU', 
    codigoMoneda: 'UYU',
    locale: 'es-UY', 
    comisionDefault: 0.27, 
    impuesto: 0.22,
    factorPrestacional: 1.45,  // 45% aportes patronales (BPS, FRL, seguro de paro)
    simboloMoneda: '$',
    decimales: 2
  },

  // ==================== AMÉRICA DEL NORTE ====================
  US: { 
    codigo: 'US',
    pais: 'United States', 
    moneda: 'USD', 
    codigoMoneda: 'USD',
    locale: 'en-US', 
    comisionDefault: 0.15, 
    impuesto: 0.10,
    factorPrestacional: 1.25,  // 25% employer payroll taxes (Social Security 6.2%, Medicare 1.45%, FUTA, SUTA, workers' comp)
    simboloMoneda: '$',
    decimales: 2
  },

  // ==================== EUROPA ====================
  ES: { 
    codigo: 'ES',
    pais: 'España', 
    moneda: 'EUR', 
    codigoMoneda: 'EUR',
    locale: 'es-ES', 
    comisionDefault: 0.24, 
    impuesto: 0.21,
    factorPrestacional: 1.35,  // 35% cotizaciones sociales (contingencias comunes, desempleo, FOGASA, FP, MEI)
    simboloMoneda: '€',
    decimales: 2
  },
  UK: { 
    codigo: 'UK',
    pais: 'United Kingdom', 
    moneda: 'GBP', 
    codigoMoneda: 'GBP',
    locale: 'en-GB', 
    comisionDefault: 0.23, 
    impuesto: 0.20,
    factorPrestacional: 1.28,  // 28% National Insurance contributions (Class 1 secondary)
    simboloMoneda: '£',
    decimales: 2
  },
  DE: { 
    codigo: 'DE',
    pais: 'Alemania', 
    moneda: 'EUR', 
    codigoMoneda: 'EUR',
    locale: 'de-DE', 
    comisionDefault: 0.24, 
    impuesto: 0.19,
    factorPrestacional: 1.32,  // 32% Sozialabgaben (Krankenversicherung, Rentenversicherung, Arbeitslosenversicherung, Pflegeversicherung)
    simboloMoneda: '€',
    decimales: 2
  },
  FR: { 
    codigo: 'FR',
    pais: 'Francia', 
    moneda: 'EUR', 
    codigoMoneda: 'EUR',
    locale: 'fr-FR', 
    comisionDefault: 0.24, 
    impuesto: 0.20,
    factorPrestacional: 1.45,  // 45% cotisations sociales patronales (malheureusement, Francia es alta)
    simboloMoneda: '€',
    decimales: 2
  },
  IT: { 
    codigo: 'IT',
    pais: 'Italia', 
    moneda: 'EUR', 
    codigoMoneda: 'EUR',
    locale: 'it-IT', 
    comisionDefault: 0.24, 
    impuesto: 0.22,
    factorPrestacional: 1.38,  // 38% contributi previdenziali (INPS, INAIL)
    simboloMoneda: '€',
    decimales: 2
  }
};

// ==================== FUNCIONES AUXILIARES ====================

// Determinar decimales según estándar ISO de moneda
const getDecimalesPorMoneda = (codigoMoneda) => {
  // Monedas sin decimales (históricamente o por inflación)
  const sinDecimales = ['COP', 'CLP', 'ARS', 'PYG', 'VES', 'KRW', 'JPY', 'ISK'];
  // Monedas con 3 decimales
  const tresDecimales = ['IQD', 'JOD', 'KWD', 'TND', 'BHD'];
  
  if (sinDecimales.includes(codigoMoneda)) return 0;
  if (tresDecimales.includes(codigoMoneda)) return 3;
  return 2; // Default: 2 decimales
};

// Obtener configuración regional por código de país
export const getRegionalConfig = (paisCode, usuarioConfig = {}) => {
  const base = REGIONES_SOPORTADAS[paisCode] || REGIONES_SOPORTADAS.CO;
  const decimales = usuarioConfig.decimalesPersonalizados || getDecimalesPorMoneda(base.codigoMoneda);
  
  return {
    ...base,
    comisionPersonalizada: usuarioConfig.comisionPasarela || base.comisionDefault,
    impuestoPersonalizado: usuarioConfig.ivaPorcentaje || base.impuesto,
    factorPrestacionalPersonalizado: usuarioConfig.factorPrestacional || base.factorPrestacional,
    formatoFecha: usuarioConfig.formatoFecha || (base.locale.includes('US') || base.locale.includes('UK') ? 'MM/DD/YYYY' : 'DD/MM/YYYY'),
    decimales: decimales
  };
};

// Formateador universal de moneda (basado en estándar ISO)
export const formatMoneyUniversal = (valor, paisCode, monedaPersonalizada = null) => {
  const config = REGIONES_SOPORTADAS[paisCode] || REGIONES_SOPORTADAS.CO;
  const moneda = monedaPersonalizada || config.moneda;
  const decimales = getDecimalesPorMoneda(moneda);
  
  // Para valores muy pequeños o cero
  const valorAbsoluto = Math.abs(valor || 0);
  const valorRedondeado = decimales === 0 
    ? Math.round(valorAbsoluto) 
    : Math.round(valorAbsoluto * Math.pow(10, decimales)) / Math.pow(10, decimales);
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    }).format(valorRedondeado);
  } catch (error) {
    // Fallback si el locale no es soportado
    const simbolo = config.simboloMoneda || '$';
    return `${simbolo} ${valorRedondeado.toFixed(decimales)}`;
  }
};

// Formatear número sin moneda (para tablas, porcentajes, etc.)
export const formatNumberUniversal = (valor, paisCode, decimalesForzados = null) => {
  const config = REGIONES_SOPORTADAS[paisCode] || REGIONES_SOPORTADAS.CO;
  const decimales = decimalesForzados !== null ? decimalesForzados : 2;
  
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(valor || 0);
};

// Obtener lista de países para selector (ordenada por región)
export const getListaPaises = () => {
  const orden = ['CO', 'MX', 'AR', 'CL', 'PE', 'UY', 'US', 'ES', 'UK', 'DE', 'FR', 'IT'];
  
  return orden
    .filter(codigo => REGIONES_SOPORTADAS[codigo])
    .map(codigo => ({
      codigo,
      nombre: REGIONES_SOPORTADAS[codigo].pais,
      moneda: REGIONES_SOPORTADAS[codigo].moneda,
      simbolo: REGIONES_SOPORTADAS[codigo].simboloMoneda,
      factorPrestacional: REGIONES_SOPORTADAS[codigo].factorPrestacional
    }));
};

// Validar si un código de país es soportado
export const isPaisSoportado = (paisCode) => {
  return !!REGIONES_SOPORTADAS[paisCode];
};

// Obtener factor prestacional por país (con posibilidad de override)
export const getFactorPrestacional = (paisCode, usuarioFactor = null) => {
  if (usuarioFactor && usuarioFactor !== 1.0) return usuarioFactor;
  const config = REGIONES_SOPORTADAS[paisCode] || REGIONES_SOPORTADAS.CO;
  return config.factorPrestacional;
};

export default REGIONES_SOPORTADAS;

