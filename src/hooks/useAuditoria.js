import { useCallback, useMemo } from 'react';
import { formatearValor } from '../util/formatters';

// ============================================================
// CONSTANTES DE AUDITORÍA (EXTRAÍDAS DE LA LÓGICA ORIGINAL)
// ============================================================
const FACTOR_PRESTACIONAL_POR_PAIS = {
  colombia: 1.52,
  mexico: 1.35,
  argentina: 1.45,
  chile: 1.38,
  peru: 1.42,
  ecuador: 1.40,
  brasil: 1.48,
  uruguay: 1.43,
  paraguay: 1.41,
  bolivia: 1.44,
  default: 1.52
};

const UMBRALES = {
  MARGEN_ESTRELLA: 30,
  MARGEN_HUESO: 15,
  MARGEN_CRITICO: 5,
  DIAS_SIN_VENTA_HUESO: 15,
  DIAS_SIN_VENTA_CRITICO: 30,
  ROTACION_ESTRELLA: 0.5,
  ROTACION_HUESO: 0.05,
  OXIGENO_CRITICO: 15,
  OXIGENO_ALERTA: 30
};

// ============================================================
// FUNCIÓN AUXILIAR: Calcular rotación de inventario
// ============================================================
const calcularRotacionInventario = (ventasProducto, inventarioProducto, diasPeriodo = 30) => {
  if (!ventasProducto || ventasProducto.length === 0) return 0;
  if (!inventarioProducto || inventarioProducto.cantidad === 0) return 0;
  
  const cantidadVendida = ventasProducto.reduce((sum, v) => sum + (v.cantidad || 1), 0);
  const inventarioPromedio = inventarioProducto.cantidad;
  
  if (inventarioPromedio === 0) return 0;
  
  const rotacion = cantidadVendida / inventarioPromedio;
  const rotacionDiaria = rotacion / diasPeriodo;
  
  return rotacionDiaria;
};

// ============================================================
// FUNCIÓN AUXILIAR: Obtener factor prestacional por país
// ============================================================
const obtenerFactorPrestacional = (pais) => {
  if (!pais) return FACTOR_PRESTACIONAL_POR_PAIS.default;
  const paisLower = pais.toLowerCase();
  return FACTOR_PRESTACIONAL_POR_PAIS[paisLower] || FACTOR_PRESTACIONAL_POR_PAIS.default;
};

