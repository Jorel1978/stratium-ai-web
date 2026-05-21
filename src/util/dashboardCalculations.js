// src/util/dashboardCalculations.js
// Funciones puras de cálculo financiero - SIN IA

/**
 * Calcula días de inactividad desde la última transacción
 * @param {Date|string} ultimaFecha - Fecha de la última transacción
 * @returns {number|null} Días de inactividad o null si no hay fecha
 */
export const calcularDiasInactividad = (ultimaFecha) => {
  if (!ultimaFecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ultima = new Date(ultimaFecha);
  ultima.setHours(0, 0, 0, 0);
  const diffTime = hoy - ultima;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calcula tendencia de ventas semana vs semana anterior
 * @param {Array} transacciones - Lista de transacciones con fecha y valor
 * @returns {Object} Porcentaje, dirección y valores
 */
export const calcularTendenciaSemanal = (transacciones) => {
  const hoy = new Date();
  const estaSemana = transacciones.filter(t => {
    const fecha = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
    const diffDias = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
    return diffDias <= 7;
  });
  
  const semanaPasada = transacciones.filter(t => {
    const fecha = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
    const diffDias = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
    return diffDias > 7 && diffDias <= 14;
  });
  
  const totalEsta = estaSemana.reduce((s, t) => s + (t.valor || 0), 0);
  const totalPasada = semanaPasada.reduce((s, t) => s + (t.valor || 0), 0);
  
  if (totalPasada === 0) {
    return { 
      porcentaje: totalEsta > 0 ? 100 : 0, 
      direccion: totalEsta > 0 ? 'up' : 'neutral',
      valorAnterior: totalPasada,
      valorActual: totalEsta
    };
  }
  
  const porcentaje = ((totalEsta - totalPasada) / totalPasada) * 100;
  return {
    porcentaje: Math.abs(Math.round(porcentaje)),
    direccion: porcentaje >= 0 ? 'up' : 'down',
    valorAnterior: totalPasada,
    valorActual: totalEsta
  };
};

/**
 * Calcula días de oxígeno financiero (gastos cubiertos)
 * @param {number} saldoCaja - Saldo actual en caja
 * @param {number} gastosMensuales - Gastos fijos mensuales
 * @returns {Object} Días cubiertos, monto necesario, si necesita acción
 */
export const calcularOxigeno = (saldoCaja, gastosMensuales) => {
  if (!gastosMensuales || gastosMensuales <= 0) {
    return { dias: 0, montoNecesario: 0, necesitaAccion: true };
  }
  const gastoDiario = gastosMensuales / 30;
  const dias = saldoCaja / gastoDiario;
  const metaDias = 5;
  const montoNecesario = dias < metaDias ? (metaDias - dias) * gastoDiario : 0;
  
  return {
    dias: Math.floor(dias * 10) / 10,
    montoNecesario: Math.max(0, Math.ceil(montoNecesario)),
    necesitaAccion: dias < 5
  };
};

/**
 * Calcula productos estrella (mayor rotación)
 * @param {Array} transacciones - Lista de transacciones
 * @param {number} limite - Cantidad máxima de productos a retornar
 * @returns {Array} Productos estrella con nombre y total
 */
export const calcularProductosEstrella = (transacciones, limite = 5) => {
  const ventas = transacciones.filter(t => t.tipo === 'ingreso' && t.categoria === 'VENTA');
  const productoVentas = {};
  
  ventas.forEach(v => {
    if (v.concepto) {
      productoVentas[v.concepto] = (productoVentas[v.concepto] || 0) + (v.valor || 0);
    }
  });
  
  return Object.entries(productoVentas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([nombre, total]) => ({ nombre, total }));
};

/**
 * Calcula productos hueso (sin rotación > umbralDías)
 * @param {Array} inventario - Lista de inventario
 * @param {Array} transacciones - Lista de transacciones
 * @param {number} umbralDias - Días sin ventas para considerar hueso
 * @returns {Array} Productos hueso
 */
export const calcularProductosHueso = (inventario, transacciones, umbralDias = 30) => {
  const hoy = new Date();
  const fechasVenta = {};
  
  transacciones.filter(t => t.tipo === 'ingreso' && t.categoria === 'VENTA').forEach(v => {
    if (v.concepto) {
      const fecha = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
      if (!fechasVenta[v.concepto] || fecha > fechasVenta[v.concepto]) {
        fechasVenta[v.concepto] = fecha;
      }
    }
  });
  
  return inventario.filter(item => {
    const ultimaVenta = fechasVenta[item.producto];
    if (!ultimaVenta) return item.cantidad > 0;
    const diffDias = Math.floor((hoy - ultimaVenta) / (1000 * 60 * 60 * 24));
    return diffDias > umbralDias && item.cantidad > 0;
  });
};

/**
 * Calcula alertas de flujo de caja
 * @param {number} saldoCaja - Saldo actual en caja
 * @param {number} gastosMensuales - Gastos fijos mensuales
 * @param {number} diasInactividad - Días sin registrar
 * @returns {Array} Lista de alertas
 */
export const calcularAlertasCaja = (saldoCaja, gastosMensuales, diasInactividad) => {
  const alertas = [];
  const oxigeno = calcularOxigeno(saldoCaja, gastosMensuales);
  
  if (oxigeno.necesitaAccion) {
    alertas.push({
      tipo: 'CAJA_BAJA',
      mensaje: `Tu saldo cubre solo ${oxigeno.dias} días. Necesitas $${oxigeno.montoNecesario.toLocaleString()} para llegar a 5 días.`,
      urgencia: oxigeno.dias < 2 ? 'ALTA' : 'MEDIA'
    });
  }
  
  if (diasInactividad > 3) {
    alertas.push({
      tipo: 'INACTIVIDAD',
      mensaje: `Llevas ${diasInactividad} días sin registrar movimientos. Registra tus operaciones para tener claridad financiera.`,
      urgencia: diasInactividad > 7 ? 'ALTA' : 'MEDIA'
    });
  }
  
  return alertas;
};

/**
 * Calcula margen neto
 * @param {number} ventas - Total ventas
 * @param {number} gastos - Total gastos
 * @returns {number} Margen neto porcentual
 */
export const calcularMargenNeto = (ventas, gastos) => {
  if (!ventas || ventas <= 0) return 0;
  return Math.round(((ventas - gastos) / ventas) * 100);
};

/**
 * Calcula punto de equilibrio
 * @param {number} gastosFijos - Gastos fijos mensuales
 * @param {number} margenContribucion - Margen de contribución por unidad
 * @returns {number} Unidades necesarias para punto de equilibrio
 */
export const calcularPuntoEquilibrio = (gastosFijos, margenContribucion) => {
  if (!margenContribucion || margenContribucion <= 0) return Infinity;
  return Math.ceil(gastosFijos / margenContribucion);
};

/**
 * Calcula rotación de inventario
 * @param {number} costoVentas - Costo de ventas en el período
 * @param {number} inventarioPromedio - Inventario promedio en el período
 * @returns {number} Rotación de inventario (veces)
 */
export const calcularRotacionInventario = (costoVentas, inventarioPromedio) => {
  if (!inventarioPromedio || inventarioPromedio <= 0) return 0;
  return Math.round((costoVentas / inventarioPromedio) * 100) / 100;
};

