// src/utils/formatMoneyUniversal.js
// Formateador de moneda multi-región para Stratium AI
// Con soporte para números negativos (pérdidas) y parsing robusto por locale

import { REGIONES_SOPORTADAS } from '../config/regional';

// Mapping de códigos de país a códigos ISO (para consistencia)
const NORMALIZAR_PAIS = {
  'UK': 'GB',      // Reino Unido → ISO GB
  'US': 'US',      // Estados Unidos
  'CO': 'CO',      // Colombia
  'MX': 'MX',      // México
  'AR': 'AR',      // Argentina
  'CL': 'CL',      // Chile
  'PE': 'PE',      // Perú
  'UY': 'UY',      // Uruguay
  'ES': 'ES',      // España
  'DE': 'DE',      // Alemania
  'FR': 'FR',      // Francia
  'IT': 'IT'       // Italia
};

/**
 * Obtener la configuración de decimales para una moneda específica
 * Basado en estándar ISO 4217
 */
const getDecimalesPorMoneda = (codigoMoneda) => {
  // Monedas sin decimales (históricamente o por inflación)
  const sinDecimales = ['COP', 'CLP', 'ARS', 'PYG', 'VES', 'KRW', 'JPY', 'ISK', 'INR'];
  // Monedas con 3 decimales
  const tresDecimales = ['IQD', 'JOD', 'KWD', 'TND', 'BHD'];
  
  if (sinDecimales.includes(codigoMoneda)) return 0;
  if (tresDecimales.includes(codigoMoneda)) return 3;
  return 2; // Default: 2 decimales
};

/**
 * Convertir valor a enteros (centavos/unidad base) para operaciones precisas
 * @param {number} valor - Valor en unidades monetarias
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number} - Valor en enteros (centavos o unidad base)
 */
export const valorAEnteros = (valor, decimales = 2) => {
  const multiplicador = Math.pow(10, decimales);
  return Math.round((Number(valor) || 0) * multiplicador);
};

/**
 * Convertir de enteros a unidades monetarias
 * @param {number} enteros - Valor en enteros (centavos o unidad base)
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number} - Valor en unidades monetarias
 */
export const enterosAValor = (enteros, decimales = 2) => {
  const divisor = Math.pow(10, decimales);
  return enteros / divisor;
};

/**
 * Formatear valor monetario según país y moneda
 * @param {number} valor - Valor a formatear (puede ser negativo)
 * @param {string} paisCode - Código del país (CO, US, ES, UK, etc.)
 * @param {string|null} monedaPersonalizada - Moneda personalizada (opcional)
 * @returns {string} - Valor formateado (ej: "$1,234.56" o "-$1,234.56")
 */
export const formatMoneyUniversal = (valor, paisCode, monedaPersonalizada = null) => {
  // Normalizar código de país
  const codigoNormalizado = NORMALIZAR_PAIS[paisCode] || paisCode;
  const config = REGIONES_SOPORTADAS[codigoNormalizado] || REGIONES_SOPORTADAS.CO;
  const moneda = monedaPersonalizada || config.moneda;
  
  // Obtener decimales basado en la moneda (ISO 4217)
  const decimales = getDecimalesPorMoneda(moneda);
  
  // Usar el valor directamente (sin Math.abs para preservar números negativos)
  const valorNumerico = Number(valor) || 0;
  
  // Redondeo financiero preciso usando enteros
  const multiplicador = Math.pow(10, decimales);
  const valorRedondeado = Math.round(valorNumerico * multiplicador) / multiplicador;
  
  try {
    // Usar Intl.NumberFormat con el locale correcto
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      // Para números negativos, usa el formato estándar del locale
      signDisplay: 'auto'
    }).format(valorRedondeado);
  } catch (error) {
    // Fallback si el locale no es soportado
    const simbolo = config.simboloMoneda || '$';
    const signo = valorRedondeado < 0 ? '-' : '';
    const valorAbs = Math.abs(valorRedondeado);
    return `${signo}${simbolo} ${valorAbs.toFixed(decimales)}`;
  }
};

/**
 * Parsear texto monetario a número según el país
 * Maneja correctamente separadores de miles y decimales por locale
 * 
 * Ejemplos que maneja correctamente:
 * - Colombia: "1.500.000" -> 1500000 (puntos miles, sin decimales)
 * - Colombia: "1.500.000,50" -> 1500000.50 (puntos miles, coma decimal)
 * - USA: "$1,500.50" -> 1500.50 (comas miles, punto decimal)
 * - España: "1.500,50 €" -> 1500.50 (punto miles, coma decimal)
 * - México: "$1,500.00" -> 1500.00 (comas miles, punto decimal)
 * - Chile: "$1.500" -> 1500 (punto miles sin decimales)
 * 
 * @param {string} texto - Texto a parsear (ej: "$1.500,50" o "1,500.50")
 * @param {string} paisCode - Código del país para determinar locale
 * @returns {number} - Valor numérico (0 si no se puede parsear)
 */