// ============================================================
// FUNCIÓN AUXILIAR: Calcular días desde última venta
// ============================================================
const calcularDiasSinVenta = (ventasProducto, fechaReferencia = new Date()) => {
  if (!ventasProducto || ventasProducto.length === 0) return 999;
  
  const fechasVentas = ventasProducto
    .filter(v => v.fecha)
    .map(v => new Date(v.fecha));
  
  if (fechasVentas.length === 0) return 999;
  
  const ultimaVenta = new Date(Math.max(...fechasVentas));
  const diffTime = fechaReferencia - ultimaVenta;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// ============================================================
// FUNCIÓN PRINCIPAL: analizarSaludFinanciera (VERSIÓN COMPLETA)
// ============================================================
export const analizarSaludFinanciera = (
  movimientos, 
  inventario, 
  configuracion, 
  idioma = 'es',
  moneda = { codigo: 'COP', simbolo: '$' }
) => {
  if (!movimientos || movimientos.length === 0) {
    return {
      saludPorcentaje: 0,
      saludColor: '#ef4444',
      saludMensaje: idioma === 'es' ? 'Sin datos' : 'No data',
      margenNeto: 0,
      margenBruto: 0,
      diasOxigeno: 0,
      alertas: [],
      recomendaciones: [],
      alertaQuiebra: null,
      productosEstrella: [],
      productosHueso: [],
      productosEstrellaFlujo: [],
      productosHuesoFinanciero: []
    };
  }

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  
  // Filtrar movimientos del mes actual
  const movimientosMes = movimientos.filter(m => {
    if (!m.fecha) return false;
    const fechaMov = new Date(m.fecha);
    return fechaMov >= primerDiaMes && fechaMov <= hoy;
  });

  const ventas = movimientosMes.filter(m => m.tipo === 'ingreso');
  const egresos = movimientosMes.filter(m => m.tipo === 'egreso');
  const comprasInventario = movimientosMes.filter(m => m.categoria === 'INVENTARIO' || m.categoria === 'Compra');
  
  const ventasTotales = ventas.reduce((s, m) => s + (m.valor || 0), 0);
  const egresosTotales = egresos.reduce((s, m) => s + (m.valor || 0), 0);
  const utilidadNeta = ventasTotales - egresosTotales;
  const margenNeto = ventasTotales > 0 ? (utilidadNeta / ventasTotales) * 100 : 0;
  
  // Calcular costo de ventas
  const costoVentas = ventas.reduce((sum, v) => {
    const costoUnitario = v.costoUnitario || 0;
    const cantidad = v.cantidad || 1;
    return sum + (costoUnitario * cantidad);
  }, 0);
  
  const margenBruto = ventasTotales > 0 ? ((ventasTotales - costoVentas) / ventasTotales) * 100 : 0;
  const utilidadBruta = ventasTotales - costoVentas;
  
  // Calcular oxígeno financiero
  const gastoDiarioPromedio = movimientosMes.length > 0 ? egresosTotales / 30 : 0;
  const saldoCaja = movimientos.reduce((sum, m) => {
    if (m.tipo === 'ingreso') return sum + (m.valor || 0);
    return sum - (m.valor || 0);
  }, 0);
  const diasOxigeno = gastoDiarioPromedio > 0 ? Math.floor(saldoCaja / gastoDiarioPromedio) : 999;
  
  // Determinar salud financiera
  let saludPorcentaje = 0;
  let saludColor = '#ef4444';
  let saludMensaje = '';
  
  if (margenNeto > 30 && diasOxigeno > 60) {
    saludPorcentaje = 100;
    saludColor = '#10b981';
    saludMensaje = idioma === 'es' ? 'Excelente' : 'Excellent';
  } else if (margenNeto > 20 && diasOxigeno > 30) {
    saludPorcentaje = 85;
    saludColor = '#34d399';
    saludMensaje = idioma === 'es' ? 'Muy Buena' : 'Very Good';
  } else if (margenNeto > 15 && diasOxigeno > 15) {
    saludPorcentaje = 70;
    saludColor = '#fbbf24';
    saludMensaje = idioma === 'es' ? 'Estable' : 'Stable';
  } else if (margenNeto > 5 && diasOxigeno > 7) {
    saludPorcentaje = 50;
    saludColor = '#f97316';
    saludMensaje = idioma === 'es' ? 'Precaria' : 'Precarious';
  } else if (margenNeto > 0 && diasOxigeno > 0) {
    saludPorcentaje = 30;
    saludColor = '#ef4444';
    saludMensaje = idioma === 'es' ? 'Frágil' : 'Fragile';
  } else {
    saludPorcentaje = 15;
    saludColor = '#dc2626';
    saludMensaje = idioma === 'es' ? 'Crítica' : 'Critical';
  }
  
  // ============================================================
  // ANÁLISIS DE PRODUCTOS ESTRELLA vs HUESO (CON ROTACIÓN)
  // ============================================================
  const ventasPorProducto = {};
  const ultimaVentaPorProducto = {};
  const rotacionPorProducto = {};
  
  // Agrupar ventas por producto
  ventas.forEach(v => {
    const nombre = v.concepto || 'Sin nombre';
    if (!ventasPorProducto[nombre]) {
      ventasPorProducto[nombre] = {
        ventas: [],
        totalIngreso: 0,
        totalCosto: 0,
        cantidadVendida: 0
      };
    }
    ventasPorProducto[nombre].ventas.push(v);
    ventasPorProducto[nombre].totalIngreso += v.valor || 0;
    ventasPorProducto[nombre].totalCosto += (v.costoUnitario || 0) * (v.cantidad || 1);
    ventasPorProducto[nombre].cantidadVendida += v.cantidad || 1;
  });
  
  // Calcular métricas por producto
  const productosAnalisis = [];
  
  Object.entries(ventasPorProducto).forEach(([nombre, data]) => {
    const margen = data.totalIngreso > 0 
      ? ((data.totalIngreso - data.totalCosto) / data.totalIngreso) * 100 
      : 0;
    
    const diasSinVenta = calcularDiasSinVenta(data.ventas, hoy);
    
    // Buscar inventario del producto
    const inventarioProducto = inventario?.find(i => 
      i.producto?.toLowerCase() === nombre.toLowerCase()
    );
    
    let rotacionDiaria = 0;
    if (inventarioProducto && inventarioProducto.cantidad > 0) {
      rotacionDiaria = calcularRotacionInventario(data.ventas, inventarioProducto, 30);
    }
    
    // CLASIFICACIÓN AVANZADA
    let clasificacion = 'NORMAL';
    let razonClasificacion = '';
    
    // Caso 1: Margen alto PERO sin rotación = HUESO FINANCIERO
    if (margen >= UMBRALES.MARGEN_ESTRELLA && diasSinVenta > UMBRALES.DIAS_SIN_VENTA_HUESO) {
      clasificacion = 'HUESO_FINANCIERO';
      razonClasificacion = idioma === 'es' 
        ? `Margen alto (${margen.toFixed(1)}%) pero ${diasSinVenta} días sin venta. Capital congelado.`
        : `High margin (${margen.toFixed(1)}%) but ${diasSinVenta} days without sales. Frozen capital.`;
    }
    // Caso 2: Margen bajo PERO alta rotación = ESTRELLA DE FLUJO
    else if (margen < UMBRALES.MARGEN_HUESO && rotacionDiaria >= UMBRALES.ROTACION_ESTRELLA) {
      clasificacion = 'ESTRELLA_FLUJO';
      razonClasificacion = idioma === 'es' 
        ? `Margen bajo (${margen.toFixed(1)}%) pero rotación alta (${(rotacionDiaria * 30).toFixed(1)} ventas/mes). Flujo constante.`
        : `Low margin (${margen.toFixed(1)}%) but high rotation (${(rotacionDiaria * 30).toFixed(1)} sales/month). Constant flow.`;
    }
    // Caso 3: Margen alto Y buena rotación = ESTRELLA
    else if (margen >= UMBRALES.MARGEN_ESTRELLA && rotacionDiaria >= UMBRALES.ROTACION_ESTRELLA) {
      clasificacion = 'ESTRELLA';
      razonClasificacion = idioma === 'es' 
        ? `Margen excelente (${margen.toFixed(1)}%) con alta rotación. Producto estrella.`
        : `Excellent margin (${margen.toFixed(1)}%) with high rotation. Star product.`;
    }
    // Caso 4: Margen bajo Y sin rotación = HUESO
    else if (margen < UMBRALES.MARGEN_HUESO && diasSinVenta > UMBRALES.DIAS_SIN_VENTA_HUESO) {
      clasificacion = 'HUESO';
      razonClasificacion = idioma === 'es' 
        ? `Margen bajo (${margen.toFixed(1)}%) y ${diasSinVenta} días sin venta. Liquidar urgente.`
        : `Low margin (${margen.toFixed(1)}%) and ${diasSinVenta} days without sales. Liquidate urgently.`;
    }
    // Caso 5: Sin ventas en inventario (producto muerto)
    else if (inventarioProducto && inventarioProducto.cantidad > 0 && data.ventas.length === 0) {
      clasificacion = 'HUESO';
      razonClasificacion = idioma === 'es' 
        ? `Sin ventas registradas. ${inventarioProducto.cantidad} unidades en inventario.`
        : `No sales recorded. ${inventarioProducto.cantidad} units in inventory.`;
    }
    
    productosAnalisis.push({
      nombre,
      margen: margen.toFixed(1),
      totalIngreso: data.totalIngreso,
      totalCosto: data.totalCosto,
      cantidadVendida: data.cantidadVendida,
      diasSinVenta,
      rotacionDiaria: rotacionDiaria.toFixed(2),
      clasificacion,
      razonClasificacion
    });
  });
  
  // Agregar productos que están en inventario pero no tienen ventas
  if (inventario && inventario.length > 0) {
    inventario.forEach(item => {
      const existeEnVentas = productosAnalisis.some(p => 
        p.nombre.toLowerCase() === item.producto?.toLowerCase()
      );
      if (!existeEnVentas && item.cantidad > 0) {
        productosAnalisis.push({
          nombre: item.producto,
          margen: '0',
          totalIngreso: 0,
          totalCosto: item.costoTotal || item.costoUnitario * item.cantidad,
          cantidadVendida: 0,
          diasSinVenta: 999,
          rotacionDiaria: '0',
          clasificacion: 'HUESO',
          razonClasificacion: idioma === 'es' 
            ? `Sin ventas. ${item.cantidad} unidades en inventario sin rotación.`
            : `No sales. ${item.cantidad} units in inventory without rotation.`
        });
      }
    });
  }
  
  // Separar productos por clasificación
  const productosEstrella = productosAnalisis.filter(p => p.clasificacion === 'ESTRELLA');
  const productosEstrellaFlujo = productosAnalisis.filter(p => p.clasificacion === 'ESTRELLA_FLUJO');
  const productosHueso = productosAnalisis.filter(p => p.clasificacion === 'HUESO');
  const productosHuesoFinanciero = productosAnalisis.filter(p => p.clasificacion === 'HUESO_FINANCIERO');
  
  // ============================================================
  // GENERAR ALERTAS
  // ============================================================
  const alertas = [];
  const recomendaciones = [];
  let alertaQuiebra = null;
  
  // Alerta 1: Productos Hueso (margen bajo + sin rotación)
  if (productosHueso.length > 0) {
    alertas.push({
      tipo: 'PRODUCTO_HUESO',
      mensaje: idioma === 'es' 
        ? `🦴 ${productosHueso.length} producto(s) Hueso: ${productosHueso.slice(0, 3).map(p => p.nombre).join(', ')}${productosHueso.length > 3 ? ` y ${productosHueso.length - 3} más` : ''}`
        : `🦴 ${productosHueso.length} Bone product(s): ${productosHueso.slice(0, 3).map(p => p.nombre).join(', ')}${productosHueso.length > 3 ? ` and ${productosHueso.length - 3} more` : ''}`,
      urgencia: productosHueso.length > 2 ? 'ALTA' : 'MEDIA',
      detalles: productosHueso.slice(0, 3).map(p => p.razonClasificacion)
    });
    recomendaciones.push(idioma === 'es' 
      ? `Liquidar productos Hueso con descuento del 30-50% para liberar capital`
      : `Liquidate Bone products with 30-50% discount to free up capital`);
  }
  
  // Alerta 2: Productos Hueso Financiero (margen alto pero sin ventas)
  if (productosHuesoFinanciero.length > 0) {
    alertas.push({
      tipo: 'HUESO_FINANCIERO',
      mensaje: idioma === 'es' 
        ? `💰 ${productosHuesoFinanciero.length} producto(s) con capital congelado: ${productosHuesoFinanciero.slice(0, 2).map(p => p.nombre).join(', ')}`
        : `💰 ${productosHuesoFinanciero.length} product(s) with frozen capital: ${productosHuesoFinanciero.slice(0, 2).map(p => p.nombre).join(', ')}`,
      urgencia: 'MEDIA',
      detalles: productosHuesoFinanciero.slice(0, 2).map(p => p.razonClasificacion)
    });
    recomendaciones.push(idioma === 'es' 
      ? `Activar promociones para productos con margen alto pero baja rotación`
      : `Activate promotions for high-margin but low-rotation products`);
  }
  
  // Alerta 3: Productos Estrella de Flujo
  if (productosEstrellaFlujo.length > 0) {
    alertas.push({
      tipo: 'ESTRELLA_FLUJO',
      mensaje: idioma === 'es' 
        ? `💨 ${productosEstrellaFlujo.length} producto(s) de flujo constante: ${productosEstrellaFlujo.slice(0, 2).map(p => p.nombre).join(', ')}`
        : `💨 ${productosEstrellaFlujo.length} constant flow product(s): ${productosEstrellaFlujo.slice(0, 2).map(p => p.nombre).join(', ')}`,
      urgencia: 'BAJA',
      detalles: productosEstrellaFlujo.slice(0, 2).map(p => p.razonClasificacion)
    });
    recomendaciones.push(idioma === 'es' 
      ? `Aumentar precio de productos con alta rotación y margen bajo para mejorar rentabilidad`
      : `Increase price of high-rotation, low-margin products to improve profitability`);
  }
  
  // Alerta 4: Margen neto bajo
  if (margenNeto < 15 && ventasTotales > 0) {
    alertas.push({
      tipo: 'MARGEN_BAJO',
      mensaje: idioma === 'es' 
        ? `📉 Margen neto bajo (${margenNeto.toFixed(1)}%). Revisa precios o costos fijos.`
        : `📉 Low net margin (${margenNeto.toFixed(1)}%). Review prices or fixed costs.`,
      urgencia: margenNeto < 5 ? 'ALTA' : 'MEDIA'
    });
    recomendaciones.push(idioma === 'es' 
      ? `Aumentar precios un mínimo del ${(15 - margenNeto + 5).toFixed(0)}% o reducir costos de proveedores`
      : `Increase prices by at least ${(15 - margenNeto + 5).toFixed(0)}% or reduce supplier costs`);
  }
  
  // Alerta 5: Margen bruto bajo (problema en costo de ventas)
  if (margenBruto < 25 && ventasTotales > 0 && margenBruto > 0) {
    alertas.push({
      tipo: 'MARGEN_BRUTO_BAJO',
      mensaje: idioma === 'es' 
        ? `🏭 Margen bruto bajo (${margenBruto.toFixed(1)}%). Costo de ventas muy alto.`
        : `🏭 Low gross margin (${margenBruto.toFixed(1)}%). Cost of sales too high.`,
      urgencia: 'ALTA'
    });
    recomendaciones.push(idioma === 'es' 
      ? `Negociar mejores precios con proveedores o buscar materias primas más económicas`
      : `Negotiate better prices with suppliers or look for cheaper raw materials`);
  }
  
  // Alerta 6: Flujo de caja negativo
  if (utilidadNeta < 0) {
    alertas.push({
      tipo: 'FLUJO_NEGATIVO',
      mensaje: idioma === 'es' 
        ? `💸 Flujo de caja negativo: pérdida de ${formatearValor(Math.abs(utilidadNeta), moneda.codigo)}`
        : `💸 Negative cash flow: loss of ${formatearValor(Math.abs(utilidadNeta), moneda.codigo)}`,
      urgencia: 'ALTA'
    });
    recomendaciones.push(idioma === 'es' 
      ? `Reducir gastos operativos un 20% o aumentar frecuencia de ventas URGENTE`
      : `Reduce operating expenses by 20% or increase sales frequency URGENTLY`);
  }
  
  // Alerta 7: Oxígeno financiero crítico
  if (diasOxigeno < UMBRALES.OXIGENO_CRITICO && diasOxigeno > 0) {
    alertas.push({
      tipo: 'OXIGENO_CRITICO',
      mensaje: idioma === 'es' 
        ? `🆘 Oxígeno financiero crítico: solo ${diasOxigeno} días de caja`
        : `🆘 Critical financial oxygen: only ${diasOxigeno} days of cash`,
      urgencia: 'ALTA'
    });
    recomendaciones.push(idioma === 'es' 
      ? `Inyectar capital o reestructurar deuda URGENTEMENTE antes de ${diasOxigeno} días`
      : `Inject capital or restructure debt URGENTLY within ${diasOxigeno} days`);
  } else if (diasOxigeno < UMBRALES.OXIGENO_ALERTA && diasOxigeno > 0) {
    alertas.push({
      tipo: 'OXIGENO_ALERTA',
      mensaje: idioma === 'es' 
        ? `⚠️ Oxígeno financiero limitado: ${diasOxigeno} días de caja`
        : `⚠️ Limited financial oxygen: ${diasOxigeno} days of cash`,
      urgencia: 'MEDIA'
    });
  }
  
  // Alerta 8: Alerta de quiebra (oxígeno < 15 días Y margen negativo)
  if (diasOxigeno < UMBRALES.OXIGENO_CRITICO && utilidadNeta < 0) {
    alertaQuiebra = {
      tipo: 'RIESGO_QUIEBRA',
      mensaje: idioma === 'es' 
        ? `🚨 RIESGO DE QUIEBRA INMINENTE: Oxígeno de ${diasOxigeno} días y pérdidas de ${formatearValor(Math.abs(utilidadNeta), moneda.codigo)}`
        : `🚨 IMMINENT BANKRUPTCY RISK: ${diasOxigeno} days of oxygen and losses of ${formatearValor(Math.abs(utilidadNeta), moneda.codigo)}`,
      recomendacion: idioma === 'es' 
        ? `Inyectar capital URGENTE (mínimo ${formatearValor(Math.abs(utilidadNeta) * 3, moneda.codigo)}) o reestructurar deuda HOY`
        : `Inject capital URGENTLY (minimum ${formatearValor(Math.abs(utilidadNeta) * 3, moneda.codigo)}) or restructure debt TODAY`,
      accionInmediata: true
    };
  }
  
  // Eliminar alertas duplicadas por tipo
  const alertasUnicas = [];
  const tiposVistos = new Set();
  for (const alerta of alertas) {
    if (!tiposVistos.has(alerta.tipo)) {
      tiposVistos.add(alerta.tipo);
      alertasUnicas.push(alerta);
    }
  }
  
  // Recomendaciones únicas
  const recomendacionesUnicas = [...new Set(recomendaciones)];
  
  return {
    saludPorcentaje,
    saludColor,
    saludMensaje,
    margenNeto: margenNeto.toFixed(1),
    margenBruto: margenBruto.toFixed(1),
    utilidadBruta,
    utilidadNeta,
    ventasTotales: formatearValor(ventasTotales, moneda.codigo),
    egresosTotales: formatearValor(egresosTotales, moneda.codigo),
    saldoCaja: formatearValor(saldoCaja, moneda.codigo),
    diasOxigeno: diasOxigeno === 999 ? 999 : diasOxigeno,
    alertas: alertasUnicas,
    recomendaciones: recomendacionesUnicas,
    alertaQuiebra,
    productosEstrella: productosEstrella.map(p => ({ nombre: p.nombre, margen: p.margen, totalIngreso: p.totalIngreso })),
    productosEstrellaFlujo: productosEstrellaFlujo.map(p => ({ nombre: p.nombre, margen: p.margen, rotacionDiaria: p.rotacionDiaria, diasSinVenta: p.diasSinVenta })),
    productosHueso: productosHueso.map(p => ({ nombre: p.nombre, margen: p.margen, diasSinVenta: p.diasSinVenta, razon: p.razonClasificacion })),
    productosHuesoFinanciero: productosHuesoFinanciero.map(p => ({ nombre: p.nombre, margen: p.margen, diasSinVenta: p.diasSinVenta, razon: p.razonClasificacion })),
    productosAnalisis: productosAnalisis.slice(0, 10)
  };
};

// ============================================================
// FUNCIÓN: procesarCosteo (con factor prestacional variable)
// ============================================================
export const procesarCosteo = (datosProduccion, configuracionUsuario = {}) => {
  const {
    materiales = 0,
    horas = 0,
    valorHora = 0,
    transporte = 0,
    precioVenta = 0,
    productoNombre = ''
  } = datosProduccion;

  const materialesNum = parseFloat(materiales) || 0;
  const horasNum = parseFloat(horas) || 0;
  const valorHoraNum = parseFloat(valorHora) || 0;
  const transporteNum = parseFloat(transporte) || 0;
  const precioVentaNum = parseFloat(precioVenta) || 0;

  // Obtener factor prestacional según la región del usuario (variable)
  const paisUsuario = configuracionUsuario?.pais || configuracionUsuario?.region || 'default';
  const factorPrestacional = obtenerFactorPrestacional(paisUsuario);
  
  // Cálculo de costos
  const costoManoObra = horasNum * valorHoraNum * factorPrestacional;
  const costoTotal = materialesNum + costoManoObra + transporteNum;
  const margenUnitario = precioVentaNum - costoTotal;
  const margenPorcentaje = costoTotal > 0 ? (margenUnitario / costoTotal) * 100 : 0;
  const margenPorHora = horasNum > 0 ? margenUnitario / horasNum : 0;
  
  // Precios sugeridos
  const precioSugerido = costoTotal * 1.3;
  const precioSugeridoPremium = costoTotal * 1.5;
  const precioSugeridoLiquidacion = costoTotal * 0.85;
  
  // Clasificación Estrella vs Hueso (básica por margen)
  let clasificacion = 'NORMAL';
  let mensajeClasificacion = '';
  let colorClasificacion = '';
  
  if (precioVentaNum > 0) {
    if (margenPorcentaje >= UMBRALES.MARGEN_ESTRELLA) {
      clasificacion = 'ESTRELLA';
      mensajeClasificacion = `⭐ Producto Estrella: margen del ${margenPorcentaje.toFixed(1)}% sobre costo. ¡Excelente rentabilidad!`;
      colorClasificacion = '#10b981';
    } else if (margenPorcentaje <= 0) {
      clasificacion = 'HUESO';
      mensajeClasificacion = `🦴 Producto Hueso: estás produciendo a pérdida (margen ${margenPorcentaje.toFixed(1)}%). Revisa costos o aumenta precio.`;
      colorClasificacion = '#ef4444';
    } else if (margenPorcentaje < UMBRALES.MARGEN_HUESO) {
      clasificacion = 'HUESO';
      mensajeClasificacion = `⚠️ Producto Hueso: margen bajo (${margenPorcentaje.toFixed(1)}%). Riesgo si hay devoluciones o sobrecostos.`;
      colorClasificacion = '#f97316';
    } else {
      mensajeClasificacion = `✅ Producto rentable con margen del ${margenPorcentaje.toFixed(1)}% sobre costo.`;
      colorClasificacion = '#fbbf24';
    }
  } else {
    mensajeClasificacion = 'Ingresa un precio de venta para evaluar rentabilidad';
    colorClasificacion = '#6b7280';
  }
  
  // Advertencia si el factor prestacional es alto
  let advertenciaPrestacional = '';
  if (factorPrestacional > 1.5) {
    advertenciaPrestacional = `⚠️ Factor prestacional alto (${factorPrestacional.toFixed(2)}). Considera externalizar producción o contratar servicios profesionales para reducir carga.`;
  }

  return {
    costoUnitario: costoTotal,
    costoMateriales: materialesNum,
    costoManoObra: costoManoObra,
    costoTransporte: transporteNum,
    factorPrestacionalUtilizado: factorPrestacional,
    margenUnitario: margenUnitario,
    margenPorcentaje: margenPorcentaje,
    margenPorHora: margenPorHora,
    clasificacion,
    mensajeClasificacion,
    colorClasificacion,
    precioSugerido,
    precioSugeridoPremium,
    precioSugeridoLiquidacion,
    advertenciaPrestacional,
    puntoEquilibrioUnidades: precioVentaNum > 0 ? costoTotal / precioVentaNum : 0,
    retornoInversion: costoTotal > 0 ? (margenUnitario / costoTotal) * 100 : 0
  };
};

// ============================================================
// FUNCIÓN: auditarSobrecostosProveedores (con moneda)
// ============================================================
export const auditarSobrecostosProveedores = (
  movimientos, 
  inventario, 
  plan, 
  idioma = 'es',
  moneda = { codigo: 'COP', simbolo: '$' }
) => {
  if (plan !== 'business' && plan !== 'elite') {
    return { sobrecostos: [], ahorroPotencial: 0, ahorroPotencialFormateado: '', mensajeResumen: '' };
  }

  const compras = movimientos.filter(m => 
    m.tipo === 'egreso' && 
    (m.categoria === 'INVENTARIO' || m.categoria === 'Compra' || m.categoria === 'COMPRA')
  );

  if (compras.length === 0) {
    return { sobrecostos: [], ahorroPotencial: 0, ahorroPotencialFormateado: '', mensajeResumen: '' };
  }

  const proveedores = {};
  
  compras.forEach(compra => {
    const proveedor = compra.proveedor || compra.tercero || 'Desconocido';
    if (!proveedores[proveedor]) {
      proveedores[proveedor] = { 
        totalGastado: 0, 
        compras: [], 
        promedioUnitario: {},
        facturas: new Set()
      };
    }
    proveedores[proveedor].totalGastado += compra.valor || 0;
    proveedores[proveedor].compras.push(compra);
    if (compra.numeroFactura) {
      proveedores[proveedor].facturas.add(compra.numeroFactura);
    }
    
    if (compra.concepto && compra.cantidad && compra.cantidad > 0) {
      const unitario = (compra.valorNeto || compra.valor) / compra.cantidad;
      if (!proveedores[proveedor].promedioUnitario[compra.concepto]) {
        proveedores[proveedor].promedioUnitario[compra.concepto] = [];
      }
      proveedores[proveedor].promedioUnitario[compra.concepto].push({
        precio: unitario,
        fecha: compra.fecha,
        factura: compra.numeroFactura,
        cantidad: compra.cantidad
      });
    }
  });

  const sobrecostos = [];
  let ahorroPotencialTotal = 0;

  Object.entries(proveedores).forEach(([proveedor, data]) => {
    Object.entries(data.promedioUnitario).forEach(([producto, precios]) => {
      if (precios.length >= 2) {
        const valores = precios.map(p => p.precio);
        const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
        const maximo = Math.max(...valores);
        const minimo = Math.min(...valores);
        const variacion = promedio > 0 ? ((maximo - minimo) / promedio) * 100 : 0;
        
        // Detectar sobrecosto significativo (>20% de variación)
        if (variacion > 20) {
          const precioReferencia = minimo;
          const sobrecostoPorUnidad = maximo - precioReferencia;
          
          // Estimar ahorro potencial basado en compras futuras
          const cantidadPromedio = precios.reduce((sum, p) => sum + (p.cantidad || 1), 0) / precios.length;
          const ahorroEstimado = sobrecostoPorUnidad * cantidadPromedio * 10; // Proyección a 10 compras
          ahorroPotencialTotal += ahorroEstimado;
          
          // Encontrar la factura más cara
          const compraCara = precios.find(p => p.precio === maximo);
          
          sobrecostos.push({
            proveedor,
            producto,
            precioMinimo: minimo,
            precioMaximo: maximo,
            precioPromedio: promedio,
            variacion: variacion.toFixed(1),
            ahorroEstimado,
            ahorroEstimadoFormateado: formatearValor(ahorroEstimado, moneda.codigo),
            gravedad: variacion > 50 ? 'ALTA' : (variacion > 30 ? 'MEDIA' : 'BAJA'),
            facturaCara: compraCara?.factura || 'N/A',
            fechaCara: compraCara?.fecha ? new Date(compraCara.fecha).toLocaleDateString() : 'N/A',
            mensaje: idioma === 'es'
              ? `${proveedor}: ${producto} varía ${variacion.toFixed(1)}% (${formatearValor(minimo, moneda.codigo)} → ${formatearValor(maximo, moneda.codigo)}). Negocia precio fijo.`
              : `${proveedor}: ${producto} varies ${variacion.toFixed(1)}% (${formatearValor(minimo, moneda.codigo)} → ${formatearValor(maximo, moneda.codigo)}). Negotiate fixed price.`
          });
        }
      }
    });
  });

  // Ordenar sobrecostos por gravedad
  sobrecostos.sort((a, b) => {
    const orden = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    return orden[a.gravedad] - orden[b.gravedad];
  });

  const ahorroPotencialFormateado = formatearValor(ahorroPotencialTotal, moneda.codigo);
  
  const mensajeResumen = sobrecostos.length > 0 && idioma === 'es'
    ? `⚠️ Detectados ${sobrecostos.length} sobrecosto(s) en ${sobrecostos.length} producto(s). Ahorro potencial: ${ahorroPotencialFormateado}`
    : sobrecostos.length > 0 ? `⚠️ Detected ${sobrecostos.length} overcost(s) in ${sobrecostos.length} product(s). Potential savings: ${ahorroPotencialFormateado}` : '';

  return { sobrecostos, ahorroPotencial: ahorroPotencialTotal, ahorroPotencialFormateado, mensajeResumen };
};

// ============================================================
// HOOK PRINCIPAL: useAuditoria (con useMemo y useCallback)
// ============================================================
export const useAuditoria = (movimientos, inventario, usuarioActual, configuracion, idioma = 'es', moneda = { codigo: 'COP' }) => {
  
  // Salud financiera - useMemo para evitar re-cálculos innecesarios
  const saludFinanciera = useMemo(() => 
    analizarSaludFinanciera(movimientos, inventario, configuracion, idioma, moneda),
    [movimientos, inventario, configuracion, idioma, moneda]
  );

  // Sobrecostos de proveedores - useMemo
  const auditoriaProveedores = useMemo(() => {
    if (!usuarioActual?.plan) return { sobrecostos: [], ahorroPotencial: 0, ahorroPotencialFormateado: '', mensajeResumen: '' };
    return auditarSobrecostosProveedores(movimientos, inventario, usuarioActual.plan, idioma, moneda);
  }, [movimientos, inventario, usuarioActual?.plan, idioma, moneda]);

  // Calcular rentabilidad de un producto específico - useCallback
  const calcularRentabilidadProducto = useCallback((producto, costoUnitario, precioVenta, cantidadInventario = 0, diasUltimaVenta = null) => {
    const margen = precioVenta > 0 ? ((precioVenta - costoUnitario) / costoUnitario) * 100 : 0;
    
    let clasificacion = 'NORMAL';
    if (margen >= UMBRALES.MARGEN_ESTRELLA && (diasUltimaVenta === null || diasUltimaVenta <= UMBRALES.DIAS_SIN_VENTA_HUESO)) {
      clasificacion = 'ESTRELLA';
    } else if (margen >= UMBRALES.MARGEN_ESTRELLA && diasUltimaVenta > UMBRALES.DIAS_SIN_VENTA_HUESO) {
      clasificacion = 'HUESO_FINANCIERO';
    } else if (margen < UMBRALES.MARGEN_HUESO && diasUltimaVenta !== null && diasUltimaVenta <= UMBRALES.DIAS_SIN_VENTA_HUESO) {
      clasificacion = 'ESTRELLA_FLUJO';
    } else if (margen < UMBRALES.MARGEN_HUESO) {
      clasificacion = 'HUESO';
    }
    
    let recomendacion = '';
    if (clasificacion === 'ESTRELLA') {
      recomendacion = idioma === 'es' ? 'Incrementar producción y mantener precio' : 'Increase production and maintain price';
    } else if (clasificacion === 'ESTRELLA_FLUJO') {
      recomendacion = idioma === 'es' ? 'Aumentar precio gradualmente para mejorar margen' : 'Gradually increase price to improve margin';
    } else if (clasificacion === 'HUESO_FINANCIERO') {
      recomendacion = idioma === 'es' ? 'Activar promociones para rotar inventario con margen alto' : 'Activate promotions to rotate high-margin inventory';
    } else if (clasificacion === 'HUESO') {
      recomendacion = idioma === 'es' ? 'Liquidar con descuento o descontinuar producto' : 'Liquidate with discount or discontinue product';
    } else {
      recomendacion = idioma === 'es' ? 'Mantener estrategia actual' : 'Maintain current strategy';
    }
    
    return {
      producto,
      costoUnitario,
      precioVenta,
      margen: margen.toFixed(1),
      clasificacion,
      recomendacion,
      precioSugerido: costoUnitario * 1.3,
      precioLiquidacion: costoUnitario * 0.85,
      rotacionSugerida: cantidadInventario > 0 ? (precioVenta * cantidadInventario) / costoUnitario : 0
    };
  }, [idioma]);

  // Procesar costeo de producción - useCallback
  const procesarCosteoConConfig = useCallback((datosProduccion) => {
    return procesarCosteo(datosProduccion, configuracion);
  }, [configuracion]);

  // Obtener alertas específicas por tipo - useCallback
  const getAlertasPorTipo = useCallback((tipo) => {
    return saludFinanciera.alertas?.filter(a => a.tipo === tipo) || [];
  }, [saludFinanciera.alertas]);

  // Verificar si hay riesgo de quiebra - useMemo
  const tieneRiesgoQuiebra = useMemo(() => {
    return saludFinanciera.alertaQuiebra !== null;
  }, [saludFinanciera.alertaQuiebra]);

  // Productos críticos (Hueso + Hueso Financiero) - useMemo
  const productosCriticos = useMemo(() => {
    return [
      ...(saludFinanciera.productosHueso || []),
      ...(saludFinanciera.productosHuesoFinanciero || [])
    ];
  }, [saludFinanciera.productosHueso, saludFinanciera.productosHuesoFinanciero]);

  return {
    saludFinanciera,
    sobrecostos: auditoriaProveedores.sobrecostos,
    ahorroPotencial: auditoriaProveedores.ahorroPotencial,
    ahorroPotencialFormateado: auditoriaProveedores.ahorroPotencialFormateado,
    mensajeSobrecostos: auditoriaProveedores.mensajeResumen,
    calcularRentabilidadProducto,
    procesarCosteo: procesarCosteoConConfig,
    getAlertasPorTipo,
    tieneRiesgoQuiebra,
    productosCriticos,
    // Exportar también las funciones individuales para uso directo
    analizarSaludFinanciera,
    auditarSobrecostosProveedores,
    procesarCosteo: procesarCosteoConConfig
  };
};

export default useAuditoria;

