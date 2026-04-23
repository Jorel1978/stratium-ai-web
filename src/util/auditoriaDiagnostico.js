// src/util/auditoriaDiagnostico.js
// Módulo de Diagnóstico de Auditoría - Stratium AI v2.3
// Analiza resultados del motor y devuelve hallazgos críticos priorizados
// CON SOPORTE BILINGÜE (ESPAÑOL/INGLÉS)

/**
 * Genera un dictamen especializado con hallazgos críticos basados en umbrales financieros
 * @param {Object} resultado - Resultado de la auditoría (del hook useAuditEngine)
 * @param {Object} configuracion - Configuración regional y de plataforma
 * @param {string} idioma - Idioma actual ('es' o 'en')
 * @returns {Array} - Array de strings con hallazgos críticos priorizados
 */
export const generarDictamenEspecialista = (resultado, configuracion, idioma = 'es') => {
  const hallazgos = [];
  
  // Extraer valores con fallbacks seguros
  const precioVentaReal = resultado.precioVentaUnitario || resultado.precioVenta || 0;
  const costoUnitarioBaseReal = resultado.costoUnitarioBase || 0;
  const costoManoObraUnitario = resultado.desglose?.manoObra ? resultado.desglose.manoObra / (resultado.unidades || 1) : 0;
  const gastosFijosUnitariosReal = resultado.desglose?.gastosFijosPorUnidad || 0;
  const puntoEquilibrioReal = resultado.precioSugerido?.puntoEquilibrio || 0;
  const costoTotalUnitario = resultado.costoUnitarioCargado || 0;
  const margen = parseFloat(resultado.margenNetoReal);
  const tasaDevolucion = resultado.configuracion?.tasaDevolucion || 0;
  
  // Tasa efectiva de comisiones
  let tasaReal = 0;
  if (resultado.configuracion?.tasaEfectiva) {
    tasaReal = parseFloat(resultado.configuracion.tasaEfectiva) / 100;
  } else if (resultado.tasaEfectivaPorcentaje) {
    tasaReal = resultado.tasaEfectivaPorcentaje;
  }
  
  const isSpanish = idioma === 'es';
  const moneda = configuracion?.moneda || 'COP';
  
  // ============================================================
  // REGLA 1: PATOLOGÍA DE MATERIALES
  // ============================================================
  if (costoUnitarioBaseReal > 0 && precioVentaReal > 0) {
    const porcentajeMateriales = (costoUnitarioBaseReal / precioVentaReal) * 100;
    if (porcentajeMateriales > 50) {
      if (isSpanish) {
        hallazgos.push(`⚠️ MATERIALES CRÍTICOS: El costo de insumos (${Math.round(porcentajeMateriales)}% del precio) absorbe demasiado margen. Busca proveedores mayoristas o optimiza el desperdicio.`);
      } else {
        hallazgos.push(`⚠️ CRITICAL MATERIALS: Input cost (${Math.round(porcentajeMateriales)}% of price) absorbs too much margin. Look for wholesale suppliers or optimize waste.`);
      }
    }
  }
  
  // ============================================================
  // REGLA 2: PATOLOGÍA DE CANAL (PLATAFORMA)
  // ============================================================
  if (tasaReal > 0.20) {
    if (isSpanish) {
      hallazgos.push(`⚠️ CANAL COSTOSO: La plataforma se lleva ${(tasaReal * 100).toFixed(1)}% de tu ingreso bruto. Considera migrar ventas de alta rotación a canales propios (WhatsApp/Directo).`);
    } else {
      hallazgos.push(`⚠️ EXPENSIVE CHANNEL: The platform takes ${(tasaReal * 100).toFixed(1)}% of your gross income. Consider migrating high-turnover sales to your own channels (WhatsApp/Direct).`);
    }
  }
  
  // ============================================================
  // REGLA 3: PATOLOGÍA DE EFICIENCIA (Mano de Obra)
  // ============================================================
  if (costoManoObraUnitario > 0 && precioVentaReal > 0) {
    const porcentajeManoObra = (costoManoObraUnitario / precioVentaReal) * 100;
    if (porcentajeManoObra > 25) {
      if (isSpanish) {
        hallazgos.push(`⚠️ DEFICIENCIA OPERATIVA: El tiempo invertido por unidad (${Math.round(porcentajeManoObra)}% del precio) es muy alto. Estandariza procesos o aumenta la velocidad de ejecución.`);
      } else {
        hallazgos.push(`⚠️ OPERATIONAL INEFFICIENCY: Time invested per unit (${Math.round(porcentajeManoObra)}% of price) is too high. Standardize processes or increase execution speed.`);
      }
    }
  }
  
  // ============================================================
  // REGLA 4: PATOLOGÍA DE ESCALA (Gastos Fijos)
  // ============================================================
  if (gastosFijosUnitariosReal > 0 && costoTotalUnitario > 0) {
    const porcentajeGastosFijos = (gastosFijosUnitariosReal / costoTotalUnitario) * 100;
    if (porcentajeGastosFijos > 15) {
      if (isSpanish) {
        hallazgos.push(`⚠️ TRAMPA DE ESCALA: Los gastos fijos representan ${Math.round(porcentajeGastosFijos)}% del costo total. Aumenta el volumen de producción para diluir tu estructura operativa.`);
      } else {
        hallazgos.push(`⚠️ SCALE TRAP: Fixed costs represent ${Math.round(porcentajeGastosFijos)}% of total cost. Increase production volume to dilute your operational structure.`);
      }
    }
  }
  
  // ============================================================
  // REGLA 5: PATOLOGÍA DE PRECIO (Suicidio Comercial)
  // ============================================================
  if (puntoEquilibrioReal > 0 && precioVentaReal > 0 && precioVentaReal < puntoEquilibrioReal) {
    const diferencia = puntoEquilibrioReal - precioVentaReal;
    if (isSpanish) {
      hallazgos.push(`🚨 SUICIDIO COMERCIAL: Estás perdiendo ${Math.round(diferencia).toLocaleString()} ${moneda} por unidad. Tu precio no cubre ni la operación básica. Ajuste de precio inmediato requerido.`);
    } else {
      hallazgos.push(`🚨 COMMERCIAL SUICIDE: You are losing ${Math.round(diferencia).toLocaleString()} ${moneda} per unit. Your price does not even cover basic operations. Immediate price adjustment required.`);
    }
  }
  
  // ============================================================
  // REGLA ADICIONAL: MARGEN NEGATIVO EXTREMO
  // ============================================================
  if (margen < -50 && !isNaN(margen)) {
    if (isSpanish) {
      hallazgos.unshift(`🔴 MARGEN CATASTRÓFICO: Estás perdiendo más del 50% en cada venta. Revisa toda tu estructura de costos URGENTEMENTE.`);
    } else {
      hallazgos.unshift(`🔴 CATASTROPHIC MARGIN: You are losing more than 50% on each sale. Review your entire cost structure URGENTLY.`);
    }
  }
  
  // ============================================================
  // REGLA ADICIONAL: DEVOLUCIONES ALTAS
  // ============================================================
  if (tasaDevolucion > 10) {
    if (isSpanish) {
      hallazgos.push(`🔴 DEVOLUCIONES ELEVADAS: Tasa del ${tasaDevolucion}%. Revisa calidad del producto, fotos o descripciones. Las devoluciones destruyen tu rentabilidad real.`);
    } else {
      hallazgos.push(`🔴 HIGH RETURN RATE: Rate of ${tasaDevolucion}%. Review product quality, photos or descriptions. Returns destroy your real profitability.`);
    }
  }
  
  // ============================================================
  // REGLA ADICIONAL: COMISIONES EXCESIVAS
  // ============================================================
  if (tasaReal > 0.35) {
    if (isSpanish) {
      hallazgos.push(`🔴 PLATAFORMA INVIABLE: Las comisiones (${(tasaReal * 100).toFixed(1)}%) son excesivas. Considera migrar a canales propios.`);
    } else {
      hallazgos.push(`🔴 UNVIABLE PLATFORM: Commissions (${(tasaReal * 100).toFixed(1)}%) are excessive. Consider migrating to your own channels.`);
    }
  }
  
  // ============================================================
  // PRIORIZACIÓN DE HALLAZGOS (más críticos primero)
  // ============================================================
  const ordenPrioridad = [
    '🚨 SUICIDIO COMERCIAL',
    '🚨 COMMERCIAL SUICIDE',
    '🔴 MARGEN CATASTRÓFICO',
    '🔴 CATASTROPHIC MARGIN',
    '🔴 PLATAFORMA INVIABLE',
    '🔴 UNVIABLE PLATFORM',
    '⚠️ MATERIALES CRÍTICOS',
    '⚠️ CRITICAL MATERIALS',
    '⚠️ CANAL COSTOSO',
    '⚠️ EXPENSIVE CHANNEL',
    '⚠️ DEFICIENCIA OPERATIVA',
    '⚠️ OPERATIONAL INEFFICIENCY',
    '⚠️ TRAMPA DE ESCALA',
    '⚠️ SCALE TRAP',
    '🔴 DEVOLUCIONES ELEVADAS',
    '🔴 HIGH RETURN RATE'
  ];
  
  hallazgos.sort((a, b) => {
    const indexA = ordenPrioridad.findIndex(p => a.includes(p)) || 999;
    const indexB = ordenPrioridad.findIndex(p => b.includes(p)) || 999;
    return indexA - indexB;
  });
  
  return hallazgos;
};

export default generarDictamenEspecialista;

