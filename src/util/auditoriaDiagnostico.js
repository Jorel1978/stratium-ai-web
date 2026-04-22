// src/util/auditoriaDiagnostico.js
// Módulo de Diagnóstico de Auditoría - Stratium AI v2.3
// Analiza resultados del motor y devuelve hallazgos críticos priorizados

/**
 * Genera un dictamen especializado con hallazgos críticos basados en umbrales financieros
 * @param {Object} resultado - Resultado de la auditoría (del hook useAuditEngine)
 * @param {Object} configuracion - Configuración regional y de plataforma
 * @returns {Array} - Array de strings con hallazgos críticos priorizados
 */
export const generarDictamenEspecialista = (resultado, configuracion) => {
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
  
  // ============================================================
  // REGLA 1: PATOLOGÍA DE MATERIALES
  // ============================================================
  if (costoUnitarioBaseReal > 0 && precioVentaReal > 0) {
    const porcentajeMateriales = (costoUnitarioBaseReal / precioVentaReal) * 100;
    if (porcentajeMateriales > 50) {
      hallazgos.push(`⚠️ MATERIALES CRÍTICOS: El costo de insumos (${Math.round(porcentajeMateriales)}% del precio) absorbe demasiado margen. Busca proveedores mayoristas o optimiza el desperdicio.`);
    }
  }
  
  // ============================================================
  // REGLA 2: PATOLOGÍA DE CANAL (PLATAFORMA)
  // ============================================================
  if (tasaReal > 0.20) {
    hallazgos.push(`⚠️ CANAL COSTOSO: La plataforma se lleva ${(tasaReal * 100).toFixed(1)}% de tu ingreso bruto. Considera migrar ventas de alta rotación a canales propios (WhatsApp/Directo).`);
  }
  
  // ============================================================
  // REGLA 3: PATOLOGÍA DE EFICIENCIA (Mano de Obra)
  // ============================================================
  if (costoManoObraUnitario > 0 && precioVentaReal > 0) {
    const porcentajeManoObra = (costoManoObraUnitario / precioVentaReal) * 100;
    if (porcentajeManoObra > 25) {
      hallazgos.push(`⚠️ DEFICIENCIA OPERATIVA: El tiempo invertido por unidad (${Math.round(porcentajeManoObra)}% del precio) es muy alto. Estandariza procesos o aumenta la velocidad de ejecución.`);
    }
  }
  
  // ============================================================
  // REGLA 4: PATOLOGÍA DE ESCALA (Gastos Fijos)
  // ============================================================
  if (gastosFijosUnitariosReal > 0 && costoTotalUnitario > 0) {
    const porcentajeGastosFijos = (gastosFijosUnitariosReal / costoTotalUnitario) * 100;
    if (porcentajeGastosFijos > 15) {
      hallazgos.push(`⚠️ TRAMPA DE ESCALA: Los gastos fijos representan ${Math.round(porcentajeGastosFijos)}% del costo total. Aumenta el volumen de producción para diluir tu estructura operativa.`);
    }
  }
  
  // ============================================================
  // REGLA 5: PATOLOGÍA DE PRECIO (Suicidio Comercial)
  // ============================================================
  if (puntoEquilibrioReal > 0 && precioVentaReal > 0 && precioVentaReal < puntoEquilibrioReal) {
    const diferencia = puntoEquilibrioReal - precioVentaReal;
    hallazgos.push(`🚨 SUICIDIO COMERCIAL: Estás perdiendo ${Math.round(diferencia).toLocaleString()} ${configuracion?.moneda || 'COP'} por unidad. Tu precio no cubre ni la operación básica. Ajuste de precio inmediato requerido.`);
  }
  
  // ============================================================
  // REGLA ADICIONAL: MARGEN NEGATIVO EXTREMO
  // ============================================================
  if (margen < -50 && !isNaN(margen)) {
    hallazgos.unshift(`🔴 MARGEN CATASTRÓFICO: Estás perdiendo más del 50% en cada venta. Revisa toda tu estructura de costos URGENTEMENTE.`);
  }
  
  // ============================================================
  // REGLA ADICIONAL: DEVOLUCIONES ALTAS
  // ============================================================
  if (tasaDevolucion > 10) {
    hallazgos.push(`🔴 DEVOLUCIONES ELEVADAS: Tasa del ${tasaDevolucion}%. Revisa calidad del producto, fotos o descripciones. Las devoluciones destruyen tu rentabilidad real.`);
  }
  
  // ============================================================
  // PRIORIZACIÓN DE HALLAZGOS (más críticos primero)
  // ============================================================
  const ordenPrioridad = [
    '🚨 SUICIDIO COMERCIAL',
    '🔴 MARGEN CATASTRÓFICO',
    '⚠️ MATERIALES CRÍTICOS',
    '⚠️ CANAL COSTOSO',
    '⚠️ DEFICIENCIA OPERATIVA',
    '⚠️ TRAMPA DE ESCALA',
    '🔴 DEVOLUCIONES ELEVADAS'
  ];
  
  hallazgos.sort((a, b) => {
    const indexA = ordenPrioridad.findIndex(p => a.includes(p)) || 999;
    const indexB = ordenPrioridad.findIndex(p => b.includes(p)) || 999;
    return indexA - indexB;
  });
  
  return hallazgos;
};

export default generarDictamenEspecialista;

