import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generarProyecciones } from './proyeccionesService';
import { generarROIporArticulo } from './roiService';
import { generarComparativo } from './comparativoService';

// Función principal para generar cualquier tipo de reporte
export const generarReporte = async (tipo, usuarioActual, movimientos, cuentasPorPagar, inventario, idioma) => {
  const lang = idioma === 'en' ? 'en' : 'es';
  
  switch(tipo) {
    case 'pyg':
      return generarReportePyG(usuarioActual, movimientos, lang);
    case 'ventas':
      return generarReporteVentas(usuarioActual, movimientos, lang);
    case 'gastos':
      return generarReporteGastos(usuarioActual, movimientos, lang);
    case 'compras':
      return generarReporteCompras(usuarioActual, movimientos, lang);
    case 'inventario':
      return generarReporteInventario(usuarioActual, inventario, lang);
    case 'cuentasPagar':
      return generarReporteCuentasPagar(usuarioActual, cuentasPorPagar, lang);
    case 'cuentasCobrar':
      return generarReporteCuentasCobrar(usuarioActual, cuentasPorPagar, lang);
    case 'flujoCaja':
      return generarReporteFlujoCaja(usuarioActual, movimientos, lang);
    case 'auditoria':
      return generarReporteAuditoria(usuarioActual, movimientos, lang);
    case 'utilidades6':
      return generarReporte6Utilidades(usuarioActual, movimientos, lang);
    case 'kpi':
      return generarReporteKPI(usuarioActual, movimientos, lang);
    case 'comparativoMes':
      return await generarComparativo(usuarioActual, 'mes', idioma);
    case 'comparativoAnio':
      return await generarComparativo(usuarioActual, 'anio', idioma);
    case 'roi':
      return await generarROIporArticulo(usuarioActual, idioma);
    case 'proyecciones':
      return await generarProyecciones(usuarioActual, idioma);
    default:
      return null;
  }
};

