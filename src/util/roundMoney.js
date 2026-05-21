// src/util/roundMoney.js
// Precisión financiera para Stratium AI (evita errores de punto flotante)
// Soporta monedas con y sin decimales (COP, CLP, ARS, JPY, etc.)

/**
 * Validar que un valor sea un número válido para operaciones financieras
 * @param {any} valor - Valor a validar
 * @param {string} contexto - Contexto para el log de error (opcional)
 * @returns {number} - Número válido o lanza error
 */
const validarNumero = (valor, contexto = '') => {
  const num = Number(valor);
  
  if (isNaN(num)) {
    const errorMsg = `❌ Error financiero: Valor inválido "${valor}" en ${contexto}`;
    console.error(errorMsg);
    // En desarrollo, lanzar error; en producción, retornar 0 con advertencia
    if (process.env.NODE_ENV === 'development') {
      throw new Error(errorMsg);
    }
    return 0;
  }
  
  if (!isFinite(num)) {
    const errorMsg = `❌ Error financiero: Valor infinito "${valor}" en ${contexto}`;
    console.error(errorMsg);
    return 0;
  }
  
  return num;
};

/**
 * Redondea un valor con precisión financiera según los decimales de la moneda
 * @param {number} valor - Valor a redondear
 * @param {number} decimales - Número de decimales (0, 2 o 3 según moneda)
 * @param {string} contexto - Contexto para debugging (opcional)
 * @returns {number} Valor redondeado
 * 
 * @example
 * roundMoney(1500.567, 2) // 1500.57
 * roundMoney(1500.567, 0) // 1501
 * roundMoney(1500.5, 0)   // 1501 (redondeo matemático)
 */
export const roundMoney = (valor, decimales = 2, contexto = '') => {
  const num = validarNumero(valor, contexto);
  
  // Validar que decimales sea un número entero no negativo
  const precision = Math.max(0, Math.floor(Number(decimales) || 2));
  
  // Para decimales = 0, redondear al entero más cercano
  if (precision === 0) {
    return Math.round(num);
  }
  
  // Para decimales > 0, usar multiplicación para evitar errores de punto flotante
  const multiplicador = Math.pow(10, precision);
  return Math.round(num * multiplicador) / multiplicador;
};

/**
 * Redondeo específico para monedas sin decimales (COP, CLP, ARS, JPY, etc.)
 * @param {number} valor - Valor a redondear
 * @returns {number} Valor redondeado a entero
 */
export const roundMoneySinDecimales = (valor) => {
  return roundMoney(valor, 0, 'roundMoneySinDecimales');
};

/**
 * Redondeo estándar para monedas con 2 decimales (USD, EUR, MXN, etc.)
 * @param {number} valor - Valor a redondear
 * @returns {number} Valor redondeado a 2 decimales
 */
export const roundMoneyDosDecimales = (valor) => {
  return roundMoney(valor, 2, 'roundMoneyDosDecimales');
};

/**
 * Suma valores monetarios con precisión (usando enteros internamente)
 * @param {number[]} valores - Array de valores a sumar
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number} Suma redondeada
 * 
 * @example
 * sumMoney([0.1, 0.2], 2) // 0.3 (no 0.30000000000000004)
 * sumMoney([1500, 2500], 0) // 4000
 */
export const sumMoney = (valores, decimales = 2) => {
  if (!Array.isArray(valores) || valores.length === 0) {
    return 0;
  }
  
  const precision = Math.max(0, Math.floor(Number(decimales) || 2));
  const multiplicador = Math.pow(10, precision);
  
  // Convertir a enteros, sumar, luego volver a decimales
  const sumaEnteros = valores.reduce((acc, val) => {
    const num = validarNumero(val, 'sumMoney');
    return acc + Math.round(num * multiplicador);
  }, 0);
  
  return sumaEnteros / multiplicador;
};

/**
 * Multiplica valores monetarios con precisión
 * NOTA: Para cálculos en cadena (ej: precio * cantidad * factor),
 * es mejor multiplicar primero y redondear al final.
 * Esta función es para operaciones aisladas.
 * 
 * @param {number} a - Primer valor
 * @param {number} b - Segundo valor
 * @param {number} decimales - Número de decimales de la moneda
 * @param {boolean} redondearAhora - Si false, retorna el valor exacto para cálculos en cadena
 * @returns {number} Producto (redondeado o exacto)
 * 
 * @example
 * // Para cálculo aislado
 * multiplyMoney(10.5, 3, 2) // 31.5
 * 
 * // Para cálculo en cadena (ej: con factor prestacional)
 * const precioBase = multiplyMoney(11500, 40, 2, false); // 460000 (sin redondear)
 * const conFactor = precioBase * 1.52; // 699200 (cálculo exacto)
 * const final = roundMoney(conFactor, 2); // Redondear al final
 */