export const parseMoneyUniversal = (texto, paisCode) => {
  if (!texto || typeof texto !== 'string') return 0;
  
  // Normalizar código de país
  const codigoNormalizado = NORMALIZAR_PAIS[paisCode] || paisCode;
  const config = REGIONES_SOPORTADAS[codigoNormalizado] || REGIONES_SOPORTADAS.CO;
  
  // Obtener separadores según el locale
  const locale = config.locale;
  const decimales = getDecimalesPorMoneda(config.moneda);
  
  // Detectar separadores según el locale
  let separadorMiles = '';
  let separadorDecimal = '';
  
  // Identificar formato basado en el locale y el texto
  const textoLimpioInicial = texto.replace(/[^\d.,-]/g, '');
  
  // Detectar si usa punto o coma como decimal
  const ultimoPunto = textoLimpioInicial.lastIndexOf('.');
  const ultimaComa = textoLimpioInicial.lastIndexOf(',');
  
  if (ultimoPunto > ultimaComa) {
    // El último separador es punto → probablemente es decimal
    separadorDecimal = '.';
    separadorMiles = ',';
  } else if (ultimaComa > ultimoPunto) {
    // El último separador es coma → probablemente es decimal
    separadorDecimal = ',';
    separadorMiles = '.';
  } else if (ultimoPunto === -1 && ultimaComa !== -1) {
    // Solo hay comas
    const partes = textoLimpioInicial.split(',');
    if (partes.length === 2 && partes[1].length <= 2 && decimales > 0) {
      // La coma es decimal (tiene máximo 2 dígitos después)
      separadorDecimal = ',';
      separadorMiles = '';
    } else {
      // La coma es separador de miles
      separadorMiles = ',';
      separadorDecimal = '';
    }
  } else if (ultimaComa === -1 && ultimoPunto !== -1) {
    // Solo hay puntos
    const partes = textoLimpioInicial.split('.');
    if (partes.length === 2 && partes[1].length <= 2 && decimales > 0) {
      // El punto es decimal
      separadorDecimal = '.';
      separadorMiles = '';
    } else {
      // El punto es separador de miles
      separadorMiles = '.';
      separadorDecimal = '';
    }
  }
  
  // Limpiar el texto según los separadores identificados
  let numeroLimpio = textoLimpioInicial;
  
  if (separadorMiles === '.') {
    // Quitar puntos (separadores de miles)
    numeroLimpio = numeroLimpio.replace(/\./g, '');
  } else if (separadorMiles === ',') {
    // Quitar comas (separadores de miles)
    numeroLimpio = numeroLimpio.replace(/,/g, '');
  }
  
  if (separadorDecimal === ',') {
    // Reemplazar coma decimal por punto para parseFloat
    numeroLimpio = numeroLimpio.replace(',', '.');
  }
  
  // Parsear a número flotante
  let resultado = parseFloat(numeroLimpio);
  
  // Si hubo algún error en la detección, intentar método alternativo
  if (isNaN(resultado)) {
    // Remover todo excepto dígitos, punto y coma
    const soloNumeros = texto.replace(/[^\d.,-]/g, '');
    // Último separador es el decimal
    const ultimoSeparador = soloNumeros.match(/[.,][0-9]+$/);
    if (ultimoSeparador) {
      const decimalChar = ultimoSeparador[0][0];
      const sinMiles = soloNumeros.replace(new RegExp(`[${decimalChar === '.' ? ',' : '.'}]`, 'g'), '');
      const conPuntoDecimal = sinMiles.replace(decimalChar, '.');
      resultado = parseFloat(conPuntoDecimal);
    } else {
      resultado = parseFloat(soloNumeros.replace(/[.,]/g, ''));
    }
  }
  
  // Redondear según los decimales de la moneda
  if (!isNaN(resultado)) {
    const multiplicador = Math.pow(10, decimales);
    resultado = Math.round(resultado * multiplicador) / multiplicador;
  }
  
  return isNaN(resultado) ? 0 : resultado;
};

/**
 * Validar y normalizar un valor monetario
 * @param {number} valor - Valor a validar
 * @param {string} paisCode - Código del país
 * @returns {number} - Valor normalizado (redondeado según la moneda)
 */
export const normalizarValorMonetario = (valor, paisCode) => {
  const codigoNormalizado = NORMALIZAR_PAIS[paisCode] || paisCode;
  const config = REGIONES_SOPORTADAS[codigoNormalizado] || REGIONES_SOPORTADAS.CO;
  const decimales = getDecimalesPorMoneda(config.moneda);
  const multiplicador = Math.pow(10, decimales);
  return Math.round((Number(valor) || 0) * multiplicador) / multiplicador;
};

/**
 * Sumar valores monetarios sin pérdida de precisión
 * @param {number[]} valores - Array de valores a sumar
 * @param {string} paisCode - Código del país
 * @returns {number} - Suma redondeada según la moneda
 */
export const sumarMonedas = (valores, paisCode) => {
  const codigoNormalizado = NORMALIZAR_PAIS[paisCode] || paisCode;
  const config = REGIONES_SOPORTADAS[codigoNormalizado] || REGIONES_SOPORTADAS.CO;
  const decimales = getDecimalesPorMoneda(config.moneda);
  
  // Convertir a enteros, sumar, luego volver
  const multiplicador = Math.pow(10, decimales);
  const sumaEnteros = valores.reduce((sum, val) => {
    return sum + Math.round((Number(val) || 0) * multiplicador);
  }, 0);
  
  return sumaEnteros / multiplicador;
};

export default formatMoneyUniversal;