// ============================================================
// REPORTE DE PYG (PÉRDIDAS Y GANANCIAS)
// ============================================================
const generarReportePyG = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'PROFIT & LOSS STATEMENT' : 'ESTADO DE RESULTADOS (PyG)';
  const subtitulo = lang === 'en' ? 'Financial Performance Report' : 'Reporte de Rendimiento Financiero';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(subtitulo, 105, 30, { align: 'center' });
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 40, { align: 'center' });
  
  // Calcular datos
  const ventas = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
  const compras = movimientos.filter(m => m.categoria === 'INVENTARIO' && m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const gastosAdmin = movimientos.filter(m => m.categoria === 'GASTO_ADMIN' || m.categoria === 'GASTO_NO_OPERACIONAL').reduce((sum, m) => sum + m.valor, 0);
  
  const utilidadBruta = ventas - compras;
  const margenBruto = ventas > 0 ? (utilidadBruta / ventas * 100).toFixed(1) : 0;
  const utilidadNeta = utilidadBruta - gastosAdmin;
  const margenNeto = ventas > 0 ? (utilidadNeta / ventas * 100).toFixed(1) : 0;
  
  const tableData = [
    [lang === 'en' ? 'Total Sales' : 'Ventas Totales', `$${ventas.toLocaleString()}`],
    [lang === 'en' ? 'Cost of Sales (Purchases)' : 'Costo de Ventas (Compras)', `$${compras.toLocaleString()}`],
    [lang === 'en' ? 'GROSS PROFIT' : 'UTILIDAD BRUTA', `$${utilidadBruta.toLocaleString()}`],
    [lang === 'en' ? 'Gross Margin' : 'Margen Bruto', `${margenBruto}%`],
    [lang === 'en' ? 'Administrative Expenses' : 'Gastos Administrativos', `$${gastosAdmin.toLocaleString()}`],
    [lang === 'en' ? 'NET PROFIT' : 'UTILIDAD NETA', `$${utilidadNeta.toLocaleString()}`],
    [lang === 'en' ? 'Net Margin' : 'Margen Neto', `${margenNeto}%`]
  ];
  
  doc.autoTable({
    startY: 55,
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 12, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE VENTAS
// ============================================================
const generarReporteVentas = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'SALES REPORT' : 'REPORTE DE VENTAS';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const ventas = movimientos.filter(m => m.tipo === 'ingreso');
  const ventasPorProducto = {};
  
  ventas.forEach(v => {
    const producto = v.concepto;
    if (!ventasPorProducto[producto]) {
      ventasPorProducto[producto] = { cantidad: 0, total: 0 };
    }
    ventasPorProducto[producto].cantidad += v.cantidad || 1;
    ventasPorProducto[producto].total += v.valor;
  });
  
  const tableData = Object.entries(ventasPorProducto).map(([producto, data]) => [
    producto,
    data.cantidad,
    `$${data.total.toLocaleString()}`
  ]);
  
  const totalVentas = ventas.reduce((sum, v) => sum + v.valor, 0);
  tableData.push([
    lang === 'en' ? 'TOTAL' : 'TOTAL',
    '',
    `$${totalVentas.toLocaleString()}`
  ]);
  
  doc.autoTable({
    startY: 40,
    head: [[
      lang === 'en' ? 'Product' : 'Producto',
      lang === 'en' ? 'Quantity' : 'Cantidad',
      lang === 'en' ? 'Total' : 'Total'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE GASTOS
// ============================================================
const generarReporteGastos = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'EXPENSES REPORT' : 'REPORTE DE GASTOS';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const gastos = movimientos.filter(m => m.tipo === 'egreso' && m.categoria !== 'INVENTARIO');
  const gastosPorCategoria = {};
  
  gastos.forEach(g => {
    const cat = g.categoria || 'OTROS';
    if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = 0;
    gastosPorCategoria[cat] += g.valor;
  });
  
  const tableData = Object.entries(gastosPorCategoria).map(([categoria, total]) => [
    categoria,
    `$${total.toLocaleString()}`
  ]);
  
  const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);
  tableData.push([
    lang === 'en' ? 'TOTAL EXPENSES' : 'TOTAL GASTOS',
    `$${totalGastos.toLocaleString()}`
  ]);
  
  doc.autoTable({
    startY: 40,
    head: [[
      lang === 'en' ? 'Category' : 'Categoría',
      lang === 'en' ? 'Amount' : 'Monto'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE COMPRAS
// ============================================================
const generarReporteCompras = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'PURCHASES REPORT' : 'REPORTE DE COMPRAS';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const compras = movimientos.filter(m => m.categoria === 'INVENTARIO' && m.tipo === 'egreso');
  const comprasPorProducto = {};
  
  compras.forEach(c => {
    const producto = c.concepto;
    if (!comprasPorProducto[producto]) {
      comprasPorProducto[producto] = { cantidad: 0, total: 0 };
    }
    comprasPorProducto[producto].cantidad += c.cantidad || 1;
    comprasPorProducto[producto].total += c.valor;
  });
  
  const tableData = Object.entries(comprasPorProducto).map(([producto, data]) => [
    producto,
    data.cantidad,
    `$${data.total.toLocaleString()}`
  ]);
  
  const totalCompras = compras.reduce((sum, c) => sum + c.valor, 0);
  tableData.push([
    lang === 'en' ? 'TOTAL' : 'TOTAL',
    '',
    `$${totalCompras.toLocaleString()}`
  ]);
  
  doc.autoTable({
    startY: 40,
    head: [[
      lang === 'en' ? 'Product' : 'Producto',
      lang === 'en' ? 'Quantity' : 'Cantidad',
      lang === 'en' ? 'Total' : 'Total'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE INVENTARIO
// ============================================================
const generarReporteInventario = (usuarioActual, inventario, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'INVENTORY REPORT' : 'REPORTE DE INVENTARIO';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const productosFiltrados = inventario.filter(p => p.userId === usuarioActual?.uid && p.cantidad > 0);
  const totalInventario = productosFiltrados.reduce((sum, p) => sum + (p.costoUnitario * p.cantidad), 0);
  
  const tableData = productosFiltrados.map(p => [
    p.producto,
    p.cantidad,
    `$${p.costoUnitario?.toLocaleString() || 0}`,
    `$${((p.costoUnitario || 0) * (p.cantidad || 0)).toLocaleString()}`
  ]);
  
  tableData.push([
    lang === 'en' ? 'TOTAL INVENTORY VALUE' : 'VALOR TOTAL INVENTARIO',
    '',
    '',
    `$${totalInventario.toLocaleString()}`
  ]);
  
  doc.autoTable({
    startY: 40,
    head: [[
      lang === 'en' ? 'Product' : 'Producto',
      lang === 'en' ? 'Quantity' : 'Cantidad',
      lang === 'en' ? 'Unit Cost' : 'Costo Unitario',
      lang === 'en' ? 'Total Value' : 'Valor Total'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    footStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE CUENTAS POR PAGAR
// ============================================================
const generarReporteCuentasPagar = (usuarioActual, cuentasPorPagar, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'ACCOUNTS PAYABLE REPORT' : 'REPORTE DE CUENTAS POR PAGAR';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const pendientes = cuentasPorPagar.filter(c => c.userId === usuarioActual?.uid && c.estado === 'PENDIENTE');
  const totalPendiente = pendientes.reduce((sum, c) => sum + (c.valor || 0), 0);
  
  if (pendientes.length === 0) {
    doc.setFontSize(12);
    doc.text(lang === 'en' ? 'No pending accounts payable' : 'No hay cuentas por pagar pendientes', 105, 60, { align: 'center' });
  } else {
    const tableData = pendientes.map(c => [
      c.proveedor || 'Proveedor',
      c.concepto || '',
      `$${(c.valor || 0).toLocaleString()}`,
      c.fechaVencimiento || '',
      c.estado || 'PENDIENTE'
    ]);
    
    tableData.push([
      lang === 'en' ? 'TOTAL' : 'TOTAL',
      '',
      `$${totalPendiente.toLocaleString()}`,
      '',
      ''
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [[
        lang === 'en' ? 'Supplier' : 'Proveedor',
        lang === 'en' ? 'Concept' : 'Concepto',
        lang === 'en' ? 'Amount' : 'Valor',
        lang === 'en' ? 'Due Date' : 'Vencimiento',
        lang === 'en' ? 'Status' : 'Estado'
      ]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  }
  
  return doc;
};

// ============================================================
// REPORTE DE CUENTAS POR COBRAR
// ============================================================
const generarReporteCuentasCobrar = (usuarioActual, cuentasPorPagar, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'ACCOUNTS RECEIVABLE REPORT' : 'REPORTE DE CUENTAS POR COBRAR';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  // Para cuentas por cobrar, se necesita una estructura similar pero con clientes
  // Por ahora, mostrar mensaje informativo
  doc.setFontSize(12);
  doc.text(lang === 'en' ? 'Accounts receivable module coming soon' : 'Módulo de cuentas por cobrar próximo', 105, 60, { align: 'center' });
  
  return doc;
};

// ============================================================
// REPORTE DE FLUJO DE CAJA
// ============================================================
const generarReporteFlujoCaja = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'CASH FLOW STATEMENT' : 'ESTADO DE FLUJO DE CAJA';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
  const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const flujoNeto = ingresos - egresos;
  
  const tableData = [
    [lang === 'en' ? 'Total Cash Inflows' : 'Total Ingresos de Efectivo', `$${ingresos.toLocaleString()}`],
    [lang === 'en' ? 'Total Cash Outflows' : 'Total Egresos de Efectivo', `$${egresos.toLocaleString()}`],
    [lang === 'en' ? 'NET CASH FLOW' : 'FLUJO NETO DE EFECTIVO', `$${flujoNeto.toLocaleString()}`]
  ];
  
  doc.autoTable({
    startY: 40,
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 12, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE AUDITORÍA FORENSE
// ============================================================
const generarReporteAuditoria = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'FORENSIC AUDIT REPORT' : 'REPORTE DE AUDITORÍA FORENSE';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  // Análisis de anomalías
  const gastos = movimientos.filter(m => m.tipo === 'egreso');
  const promedioGastos = gastos.length > 0 ? gastos.reduce((sum, g) => sum + g.valor, 0) / gastos.length : 0;
  const anomalias = gastos.filter(g => g.valor > promedioGastos * 2);
  
  doc.setFontSize(12);
  doc.text(lang === 'en' ? '1. ANOMALY DETECTION' : '1. DETECCIÓN DE ANOMALÍAS', 14, 50);
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Average expense' : 'Gasto promedio'}: $${promedioGastos.toLocaleString()}`, 20, 60);
  doc.text(`${lang === 'en' ? 'Anomalies detected' : 'Anomalías detectadas'}: ${anomalias.length}`, 20, 68);
  
  if (anomalias.length > 0) {
    const tableData = anomalias.map(a => [
      a.concepto || '',
      `$${a.valor.toLocaleString()}`,
      a.fecha ? new Date(a.fecha).toLocaleDateString() : ''
    ]);
    
    doc.autoTable({
      startY: 75,
      head: [[
        lang === 'en' ? 'Concept' : 'Concepto',
        lang === 'en' ? 'Amount' : 'Valor',
        lang === 'en' ? 'Date' : 'Fecha'
      ]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  } else {
    doc.setFontSize(10);
    doc.text(lang === 'en' ? 'No anomalies detected in the period' : 'No se detectaron anomalías en el período', 20, 80);
  }
  
  return doc;
};

// ============================================================
// REPORTE DE 6 TIPOS DE UTILIDADES
// ============================================================
const generarReporte6Utilidades = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? '6 PROFIT MARGINS REPORT' : 'REPORTE DE 6 TIPOS DE UTILIDADES';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const ventas = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
  const costoVentas = movimientos.filter(m => m.categoria === 'INVENTARIO' && m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const gastosAdmin = movimientos.filter(m => m.categoria === 'GASTO_ADMIN' || m.categoria === 'GASTO_NO_OPERACIONAL').reduce((sum, m) => sum + m.valor, 0);
  
  const utilidadBruta = ventas - costoVentas;
  const utilidadOperacional = utilidadBruta - gastosAdmin;
  const utilidadNeta = utilidadOperacional;
  const ebitda = utilidadOperacional;
  const margenContribucion = ventas > 0 ? (utilidadBruta / ventas * 100).toFixed(1) : 0;
  
  const tableData = [
    [lang === 'en' ? '1. Gross Profit' : '1. Utilidad Bruta', `$${utilidadBruta.toLocaleString()}`, `${margenContribucion}%`],
    [lang === 'en' ? '2. Operating Profit' : '2. Utilidad Operacional', `$${utilidadOperacional.toLocaleString()}`, ''],
    [lang === 'en' ? '3. Net Profit' : '3. Utilidad Neta', `$${utilidadNeta.toLocaleString()}`, ''],
    [lang === 'en' ? '4. EBITDA' : '4. EBITDA', `$${ebitda.toLocaleString()}`, ''],
    [lang === 'en' ? '5. Contribution Margin' : '5. Margen de Contribución', `${margenContribucion}%`, ''],
    [lang === 'en' ? '6. Profit per Production Batch' : '6. Utilidad por Lote', lang === 'en' ? 'Calculated in Production Module' : 'Calculado en Módulo de Producción', '']
  ];
  
  doc.autoTable({
    startY: 40,
    head: [[
      lang === 'en' ? 'Profit Type' : 'Tipo de Utilidad',
      lang === 'en' ? 'Amount' : 'Valor',
      lang === 'en' ? 'Margin %' : 'Margen %'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  });
  
  return doc;
};

// ============================================================
// REPORTE DE KPI
// ============================================================
const generarReporteKPI = (usuarioActual, movimientos, lang) => {
  const doc = new jsPDF();
  const fecha = new Date();
  
  const titulo = lang === 'en' ? 'KPI DASHBOARD' : 'INFORME KPI';
  
  doc.setFontSize(18);
  doc.text(titulo, 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${fecha.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO')}`, 105, 30, { align: 'center' });
  
  const ventas = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
  const gastos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const utilidad = ventas - gastos;
  const margenNeto = ventas > 0 ? (utilidad / ventas * 100).toFixed(1) : 0;
  
  // Calcular rotación de inventario (simplificada)
  const compras = movimientos.filter(m => m.categoria === 'INVENTARIO' && m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const inventarioPromedio = compras / 2; // Simplificación
  const rotacionInventario = inventarioPromedio > 0 ? (ventas / inventarioPromedio).toFixed(1) : 0;
  
  const tableData = [
    [lang === 'en' ? 'Net Profit Margin' : 'Margen Neto', `${margenNeto}%`],
    [lang === 'en' ? 'Gross Profit Margin' : 'Margen Bruto', `${ventas > 0 ? ((ventas - compras) / ventas * 100).toFixed(1) : 0}%`],
    [lang === 'en' ? 'Operating Profit Margin' : 'Margen Operacional', `${ventas > 0 ? (utilidad / ventas * 100).toFixed(1) : 0}%`],
    [lang === 'en' ? 'Inventory Turnover' : 'Rotación de Inventario', `${rotacionInventario}x`],
    [lang === 'en' ? 'Return on Sales (ROS)' : 'Retorno sobre Ventas', `${margenNeto}%`],
    [lang === 'en' ? 'Expense Ratio' : 'Ratio de Gastos', `${ventas > 0 ? (gastos / ventas * 100).toFixed(1) : 0}%`]
  ];
  
  doc.autoTable({
    startY: 40,
    head: [[
      lang === 'en' ? 'KPI' : 'Indicador',
      lang === 'en' ? 'Value' : 'Valor'
    ]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  });
  
  return doc;
};

export default generarReporte;