export const multiplyMoney = (a, b, decimales = 2, redondearAhora = true) => {
  const numA = validarNumero(a, 'multiplyMoney');
  const numB = validarNumero(b, 'multiplyMoney');
  
  const producto = numA * numB;
  
  if (redondearAhora) {
    return roundMoney(producto, decimales, 'multiplyMoney');
  }
  return producto;
};

/**
 * Divide valores monetarios con precisión
 * @param {number} a - Numerador (dividendo)
 * @param {number} b - Denominador (divisor)
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number} Cociente redondeado
 */
export const divideMoney = (a, b, decimales = 2) => {
  const numA = validarNumero(a, 'divideMoney');
  const numB = validarNumero(b, 'divideMoney');
  
  if (numB === 0) {
    console.warn('⚠️ División por cero en divideMoney');
    return 0;
  }
  
  const cociente = numA / numB;
  return roundMoney(cociente, decimales, 'divideMoney');
};

/**
 * Calcula un porcentaje sobre un valor base
 * @param {number} valor - Valor base
 * @param {number} porcentaje - Porcentaje a aplicar (ej: 19 para 19%)
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number} Valor del porcentaje redondeado
 * 
 * @example
 * calcularPorcentaje(1000000, 19, 2) // 190000
 * calcularPorcentaje(1500.5, 27.1, 2) // 406.64
 */
export const calcularPorcentaje = (valor, porcentaje, decimales = 2) => {
  const numValor = validarNumero(valor, 'calcularPorcentaje');
  const numPorcentaje = validarNumero(porcentaje, 'calcularPorcentaje');
  
  // Multiplicar sin redondear, luego redondear al final
  const resultado = numValor * (numPorcentaje / 100);
  return roundMoney(resultado, decimales, 'calcularPorcentaje');
};

/**
 * Aplica factor prestacional (ej: 1.52) a un valor
 * @param {number} valor - Valor base
 * @param {number} factor - Factor a aplicar
 * @param {number} decimales - Número de decimales de la moneda
 * @param {boolean} redondearAhora - Si false, retorna valor exacto para cálculos en cadena
 * @returns {number} Valor con factor aplicado
 */
export const aplicarFactor = (valor, factor, decimales = 2, redondearAhora = true) => {
  return multiplyMoney(valor, factor, decimales, redondearAhora);
};

/**
 * Calcula el valor por unidad (prorrateo) con precisión
 * @param {number} total - Valor total a prorratear
 * @param {number} unidades - Número de unidades
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number} Valor por unidad redondeado
 */
export const prorratearPorUnidad = (total, unidades, decimales = 2) => {
  const numTotal = validarNumero(total, 'prorratearPorUnidad');
  const numUnidades = validarNumero(unidades, 'prorratearPorUnidad');
  
  if (numUnidades <= 0) {
    console.warn('⚠️ Unidades inválidas en prorratearPorUnidad:', numUnidades);
    return 0;
  }
  
  return divideMoney(numTotal, numUnidades, decimales);
};

/**
 * Calcula el valor total desde valor unitario y cantidad
 * Para cálculos en cadena (facturación), usar redondearAhora = false
 * @param {number} valorUnitario - Valor por unidad
 * @param {number} cantidad - Cantidad de unidades
 * @param {number} decimales - Número de decimales de la moneda
 * @param {boolean} redondearAhora - Si false, retorna valor exacto
 * @returns {number} Valor total
 */
export const calcularTotal = (valorUnitario, cantidad, decimales = 2, redondearAhora = true) => {
  return multiplyMoney(valorUnitario, cantidad, decimales, redondearAhora);
};

/**
 * Redondea un array de valores según los decimales de la moneda
 * @param {number[]} valores - Array de valores a redondear
 * @param {number} decimales - Número de decimales de la moneda
 * @returns {number[]} Array de valores redondeados
 */
export const redondearArray = (valores, decimales = 2) => {
  if (!Array.isArray(valores)) return [];
  return valores.map(val => roundMoney(val, decimales, 'redondearArray'));
};

// NOTA: Solo exportamos las funciones individuales, NO un objeto default.
// Esto permite tree shaking y evita duplicación en la importación.
// Uso: import { roundMoney, sumMoney, multiplyMoney } from './util/roundMoney';

