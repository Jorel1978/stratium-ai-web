import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import { db, auth, storage, registrosCollection, inventarioCollection, cuentasPorPagarCollection, logsEliminacionesCollection } from '../services/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auditarOperacion, procesarCosteo, analizarSaludFinanciera, auditarSobrecostosProveedores } from '../logic/logicEngine';
import { handleEscaneoDocumentos, registrarCompraEnRegistros, actualizarInventarioAcumulado } from '../util/ocrEngine';
import { programarAlertasDiarias } from '../services/alertasService';
import { i18n } from '../util/i18n';
import { parseNumberInternational, formatearValor } from '../util/formatters';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import emailjs from '@emailjs/browser';

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

  // Estados de datos
  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [procesandoOCR, setProcesandoOCR] = useState(false);
  const [planSeleccionadoPago, setPlanSeleccionadoPago] = useState(null);
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
  const [valoresAtipicos, setValoresAtipicos] = useState([]);
  const [inconsistenciaSaldo, setInconsistenciaSaldo] = useState(null);
  const [logsEliminaciones, setLogsEliminaciones] = useState([]);
  const [sobrecostosProveedores, setSobrecostosProveedores] = useState([]);
  const [ahorroPotencial, setAhorroPotencial] = useState(0);
  const [dictamenGeneral, setDictamenGeneral] = useState('');
  const [produccion, setProduccion] = useState({ materiales: '', horas: '', valorHora: '', transporte: '', precioVenta: '', productoNombre: '' });
  const [costeoResultado, setCosteoResultado] = useState(null);
  const [calculandoProduccion, setCalculandoProduccion] = useState(false);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [imagenFactura, setImagenFactura] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [productoPendiente, setProductoPendiente] = useState(null);
  const [cantidadPendiente, setCantidadPendiente] = useState(null);
  const [valorPendiente, setValorPendiente] = useState(null);
  const [textoComandoPendiente, setTextoComandoPendiente] = useState(null);

  const obtenerFechaActual = () => new Date().toLocaleDateString('es-CO');
  const obtenerPrimerDiaMes = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('es-CO');
  const calcularFechaVencimiento = (diasPlazo) => { const fecha = new Date(); fecha.setDate(new Date().getDate() + diasPlazo); return fecha.toLocaleDateString('es-CO'); };
  const calcularDiasParaVencer = (fechaVenc) => { if (!fechaVenc) return null; const hoy = new Date(); hoy.setHours(0,0,0,0); const venc = fechaVenc?.toDate ? fechaVenc.toDate() : new Date(fechaVenc); venc.setHours(0,0,0,0); return Math.ceil((venc - hoy) / (86400000)); };

  const obtenerLimitesPlan = useCallback(() => {
    const plan = usuarioActual?.plan || 'gratis';
    const map = {
      gratis: { historialDias: 30, escaneosMensuales: 3, puedeExportarExcel: false, puedeGenerarPDF: false, puedeVerLogs: false, puedeVerAnomalias: false, puedeVerComparacionMensual: false, puedeVerPuntoEquilibrio: false, puedeVerRotacionInventario: false },
      pro: { historialDias: 365, escaneosMensuales: 30, puedeExportarExcel: true, puedeGenerarPDF: true, puedeVerLogs: false, puedeVerAnomalias: false, puedeVerComparacionMensual: true, puedeVerPuntoEquilibrio: true, puedeVerRotacionInventario: true },
      business: { historialDias: 1825, escaneosMensuales: 100, puedeExportarExcel: true, puedeGenerarPDF: true, puedeVerLogs: true, puedeVerAnomalias: true, puedeVerComparacionMensual: true, puedeVerPuntoEquilibrio: true, puedeVerRotacionInventario: true },
      elite: { historialDias: 3650, escaneosMensuales: 500, puedeExportarExcel: true, puedeGenerarPDF: true, puedeVerLogs: true, puedeVerAnomalias: true, puedeVerComparacionMensual: true, puedeVerPuntoEquilibrio: true, puedeVerRotacionInventario: true, tieneWhatsApp: true }
    };
    return map[plan] || map.gratis;
  }, [usuarioActual]);

  const puedeAccederAFuncion = useCallback((funcion) => obtenerLimitesPlan()[funcion] === true, [obtenerLimitesPlan]);
  const obtenerFechaLimiteHistorial = useCallback(() => { const fecha = new Date(); fecha.setDate(fecha.getDate() - obtenerLimitesPlan().historialDias); return fecha; }, [obtenerLimitesPlan]);

  useEffect(() => {
    const detectarUbicacion = async () => {
      try {
        const res = await fetch('https://api.country.is/');
        const data = await res.json();
        dispatch({ type: 'SET_MONEDA', payload: data.country !== 'CO' 
          ? { simbolo: 'USD $', codigo: 'USD', mostrarCOP: false }
          : { simbolo: '$', codigo: 'COP', mostrarCOP: true } });
      } catch { 
        dispatch({ type: 'SET_MONEDA', payload: { simbolo: '$', codigo: 'COP', mostrarCOP: true } }); 
      }
    };
    detectarUbicacion();
  }, []);

  const obtenerEmojiPorCategoria = useCallback((categoria) => {
    const emojis = { 'Venta': '💰', 'Compra': '📦', 'Servicio': '💼', 'Gasto': '📉', 'Gasto Fijo': '🏢', 'Nómina': '👥', 'Inversión': '📈', 'Pago': '💸', 'operativo': '🏢', 'logistica': '🚚', 'marketing': '📢', 'directo': '📦', 'ingreso': '💰', 'otros_gastos': '📝', 'Procesando IA...': '🤖', 'Producción': '🏭', 'default': '📝' };
    return emojis[categoria] || emojis.default;
  }, []);

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

  const exportarACSV = () => {
    if (!puedeAccederAFuncion('puedeExportarExcel')) { dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: 'Exportar a Excel/CSV' }); return; }
    if (movimientos.length === 0) { dispatch({ type: 'SET_ERROR', payload: 'No hay registros para exportar' }); return; }
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Valor', 'Tipo', 'Cantidad', 'Proveedor', 'Factura'];
    const rows = movimientos.map(m => [m.fecha ? new Date(m.fecha).toLocaleDateString('es-CO') : '', m.concepto || '', m.categoria || '', m.valor || 0, m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', m.cantidad || 1, m.proveedor || '', m.numeroFactura || '']);
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

  const generarReportePDF = useCallback(async () => {
    if (!puedeAccederAFuncion('puedeGenerarPDF')) { dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: 'Reportes PDF' }); return; }
    setGenerandoReporte(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('REPORTE MAESTRO DE AUDITORÍA', 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`PERIODO: ${obtenerPrimerDiaMes()} AL ${obtenerFechaActual()}`, 105, 33, { align: 'center' });
      doc.setFontSize(12);
      doc.text('ESTADO DE RESULTADOS', 14, 70);
      doc.setFontSize(10);
      doc.text(`Ventas: ${formatearValor(ventasTotales, state.moneda.codigo)}`, 20, 85);
      doc.text(`Gastos: ${formatearValor(gastosTotales, state.moneda.codigo)}`, 20, 95);
      doc.text(`Utilidad: ${formatearValor(utilidadEstimada, state.moneda.codigo)}`, 20, 105);
      doc.text(`Margen: ${margen}%`, 20, 115);
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Auditoria_${obtenerFechaActual().replace(/\//g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { console.error(error); dispatch({ type: 'SET_ERROR', payload: 'Error al generar el reporte' }); }
    finally { setGenerandoReporte(false); }
  }, [ventasTotales, gastosTotales, utilidadEstimada, margen, state.moneda]);

  const guardarProductoEnCatalogo = async (nombreProducto, userId) => {
    if (!nombreProducto || !userId) return;
    try {
      const q = query(collection(db, 'products'), where('userId', '==', userId), where('nombreNormalizado', '==', nombreProducto.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) await addDoc(collection(db, 'products'), { nombre: nombreProducto, nombreNormalizado: nombreProducto.toLowerCase().trim(), userId, fechaCreacion: serverTimestamp() });
    } catch (error) { console.error(error); }
  };

  const validarStockDisponible = useCallback((producto, cantidadSolicitada) => {
    const item = inventario.find(i => i.producto?.toLowerCase().includes(producto.toLowerCase()) || producto.toLowerCase().includes(i.producto?.toLowerCase() || ''));
    if (!item) throw new Error(`🚨 Producto "${producto}" NO EXISTE en inventario.`);
    if (item.cantidad < cantidadSolicitada) throw new Error(`🚨 Stock insuficiente: ${item.cantidad}`);
    return true;
  }, [inventario]);

  const handleSubmit = async (e) => { e.preventDefault(); console.log('Submit'); };

  const handleLogin = async (email, password) => { const cred = await signInWithEmailAndPassword(auth, email, password); if (!cred.user.emailVerified) throw new Error('Verifica tu correo'); return cred.user; };
  const handleRegistro = async (email, password, nombre, plan, acepta) => { if (!acepta) throw new Error('Acepta términos'); const cred = await createUserWithEmailAndPassword(auth, email, password); await sendEmailVerification(cred.user); return cred.user; };
  const handleLogout = async () => { await signOut(auth); setUsuarioActual(null); setMovimientos([]); setInventario([]); };
  const reenviarVerificacion = async (email, password) => { const cred = await signInWithEmailAndPassword(auth, email, password); await sendEmailVerification(cred.user); await signOut(auth); };
  const handleResetPassword = async (email) => { await sendPasswordResetEmail(auth, email); };
  const seleccionarImagenFactura = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.click(); };
  const handleFileUpload = async (e) => { console.log('File upload'); };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) { await signOut(auth); setUsuarioActual(null); dispatch({ type: 'SET_CARGANDO_AUTH', payload: false }); return; }
        const userDoc = await getDocs(query(collection(db, 'usuarios'), where('uid', '==', user.uid)));
        if (!userDoc.empty) setUsuarioActual({ uid: user.uid, email: user.email, ...userDoc.docs[0].data() });
        else { await setDoc(doc(db, 'usuarios', user.uid), { uid: user.uid, email: user.email, plan: 'gratis', creditosOCR: 3, creditosUsados: 0, fechaVencimiento: new Date(), dataVersion: 2 }); setUsuarioActual({ uid: user.uid, email: user.email, plan: 'gratis' }); }
      } else { setUsuarioActual(null); }
      dispatch({ type: 'SET_CARGANDO_AUTH', payload: false });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!usuarioActual?.uid) { setMovimientos([]); setInventario([]); setIsLoading(false); return; }
    const q = query(registrosCollection, where('userId', '==', usuarioActual.uid), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => { setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data(), fecha: d.data().fecha?.toDate() || new Date() }))); setIsLoading(false); });
    const unsubscribeInv = onSnapshot(query(inventarioCollection, where('userId', '==', usuarioActual.uid)), (snap) => setInventario(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubscribe(); unsubscribeInv(); };
  }, [usuarioActual]);

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
    puedeAccederAFuncion, exportarACSV, generarReportePDF, generarReportePreview: () => {},
    handleLogin, handleRegistro, handleLogout, reenviarVerificacion, handleResetPassword,
    guardarProductoEnCatalogo, validarStockDisponible, registrarCompraConVencimiento: async () => {},
    procesarComando: async () => {}, seleccionarImagenFactura, handleFileUpload, generarDictamenGeneral: () => {},
    formatearValor, parseNumberInternational, handleSubmit
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

// ✅ IMPORTANTE: useApp DEBE ESTAR FUERA de AppProvider
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

