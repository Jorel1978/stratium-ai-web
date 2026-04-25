import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import { 
  db, auth, storage, 
  registrosCollection, inventarioCollection, 
  cuentasPorPagarCollection, logsEliminacionesCollection 
} from '../services/firebase';
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, 
  serverTimestamp, updateDoc, where, getDocs, setDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  auditarOperacion, procesarCosteo, analizarSaludFinanciera, 
  auditarSobrecostosProveedores 
} from '../logic/logicEngine';
import { handleEscaneoDocumentos, registrarCompraEnRegistros, actualizarInventarioAcumulado } from '../util/ocrEngine';
import { programarAlertasDiarias } from '../services/alertasService';
import { i18n } from '../util/i18n';
import { parseNumberInternational, formatearValor } from '../util/formatters';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import emailjs from '@emailjs/browser';

// Inicializar EmailJS
emailjs.init("TU_USER_ID");

const AppContext = createContext();

const initialState = {
  idioma: 'es',
  moneda: { simbolo: '$', codigo: 'COP', mostrarCOP: true },
  validationMessage: null,
  error: null,
  modalUpgradeOpen: false,
  funcionBloqueada: '',
  showLogsEliminaciones: false,
  mostrarConfigModal: false,
  mostrarModalVencimiento: false,
  mostrarCheckout: false,
  cargandoAuth: true
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_IDIOMA': return { ...state, idioma: action.payload };
    case 'SET_MONEDA': return { ...state, moneda: action.payload };
    case 'SET_VALIDATION': return { ...state, validationMessage: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_MODAL_UPGRADE': return { ...state, modalUpgradeOpen: action.payload, funcionBloqueada: action.funcion || '' };
    case 'SET_LOGS_VISIBLE': return { ...state, showLogsEliminaciones: action.payload };
    case 'SET_CONFIG_MODAL': return { ...state, mostrarConfigModal: action.payload };
    case 'SET_VENCIMIENTO_MODAL': return { ...state, mostrarModalVencimiento: action.payload };
    case 'SET_CHECKOUT': return { ...state, mostrarCheckout: action.payload };
    case 'CLEAR_MESSAGES': return { ...state, validationMessage: null, error: null };
    case 'SET_CARGANDO_AUTH': return { ...state, cargandoAuth: action.payload };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const t = i18n[state.idioma];

  // ============================================================
  // ESTADOS DE DATOS (del App.js original)
  // ============================================================
  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [procesandoOCR, setProcesandoOCR] = useState(false);
  const [planSeleccionadoPago, setPlanSeleccionadoPago] = useState(null);
  
  // Estados de autenticación
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [errorAuth, setErrorAuth] = useState('');
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [planSeleccionado, setPlanSeleccionado] = useState('gratis');
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('mensual');
  const [esRegistro, setEsRegistro] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados de auditoría
  const [valoresAtipicos, setValoresAtipicos] = useState([]);
  const [inconsistenciaSaldo, setInconsistenciaSaldo] = useState(null);
  const [logsEliminaciones, setLogsEliminaciones] = useState([]);
  const [sobrecostosProveedores, setSobrecostosProveedores] = useState([]);
  const [ahorroPotencial, setAhorroPotencial] = useState(0);
  const [dictamenGeneral, setDictamenGeneral] = useState('');
  
  // Estados producción
  const [produccion, setProduccion] = useState({
    materiales: '', horas: '', valorHora: '', transporte: '', precioVenta: '', productoNombre: ''
  });
  const [costeoResultado, setCosteoResultado] = useState(null);
  const [calculandoProduccion, setCalculandoProduccion] = useState(false);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  
  // Estados varios
  const [imagenFactura, setImagenFactura] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [productoPendiente, setProductoPendiente] = useState(null);
  const [cantidadPendiente, setCantidadPendiente] = useState(null);
  const [valorPendiente, setValorPendiente] = useState(null);
  const [textoComandoPendiente, setTextoComandoPendiente] = useState(null);

  // ============================================================
  // FUNCIONES DE FECHAS (del App.js original)
  // ============================================================
  const obtenerFechaActual = () => new Date().toLocaleDateString('es-CO');
  const obtenerPrimerDiaMes = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('es-CO');
  const calcularFechaVencimiento = (diasPlazo) => {
    const fechaVenc = new Date();
    fechaVenc.setDate(new Date().getDate() + diasPlazo);
    return fechaVenc.toLocaleDateString('es-CO');
  };
  const calcularDiasParaVencer = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const venc = new Date(fechaVencimiento); venc.setHours(0,0,0,0);
    return Math.ceil((venc - hoy) / (1000*60*60*24));
  };

  // ============================================================
  // CONTROL DE ACCESO POR PLAN
  // ============================================================
  const obtenerLimitesPlan = useCallback(() => {
    const plan = usuarioActual?.plan || 'gratis';
    return {
      gratis: { historialDias: 30, escaneosMensuales: 3, puedeExportarExcel: false, puedeGenerarPDF: false, puedeVerLogs: false, puedeVerAnomalias: false, puedeVerComparacionMensual: false, puedeVerPuntoEquilibrio: false, puedeVerRotacionInventario: false },
      pro: { historialDias: 365, escaneosMensuales: 30, puedeExportarExcel: true, puedeGenerarPDF: true, puedeVerLogs: false, puedeVerAnomalias: false, puedeVerComparacionMensual: true, puedeVerPuntoEquilibrio: true, puedeVerRotacionInventario: true },
      business: { historialDias: 1825, escaneosMensuales: 100, puedeExportarExcel: true, puedeGenerarPDF: true, puedeVerLogs: true, puedeVerAnomalias: true, puedeVerComparacionMensual: true, puedeVerPuntoEquilibrio: true, puedeVerRotacionInventario: true },
      elite: { historialDias: 3650, escaneosMensuales: 500, puedeExportarExcel: true, puedeGenerarPDF: true, puedeVerLogs: true, puedeVerAnomalias: true, puedeVerComparacionMensual: true, puedeVerPuntoEquilibrio: true, puedeVerRotacionInventario: true, tieneWhatsApp: true }
    }[plan];
  }, [usuarioActual]);

  const puedeAccederAFuncion = useCallback((funcion) => obtenerLimitesPlan()[funcion] === true, [obtenerLimitesPlan]);
  const obtenerFechaLimiteHistorial = useCallback(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - obtenerLimitesPlan().historialDias);
    return fecha;
  }, [obtenerLimitesPlan]);

  // ============================================================
  // GEOLOCALIZACIÓN (del App.js original)
  // ============================================================
  useEffect(() => {
    const detectarUbicacion = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        dispatch({ type: 'SET_MONEDA', payload: data.country_code !== 'CO' 
          ? { simbolo: 'USD $', codigo: 'USD', mostrarCOP: false }
          : { simbolo: '$', codigo: 'COP', mostrarCOP: true } });
      } catch { dispatch({ type: 'SET_MONEDA', payload: { simbolo: '$', codigo: 'COP', mostrarCOP: true } }); }
    };
    detectarUbicacion();
  }, []);

  // ============================================================
  // FUNCIÓN PARA OBTENER EMOJIS
  // ============================================================
  const obtenerEmojiPorCategoria = useCallback((categoria) => {
    const emojis = {
      'Venta': '💰', 'Compra': '📦', 'Servicio': '💼', 'Gasto': '📉',
      'Gasto Fijo': '🏢', 'Nómina': '👥', 'Inversión': '📈', 'Pago': '💸',
      'operativo': '🏢', 'logistica': '🚚', 'marketing': '📢', 'directo': '📦',
      'ingreso': '💰', 'otros_gastos': '📝', 'Procesando IA...': '🤖', 'Producción': '🏭',
      'default': '📝'
    };
    return emojis[categoria] || emojis.default;
  }, []);

  // ============================================================
  // KPI CALCULATIONS (del App.js original)
  // ============================================================
  const ventasTotales = useMemo(() => movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (m.valor || 0), 0), [movimientos]);
  const gastosTotales = useMemo(() => movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + (m.valor || 0), 0), [movimientos]);
  const utilidadEstimada = ventasTotales - gastosTotales;
  const margen = ventasTotales > 0 ? parseFloat(((utilidadEstimada / ventasTotales) * 100).toFixed(1)) : 0;
  const saldoCaja = useMemo(() => movimientos.reduce((s, m) => m.tipo === 'ingreso' ? s + m.valor : s - m.valor, 0), [movimientos]);
  const comprasTotales = useMemo(() => movimientos.filter(m => m.tipo === 'egreso' && m.categoria === 'INVENTARIO').reduce((s, m) => s + m.valor, 0), [movimientos]);
  const capitalInyectado = usuarioActual?.aportesPersonales || 0;
  
  const datosGrafico = [
    { nombre: 'Ventas', valor: ventasTotales, color: '#10b981' },
    { nombre: 'Gastos', valor: gastosTotales, color: '#ef4444' },
    { nombre: 'Compras', valor: comprasTotales, color: '#f59e0b' },
    { nombre: 'Capital', valor: capitalInyectado, color: '#8b5cf6' },
    { nombre: 'Utilidad', valor: utilidadEstimada, color: utilidadEstimada >= 0 ? '#06b6d4' : '#f97316' }
  ];

  const analisisSalud = useMemo(() => {
    if (movimientos.length === 0) return null;
    return analizarSaludFinanciera(movimientos.map(m => ({ ...m, tipo: m.tipo === 'ingreso' ? 'INGRESO' : 'EGRESO', valor: m.valor || 0 })), inventario, {}, state.idioma);
  }, [movimientos, inventario, state.idioma]);

  // ============================================================
  // GENERAR DICTAMEN GENERAL
  // ============================================================
  const generarDictamenGeneral = useCallback((movs, esPlanPago = false) => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaLimite = obtenerFechaLimiteHistorial();
    const movimientosMes = movs.filter(m => m.fecha && new Date(m.fecha) >= primerDiaMes && new Date(m.fecha) <= hoy);
    
    const ventas = movimientosMes.filter(m => m.tipo === 'ingreso');
    const egresos = movimientosMes.filter(m => m.tipo === 'egreso');
    const ventasTotalesCalc = ventas.reduce((s, m) => s + m.valor, 0);
    const egresosTotalesCalc = egresos.reduce((s, m) => s + m.valor, 0);
    const utilidadNeta = ventasTotalesCalc - egresosTotalesCalc;
    const margenSimple = ventasTotalesCalc > 0 ? ((utilidadNeta / ventasTotalesCalc) * 100).toFixed(1) : 0;
    
    const categoriasVariables = ['INVENTARIO', 'Insumos', 'Mercancía', 'Compra'];
    const costosVariables = egresos.filter(m => categoriasVariables.includes(m.categoria)).reduce((s, m) => s + m.valor, 0);
    const gastosFijos = egresosTotalesCalc - costosVariables;
    
    const margenBrutoCalc = ventasTotalesCalc > 0 ? ((ventasTotalesCalc - costosVariables) / ventasTotalesCalc) * 100 : 0;
    const margenContribucion = ventasTotalesCalc > 0 ? ((ventasTotalesCalc - costosVariables) / ventasTotalesCalc) * 100 : 0;
    const margenEBITDA = ventasTotalesCalc > 0 ? ((ventasTotalesCalc - costosVariables - gastosFijos) / ventasTotalesCalc) * 100 : 0;
    const margenOperativo = ventasTotalesCalc > 0 ? (utilidadNeta / ventasTotalesCalc) * 100 : 0;
    const margenEBT = ventasTotalesCalc > 0 ? (utilidadNeta / ventasTotalesCalc) * 100 : 0;
    const margenNeto = ventasTotalesCalc > 0 ? (utilidadNeta / ventasTotalesCalc) * 100 : 0;
    
    const formatearValorLocal = (valor) => new Intl.NumberFormat(state.idioma === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency', currency: state.idioma === 'es' ? 'COP' : 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Math.abs(valor));
    
    let texto = '';
    if (movimientosMes.length === 0) {
      texto = state.idioma === 'es' ? 'No hay transacciones en el periodo actual.' : 'No transactions.';
    } else if (!esPlanPago) {
      texto = `📊 REPORTE EJECUTIVO\n━━━━━━━━━━━━━━━━━━━━━\n📈 Ventas: ${formatearValorLocal(ventasTotalesCalc)}\n📉 Gastos: ${formatearValorLocal(egresosTotalesCalc)}\n💰 Utilidad Neta: ${formatearValorLocal(utilidadNeta)}\n📊 Margen Neto: ${margenSimple}%\n\n${utilidadNeta < 0 ? '⚠️ Estás operando con pérdida.' : margenSimple > 25 ? '✅ Excelente rentabilidad.' : margenSimple > 10 ? '📢 Rentabilidad saludable.' : '⚠️ Rentabilidad baja.'}`;
    } else {
      texto = `📊 ANALISIS FINANCIERO DETALLADO\n━━━━━━━━━━━━━━━━━━━━━\n📈 Ventas: ${formatearValorLocal(ventasTotalesCalc)}\n📉 Costos Variables: ${formatearValorLocal(costosVariables)}\n📉 Gastos Fijos: ${formatearValorLocal(gastosFijos)}\n💰 Utilidad Neta: ${formatearValorLocal(utilidadNeta)}\n\n💰 MÁRGENES:\n   • Margen Bruto: ${margenBrutoCalc.toFixed(1)}%\n   • Margen Contribución: ${margenContribucion.toFixed(1)}%\n   • Margen EBITDA: ${margenEBITDA.toFixed(1)}%\n   • Margen Operativo: ${margenOperativo.toFixed(1)}%\n   • Margen Neto: ${margenNeto.toFixed(1)}%`;
    }
    setDictamenGeneral(texto);
  }, [obtenerFechaLimiteHistorial, state.idioma]);

  // ============================================================
  // EXPORTAR A CSV
  // ============================================================
  const exportarACSV = () => {
    if (!puedeAccederAFuncion('puedeExportarExcel')) {
      dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: 'Exportar a Excel/CSV' });
      return;
    }
    if (movimientos.length === 0) { dispatch({ type: 'SET_ERROR', payload: 'No hay registros para exportar' }); return; }
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Valor', 'Tipo', 'Cantidad', 'Proveedor', 'Factura'];
    const rows = movimientos.map(m => [
      m.fecha ? new Date(m.fecha).toLocaleDateString('es-CO') : '',
      m.concepto || '', m.categoria || '', m.valor || 0,
      m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      m.cantidad || 1, m.proveedor || '', m.numeroFactura || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `STRATIUM_AI_Registros_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    dispatch({ type: 'SET_VALIDATION', payload: `✅ Exportados ${movimientos.length} registros a CSV` });
    setTimeout(() => dispatch({ type: 'CLEAR_MESSAGES' }), 4000);
  };

  // ============================================================
  // REPORTE PREVIEW
  // ============================================================
  const generarReportePreview = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('STRATIUM AI', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Reporte Ejecutivo', 105, 35, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Ventas: ${formatearValor(ventasTotales, state.moneda.codigo)}`, 25, 80);
    doc.text(`Gastos: ${formatearValor(gastosTotales, state.moneda.codigo)}`, 25, 90);
    doc.text(`Utilidad: ${formatearValor(utilidadEstimada, state.moneda.codigo)}`, 25, 100);
    doc.text(`Margen: ${margen}%`, 25, 110);
    doc.save('STRATIUM_Preview.pdf');
  };

  // ============================================================
  // GENERAR REPORTE PDF COMPLETO
  // ============================================================
  const generarReportePDF = useCallback(async (esCierreMensual = false) => {
    if (!puedeAccederAFuncion('puedeGenerarPDF')) {
      dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: 'Reportes PDF' });
      return;
    }
    setGenerandoReporte(true);
    try {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fechaLimite = obtenerFechaLimiteHistorial();
      const movimientosMes = movimientos.filter(m => m.fecha && m.userId === usuarioActual?.uid && new Date(m.fecha) >= primerDiaMes && new Date(m.fecha) <= hoy && new Date(m.fecha) >= fechaLimite);
      const ventas = movimientosMes.filter(m => m.tipo === 'ingreso');
      const costoVentas = ventas.reduce((sum, v) => sum + ((v.costoUnitario || 0) * (v.cantidad || 1)), 0);
      const ventasTotalesCalc = ventas.reduce((s, v) => s + v.valor, 0);
      const utilidadBruta = ventasTotalesCalc - costoVentas;
      
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('REPORTE MAESTRO DE AUDITORÍA', 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`PERIODO: ${obtenerPrimerDiaMes()} AL ${obtenerFechaActual()}`, 105, 33, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 105, 40, { align: 'center' });
      doc.setFontSize(12);
      doc.text('ESTADO DE RESULTADOS', 14, 70);
      doc.setFontSize(10);
      doc.text(`Ventas: ${formatearValor(ventasTotalesCalc, state.moneda.codigo)}`, 20, 85);
      doc.text(`Costo de Ventas: ${formatearValor(costoVentas, state.moneda.codigo)}`, 20, 95);
      doc.text(`Utilidad Bruta: ${formatearValor(utilidadBruta, state.moneda.codigo)}`, 20, 105);
      doc.text(`Margen: ${ventasTotalesCalc > 0 ? ((utilidadBruta / ventasTotalesCalc) * 100).toFixed(1) : 0}%`, 20, 115);
      
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Auditoria_${obtenerFechaActual().replace(/\//g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { console.error('Error generando PDF:', error); dispatch({ type: 'SET_ERROR', payload: 'Error al generar el reporte' }); }
    finally { setGenerandoReporte(false); }
  }, [movimientos, usuarioActual, puedeAccederAFuncion, obtenerFechaLimiteHistorial, state.moneda]);

  // ============================================================
  // GUARDAR PRODUCTO EN CATÁLOGO
  // ============================================================
  const guardarProductoEnCatalogo = async (nombreProducto, userId) => {
    if (!nombreProducto || !userId) return;
    try {
      const q = query(collection(db, 'products'), where('userId', '==', userId), where('nombreNormalizado', '==', nombreProducto.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) await addDoc(collection(db, 'products'), { nombre: nombreProducto, nombreNormalizado: nombreProducto.toLowerCase().trim(), userId, fechaCreacion: serverTimestamp() });
    } catch (error) { console.error('Error guardando producto:', error); }
  };

  // ============================================================
  // VALIDAR STOCK
  // ============================================================
  const validarStockDisponible = useCallback((producto, cantidadSolicitada) => {
    const item = inventario.find(i => i.producto?.toLowerCase().includes(producto.toLowerCase()) || producto.toLowerCase().includes(i.producto?.toLowerCase() || ''));
    if (!item) throw new Error(`🚨 Sargento Financiero: Producto "${producto}" NO EXISTE en inventario.`);
    if (item.cantidad < cantidadSolicitada) throw new Error(`🚨 STOCK INSUFICIENTE: disponible ${item.cantidad}, solicitado ${cantidadSolicitada}`);
    return true;
  }, [inventario]);

  // ============================================================
  // REGISTRAR COMPRA CON VENCIMIENTO
  // ============================================================
  const registrarCompraConVencimiento = async (texto, concepto, valor, cantidad, fechaVenc = null) => {
    if (!usuarioActual?.uid) return { success: false };
    const costoUnitario = valor / cantidad;
    await addDoc(registrosCollection, { texto, concepto, valor, tipo: 'egreso', categoria: 'Compra', emoji: '📦', fecha: serverTimestamp(), cantidad, costoUnitario, userId: usuarioActual.uid });
    const q = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
    const snap = await getDocs(q);
    if (snap.empty) await addDoc(inventarioCollection, { producto: concepto, cantidad, costoUnitario, costoTotal: valor, fechaActualizacion: serverTimestamp(), userId: usuarioActual.uid, ...(fechaVenc && { fechaVencimiento: new Date(fechaVenc), diasParaVencer: calcularDiasParaVencer(fechaVenc) }) });
    else {
      const docInv = snap.docs[0];
      const data = docInv.data();
      const nuevaCantidad = data.cantidad + cantidad;
      const nuevoCostoTotal = (data.cantidad * data.costoUnitario) + valor;
      await updateDoc(doc(db, 'inventario', docInv.id), { cantidad: nuevaCantidad, costoUnitario: nuevoCostoTotal / nuevaCantidad, costoTotal: nuevoCostoTotal, fechaActualizacion: serverTimestamp() });
    }
    return { success: true };
  };

  // ============================================================
  // PROCESAR COMANDO (INPUT MÁGICO)
  // ============================================================
  const procesarComando = useCallback(async (texto) => {
    if (!usuarioActual?.uid) return { tipo: 'error', mensaje: 'Debes iniciar sesión' };
    const textoLower = texto.toLowerCase();
    
    if (textoLower.includes('genera: reporte') || textoLower.includes('genera reporte')) {
      await generarReportePDF(false);
      return { tipo: 'reporte', mensaje: 'Generando reporte PDF...' };
    }
    
    if (textoLower.includes('compra') || textoLower.includes('purchase')) {
      const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
      let valor = 0, cantidad = 1;
      if (numeros && numeros.length >= 2) { cantidad = parseNumberInternational(numeros[0]); valor = parseNumberInternational(numeros[numeros.length - 1]); }
      else if (numeros) valor = parseNumberInternational(numeros[0]);
      let concepto = texto.replace(/^(registra:?|compra|purchase)/i, '').trim().replace(/\d+(?:[.,]\d+)*/g, '').trim();
      if (concepto.length > 50) concepto = concepto.substring(0, 50);
      await guardarProductoEnCatalogo(concepto, usuarioActual.uid);
      setProductoPendiente(concepto);
      setCantidadPendiente(cantidad);
      setValorPendiente(valor);
      setTextoComandoPendiente(texto);
      dispatch({ type: 'SET_VENCIMIENTO_MODAL', payload: true });
      return { tipo: 'pendiente', mensaje: '¿Deseas registrar fecha de vencimiento?' };
    }
    
    if (textoLower.includes('venta') || textoLower.includes('sale')) {
      try {
        const matchCantidad = texto.match(/(\d+)\s+(?:unidades?|items?)/i);
        const cantidad = matchCantidad ? parseInt(matchCantidad[1]) : 1;
        const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
        let valor = numeros ? parseNumberInternational(numeros[numeros.length - 1]) : 0;
        let concepto = texto.replace(/^(venta|sale)/i, '').trim().replace(/\d+(?:[.,]\d+)*/g, '').trim();
        validarStockDisponible(concepto, cantidad);
        await addDoc(registrosCollection, { texto, concepto, valor, cantidad, tipo: 'ingreso', categoria: 'Venta', emoji: '💰', costoUnitario: valor / cantidad, fecha: serverTimestamp(), userId: usuarioActual.uid });
        const q = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
        const snap = await getDocs(q);
        if (!snap.empty) await updateDoc(doc(db, 'inventario', snap.docs[0].id), { cantidad: snap.docs[0].data().cantidad - cantidad });
        return { tipo: 'exito', mensaje: `Venta registrada: ${cantidad}x ${concepto} por $${valor.toLocaleString()}` };
      } catch (err) { return { tipo: 'error', mensaje: err.message }; }
    }
    return null;
  }, [usuarioActual, generarReportePDF, guardarProductoEnCatalogo, validarStockDisponible]);

  // ============================================================
  // DETECCIÓN DE VALORES ATÍPICOS
  // ============================================================
  const detectarValoresAtipicos = useCallback(() => {
    if (!usuarioActual?.uid || movimientos.length === 0 || !puedeAccederAFuncion('puedeVerAnomalias')) return [];
    const egresos = movimientos.filter(m => m.tipo === 'egreso' && m.userId === usuarioActual.uid);
    if (egresos.length === 0) return [];
    const valores = egresos.map(m => m.valor);
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const sumaCuadrados = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0);
    const desviacion = Math.sqrt(sumaCuadrados / valores.length);
    const umbral = media + (desviacion * 3);
    return egresos.filter(m => m.valor > umbral && umbral > 0).map(m => ({ id: m.id, concepto: m.concepto, valor: m.valor, media, umbral }));
  }, [movimientos, usuarioActual, puedeAccederAFuncion]);

  // ============================================================
  // VALIDAR SALDO CONTABLE
  // ============================================================
  const validarSaldoContable = useCallback(() => {
    if (!usuarioActual?.uid || movimientos.length === 0) return null;
    const saldoCalculado = movimientos.reduce((s, m) => m.tipo === 'ingreso' ? s + m.valor : s - m.valor, 0);
    const diferencia = Math.abs(saldoCalculado - saldoCalculado);
    return diferencia > 1000 ? { saldoCalculado, diferencia, inconsistente: true } : null;
  }, [movimientos, usuarioActual]);

  // ============================================================
  // CARGAR LOGS ELIMINACIONES
  // ============================================================
  const cargarLogsEliminaciones = useCallback(async () => {
    if (!usuarioActual?.uid || !puedeAccederAFuncion('puedeVerLogs')) return;
    const q = query(logsEliminacionesCollection, where('userId', '==', usuarioActual.uid), orderBy('fecha', 'desc'));
    const snap = await getDocs(q);
    setLogsEliminaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, [usuarioActual, puedeAccederAFuncion]);

  // ============================================================
  // AUTENTICACIÓN: MONITOREO DE USUARIO (del App.js original)
  // ============================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          await signOut(auth);
          setErrorAuth('Por favor verifica tu correo electrónico');
          setUsuarioActual(null);
          dispatch({ type: 'SET_CARGANDO_AUTH', payload: false });
          return;
        }
        const userDoc = await getDocs(query(collection(db, 'usuarios'), where('uid', '==', user.uid)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setUsuarioActual({ uid: user.uid, email: user.email, ...userData });
          if (user.email) programarAlertasDiarias(user.email).catch(console.error);
        } else {
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
          await setDoc(doc(db, 'usuarios', user.uid), {
            uid: user.uid, email: user.email, nombre: user.email.split('@')[0],
            plan: 'gratis', estado: 'activo', emailVerificado: true,
            creditosOCR: 3, creditosUsados: 0, fechaVencimiento, fechaInicio: new Date(),
            dataVersion: 2, suscripcionActiva: false, vigencia: 0
          });
          setUsuarioActual({ uid: user.uid, email: user.email, plan: 'gratis', creditosOCR: 3, creditosUsados: 0, fechaVencimiento, dataVersion: 2 });
          if (user.email) programarAlertasDiarias(user.email).catch(console.error);
        }
      } else { setUsuarioActual(null); }
      dispatch({ type: 'SET_CARGANDO_AUTH', payload: false });
    });
    return () => unsubscribe();
  }, []);

  // ============================================================
  // HANDLE LOGIN/REGISTRO
  // ============================================================
  const handleLogin = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) throw new Error('Verifica tu correo electrónico');
    return userCredential.user;
  };

  const handleRegistro = async (email, password, nombre, plan, aceptaTerminosBool) => {
    if (!aceptaTerminosBool) throw new Error('Debes aceptar los términos');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    const planData = { gratis: { creditosOCR: 3, duracionDias: 15 }, pro: { creditosOCR: 30, duracionDias: 30 }, business: { creditosOCR: 120, duracionDias: 30 }, elite: { creditosOCR: 300, duracionDias: 30 } };
    const selected = planData[plan];
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + selected.duracionDias);
    await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
      uid: userCredential.user.uid, email, nombre: nombre || email.split('@')[0], plan,
      creditosOCR: selected.creditosOCR, creditosUsados: 0, fechaVencimiento, fechaInicio: new Date(),
      estado: 'pendiente_verificacion', emailVerificado: false, terminosAceptados: true,
      suscripcionActiva: false, vigencia: 0, dataVersion: 2
    });
    return userCredential.user;
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUsuarioActual(null);
    setMovimientos([]);
    setInventario([]);
    setCuentasPorPagar([]);
  };

  const reenviarVerificacion = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
  };

  const handleResetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // ============================================================
  // CARGAR DATOS DE FIREBASE
  // ============================================================
  useEffect(() => {
    if (!usuarioActual?.uid) {
      setMovimientos([]); setInventario([]); setCuentasPorPagar([]); setIsLoading(false);
      return;
    }
    const fechaLimite = obtenerFechaLimiteHistorial();
    const q = query(registrosCollection, where('userId', '==', usuarioActual.uid), where('fecha', '>=', fechaLimite), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data(), fecha: d.data().fecha?.toDate() || new Date() }));
      setMovimientos(data);
      setIsLoading(false);
      generarDictamenGeneral(data);
    });
    const unsubscribeInv = onSnapshot(query(inventarioCollection, where('userId', '==', usuarioActual.uid)), (snap) => setInventario(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubscribe(); unsubscribeInv(); };
  }, [usuarioActual, obtenerFechaLimiteHistorial, generarDictamenGeneral]);

  // ============================================================
  // ACTUALIZAR VALORES ATÍPICOS Y LOGS
  // ============================================================
  useEffect(() => {
    if (movimientos.length > 0 && usuarioActual?.uid) {
      setValoresAtipicos(detectarValoresAtipicos());
      setInconsistenciaSaldo(validarSaldoContable());
      if (puedeAccederAFuncion('puedeVerLogs')) cargarLogsEliminaciones();
    }
  }, [movimientos, usuarioActual, detectarValoresAtipicos, validarSaldoContable, cargarLogsEliminaciones, puedeAccederAFuncion]);

  // ============================================================
  // AUDITORÍA DE SOBRECOSTOS
  // ============================================================
  useEffect(() => {
    if (!usuarioActual?.uid) return;
    if (usuarioActual.plan !== 'business' && usuarioActual.plan !== 'elite') {
      setSobrecostosProveedores([]);
      setAhorroPotencial(0);
      return;
    }
    const resultado = auditarSobrecostosProveedores(movimientos, inventario, usuarioActual.plan, state.idioma);
    setSobrecostosProveedores(resultado.sobrecostos || []);
    setAhorroPotencial(resultado.ahorroPotencial || 0);
  }, [movimientos, inventario, usuarioActual?.plan, usuarioActual?.uid, state.idioma]);

  // ============================================================
  // MANEJO DE ARCHIVOS
  // ============================================================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !usuarioActual?.uid) return;
    setSubiendoArchivo(true);
    try {
      const storageRef = ref(storage, `documentos/${usuarioActual.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'documentos'), { nombre: file.name, url, tipo: file.type, fecha: serverTimestamp(), userId: usuarioActual.uid });
      alert(`Documento "${file.name}" subido correctamente`);
    } catch (err) { console.error(err); dispatch({ type: 'SET_ERROR', payload: 'Error al subir el archivo' }); }
    finally { setSubiendoArchivo(false); e.target.value = null; }
  };

  const seleccionarImagenFactura = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setImagenFactura(file);
        await procesarOCRConImagen(file);
      }
    };
    input.click();
  };

  const procesarOCRConImagen = async (imagenFile) => {
    if (!usuarioActual?.uid || !imagenFile) return;
    setProcesandoOCR(true);
    try {
      const resultado = await handleEscaneoDocumentos(imagenFile, inputValue, state.moneda.codigo);
      if (resultado.success) {
        for (const producto of resultado.productosReventa) {
          await registrarCompraEnRegistros({
            concepto: producto.nombre, cantidad: producto.cantidad,
            valor_unitario_base: producto.precioUnitario, tax_item: producto.impuestoValor,
            flujo: 'INVENTARIO', tercero: resultado.proveedor, estado: resultado.estado,
            factura: resultado.factura, fecha: resultado.fecha, moneda: state.moneda.codigo
          }, db, usuarioActual.uid);
          await actualizarInventarioAcumulado(producto.nombre, producto.cantidad, producto.precioUnitario, db, usuarioActual.uid);
        }
        dispatch({ type: 'SET_VALIDATION', payload: `✅ Factura procesada: ${resultado.productosReventa.length} productos agregados` });
      } else { dispatch({ type: 'SET_ERROR', payload: resultado.mensaje }); }
    } catch (err) { dispatch({ type: 'SET_ERROR', payload: 'Error al procesar OCR' }); }
    finally { setProcesandoOCR(false); setImagenFactura(null); setInputValue(''); }
  };

  // ============================================================
  // CALCULAR PRODUCCIÓN
  // ============================================================
  const calcularProduccion = useCallback(() => {
    setCalculandoProduccion(true);
    try {
      const materiales = parseFloat(produccion.materiales) || 0;
      const horas = parseFloat(produccion.horas) || 0;
      const valorHora = parseFloat(produccion.valorHora) || 0;
      const transporte = parseFloat(produccion.transporte) || 0;
      const precioVenta = produccion.precioVenta ? parseFloat(produccion.precioVenta) : 0;
      const costoManoObra = horas * valorHora;
      const costoTotal = materiales + costoManoObra + transporte;
      setCosteoResultado({
        costoUnitario: costoTotal, costoMateriales: materiales,
        costoManoObra: costoManoObra, costoTransporte: transporte,
        margenUnitario: precioVenta - costoTotal,
        margenPorcentaje: costoTotal > 0 ? ((precioVenta - costoTotal) / costoTotal) * 100 : 0,
        margenPorHora: horas > 0 ? (precioVenta - costoTotal) / horas : 0
      });
    } catch (err) { console.error(err); dispatch({ type: 'SET_ERROR', payload: 'Error al calcular producción' }); }
    finally { setCalculandoProduccion(false); }
  }, [produccion]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (produccion.materiales || produccion.horas || produccion.valorHora || produccion.transporte) calcularProduccion();
    }, 500);
    return () => clearTimeout(timer);
  }, [produccion, calcularProduccion]);

  // ============================================================
  // VALUE DEL CONTEXTO
  // ============================================================
  const value = {
    ...state, dispatch, t,
    movimientos, setMovimientos, inventario, setInventario, cuentasPorPagar,
    isLoading, generandoReporte, subiendoArchivo, procesandoOCR,
    usuarioActual, setUsuarioActual, errorAuth, setErrorAuth,
    emailLogin, setEmailLogin, passwordLogin, setPasswordLogin,
    nombreRegistro, setNombreRegistro, planSeleccionado, setPlanSeleccionado,
    modalidadSeleccionada, setModalidadSeleccionada, esRegistro, setEsRegistro,
    aceptaTerminos, setAceptaTerminos, showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword, confirmPassword, setConfirmPassword,
    planSeleccionadoPago, setPlanSeleccionadoPago,
    valoresAtipicos, inconsistenciaSaldo, logsEliminaciones, sobrecostosProveedores,
    ahorroPotencial, dictamenGeneral,
    produccion, setProduccion, costeoResultado, calculandoProduccion, cargandoInventario,
    imagenFactura, setImagenFactura, inputValue, setInputValue,
    fechaVencimiento, setFechaVencimiento, productoPendiente, cantidadPendiente,
    valorPendiente, textoComandoPendiente,
    ventasTotales, gastosTotales, utilidadEstimada, margen, saldoCaja,
    comprasTotales, capitalInyectado, datosGrafico, analisisSalud,
    obtenerPrimerDiaMes, obtenerFechaActual, calcularFechaVencimiento, calcularDiasParaVencer,
    puedeAccederAFuncion, exportarACSV, generarReportePDF, generarReportePreview,
    handleLogin, handleRegistro, handleLogout, reenviarVerificacion, handleResetPassword,
    guardarProductoEnCatalogo, validarStockDisponible, registrarCompraConVencimiento,
    procesarComando, seleccionarImagenFactura, handleFileUpload, generarDictamenGeneral,
    formatearValor, parseNumberInternational
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

