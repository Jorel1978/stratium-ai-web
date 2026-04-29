import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './index.css';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  where,
  getDocs,
  setDoc        // ← AGREGA ESTA LÍNEA (con coma al final si hay más después)
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auditarOperacion, procesarCosteo, analizarSaludFinanciera, auditarSobrecostosProveedores } from './logic/logicEngine';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import emailjs from '@emailjs/browser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { handleEscaneoDocumentos, registrarCompraEnRegistros, actualizarInventarioAcumulado } from './util/ocrEngine';
import CheckoutMercadoPago from './components/CheckoutMercadoPago';
import AdminPanel from './components/AdminPanel';
import MassiveUpload from './components/MassiveUpload';        // ← NUEVO
import RegistroManual from './components/RegistroManual';      // ← NUEVO
import { Toaster } from 'react-hot-toast';
import { programarAlertasDiarias, verificarVencimientoProductos, verificarStockBajo } from './services/alertasService';
import ProduccionForm from './components/ProduccionForm';
import ConfiguracionAuditoria from './components/ConfiguracionAuditoria';
import ModalUpgrade from './components/ModalUpgrade';
import SupportBot from './components/SupportBot';
import useDeleteTransaction from './hooks/useDeleteTransaction';
import useCargarProduccion from './hooks/useCargarProduccion';
import OnboardingNegocioExistente from './components/OnboardingNegocioExistente';
//import CheckoutStripe from './components/CheckoutStripe'; // Oculto Temporalmente

const firebaseConfig = {
  apiKey: "AIzaSyAgEy1bbqfV4ugPbEdF8pccihUogwfIVDE",
  authDomain: "agente-financiero-ia-8548f.firebaseapp.com",
  projectId: "agente-financiero-ia-8548f",
  storageBucket: "agente-financiero-ia-8548f.firebasestorage.app",
  messagingSenderId: "924586612103",
  appId: "1:924586612103:web:1df0a21e7982a77a6caf22",
  measurementId: "G-8BEN3YXTDE"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const registrosCollection = collection(db, 'registros');
const inventarioCollection = collection(db, 'inventario');
const cuentasPorPagarCollection = collection(db, 'cuentasPorPagar');
const logsEliminacionesCollection = collection(db, 'logsEliminaciones');

// Configuración de EmailJS
emailjs.init("TU_USER_ID");

// ============================================================
// INTERNACIONALIZACIÓN (ACTUALIZADA CON PLAN 3 - ELITE)
// ============================================================
const i18n = {
  es: {
    title: 'STRATIUM AI',
    subtitle: 'Especialista en Optimización de Costos y Auditoría Financiera con IA',
    ventas: 'Ventas (Mes)',
    utilidad: 'Utilidad Estimada',
    margen: 'Margen',
    saldo: 'Saldo en Caja',
    analizar: 'Analizar',
    reporte: 'Reporte PDF',
    adjuntar: 'Adjuntar',
    produccion: 'Cálculo de Producción',
    dictamen: 'Dictamen de Auditoría',
    registros: 'Registros Financieros',
    ejemplo: 'Ej: "Compra 10 gorras por 125.000" o "Genera: Reporte"',
    salud: 'Termómetro de Salud',
    ingresosVsEgresos: 'Ingresos vs Egresos',
    alertas: 'Alertas del Sargento Financiero',
    recomendaciones: 'Recomendaciones Estratégicas',
    conectar: 'Conectando...',
    enLinea: 'En línea',
    adjuntando: 'Adjuntando...',
    generando: 'Generando...',
    idioma: 'Idioma',
    español: 'Español',
    ingles: 'English',
    material: 'Costo de Materiales',
    horas: 'Horas de Trabajo',
    valorHora: 'Valor Hora',
    transporte: 'Gastos de Transporte',
    precioVenta: 'Precio de Venta',
    productoNombre: 'Nombre del Producto',
    costoUnitario: 'Costo Unitario',
    precioSugerido: 'Precio Sugerido (30%)',
    calcular: 'Calculando...',
    cargarInventario: 'Cargar a Inventario',
    alertaProduccion: '⚠️ ALERTA: Producción a pérdida. Costo unitario supera el precio de venta. Revisa costos.',
    oxigeno: 'Oxígeno financiero',
    saludExcelente: 'Excelente',
    saludEstable: 'Estable',
    saludCritico: 'Crítico',
    sinDatos: 'Sin datos',
    verHistorial: 'Ver historial completo',
    totalTransacciones: 'transacciones',
    tooltipVentas: 'Total de ingresos por ventas en el mes actual',
    tooltipUtilidad: 'Ingresos menos gastos del período',
    tooltipMargen: 'Porcentaje de utilidad sobre ventas',
    tooltipSaldo: 'Saldo histórico acumulado (ingresos - egresos)',
    tooltipOxigeno: 'Días que puedes operar con el saldo actual sin nuevos ingresos',
    tooltipProductoHueso: 'Producto sin ventas en más de 15 días - recomendación: liquidar con descuento',
    tooltipMargenBajo: 'Margen inferior al 20% - riesgo en dropshipping si hay devoluciones',
    tooltipEstrella: 'Producto con mayor facturación del período',
    tooltipQuiebra: 'Alerta de flujo de caja - acción inmediata requerida',
    tooltipSalud: 'Indicador de salud financiera basado en margen neto',
    tooltipTermometro: 'Barra de salud: >30% Excelente, 15-30% Estable, <15% Crítico',
    variacionVentas: 'vs mes anterior',
    crecimiento: 'Crecimiento',
    decrecimiento: 'Decrecimiento',
    puntoEquilibrio: 'Punto de Equilibrio',
    puntoEquilibrioDesc: 'Ventas necesarias para cubrir costos fijos',
    alertaPuntoEquilibrio: '⚠️ Estás por debajo del punto de equilibrio. Necesitas vender más para cubrir costos fijos.',
    // Login
    loginTitle: 'Bienvenido a STRATIUM AI',
    loginSubtitle: 'Tu asistente financiero con IA',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    nombre: 'Nombre (opcional)',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    switchToRegister: 'Regístrate aquí',
    switchToLogin: 'Inicia sesión aquí',
    plan: 'Plan',
    gratis: 'Gratis (15 días)',
    pro: 'Pro',
    business: 'Business',
    elite: 'Elite',
    loadingAuth: 'Cargando autenticación...',
    errorAuth: 'Error de autenticación',
    showPassword: 'Mostrar',
    hidePassword: 'Ocultar',
    passwordsDontMatch: 'Las contraseñas no coinciden',
    // DÍA 4: Auditoría
    alertaValorAtipico: '⚠️ Gasto atípico detectado',
    alertaValorAtipicoDesc: 'Este gasto supera significativamente tu promedio. ¿Es correcto?',
    alertaInconsistenciaSaldo: '⚠️ Inconsistencia en saldo contable',
    alertaInconsistenciaSaldoDesc: 'El saldo calculado no coincide con la suma de movimientos. Revisa los registros.',
    verLogsEliminaciones: 'Ver historial de eliminaciones',
    // Modal Upgrade
    upgradeTitle: 'Función no disponible',
    upgradeDescription: 'es exclusiva de los planes de pago',
    upgradePro: 'Pro',
    upgradeBusiness: 'Business',
    upgradeElite: 'Elite',
    upgradeButton: 'Ver Planes y Precios',
    starterPlan: 'Prueba 15 días',
    plan1: 'Pro',
    plan2: 'Business',
    plan3: 'Elite',
    // OCR
    procesandoOCR: 'Procesando factura con OCR...',
    escanearFactura: 'Escanear factura',
    // Términos y condiciones
    aceptarTerminos: 'Acepto los Términos y Condiciones y autorizo el tratamiento de mis datos personales.',
    terminosLink: 'Términos y Condiciones',
    // Fecha de vencimiento
    preguntarVencimiento: '¿Registrar fecha de vencimiento?',
    fechaVencimiento: 'Fecha de vencimiento',
    guardarConVencimiento: 'Guardar con vencimiento',
    saltarVencimiento: 'Saltar (sin vencimiento)',
    producto: 'Producto',
    cancelar: 'Cancelar',
    // Sección Mi Plan Actual
    miPlanActual: 'Mi Plan Actual',
    gestionaSuscripcion: 'Gestiona tu suscripción',
    cambiarPlan: 'Cambiar Plan',
    escaneos: 'Escaneos',
    dias: 'Días',
    capitalInyectado: 'Capital Inyectado',
    // Configuración de Auditoría
    configuracionAuditoria: 'Configuración de Auditoría',
    configurar: 'Configurar',
    region: 'Región',
    gastosFijos: 'Gastos Fijos Mensuales',
    plataforma: 'Plataforma de venta principal',
    guardar: 'Guardar Configuración',
    pagar: 'Pagar',
masPopular: 'Más popular',
paquetesEscaneos: 'PAQUETES ADICIONALES DE ESCANEOS',
paqueteBasico: 'Básico',
paqueteFrecuente: 'Frecuente',
paqueteProfesional: 'Profesional',
paqueteCorporativo: 'Corporativo',
paquetesNota: 'Los paquetes se compran dentro de la app y NO están incluidos en el plan mensual',
plansStarterTagline: 'Consejero financiero de bolsillo',
plansStarterFeature1: '10 escaneos/mes',
plansStarterFeature2: 'Registro manual de movimientos',
plansStarterFeature3: 'Dashboard financiero básico',
plansStarterFeature4: 'Alertas de riesgo',
plansStarterFeature5: 'Soporte IA 20 mensajes/mes',
plansStarterFeature6: 'Sin reportes PDF',
plansStarterFeature7: 'Sin exportar CSV',
plansProTagline: 'Digitalización inteligente',
plansProFeature1: '30 escaneos/mes',
plansProFeature2: 'Registro manual ilimitado',
plansProFeature3: 'Reportes PDF completos',
plansProFeature4: 'Exportar CSV',
plansProFeature5: 'Comparación mensual',
plansProFeature6: 'Punto de equilibrio',
plansProFeature7: 'Rotación de inventario',
plansProFeature8: 'Soporte IA 50 mensajes/mes',
plansBusinessTagline: 'Auditoría de sobrecostos',
plansBusinessFeature1: '120 escaneos/mes',
plansBusinessFeature2: 'Todo el plan Pro',
plansBusinessFeature3: 'Auditoría forense de gastos',
plansBusinessFeature4: 'Detección de sobrecostos de proveedores',
plansBusinessFeature5: '3 usuarios incluidos',
plansBusinessFeature6: 'Historial de eliminaciones',
plansBusinessFeature7: 'Soporte IA 200 mensajes/mes',
plansEliteTagline: 'Radar de quiebra',
plansEliteFeature1: '300 escaneos/mes',
plansEliteFeature2: 'Todo el plan Business',
plansEliteFeature3: 'Radar de quiebra (90 días)',
plansEliteFeature4: 'Alertas predictivas WhatsApp',
plansEliteFeature5: 'Certificado Salud Financiera (QR)',
plansEliteFeature6: '10 usuarios incluidos',
plansEliteFeature7: 'Soporte IA 500 mensajes/mes',
    cerrar: 'Cerrar'
  },
  en: {
    title: 'STRATIUM AI',
    subtitle: 'Cost Optimization Specialist & AI Financial Auditor',
    ventas: 'Sales (Month)',
    utilidad: 'Estimated Profit',
    margen: 'Margin',
    saldo: 'Cash Balance',
    analizar: 'Analyze',
    reporte: 'PDF Report',
    adjuntar: 'Attach',
    produccion: 'Production Costing',
    dictamen: 'Audit Report',
    registros: 'Financial Records',
    ejemplo: 'Ex: "Buy 10 caps for 125,000" or "Generate: Report"',
    salud: 'Health Thermometer',
    ingresosVsEgresos: 'Income vs Expenses',
    alertas: 'Financial Alerts',
    recomendaciones: 'Strategic Recommendations',
    conectar: 'Connecting...',
    enLinea: 'Online',
    adjuntando: 'Uploading...',
    generando: 'Generating...',
    idioma: 'Language',
    español: 'Spanish',
    ingles: 'English',
    material: 'Material Cost',
    horas: 'Work Hours',
    valorHora: 'Hourly Rate',
    transporte: 'Transportation',
    precioVenta: 'Selling Price',
    productoNombre: 'Product Name',
    costoUnitario: 'Unit Cost',
    precioSugerido: 'Suggested Price (30%)',
    calcular: 'Calculating...',
    cargarInventario: 'Add to Inventory',
    alertaProduccion: '⚠️ ALERT: Production at a loss. Unit cost exceeds selling price. Review costs.',
    oxigeno: 'Cash runway',
    saludExcelente: 'Excellent',
    saludEstable: 'Stable',
    saludCritico: 'Critical',
    sinDatos: 'No data',
    verHistorial: 'View full history',
    totalTransacciones: 'transactions',
    tooltipVentas: 'Total sales revenue for the current month',
    tooltipUtilidad: 'Revenue minus expenses for the period',
    tooltipMargen: 'Profit percentage over sales',
    tooltipSaldo: 'Historical accumulated balance (income - expenses)',
    tooltipOxigeno: 'Days you can operate with current balance without new income',
    tooltipProductoHueso: 'Product with no sales for over 15 days - recommendation: discount liquidation',
    tooltipMargenBajo: 'Margin below 20% - risk in dropshipping if returns occur',
    tooltipEstrella: 'Product with highest revenue in the period',
    tooltipQuiebra: 'Cash flow alert - immediate action required',
    tooltipSalud: 'Financial health indicator based on net margin',
    tooltipTermometro: 'Health bar: >30% Excellent, 15-30% Stable, <15% Critical',
    variacionVentas: 'vs last month',
    crecimiento: 'Growth',
    decrecimiento: 'Decline',
    puntoEquilibrio: 'Break-even Point',
    puntoEquilibrioDesc: 'Sales needed to cover fixed costs',
    alertaPuntoEquilibrio: '⚠️ You are below break-even point. Need more sales to cover fixed costs.',
    // Login
    loginTitle: 'Welcome to STRATIUM AI',
    loginSubtitle: 'Your AI Financial Assistant',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    nombre: 'Name (optional)',
    login: 'Sign In',
    register: 'Sign Up',
    logout: 'Sign Out',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    switchToRegister: 'Sign up here',
    switchToLogin: 'Sign in here',
    plan: 'Plan',
    gratis: 'Free (15 days)',
    pro: 'Pro',
    business: 'Business',
    elite: 'Elite',
    loadingAuth: 'Loading authentication...',
    errorAuth: 'Authentication error',
    showPassword: 'Show',
    hidePassword: 'Hide',
    passwordsDontMatch: 'Passwords do not match',
    // DÍA 4: Auditoría
    alertaValorAtipico: '⚠️ Unusual expense detected',
    alertaValorAtipicoDesc: 'This expense significantly exceeds your average. Is it correct?',
    alertaInconsistenciaSaldo: '⚠️ Balance inconsistency detected',
    alertaInconsistenciaSaldoDesc: 'Calculated balance does not match the sum of transactions. Review your records.',
    verLogsEliminaciones: 'View deletion history',
    // Modal Upgrade
    upgradeTitle: 'Feature not available',
    upgradeDescription: 'is exclusive to paid plans',
    upgradePro: 'Pro',
    upgradeBusiness: 'Business',
    upgradeElite: 'Elite',
    upgradeButton: 'View Plans and Pricing',
    starterPlan: '15-day Trial',
    plan1: 'Pro',
    plan2: 'Business',
    plan3: 'Elite',
    // OCR
    procesandoOCR: 'Processing invoice with OCR...',
    escanearFactura: 'Scan invoice',
    // Términos y condiciones
    aceptarTerminos: 'I accept the Terms and Conditions and authorize the processing of my personal data.',
    terminosLink: 'Terms and Conditions',
    // Fecha de vencimiento
    preguntarVencimiento: 'Add expiration date?',
    fechaVencimiento: 'Expiration date',
    guardarConVencimiento: 'Save with expiration',
    saltarVencimiento: 'Skip (no expiration)',
    producto: 'Product',
    cancelar: 'Cancel',
    // Sección Mi Plan Actual
    miPlanActual: 'My Current Plan',
    gestionaSuscripcion: 'Manage your subscription',
    cambiarPlan: 'Change Plan',
    escaneos: 'Scans',
    dias: 'Days',
    capitalInyectado: 'Injected Capital',
    // Configuración de Auditoría
    configuracionAuditoria: 'Audit Configuration',
    configurar: 'Configure',
    region: 'Region',
    gastosFijos: 'Monthly Fixed Expenses',
    plataforma: 'Main selling platform',
    guardar: 'Save Configuration',
    pagar: 'Pay',
masPopular: 'Most popular',
paquetesEscaneos: 'ADDITIONAL SCAN PACKAGES',
paqueteBasico: 'Basic',
paqueteFrecuente: 'Frequent',
paqueteProfesional: 'Professional',
paqueteCorporativo: 'Corporate',
paquetesNota: 'Packages are purchased inside the app and NOT included in the monthly plan',
plansStarterTagline: 'Pocket financial advisor',
plansStarterFeature1: '10 scans/month',
plansStarterFeature2: 'Manual transaction entry',
plansStarterFeature3: 'Basic financial dashboard',
plansStarterFeature4: 'Risk alerts',
plansStarterFeature5: 'AI support 20 messages/month',
plansStarterFeature6: 'No PDF reports',
plansStarterFeature7: 'No CSV export',
plansProTagline: 'Smart digitization',
plansProFeature1: '30 scans/month',
plansProFeature2: 'Unlimited manual entry',
plansProFeature3: 'Complete PDF reports',
plansProFeature4: 'CSV export',
plansProFeature5: 'Monthly comparison',
plansProFeature6: 'Break-even point',
plansProFeature7: 'Inventory turnover',
plansProFeature8: 'AI support 50 messages/month',
plansBusinessTagline: 'Overcost audit',
plansBusinessFeature1: '120 scans/month',
plansBusinessFeature2: 'Everything in Pro',
plansBusinessFeature3: 'Forensic expense audit',
plansBusinessFeature4: 'Supplier overcost detection',
plansBusinessFeature5: '3 users included',
plansBusinessFeature6: 'Deletion history',
plansBusinessFeature7: 'AI support 200 messages/month',
plansEliteTagline: 'Bankruptcy radar',
plansEliteFeature1: '300 scans/month',
plansEliteFeature2: 'Everything in Business',
plansEliteFeature3: 'Bankruptcy radar (90 days)',
plansEliteFeature4: 'Predictive WhatsApp alerts',
plansEliteFeature5: 'Financial Health Certificate (QR)',
plansEliteFeature6: '10 users included',
plansEliteFeature7: 'AI support 500 messages/month',
    cerrar: 'Close'
  }
};

// ============================================================
// FUNCIÓN DE LIMPIEZA NUMÉRICA INTERNACIONAL
// ============================================================
const parseNumberInternational = (numeroStr) => {
  if (!numeroStr || typeof numeroStr !== 'string') return 0;
  let limpio = numeroStr.replace(/[$€£¥\s]/g, '').trim();
  limpio = limpio.replace(/,/g, '.');
  const partes = limpio.split('.');
  if (partes.length > 2) {
    const decimales = partes.pop();
    limpio = partes.join('') + '.' + decimales;
  }
  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : Math.round(numero * 100) / 100;
};

// ============================================================
// FUNCIÓN DE FORMATO DE VALORES
// ============================================================
const formatearValor = (valor, moneda = 'COP') => {
  const opciones = {
    'COP': { locale: 'es-CO', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 },
    'USD': { locale: 'en-US', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    'EUR': { locale: 'es-ES', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    'default': { locale: 'es-CO', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }
  };
  const config = opciones[moneda] || opciones.default;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits
  }).format(Math.abs(valor));
};

// ============================================================
// COMPONENTE TOOLTIP
// ============================================================
const TooltipIcon = ({ text }) => (
  <div className="relative group ml-1 inline-block">
    <span className="cursor-help text-gray-500 text-xs bg-gray-800 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-gray-300 text-xs rounded-lg shadow-lg z-50 border border-gray-700">
      {text}
    </div>
  </div>
);

// ============================================================
// FUNCIÓN PARA CALCULAR DÍAS HASTA VENCIMIENTO
// ============================================================
const calcularDiasParaVencer = (fechaVencimiento) => {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diffTime = vencimiento - hoy;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ============================================================
// FUNCIONES DE ALERTAS CONSOLIDADAS PARA WHATSAPP (ELITE)
// ============================================================
const generarAlertaStockBajoConsolidada = (inventario, umbralMinimo = 5) => {
  if (!inventario || inventario.length === 0) return null;
  
  const productosStockBajo = inventario.filter(item => 
    item.cantidad < umbralMinimo && item.cantidad > 0
  );
  
  if (productosStockBajo.length === 0) return null;
  
  productosStockBajo.sort((a, b) => a.cantidad - b.cantidad);
  
  let mensaje = `⚠️ *STOCK BAJO* (${productosStockBajo.length} productos)\n━━━━━━━━━━━━━━━━━━━━━\n`;
  
  productosStockBajo.forEach(p => {
    mensaje += `• ${p.producto} → ${p.cantidad} unidades (mínimo: ${umbralMinimo})\n`;
  });
  
  return mensaje;
};

const generarAlertaVencimientoConsolidada = (inventario) => {
  if (!inventario || inventario.length === 0) return null;
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const productosPorVencer = inventario.filter(item => {
    if (!item.fechaVencimiento) return false;
    const vencimiento = new Date(item.fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0 && item.cantidad > 0;
  });
  
  if (productosPorVencer.length === 0) return null;
  
  const venceManana = [];
  const vence3Dias = [];
  const vence7Dias = [];
  
  productosPorVencer.forEach(p => {
    const vencimiento = new Date(p.fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) venceManana.push(p);
    else if (diffDays <= 3) vence3Dias.push(p);
    else vence7Dias.push(p);
  });
  
  let mensaje = `⏰ *POR VENCER* (${productosPorVencer.length} productos)\n━━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (venceManana.length > 0) {
    mensaje += `🔴 *VENCE MAÑANA:*\n`;
    venceManana.forEach(p => {
      mensaje += `   • ${p.producto} → ${p.cantidad} unidades\n`;
    });
  }
  
  if (vence3Dias.length > 0) {
    mensaje += `🟠 *VENCE EN ≤3 DÍAS:*\n`;
    vence3Dias.forEach(p => {
      const fecha = new Date(p.fechaVencimiento).toLocaleDateString('es-CO');
      mensaje += `   • ${p.producto} → ${p.cantidad} unidades (${fecha})\n`;
    });
  }
  
  if (vence7Dias.length > 0) {
    mensaje += `🟡 *VENCE EN ≤7 DÍAS:*\n`;
    vence7Dias.forEach(p => {
      const fecha = new Date(p.fechaVencimiento).toLocaleDateString('es-CO');
      mensaje += `   • ${p.producto} → ${p.cantidad} unidades (${fecha})\n`;
    });
  }
  
  return mensaje;
};

// ============================================================
// FUNCIÓN DE ESCANEO SELECTIVO
// ============================================================
const procesarEscaneoInteligente = async (textoComando, db, inventarioCollection, registrosCollection, userId) => {
  try {
    const matchProducto = textoComando.match(/(?:escanea|scan):\s*(?:compra|purchase)\s+(?:de\s+)?([a-záéíóúñ\s]+?)(?:\s+el\s+resto|\s+para\s+uso\s+personal|\s*$)/i);
    const productoObjetivo = matchProducto ? matchProducto[1].trim().toLowerCase() : null;
    
    if (!productoObjetivo) {
      throw new Error("No se pudo identificar el producto objetivo en el comando");
    }
    
    const facturaSimulada = {
      proveedor: "Distribuidora XYZ S.A.S.",
      nit: "901.234.567-8",
      numeroFactura: "FAC-2026-0342",
      fecha: "15/03/2026",
      items: [
        { nombre: "Gorras Deportivas", cantidad: 10, valorUnitario: 12500, iva: 19, total: 148750 },
        { nombre: "Cargador Portátil", cantidad: 1, valorUnitario: 45000, iva: 19, total: 53550 },
        { nombre: "Audífonos Bluetooth", cantidad: 2, valorUnitario: 28500, iva: 19, total: 67830 }
      ],
      totalFactura: 270130
    };
    
    const itemInventario = facturaSimulada.items.find(item =>
      item.nombre.toLowerCase().includes(productoObjetivo)
    );
    
    if (!itemInventario) {
      throw new Error(`Producto "${productoObjetivo}" no encontrado en la factura escaneada`);
    }
    
    const itemsGasto = facturaSimulada.items.filter(item =>
      !item.nombre.toLowerCase().includes(productoObjetivo)
    );
    const totalGastos = itemsGasto.reduce((sum, item) => sum + item.total, 0);
    const valorNetoGastos = itemsGasto.reduce((sum, item) => sum + (item.valorUnitario * item.cantidad), 0);
    const ivaGastos = totalGastos - valorNetoGastos;
    const conceptosGastos = itemsGasto.map(item => item.nombre).join(', ');
    
    const qInventario = query(inventarioCollection, where('producto', '==', itemInventario.nombre), where('userId', '==', userId));
    const snapshotInventario = await getDocs(qInventario);
    
    let nuevoCostoUnitario = itemInventario.valorUnitario;
    let nuevaCantidad = itemInventario.cantidad;
    
    if (!snapshotInventario.empty) {
      const docExistente = snapshotInventario.docs[0];
      const dataActual = docExistente.data();
      const costoTotalActual = dataActual.cantidad * dataActual.costoUnitario;
      const costoTotalNuevo = itemInventario.cantidad * itemInventario.valorUnitario;
      const cantidadTotal = dataActual.cantidad + itemInventario.cantidad;
      nuevoCostoUnitario = (costoTotalActual + costoTotalNuevo) / cantidadTotal;
      nuevaCantidad = cantidadTotal;
      
      await updateDoc(doc(db, 'inventario', docExistente.id), {
        cantidad: nuevaCantidad,
        costoUnitario: nuevoCostoUnitario,
        costoTotal: nuevoCostoUnitario * nuevaCantidad,
        fechaActualizacion: serverTimestamp(),
        proveedor: facturaSimulada.proveedor,
        nitProveedor: facturaSimulada.nit,
        numeroFactura: facturaSimulada.numeroFactura,
        fechaFactura: facturaSimulada.fecha
      });
    } else {
      await addDoc(inventarioCollection, {
        producto: itemInventario.nombre,
        cantidad: itemInventario.cantidad,
        costoUnitario: itemInventario.valorUnitario,
        costoTotal: itemInventario.total,
        fechaActualizacion: serverTimestamp(),
        proveedor: facturaSimulada.proveedor,
        nitProveedor: facturaSimulada.nit,
        numeroFactura: facturaSimulada.numeroFactura,
        fechaFactura: facturaSimulada.fecha,
        userId: userId
      });
    }
    
    await addDoc(registrosCollection, {
      texto: `Compra inventario: ${itemInventario.nombre} x${itemInventario.cantidad}`,
      concepto: itemInventario.nombre,
      valor: itemInventario.total,
      tipo: 'egreso',
      categoria: 'INVENTARIO',
      emoji: '📦',
      cantidad: itemInventario.cantidad,
      costoUnitario: nuevoCostoUnitario,
      valorNeto: itemInventario.valorUnitario * itemInventario.cantidad,
      iva: itemInventario.total - (itemInventario.valorUnitario * itemInventario.cantidad),
      proveedor: facturaSimulada.proveedor,
      nitProveedor: facturaSimulada.nit,
      numeroFactura: facturaSimulada.numeroFactura,
      fechaFactura: facturaSimulada.fecha,
      fecha: serverTimestamp(),
      userId: userId
    });
    
    if (itemsGasto.length > 0) {
      await addDoc(registrosCollection, {
        texto: `Gasto personal: ${conceptosGastos}`,
        concepto: 'Gastos Personales',
        valor: totalGastos,
        tipo: 'egreso',
        categoria: 'GASTO_NO_OPERACIONAL',
        emoji: '💸',
        valorNeto: valorNetoGastos,
        iva: ivaGastos,
        proveedor: facturaSimulada.proveedor,
        nitProveedor: facturaSimulada.nit,
        numeroFactura: facturaSimulada.numeroFactura,
        fechaFactura: facturaSimulada.fecha,
        fecha: serverTimestamp(),
        userId: userId
      });
    }
    
    return {
      success: true,
      mensaje: `✅ Factura procesada: ${itemInventario.nombre} agregado al inventario. Gastos personales consolidados: $${totalGastos.toLocaleString()}`,
      producto: itemInventario.nombre,
      cantidad: itemInventario.cantidad,
      costoUnitario: nuevoCostoUnitario,
      totalGastos: totalGastos
    };
  } catch (err) {
    console.error('Error en escaneo inteligente:', err);
    throw err;
  }
};

// ============================================================
// COMPONENTE DE LOGIN/REGISTRO (CON CHECKBOX Y PLAN 3)
// ============================================================
const PantallaLogin = ({
  t, idioma, moneda, errorAuth, validationMessage, esRegistro,
  emailLogin, setEmailLogin, passwordLogin, setPasswordLogin,
  showPassword, setShowPassword, confirmPassword, setConfirmPassword,
  showConfirmPassword, setShowConfirmPassword, nombreRegistro, setNombreRegistro,
  planSeleccionado, setPlanSeleccionado,
  aceptaTerminos, setAceptaTerminos,
  handleRegistro, handleLogin, setEsRegistro, setErrorAuth, reenviarVerificacion, handleResetPassword,
  onChangeIdioma
}) => {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-8 max-w-md w-full border border-blue-900/30 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            {t.title}
          </h1>
          <p className="text-gray-400 text-sm mt-2">{t.loginSubtitle}</p>
          {!moneda.mostrarCOP && (
            <p className="text-xs text-cyan-400 mt-1">💱 Precios mostrados en USD</p>
          )}
        </div>

        {/* Selector de idioma en pantalla de login */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-800/50 rounded-lg p-1 flex gap-1">
            <button
              onClick={() => onChangeIdioma('es')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                idioma === 'es' 
                  ? 'bg-cyan-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              🇪🇸 Español
            </button>
            <button
              onClick={() => onChangeIdioma('en')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                idioma === 'en' 
                  ? 'bg-cyan-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>
        
        {errorAuth && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {errorAuth}
          </div>
        )}
        
        {validationMessage && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {validationMessage}
          </div>
        )}
        
        <form onSubmit={esRegistro ? handleRegistro : handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">{t.email}</label>
            <input
              type="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              autoComplete="email"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-20"
                required
                autoComplete={esRegistro ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-400 text-sm hover:text-cyan-300 px-2 py-1"
              >
                {showPassword ? t.hidePassword : t.showPassword}
              </button>
            </div>
          </div>
          
          {esRegistro && (
  <>
    <div className="mb-4">
      <label className="block text-gray-400 text-sm mb-2">{t.confirmPassword}</label>
      <div className="relative">
        <input
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-20"
          required
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-400 text-sm hover:text-cyan-300 px-2 py-1"
        >
          {showConfirmPassword ? t.hidePassword : t.showPassword}
        </button>
      </div>
      {confirmPassword && passwordLogin !== confirmPassword && (
        <p className="text-red-400 text-xs mt-1">{t.passwordsDontMatch}</p>
      )}
    </div>
    
    <div className="mb-4">
      <label className="block text-gray-400 text-sm mb-2">{t.nombre}</label>
      <input
        type="text"
        value={nombreRegistro}
        onChange={(e) => setNombreRegistro(e.target.value)}
        className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        autoComplete="name"
      />
    </div>
    
    <div className="mb-4">
      <label className="block text-gray-400 text-sm mb-2">{t.plan}</label>
      <div className="grid grid-cols-4 gap-2">
        {/* Plan Starter */}
        <button
          type="button"
          onClick={() => setPlanSeleccionado('gratis')}
          className={`p-2 rounded-lg text-sm font-bold transition-all ${
            planSeleccionado === 'gratis'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          Starter
          <span className="block text-[10px] opacity-80">
            {moneda.mostrarCOP ? '$0 / 15 días' : '$0 / 15 days'}
          </span>
        </button>
        
        {/* Plan Pro */}
        <button
          type="button"
          onClick={() => setPlanSeleccionado('pro')}
          className={`p-2 rounded-lg text-sm font-bold transition-all ${
            planSeleccionado === 'pro'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          Pro
          <span className="block text-[10px] opacity-80">
            {moneda.mostrarCOP ? '$79,900/mes' : '$29.99/mes'}
          </span>
        </button>
        
        {/* Plan Business */}
        <button
          type="button"
          onClick={() => setPlanSeleccionado('business')}
          className={`p-2 rounded-lg text-sm font-bold transition-all ${
            planSeleccionado === 'business'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          Business
          <span className="block text-[10px] opacity-80">
            {moneda.mostrarCOP ? '$199,900/mes' : '$79.99/mes'}
          </span>
        </button>
        
        {/* Plan Elite */}
        <button
          type="button"
          onClick={() => setPlanSeleccionado('elite')}
          className={`p-2 rounded-lg text-sm font-bold transition-all ${
            planSeleccionado === 'elite'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          Elite
          <span className="block text-[10px] opacity-80">
            {moneda.mostrarCOP ? '$499,900/mes' : '$199.99/mes'}
          </span>
        </button>
      </div>
    </div>

    {/* CHECKBOX DE TÉRMINOS Y CONDICIONES */}
    <div className="mb-4">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={aceptaTerminos}
          onChange={(e) => setAceptaTerminos(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-blue-900/20 bg-[#0f172a] text-cyan-500 focus:ring-cyan-500 focus:ring-2"
          required
        />
        <span className="text-gray-400 text-xs">
          {t.aceptarTerminos} 
          <a 
            href={idioma === 'es' ? '/terminos.html' : '/terms.html'} 
            target="_blank" 
            className="text-cyan-400 hover:underline ml-1"
          >
            {t.terminosLink}
          </a>
        </span>
      </label>
    </div>
  </>
)}
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-2 cursor-pointer"
          >
            {esRegistro ? t.register : t.login}
          </button>
        </form>
        
        {!esRegistro && errorAuth && errorAuth.includes('verificado') && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={reenviarVerificacion}
              className="text-cyan-400 text-xs hover:underline cursor-pointer"
            >
              📧 Reenviar correo de verificación
            </button>
          </div>
        )}

        {/* Botón de recuperación de contraseña */}
        {!esRegistro && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-cyan-400 text-xs hover:underline cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}
        
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setEsRegistro(!esRegistro);
              setErrorAuth('');
              setShowPassword(false);
              setShowConfirmPassword(false);
              setConfirmPassword('');
              setAceptaTerminos(false);
            }}
            className="text-cyan-400 text-sm hover:underline cursor-pointer"
          >
            {esRegistro ? `${t.hasAccount} ${t.switchToLogin}` : `${t.noAccount} ${t.switchToRegister}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL App
// ============================================================
const App = () => {
  // Estado para los movimientos (desde Firebase)
  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  
  // ✅ NUEVO: Estado para cuentas por cobrar (lo que te deben)
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  
  // Estado para carga y error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationMessage, setValidationMessage] = useState(null);
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado para el módulo de producción
  const [produccion, setProduccion] = useState({
    materiales: '',
    horas: '',
    valorHora: '',
    transporte: '',
    precioVenta: '',
    productoNombre: ''
  });
  const [costeoResultado, setCosteoResultado] = useState(null);
  const [calculandoProduccion, setCalculandoProduccion] = useState(false);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  
  // Estado para el archivo adjunto
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [escaneando] = useState(false);
  
  // Estado para el dictamen de auditoría
  const [dictamenGeneral, setDictamenGeneral] = useState('');
  
  // Estado para el idioma
  const [idioma, setIdioma] = useState('es');
  const t = i18n[idioma];

  // Estado para moneda y geolocalización
  const [moneda, setMoneda] = useState({ simbolo: '$', codigo: 'COP', tasa: 0.00025, mostrarCOP: true });

  // ============================================================
  // ESTADOS DE AUTENTICACIÓN
  // ============================================================
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [planSeleccionado, setPlanSeleccionado] = useState('gratis');
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('mensual');
  const [esRegistro, setEsRegistro] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');
  
  // Estado para checkbox de términos
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  
  // Estados para mejorar login
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // ============================================================
  // NUEVOS ESTADOS PARA FECHA DE VENCIMIENTO
  // ============================================================
  const [mostrarModalVencimiento, setMostrarModalVencimiento] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [productoPendiente, setProductoPendiente] = useState(null);
  const [cantidadPendiente, setCantidadPendiente] = useState(null);
  const [valorPendiente, setValorPendiente] = useState(null);
  const [textoComandoPendiente, setTextoComandoPendiente] = useState(null);

  // ============================================================
  // DÍA 4: ESTADOS DE AUDITORÍA
  // ============================================================
  const [valoresAtipicos, setValoresAtipicos] = useState([]);
  const [inconsistenciaSaldo, setInconsistenciaSaldo] = useState(null);
  const [mostrarLogsEliminaciones, setMostrarLogsEliminaciones] = useState(false);
  const [logsEliminaciones, setLogsEliminaciones] = useState([]);
  
  // ============================================================
  // ESTADOS PARA MODAL DE UPGRADE
  // ============================================================
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false);
  const [funcionBloqueada, setFuncionBloqueada] = useState('');
  
  // ============================================================
  // ESTADOS PARA OCR
  // ============================================================
  const [imagenFactura, setImagenFactura] = useState(null);
  const [procesandoOCR, setProcesandoOCR] = useState(false);

  // ============================================================
  // NUEVOS ESTADOS PARA MERCADO PAGO
  // ============================================================
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [planSeleccionadoPago, setPlanSeleccionadoPago] = useState(null);

  // ============================================================
  // ESTADOS PARA STRIPE
  // ============================================================
  //const [mostrarCheckoutStripe, setMostrarCheckoutStripe] = useState(false); // Oculto Temporalmente
  //const [planSeleccionadoStripe, setPlanSeleccionadoStripe] = useState(null); // Oculto Temporalmente

  // ✅ Estado para el input mágico (mantenido para compatibilidad)
  const [inputValue, setInputValue] = useState('');

  // ✅ NUEVO ESTADO PARA MODAL DE CONFIGURACIÓN DE AUDITORÍA
  const [mostrarConfigModal, setMostrarConfigModal] = useState(false);
  
  // ✅ NUEVOS ESTADOS PARA ACORDEONES (MOBILE)
  const [showAuditoria, setShowAuditoria] = useState(false);
  const [showProduccion, setShowProduccion] = useState(false);
  const [showRegistroManual, setShowRegistroManual] = useState(false);
  
  // ✅ NUEVO ESTADO PARA ONBOARDING
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  
  // ✅ NUEVO ESTADO PARA DIAGNÓSTICO DE BIENVENIDA
  const [diagnosticoBienvenida, setDiagnosticoBienvenida] = useState(null);

  // ✅ FUNCIÓN PARA VERIFICAR ACCESO POR PLAN (DEFINIDA DENTRO DE App)
  const puedeAccederAFuncion = (funcion) => {
    try {
      const limites = obtenerLimitesPlan();
      return limites && limites[funcion] === true;
    } catch (e) {
      return false;
    }
  };
  
  // ✅ FUNCIÓN PARA CALCULAR DÍAS RESTANTES DE PRUEBA CORRECTAMENTE
  const calcularDiasRestantesPrueba = useCallback(() => {
    if (!usuarioActual?.metadata?.creationTime) return 15;
    const fechaCreacion = new Date(usuarioActual.metadata.creationTime);
    const hoy = new Date();
    const diasTranscurridos = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));
    return Math.max(0, 15 - diasTranscurridos);
  }, [usuarioActual]);
  
  // ============================================================
  // FUNCIÓN PARA GENERAR DIAGNÓSTICO DE CIERRE (EFECTO WOW)
  // ============================================================
  const generarDiagnosticoCierre = (inventario, movimientos, capitalInyectado) => {
    const totalInventarioCosto = inventario.reduce((sum, p) => sum + ((p.costoUnitario || 0) * (p.cantidad || 0)), 0);
    
    const productoMasRentable = [...inventario]
      .filter(p => p.margenNetoReal > 0)
      .sort((a, b) => b.margenNetoReal - a.margenNetoReal)[0];
  
    let margenPromedio = 0;
    const productosConMargen = inventario.filter(p => p.margenNetoReal > 0);
    if (productosConMargen.length > 0) {
      margenPromedio = productosConMargen.reduce((sum, p) => sum + (p.margenNetoReal || 0), 0) / productosConMargen.length;
    }
    
    let tiempoRecuperacion = null;
    const ventaPromedio = inventario.length > 0 ? totalInventarioCosto / inventario.length : 0;
    const gananciaPorVenta = ventaPromedio * (margenPromedio / 100);
    
    if (gananciaPorVenta > 0 && capitalInyectado > 0) {
      tiempoRecuperacion = Math.ceil(capitalInyectado / gananciaPorVenta);
    }
  
    return {
      capitalInvertido: capitalInyectado,
      totalInventarioCosto: totalInventarioCosto,
      totalProductos: inventario.length,
      margenPromedio: margenPromedio.toFixed(1),
      productoMasRentable: productoMasRentable ? { 
        nombre: productoMasRentable.producto, 
        margen: productoMasRentable.margenNetoReal 
      } : null,
      tiempoRecuperacion: tiempoRecuperacion
    };
  };
  
  // ✅ GENERAR DIAGNÓSTICO DE CIERRE CUANDO HAY DATOS
  useEffect(() => {
    if (inventario.length > 0 && usuarioActual) {
      const capitalInyectado = usuarioActual?.aportesPersonales || 0;
      const diagnostico = generarDiagnosticoCierre(inventario, movimientos, capitalInyectado);
      setDiagnosticoBienvenida(diagnostico);
      console.log('📊 Diagnóstico de cierre generado:', diagnostico);
    }
  }, [inventario, movimientos, usuarioActual]);
  
  // ✅ HOOK DE ELIMINACIÓN ATÓMICA
  const { handleDelete } = useDeleteTransaction(usuarioActual, puedeAccederAFuncion, formatearValor);
  const { cargarAInventario } = useCargarProduccion(usuarioActual);

  // ============================================================
// VERIFICAR PAGO PENDIENTE - SOLO LECTURA DE URL (SIN TOKEN)
// La actualización de Firestore la hace el Webhook del backend
// ============================================================
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  const plan = localStorage.getItem('pendingPlan');
  const userId = localStorage.getItem('pendingUserId');
  
  // Solo verificar el estado en la URL, sin llamadas a la API
  if (status === 'approved' && userId && usuarioActual?.uid === userId) {
    // Mostrar mensaje de éxito al usuario
    setValidationMessage(`✅ Pago exitoso! Plan ${plan} activado. El sistema se actualizará en unos segundos.`);
    
    // Limpiar localStorage
    localStorage.removeItem('pendingPlan');
    localStorage.removeItem('pendingUserId');
    
    // Recargar la página después de 3 segundos para que el webhook haya actualizado los datos
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
}, [usuarioActual]);

  // ============================================================
  // FUNCIONES DE CÁLCULO DE FECHAS
  // ============================================================
  const obtenerFechaActual = () => {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-CO');
  };

  const obtenerPrimerDiaMes = () => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toLocaleDateString('es-CO');
  };

  const calcularFechaVencimiento = (diasPlazo) => {
    const hoy = new Date();
    const fechaVenc = new Date(hoy);
    fechaVenc.setDate(hoy.getDate() + diasPlazo);
    return fechaVenc.toLocaleDateString('es-CO');
  };

  // ============================================================
  // CONTROL DE ACCESO POR PLAN (ACTUALIZADO CON PLAN 3 - ELITE)
  // ============================================================
  const obtenerLimitesPlan = useCallback(() => {
    const plan = usuarioActual?.plan || 'gratis';
    const limites = {
      gratis: {
        historialDias: 30,
        escaneosMensuales: 3,
        puedeExportarExcel: false,
        puedeGenerarPDF: false,
        puedeVerLogs: false,
        puedeVerAnomalias: false,
        puedeVerComparacionMensual: false,
        puedeVerPuntoEquilibrio: false,
        puedeVerRotacionInventario: false
      },
      pro: {
        historialDias: 365,
        escaneosMensuales: 30,
        puedeExportarExcel: true,
        puedeGenerarPDF: true,
        puedeVerLogs: false,
        puedeVerAnomalias: false,
        puedeVerComparacionMensual: true,
        puedeVerPuntoEquilibrio: true,
        puedeVerRotacionInventario: true
      },
      business: {
        historialDias: 1825,
        escaneosMensuales: 100,
        puedeExportarExcel: true,
        puedeGenerarPDF: true,
        puedeVerLogs: true,
        puedeVerAnomalias: true,
        puedeVerComparacionMensual: true,
        puedeVerPuntoEquilibrio: true,
        puedeVerRotacionInventario: true
      },
      elite: {
        historialDias: 3650,
        escaneosMensuales: 500,
        puedeExportarExcel: true,
        puedeGenerarPDF: true,
        puedeVerLogs: true,
        puedeVerAnomalias: true,
        puedeVerComparacionMensual: true,
        puedeVerPuntoEquilibrio: true,
        puedeVerRotacionInventario: true,
        tieneWhatsApp: true,
        whatsappAlertasLimitadas: true
      }
    };
    return limites[plan] || limites.gratis;
  }, [usuarioActual]);

    const obtenerLimiteEscaneos = useCallback(() => {
    const limites = obtenerLimitesPlan();
    return limites.escaneosMensuales;
  }, [obtenerLimitesPlan]);

  const obtenerFechaLimiteHistorial = useCallback(() => {
    const limites = obtenerLimitesPlan();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - limites.historialDias);
    return fechaLimite;
  }, [obtenerLimitesPlan]);

  // ============================================================
  // VERIFICAR CRÉDITOS Y VENCIMIENTO DEL PLAN
  // ============================================================
  
  const verificarCreditosYVencimiento = useCallback(async () => {
  if (!usuarioActual?.uid) return { valido: false, mensaje: 'No autenticado', necesitaUpgrade: false };
  
  // ============================================================
  // NUEVO: Verificar suscripción activa (para planes de pago)
  // ============================================================
  if (usuarioActual.plan !== 'gratis' && usuarioActual.plan !== 'starter') {
    // Si la suscripción no está activa, bloquear
    if (usuarioActual.suscripcionActiva !== true) {
      return { 
        valido: false, 
        mensaje: 'Tu suscripción no está activa. Por favor, activa tu suscripción para continuar.', 
        necesitaUpgrade: true 
      };
    }
    
    // Si la vigencia es 0 o menor, la suscripción expiró
    if (usuarioActual.vigencia <= 0) {
      return { 
        valido: false, 
        mensaje: 'Tu suscripción ha expirado. Renueva para continuar.', 
        necesitaUpgrade: true 
      };
    }
  }
  
  // Verificar vencimiento del plan (solo para Starter)
  if (usuarioActual.plan === 'gratis' || usuarioActual.plan === 'starter') {
    const hoy = new Date();
    const fechaVencimiento = usuarioActual.fechaVencimiento?.toDate ? 
      usuarioActual.fechaVencimiento.toDate() : new Date(usuarioActual.fechaVencimiento);
    
    if (hoy > fechaVencimiento) {
      return { 
        valido: false, 
        mensaje: 'Tu período de prueba ha terminado. Selecciona un plan para continuar.', 
        necesitaUpgrade: true 
      };
    }
  }
  
  // Verificar créditos restantes para TODOS los planes
  const creditosDisponibles = (usuarioActual.creditosOCR || 0) - (usuarioActual.creditosUsados || 0);
  
  if (creditosDisponibles <= 0) {
    return { 
      valido: false, 
      mensaje: 'Has agotado tus créditos de escaneo. Actualiza tu plan para más escaneos.', 
      necesitaUpgrade: true 
    };
  }
  
  return { valido: true, creditosDisponibles, mensaje: `${creditosDisponibles} escaneos disponibles` };
}, [usuarioActual]);

  const consumirCreditoOCR = useCallback(async () => {
    if (!usuarioActual?.uid) return false;
    
    // Todos los planes consumen créditos (incluido Elite)
    const creditosUsados = (usuarioActual.creditosUsados || 0) + 1;
    const creditosRestantes = (usuarioActual.creditosOCR || 0) - creditosUsados;
    
    await updateDoc(doc(db, 'usuarios', usuarioActual.uid), {
      creditosUsados: creditosUsados
    });
    
    setUsuarioActual(prev => ({ ...prev, creditosUsados }));
    
    return creditosRestantes;
  }, [usuarioActual]);

  // ============================================================
  // FUNCIÓN DE ENVÍO POR CORREO
  // ============================================================
  const enviarReportePorEmail = async (pdfBlob, periodo, tipoReporte) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      
      reader.onload = async () => {
        const base64PDF = reader.result.split(',')[1];
        
        const templateParams = {
          to_email: usuarioActual?.email || 'tucorreo@gmail.com',
          asunto: `STRATIUM AI: Reporte Maestro de Auditoría - ${periodo}`,
          mensaje: `Adjunto encontrará el reporte de auditoría correspondiente al periodo ${periodo}. Tipo: ${tipoReporte}`,
          pdf_adjunto: base64PDF,
          pdf_nombre: `Reporte_Auditoria_${periodo.replace(/\//g, '-')}.pdf`
        };
        
        await emailjs.send('TU_SERVICE_ID', 'TU_TEMPLATE_ID', templateParams);
        setValidationMessage(`Reporte enviado por correo para periodo ${periodo}`);
        setTimeout(() => setValidationMessage(null), 5000);
        
        await addDoc(collection(db, 'enviosReportes'), {
          fecha: serverTimestamp(),
          periodo: periodo,
          tipo: tipoReporte,
          userId: usuarioActual?.uid
        });
      };
    } catch (error) {
      console.error('Error enviando correo:', error);
      setError('Error al enviar el reporte por correo');
    }
  };

  // ============================================================
  // FUNCIÓN DE GENERACIÓN DE REPORTE MAESTRO PDF
  // ============================================================
  const generarReportePDF = useCallback(async (esCierreMensual = false) => {
    if (!usuarioActual?.uid) return;
    
    if (!puedeAccederAFuncion('puedeGenerarPDF')) {
      setFuncionBloqueada('Reportes PDF');
      setModalUpgradeOpen(true);
      return;
    }
    
    setGenerandoReporte(true);
    try {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fechaLimite = obtenerFechaLimiteHistorial();
      const movimientosMes = movimientos.filter(m => {
        if (!m.fecha || m.userId !== usuarioActual.uid) return false;
        const fechaMov = new Date(m.fecha);
        return fechaMov >= primerDiaMes && fechaMov <= hoy && fechaMov >= fechaLimite;
      });
      
      const fechaInicio = obtenerPrimerDiaMes();
      const fechaFin = obtenerFechaActual();
      const fechaGeneracion = new Date().toLocaleString('es-CO');
      const tipoReporte = esCierreMensual ? 'CIERRE MENSUAL' : 'BORRADOR';
      
      const docPDF = new jsPDF();
      
      const ventas = movimientosMes.filter(m => m.tipo === 'ingreso');
      const comprasInventario = movimientosMes.filter(m => m.categoria === 'INVENTARIO');
      const gastosNoOperacionales = movimientosMes.filter(m => m.categoria === 'GASTO_NO_OPERACIONAL');
      
      const ventasTotales = ventas.reduce((sum, m) => sum + m.valor, 0);
      const comprasTotales = comprasInventario.reduce((sum, m) => sum + m.valor, 0);
      const gastosTotales = gastosNoOperacionales.reduce((sum, m) => sum + m.valor, 0);
      
      const ventasPorProducto = {};
      ventas.forEach(v => {
        if (!ventasPorProducto[v.concepto]) {
          ventasPorProducto[v.concepto] = { cantidad: 0, ingreso: 0, costo: 0 };
        }
        ventasPorProducto[v.concepto].cantidad += v.cantidad || 1;
        ventasPorProducto[v.concepto].ingreso += v.valor;
        ventasPorProducto[v.concepto].costo += (v.costoUnitario || 0) * (v.cantidad || 1);
      });
      
      const costoVentas = Object.values(ventasPorProducto).reduce((sum, p) => sum + p.costo, 0);
      const utilidadBruta = ventasTotales - costoVentas;
      const margenBruto = ventasTotales > 0 ? (utilidadBruta / ventasTotales) * 100 : 0;
      const flujoNeto = ventasTotales - comprasTotales - gastosTotales;
      
      // PÁGINA 1 - DICTAMEN DE AUDITORIA
      docPDF.setFontSize(18);
      docPDF.text('REPORTE MAESTRO DE AUDITORÍA', 105, 15, { align: 'center' });
      docPDF.setFontSize(14);
      docPDF.text('ESTADO DE RESULTADOS', 105, 23, { align: 'center' });
      docPDF.setFontSize(10);
      docPDF.text(`PERIODO CONTABLE: ${fechaInicio} AL ${fechaFin}`, 105, 33, { align: 'center' });
      docPDF.text(`ESTADO DE AUDITORIA: ${tipoReporte}`, 105, 40, { align: 'center' });
      docPDF.text(`Fecha de generacion: ${fechaGeneracion}`, 105, 47, { align: 'center' });
      docPDF.setFontSize(9);
      docPDF.text('Auditor Responsable: Especialista en optimización de costos y auditoría internacional con IA', 105, 55, { align: 'center' });
      
      docPDF.setFontSize(12);
      docPDF.text('1. DICTAMEN DE AUDITORIA', 14, 70);
      
      docPDF.setFontSize(10);
      const porcentajeFlujo = ventasTotales > 0 ? (flujoNeto / ventasTotales) * 100 : 0;
      docPDF.text(`Analisis de Flujo de Caja: El periodo presenta un flujo neto de $${flujoNeto.toLocaleString()} COP, equivalente a un ${porcentajeFlujo.toFixed(1)}% sobre ventas totales ($${ventasTotales.toLocaleString()} COP).`, 14, 80, { maxWidth: 180 });
      
      docPDF.text(`Analisis de Margen: El margen bruto se situa en ${margenBruto.toFixed(1)}%, con una utilidad bruta de $${utilidadBruta.toLocaleString()} COP sobre ventas de $${ventasTotales.toLocaleString()} COP. El costo de ventas asciende a $${costoVentas.toLocaleString()} COP.`, 14, 100, { maxWidth: 180 });
      
      docPDF.text(`Analisis de Gastos: Los gastos operativos totales son $${gastosTotales.toLocaleString()} COP, representando un ${(gastosTotales/ventasTotales*100).toFixed(1)}% de las ventas.`, 14, 120, { maxWidth: 180 });
      
      if (utilidadBruta >= 0) {
        docPDF.text(`Resultado Neto: El periodo cierra con una utilidad neta de $${utilidadBruta.toLocaleString()} COP, lo que indica rentabilidad positiva en las operaciones.`, 14, 140, { maxWidth: 180 });
      } else {
        docPDF.setTextColor(255, 0, 0);
        docPDF.text(`Resultado Neto: El periodo cierra con una perdida neta de $${Math.abs(utilidadBruta).toLocaleString()} COP.`, 14, 140, { maxWidth: 180 });
        docPDF.setTextColor(0, 0, 0);
      }
      
      docPDF.setFontSize(11);
      docPDF.text('Recomendaciones Estrategicas:', 14, 160);
      docPDF.setFontSize(10);
      
      if (flujoNeto < 0) {
        docPDF.text('- Alerta: Flujo neto negativo debido a inversion en inventario; optimizar rotacion de stock.', 20, 170, { maxWidth: 170 });
      }
      if (margenBruto < 30) {
        docPDF.text('- Margen bruto bajo, revisar politicas de precios y negociar con proveedores.', 20, 180, { maxWidth: 170 });
      }
      if (cuentasPorPagar.filter(c => c.estado === 'PENDIENTE' && c.userId === usuarioActual.uid).length > 0) {
        const cuentasPendientes = cuentasPorPagar.filter(c => c.estado === 'PENDIENTE' && c.userId === usuarioActual.uid);
        docPDF.text(`- Cuentas por pagar pendientes: ${cuentasPendientes.length} registros por $${cuentasPendientes.reduce((s, c) => s + c.valor, 0).toLocaleString()} COP.`, 20, 190, { maxWidth: 170 });
      }
      
      // PÁGINA 2 - ANALISIS DE CARTERA
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('2. ANALISIS DE CARTERA - CUENTAS POR COBRAR', 14, 20);
      
      const cuentasPendientes = cuentasPorPagar.filter(c => c.estado === 'PENDIENTE' && c.userId === usuarioActual.uid);
      if (cuentasPendientes.length === 0) {
        docPDF.setFontSize(10);
        docPDF.text('No hay cuentas por cobrar pendientes en el periodo.', 14, 35);
      } else {
        const tableData = cuentasPendientes.map(c => [
          c.fechaRegistro || '',
          c.proveedor || 'Proveedor',
          c.concepto || '',
          `$${c.valor?.toLocaleString() || '0'}`,
          c.fechaVencimiento || '',
          c.estado || 'PENDIENTE'
        ]);
        
        docPDF.autoTable({
          startY: 30,
          head: [['FECHA', 'PROVEEDOR', 'CONCEPTO', 'VALOR', 'VENCIMIENTO', 'ESTADO']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });
      }
      
      // PÁGINA 3 - INVENTARIO Y COSTEO
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('3. INVENTARIO Y COSTEO - ANALISIS POR PRODUCTO', 14, 20);
      
      const productosData = Object.entries(ventasPorProducto).map(([producto, data]) => [
        producto,
        data.cantidad,
        `$${data.ingreso.toLocaleString()}`,
        `$${data.costo.toLocaleString()}`,
        data.ingreso > 0 ? `${((data.ingreso - data.costo) / data.ingreso * 100).toFixed(1)}%` : '0%',
        `$${(data.ingreso - data.costo).toLocaleString()}`
      ]);
      
      docPDF.autoTable({
        startY: 30,
        head: [['PRODUCTO', 'CANT.', 'INGRESO', 'COSTO', 'MARGEN %', 'CONTRIBUCION']],
        body: productosData,
        foot: [['TOTALES', '', `$${ventasTotales.toLocaleString()}`, `$${costoVentas.toLocaleString()}`, '', `$${utilidadBruta.toLocaleString()}`]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' }
      });
      
      // PÁGINA 4 - LIBRO AUXILIAR DE VENTAS
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('4. LIBRO AUXILIAR DE VENTAS', 14, 20);
      
      const ventasData = ventas.map(v => [
        v.fecha ? new Date(v.fecha).toLocaleDateString('es-CO') : '',
        v.concepto || '',
        v.cantidad || 1,
        `$${(v.valor / (v.cantidad || 1)).toLocaleString()}`,
        `$${v.valor.toLocaleString()}`,
        `$${((v.costoUnitario || 0) * (v.cantidad || 1)).toLocaleString()}`,
        v.estado || 'PAGADO'
      ]);
      
      docPDF.autoTable({
        startY: 30,
        head: [['FECHA', 'PRODUCTO', 'CANT', 'PRECIO', 'INGRESO', 'COSTO T.', 'ESTADO']],
        body: ventasData,
        foot: [['TOTALES', '', '', '', `$${ventasTotales.toLocaleString()}`, `$${costoVentas.toLocaleString()}`, '']],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      });
      
      // PÁGINA 5 - LIBRO DE COMPRAS E INVENTARIO
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('5A. LIBRO DE COMPRAS E INVENTARIO', 14, 20);
      
      const comprasData = comprasInventario.map(c => [
        c.fechaFactura || (c.fecha ? new Date(c.fecha).toLocaleDateString('es-CO') : ''),
        c.proveedor || 'Proveedor',
        c.nitProveedor || '',
        c.numeroFactura || '',
        c.concepto || '',
        c.cantidad || 1,
        `$${((c.valorNeto || c.valor) / (c.cantidad || 1)).toLocaleString()}`,
        `$${(c.valorNeto || c.valor).toLocaleString()}`,
        `$${(c.iva || 0).toLocaleString()}`,
        `$${c.valor.toLocaleString()}`,
        'INVENTARIO'
      ]);
      
      docPDF.autoTable({
        startY: 30,
        head: [['FECHA', 'PROVEEDOR', 'NIT', 'FACTURA', 'PRODUCTO', 'CANT', 'VALOR UNIT.', 'NETO', 'IVA', 'TOTAL', 'FLUJO']],
        body: comprasData,
        foot: [['TOTAL COMPRAS INVENTARIO:', '', '', '', '', '', '', `$${comprasTotales.toLocaleString()}`, '', '', '']],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      });
      
      // PÁGINA 6 - GASTOS OPERATIVOS
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('5B. LIBRO DE GASTOS OPERATIVOS', 14, 20);
      
      if (gastosNoOperacionales.length === 0) {
        docPDF.setFontSize(10);
        docPDF.text('No hay gastos operativos registrados en el periodo.', 14, 35);
      } else {
        const gastosData = gastosNoOperacionales.map(g => [
          g.fecha ? new Date(g.fecha).toLocaleDateString('es-CO') : '',
          g.concepto || '',
          `$${g.valorNeto?.toLocaleString() || '0'}`,
          `$${g.iva?.toLocaleString() || '0'}`,
          `$${g.valor.toLocaleString()}`,
          'GASTO_NO_OPERACIONAL'
        ]);
        
        docPDF.autoTable({
          startY: 30,
          head: [['FECHA', 'CONCEPTO', 'NETO', 'IVA', 'TOTAL', 'CATEGORÍA']],
          body: gastosData,
          foot: [['TOTAL GASTOS:', '', `$${gastosTotales.toLocaleString()}`, '', '', '']],
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });
      }
      
      // PÁGINA 7 - GRÁFICO KPI
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('6. ANALISIS DE KPIS FINANCIEROS', 14, 20);
      
      const maxValor = Math.max(ventasTotales, costoVentas, utilidadBruta, 1);
      const escala = 120 / maxValor;
      
      docPDF.setFillColor(46, 139, 87);
      docPDF.rect(30, 50, ventasTotales * escala, 15, 'F');
      docPDF.text(`Ventas: $${ventasTotales.toLocaleString()}`, 35, 48);
      
      docPDF.setFillColor(205, 92, 92);
      docPDF.rect(30, 75, costoVentas * escala, 15, 'F');
      docPDF.text(`Costo: $${costoVentas.toLocaleString()}`, 35, 73);
      
      docPDF.setFillColor(70, 130, 180);
      docPDF.rect(30, 100, Math.abs(utilidadBruta) * escala, 15, 'F');
      docPDF.text(`Utilidad: $${utilidadBruta.toLocaleString()}`, 35, 98);
      
      docPDF.text(`Margen Bruto: ${margenBruto.toFixed(1)}%`, 30, 125);
      
      // PÁGINA 8 - ESTADO DE RESULTADOS
      docPDF.addPage();
      docPDF.setFontSize(12);
      docPDF.text('ESTADO DE RESULTADOS - ANALISIS FINANCIERO', 14, 20);
      
      const roi = comprasTotales > 0 ? (utilidadBruta / comprasTotales) * 100 : 0;
      const puntoEquilibrio = margenBruto > 0 ? (gastosTotales / (margenBruto / 100)) : 0;
      
      docPDF.setFontSize(11);
      docPDF.text(`VENTAS TOTALES`, 30, 40);
      docPDF.text(`$${ventasTotales.toLocaleString()}`, 150, 40, { align: 'right' });
      
      docPDF.text(`Costo de Ventas`, 30, 50);
      docPDF.text(`($${costoVentas.toLocaleString()})`, 150, 50, { align: 'right' });
      
      docPDF.setFontSize(12);
      docPDF.text(`UTILIDAD BRUTA`, 30, 65);
      docPDF.text(`$${utilidadBruta.toLocaleString()}`, 150, 65, { align: 'right' });
      
      docPDF.setFontSize(10);
      docPDF.text(`Margen Bruto: ${margenBruto.toFixed(1)}%`, 30, 75);
      
      docPDF.setFontSize(11);
      docPDF.text(`GASTOS OPERATIVOS`, 30, 95);
      docPDF.text(`($${gastosTotales.toLocaleString()})`, 150, 95, { align: 'right' });
      
      docPDF.setFontSize(12);
      if (utilidadBruta >= 0) {
        docPDF.setTextColor(0, 128, 0);
        docPDF.text(`UTILIDAD NETA`, 30, 115);
        docPDF.text(`$${utilidadBruta.toLocaleString()}`, 150, 115, { align: 'right' });
      } else {
        docPDF.setTextColor(255, 0, 0);
        docPDF.text(`PERDIDA NETA`, 30, 115);
        docPDF.text(`($${Math.abs(utilidadBruta).toLocaleString()})`, 150, 115, { align: 'right' });
      }
      docPDF.setTextColor(0, 0, 0);
      
      docPDF.setFontSize(11);
      docPDF.text('RATIOS FINANCIEROS', 30, 140);
      docPDF.setFontSize(10);
      docPDF.text(`Ratio Gastos / Ventas: ${(gastosTotales/ventasTotales*100).toFixed(1)}%`, 30, 150);
      docPDF.text(`Punto de Equilibrio Estimado: $${puntoEquilibrio.toLocaleString()}`, 30, 158);
      docPDF.text(`ROI (Retorno sobre Inversion): ${roi.toFixed(1)}%`, 30, 166);
      
      const pdfBlob = docPDF.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Reporte_Auditoria_${fechaFin.replace(/\//g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(pdfUrl);
      
      if (esCierreMensual) {
        const periodoLabel = `${fechaInicio} al ${fechaFin}`;
        await enviarReportePorEmail(pdfBlob, periodoLabel, tipoReporte);
      }
      
    } catch (error) {
      console.error('Error generando reporte:', error);
      setError('Error al generar el reporte PDF');
    } finally {
      setGenerandoReporte(false);
    }
  }, [movimientos, cuentasPorPagar, usuarioActual, puedeAccederAFuncion, obtenerFechaLimiteHistorial]);

// ============================================================
// REPORTE CORTO (PREVIEW) - PARA PLAN FREE/STARTER
// ============================================================
const generarReportePreview = () => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('STRATIUM AI', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Reporte Ejecutivo', 105, 35, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 45, { align: 'center' });
  
  // Estado de Resultados (PyG)
  doc.setFontSize(12);
  doc.text('Estado de Resultados', 20, 65);
  doc.setFontSize(10);
  doc.text(`Ventas: ${formatearValor(ventasTotales)}`, 25, 80);
  doc.text(`Gastos: ${formatearValor(gastosTotales)}`, 25, 90);
  doc.text(`Utilidad: ${formatearValor(utilidadEstimada)}`, 25, 100);
  doc.text(`Margen: ${margen}%`, 25, 110);
  
  // Inventario (Top 5)
  doc.setFontSize(12);
  doc.text('Inventario (Top 5)', 20, 130);
  doc.setFontSize(9);
  let y = 145;
  const topInventario = inventario.slice(0, 5);
  if (topInventario.length === 0) {
    doc.text('No hay productos en inventario', 25, y);
  } else {
    topInventario.forEach(item => {
      if (y > 270) return;
      doc.text(`${item.producto}: ${item.cantidad} unidades`, 25, y);
      y += 8;
    });
  }
  
  // Pie de página
  doc.setFontSize(8);
  doc.text('Este es un reporte de prueba. Actualiza tu plan para reportes completos.', 105, 285, { align: 'center' });
  
  doc.save('STRATIUM_Preview.pdf');
};

  // ============================================================
  // EXPORTAR A EXCEL/CSV
  // ============================================================
  const exportarACSV = () => {
    if (!usuarioActual?.uid) return;
    
    // Verificar si el plan permite exportar
    if (!puedeAccederAFuncion('puedeExportarExcel')) {
      setFuncionBloqueada('Exportar a Excel/CSV');
      setModalUpgradeOpen(true);
      return;
    }
    
    if (movimientos.length === 0) {
      setError('No hay registros para exportar');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Preparar datos para CSV
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Valor', 'Tipo', 'Cantidad', 'Proveedor', 'Factura'];
    const rows = movimientos.map(m => [
      m.fecha ? new Date(m.fecha).toLocaleDateString('es-CO') : '',
      m.concepto || '',
      m.categoria || '',
      m.valor || 0,
      m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      m.cantidad || 1,
      m.proveedor || '',
      m.numeroFactura || ''
    ]);
    
    // Crear contenido CSV
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Agregar BOM para caracteres especiales en español
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    link.href = url;
    link.setAttribute('download', `STRATIUM_AI_Registros_${fecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setValidationMessage(`✅ Exportados ${movimientos.length} registros a CSV`);
    setTimeout(() => setValidationMessage(null), 4000);
  };

  // ============================================================
  // RECUPERACIÓN DE CONTRASEÑA
  // ============================================================
  const handleResetPassword = async () => {
    if (!emailLogin) {
      setErrorAuth('Ingresa tu correo electrónico primero');
      return;
    }
    setErrorAuth('');
    setValidationMessage('Enviando correo de recuperación...');
    
    try {
      await sendPasswordResetEmail(auth, emailLogin);
      setValidationMessage(`📧 Se ha enviado un correo de recuperación a ${emailLogin}. Revisa tu bandeja de entrada o spam.`);
      setTimeout(() => setValidationMessage(null), 8000);
    } catch (error) {
      console.error('Error en recuperación:', error);
      if (error.code === 'auth/user-not-found') {
        setErrorAuth('No existe una cuenta con este correo electrónico.');
      } else {
        setErrorAuth(error.message);
      }
    }
  };

  // ============================================================
  // OBTENER EMOJIS
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
// GENERAR DICTAMEN GENERAL (VERSIÓN MEJORADA)
// ============================================================
const generarDictamenGeneral = useCallback((movs, esPlanPago = false) => {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fechaLimite = obtenerFechaLimiteHistorial();
  const movimientosMes = movs.filter(m => {
    if (!m.fecha) return false;
    const fechaMov = new Date(m.fecha);
    return fechaMov >= primerDiaMes && fechaMov <= hoy && fechaMov >= fechaLimite;
  });
  
  const ventas = movimientosMes.filter(m => m.tipo === 'ingreso');
  const egresos = movimientosMes.filter(m => m.tipo === 'egreso');
  const ventasTotales = ventas.reduce((s, m) => s + m.valor, 0);
  const egresosTotales = egresos.reduce((s, m) => s + m.valor, 0);
  const utilidadNeta = ventasTotales - egresosTotales;
  const margenSimple = ventasTotales > 0 ? ((utilidadNeta / ventasTotales) * 100).toFixed(1) : 0;
  
  // Clasificar costos variables y gastos fijos
  const categoriasVariables = ['INVENTARIO', 'Insumos', 'Mercancía', 'Compra'];
  const costosVariables = egresos.filter(m => categoriasVariables.includes(m.categoria)).reduce((s, m) => s + m.valor, 0);
  const gastosFijos = egresosTotales - costosVariables;
  
  // Cálculo de los 6 márgenes
  const margenBruto = ventasTotales > 0 ? ((ventasTotales - costosVariables) / ventasTotales) * 100 : 0;
  const margenContribucion = ventasTotales > 0 ? ((ventasTotales - costosVariables) / ventasTotales) * 100 : 0;
  const margenEBITDA = ventasTotales > 0 ? ((ventasTotales - costosVariables - gastosFijos) / ventasTotales) * 100 : 0;
  const margenOperativo = ventasTotales > 0 ? ((utilidadNeta) / ventasTotales) * 100 : 0;
  const margenEBT = ventasTotales > 0 ? ((utilidadNeta) / ventasTotales) * 100 : 0;
  const margenNeto = ventasTotales > 0 ? ((utilidadNeta) / ventasTotales) * 100 : 0;
  
  // ROI (Retorno sobre Inversión)
  const capitalTotalInvertido = (usuarioActual?.deudaConDueño || 0) + (usuarioActual?.aportesPersonales || 0);
  const roi = capitalTotalInvertido > 0 ? ((utilidadNeta / capitalTotalInvertido) * 100).toFixed(1) : 0;
  
  const formatearValorLocal = (valor) => {
    return new Intl.NumberFormat(idioma === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency', currency: idioma === 'es' ? 'COP' : 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Math.abs(valor));
  };
  
  let textoDictamen = '';
  
  if (movimientosMes.length === 0) {
    textoDictamen = idioma === 'es' 
      ? 'No hay transacciones en el periodo actual. Comienza a registrar tus operaciones para obtener un análisis financiero.'
      : 'No transactions in the current period. Start recording your operations to get a financial analysis.';
  } else if (!esPlanPago) {
    // ============================================================
    // PLAN GRATUITO (ANZUELO)
    // ============================================================
    textoDictamen = idioma === 'es' 
      ? '📊 REPORTE EJECUTIVO\n━━━━━━━━━━━━━━━━━━━━━\n'
      : '📊 EXECUTIVE REPORT\n━━━━━━━━━━━━━━━━━━━━━\n';
    textoDictamen += (idioma === 'es' ? '📈 Ventas: ' : '📈 Sales: ') + `${formatearValorLocal(ventasTotales)}\n`;
    textoDictamen += (idioma === 'es' ? '📉 Gastos: ' : '📉 Expenses: ') + `${formatearValorLocal(egresosTotales)}\n`;
    textoDictamen += (idioma === 'es' ? '💰 Utilidad Neta: ' : '💰 Net Profit: ') + `${formatearValorLocal(utilidadNeta)}\n`;
    textoDictamen += (idioma === 'es' ? '📊 Margen Neto: ' : '📊 Net Margin: ') + `${margenSimple}%\n\n`;
    
    // Diagnóstico básico
    if (utilidadNeta < 0) {
      textoDictamen += (idioma === 'es' 
        ? '⚠️ Estás operando con pérdida. Revisa precios de venta o reduce costos.\n'
        : '⚠️ You are operating at a loss. Review selling prices or reduce costs.\n');
    } else if (margenSimple > 25) {
      textoDictamen += (idioma === 'es' 
        ? '✅ Excelente rentabilidad. Mantén la estrategia actual.\n'
        : '✅ Excellent profitability. Maintain current strategy.\n');
    } else if (margenSimple > 10) {
      textoDictamen += (idioma === 'es' 
        ? '📢 Rentabilidad saludable. Busca optimizar gastos para mejorar.\n'
        : '📢 Healthy profitability. Look to optimize expenses to improve.\n');
    } else {
      textoDictamen += (idioma === 'es' 
        ? '⚠️ Rentabilidad baja. Prioriza reducir costos o aumentar ventas.\n'
        : '⚠️ Low profitability. Prioritize reducing costs or increasing sales.\n');
    }
    
    // 🎯 GATILLO MENTAL PARA UPGRADE
    textoDictamen += (idioma === 'es' 
      ? '\n🔓 ¿Quieres saber tu Margen de Contribución, EBITDA y ROI?\n'
      : '\n🔓 Want to know your Contribution Margin, EBITDA and ROI?\n');
    textoDictamen += (idioma === 'es' 
      ? '💡 Actualiza a Plan Business y descubre los 6 márgenes de rentabilidad real.\n'
      : '💡 Upgrade to Business Plan and discover the 6 real profitability margins.\n');
    
    // ✅ VERIFICAR CAPITAL CERO PARA ROI (SOLO PARA PLAN DE PAGO)
    if (capitalTotalInvertido === 0 && ventasTotales > 0) {
      textoDictamen += (idioma === 'es' 
        ? '\n⚠️ Completa tu inversión inicial para calcular tu ROI (Retorno sobre Inversión). Registra tus aportes personales o deudas con el dueño.\n'
        : '\n⚠️ Complete your initial investment to calculate your ROI (Return on Investment). Record your personal contributions or debts to the owner.\n');
    }
    
    // Alerta de inventario lento
    const productosLentos = inventario.filter(item => {
      if (!item.producto || item.cantidad <= 0) return false;
      const ventasProducto = movimientosMes.filter(m => 
        m.tipo === 'ingreso' && 
        m.concepto?.toLowerCase() === item.producto.toLowerCase()
      );
      if (ventasProducto.length === 0) return true;
      const ultimaVenta = new Date(Math.max(...ventasProducto.map(v => new Date(v.fecha))));
      const dias = Math.floor((hoy - ultimaVenta) / (1000 * 60 * 60 * 24));
      return dias > 180;
    });
    
    if (productosLentos.length > 0) {
      textoDictamen += (idioma === 'es' ? '\n⚠️ ALERTA DE INVENTARIO:\n' : '\n⚠️ INVENTORY ALERT:\n');
      productosLentos.slice(0, 3).forEach(p => {
        textoDictamen += `   • ${p.producto}: ${p.cantidad} ${idioma === 'es' ? 'unidades sin rotación' : 'units without rotation'}\n`;
      });
    }
    
  } else {
    // ============================================================
    // PLAN DE PAGO (BUSINESS/ELITE) - ANÁLISIS COMPLETO
    // ============================================================
    textoDictamen = idioma === 'es'
      ? '📊 ANALISIS FINANCIERO DETALLADO\n━━━━━━━━━━━━━━━━━━━━━\n'
      : '📊 DETAILED FINANCIAL ANALYSIS\n━━━━━━━━━━━━━━━━━━━━━\n';
    textoDictamen += (idioma === 'es' ? `Período: ${obtenerPrimerDiaMes()} al ${obtenerFechaActual()}\n` : `Period: ${obtenerPrimerDiaMes()} to ${obtenerFechaActual()}\n`);
    textoDictamen += (idioma === 'es' ? '📈 Ventas: ' : '📈 Sales: ') + `${formatearValorLocal(ventasTotales)}\n`;
    textoDictamen += (idioma === 'es' ? '📉 Costos Variables: ' : '📉 Variable Costs: ') + `${formatearValorLocal(costosVariables)}\n`;
    textoDictamen += (idioma === 'es' ? '📉 Gastos Fijos: ' : '📉 Fixed Expenses: ') + `${formatearValorLocal(gastosFijos)}\n`;
    textoDictamen += (idioma === 'es' ? '💰 Utilidad Neta: ' : '💰 Net Profit: ') + `${formatearValorLocal(utilidadNeta)}\n\n`;
    
    textoDictamen += (idioma === 'es' ? '💰 MÁRGENES DE UTILIDAD:\n' : '💰 PROFIT MARGINS:\n');
    textoDictamen += (idioma === 'es' ? '   • Margen Bruto: ' : '   • Gross Margin: ') + `${margenBruto.toFixed(1)}%\n`;
    textoDictamen += (idioma === 'es' ? '   • Margen de Contribución: ' : '   • Contribution Margin: ') + `${margenContribucion.toFixed(1)}%\n`;
    textoDictamen += (idioma === 'es' ? '   • Margen EBITDA: ' : '   • EBITDA Margin: ') + `${margenEBITDA.toFixed(1)}%\n`;
    textoDictamen += (idioma === 'es' ? '   • Margen Operativo: ' : '   • Operating Margin: ') + `${margenOperativo.toFixed(1)}%\n`;
    textoDictamen += (idioma === 'es' ? '   • Margen EBT: ' : '   • EBT Margin: ') + `${margenEBT.toFixed(1)}%\n`;
    textoDictamen += (idioma === 'es' ? '   • Margen Neto: ' : '   • Net Margin: ') + `${margenNeto.toFixed(1)}%\n\n`;
    
    textoDictamen += (idioma === 'es' ? '📊 INDICADORES ADICIONALES:\n' : '📊 ADDITIONAL INDICATORS:\n');
    textoDictamen += (idioma === 'es' ? '   • ROI (Retorno sobre Inversión): ' : '   • ROI (Return on Investment): ') + `${roi}%\n\n`;
    
    // ✅ VERIFICAR CAPITAL CERO PARA ROI
    if (capitalTotalInvertido === 0 && ventasTotales > 0) {
      textoDictamen += (idioma === 'es' 
        ? '⚠️ Completa tu inversión inicial para calcular tu ROI (Retorno sobre Inversión). Registra tus aportes personales o deudas con el dueño.\n\n'
        : '⚠️ Complete your initial investment to calculate your ROI (Return on Investment). Record your personal contributions or debts to the owner.\n\n');
    }
    
    // Diagnóstico ejecutivo
    if (ventasTotales === 0) {
      textoDictamen += (idioma === 'es' 
        ? '⚠️ No hay ventas registradas. Activa tu estrategia comercial.\n'
        : '⚠️ No sales recorded. Activate your commercial strategy.\n');
    } else if (utilidadNeta < 0) {
      textoDictamen += (idioma === 'es' 
        ? '🚨 Estás operando con pérdida de ' + formatearValorLocal(Math.abs(utilidadNeta)) + '. Necesitas aumentar precios un mínimo del ' + (Math.abs(margenNeto) + 10).toFixed(0) + '% o reducir costos.\n'
        : '🚨 You are operating at a loss of ' + formatearValorLocal(Math.abs(utilidadNeta)) + '. You need to increase prices by a minimum of ' + (Math.abs(margenNeto) + 10).toFixed(0) + '% or reduce costs.\n');
    } else if (margenNeto > 25) {
      textoDictamen += (idioma === 'es' 
        ? '✅ Excelente rentabilidad (margen neto ' + margenNeto.toFixed(1) + '%). Tu ROI del ' + roi + '% indica que la inversión está generando buenos retornos.\n'
        : '✅ Excellent profitability (net margin ' + margenNeto.toFixed(1) + '%). Your ROI of ' + roi + '% indicates that the investment is generating good returns.\n');
    } else if (margenNeto > 15) {
      textoDictamen += (idioma === 'es' 
        ? '📢 Buena rentabilidad (margen neto ' + margenNeto.toFixed(1) + '%). Optimiza gastos para alcanzar el 25%.\n'
        : '📢 Good profitability (net margin ' + margenNeto.toFixed(1) + '%). Optimize expenses to reach 25%.\n');
    } else if (margenNeto > 5) {
      textoDictamen += (idioma === 'es' 
        ? '⚠️ Margen ajustado (' + margenNeto.toFixed(1) + '%). Reduce gastos fijos o revisa precios de proveedores.\n'
        : '⚠️ Tight margin (' + margenNeto.toFixed(1) + '%). Reduce fixed costs or review supplier prices.\n');
    } else {
      textoDictamen += (idioma === 'es' 
        ? '🔴 Rentabilidad insuficiente (' + margenNeto.toFixed(1) + '%). Reestructura precios o elimina productos no rentables.\n'
        : '🔴 Insufficient profitability (' + margenNeto.toFixed(1) + '%). Restructure prices or eliminate unprofitable products.\n');
    }
    
    // Recomendaciones específicas
    if (gastosFijos > ventasTotales * 0.4 && ventasTotales > 0) {
      textoDictamen += (idioma === 'es' 
        ? '💡 Tus gastos fijos representan más del 40% de las ventas. Reduce arriendo o renegocia servicios.\n'
        : '💡 Your fixed expenses represent more than 40% of sales. Reduce rent or renegotiate services.\n');
    }
    
    if (margenContribucion < 30 && ventasTotales > 0) {
      textoDictamen += (idioma === 'es' 
        ? '💡 Tu margen de contribución es bajo (' + margenContribucion.toFixed(1) + '%). Revisa costos de materia prima o aumenta precios.\n'
        : '💡 Your contribution margin is low (' + margenContribucion.toFixed(1) + '%). Review raw material costs or increase prices.\n');
    }
    
    if (roi < 10 && roi > 0) {
      textoDictamen += (idioma === 'es' 
        ? '💡 Tu ROI es bajo (' + roi + '%). Busca inversiones con mayor retorno o reduce el capital invertido.\n'
        : '💡 Your ROI is low (' + roi + '%). Look for investments with higher returns or reduce invested capital.\n');
    } else if (roi > 30) {
      textoDictamen += (idioma === 'es' 
        ? '✅ ¡Excelente ROI del ' + roi + '%! Tu inversión está generando muy buenos retornos.\n'
        : '✅ Excellent ROI of ' + roi + '%! Your investment is generating very good returns.\n');
    }
    
    textoDictamen += (idioma === 'es' ? '\n💵 Capital Inyectado: ' : '\n💵 Injected Capital: ') + `${formatearValorLocal(usuarioActual?.aportesPersonales || 0)}\n`;
    textoDictamen += (idioma === 'es' ? '🏦 Deuda con Dueño: ' : '🏦 Debt to Owner: ') + `${formatearValorLocal(usuarioActual?.deudaConDueño || 0)}\n`;
  }
  
  setDictamenGeneral(textoDictamen);
}, [obtenerFechaLimiteHistorial, obtenerPrimerDiaMes, obtenerFechaActual, inventario, usuarioActual, idioma]);
  
// ============================================================
  // REGISTRAR COMPRA CON FECHA DE VENCIMIENTO (NUEVO)
  // ============================================================
  const registrarCompraConVencimiento = async (texto, concepto, valor, cantidad, fechaVencimiento = null) => {
    if (!usuarioActual?.uid) return { success: false, error: 'No autenticado' };
    
    try {
      const costoUnitario = valor / cantidad;
      
      // Guardar en registrosCollection
      await addDoc(registrosCollection, {
        texto: texto,
        concepto: concepto,
        valor: valor,
        tipo: 'egreso',
        categoria: 'Compra',
        emoji: '📦',
        fecha: serverTimestamp(),
        cantidad: cantidad,
        costoUnitario: costoUnitario,
        userId: usuarioActual.uid
      });
      
      // Actualizar o crear en inventario
      const q = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
      const querySnapshot = await getDocs(q);
      
      const inventarioData = {
        producto: concepto,
        cantidad: cantidad,
        costoUnitario: costoUnitario,
        costoTotal: valor,
        fechaActualizacion: serverTimestamp(),
        userId: usuarioActual.uid
      };
      
      // Si se proporcionó fecha de vencimiento
      if (fechaVencimiento) {
        const fechaVenc = new Date(fechaVencimiento);
        inventarioData.fechaVencimiento = fechaVenc;
        inventarioData.diasParaVencer = calcularDiasParaVencer(fechaVenc);
        inventarioData.alertaVencimientoEnviada = false;
      }
      
      if (querySnapshot.empty) {
        await addDoc(inventarioCollection, inventarioData);
      } else {
        const docInventario = querySnapshot.docs[0];
        const dataActual = docInventario.data();
        const nuevaCantidad = dataActual.cantidad + cantidad;
        const nuevoCostoTotal = (dataActual.cantidad * dataActual.costoUnitario) + valor;
        const nuevoCostoUnitario = nuevoCostoTotal / nuevaCantidad;
        
        const updateData = {
          cantidad: nuevaCantidad,
          costoUnitario: nuevoCostoUnitario,
          costoTotal: nuevoCostoTotal,
          fechaActualizacion: serverTimestamp()
        };
        
        // Mantener fecha de vencimiento si existe (la más próxima)
        if (fechaVencimiento && (!dataActual.fechaVencimiento || new Date(fechaVencimiento) < new Date(dataActual.fechaVencimiento))) {
          updateData.fechaVencimiento = new Date(fechaVencimiento);
          updateData.diasParaVencer = calcularDiasParaVencer(fechaVencimiento);
          updateData.alertaVencimientoEnviada = false;
        } else if (dataActual.fechaVencimiento && !fechaVencimiento) {
          updateData.fechaVencimiento = dataActual.fechaVencimiento;
          updateData.diasParaVencer = dataActual.diasParaVencer;
        }
        
        await updateDoc(doc(db, 'inventario', docInventario.id), updateData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error registrando compra:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================================
  // REGISTRO DE COMPRA A CRÉDITO
  // ============================================================
  const registrarCompraCredito = async (texto, concepto, valor, cantidad, plazoDias) => {
    if (!usuarioActual?.uid) return { success: false, error: 'No autenticado' };
    
    try {
      const fechaActual = new Date().toLocaleDateString('es-CO');
      const fechaVencimientoCredito = calcularFechaVencimiento(plazoDias);
      const costoUnitario = valor / cantidad;
      
      await addDoc(registrosCollection, {
        texto: texto,
        concepto: concepto,
        valor: valor,
        tipo: 'egreso',
        categoria: 'Compra',
        emoji: '📦',
        fecha: serverTimestamp(),
        fechaRegistro: fechaActual,
        cantidad: cantidad,
        costoUnitario: costoUnitario,
        userId: usuarioActual.uid
      });
      
      const q = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(inventarioCollection, {
          producto: concepto,
          cantidad: cantidad,
          costoUnitario: costoUnitario,
          costoTotal: valor,
          fechaActualizacion: serverTimestamp(),
          userId: usuarioActual.uid
        });
      } else {
        const docInventario = querySnapshot.docs[0];
        const dataActual = docInventario.data();
        const nuevaCantidad = dataActual.cantidad + cantidad;
        const nuevoCostoTotal = (dataActual.cantidad * dataActual.costoUnitario) + valor;
        const nuevoCostoUnitario = nuevoCostoTotal / nuevaCantidad;
        
        await updateDoc(doc(db, 'inventario', docInventario.id), {
          cantidad: nuevaCantidad,
          costoUnitario: nuevoCostoUnitario,
          costoTotal: nuevoCostoTotal,
          fechaActualizacion: serverTimestamp()
        });
      }
      
      await addDoc(cuentasPorPagarCollection, {
        proveedor: 'Proveedor',
        concepto: concepto,
        valor: valor,
        fechaVencimiento: fechaVencimientoCredito,
        fechaRegistro: fechaActual,
        estado: 'PENDIENTE',
        texto: texto,
        userId: usuarioActual.uid
      });
      
      return { success: true, fechaVencimiento: fechaVencimientoCredito };
    } catch (error) {
      console.error('Error registrando compra a crédito:', error);
      return { success: false, error: error.message };
    }
  };

    // ============================================================
  // FUNCIÓN DE ESCANEO OCR REAL
  // ============================================================
  const procesarEscaneoOCRReal = async (textoComando, imagenFile, db, registrosCollection, inventarioCollection, userId, monedaUsuario, fuentePago = 'negocio') => {
  try {
    const resultadoOCR = await handleEscaneoDocumentos(imagenFile, textoComando, monedaUsuario);
    
    if (!resultadoOCR.success) {
      return { tipo: 'error', mensaje: resultadoOCR.mensaje };
    }
    
    // 🔥 NUEVO: Identificar producto objetivo para revender
    const matchProducto = textoComando.match(/(?:escanea|scan):\s*(?:compra|purchase)\s+(?:de\s+)?([a-záéíóúñ\s]+?)(?:\s+el\s+resto|\s+para\s+uso\s+personal|\s*$)/i);
    const productoObjetivo = matchProducto ? matchProducto[1].trim().toLowerCase() : null;
    
    let productosReventa = [];
    let productosGastoPersonal = [];
    
    if (productoObjetivo) {
      // Separar productos según el objetivo
      for (const producto of resultadoOCR.productosReventa) {
        if (producto.nombre.toLowerCase().includes(productoObjetivo)) {
          productosReventa.push(producto);
        } else {
          productosGastoPersonal.push(producto);
        }
      }
    } else {
      // Si no hay producto objetivo, todo va a inventario
      productosReventa = resultadoOCR.productosReventa;
    }
    
    // 🔥 NUEVO: Registrar productos para revender (inventario)
    for (const producto of productosReventa) {
      await registrarCompraEnRegistros({
        concepto: producto.nombre,
        cantidad: producto.cantidad,
        valor_unitario_base: producto.precioUnitario,
        tax_item: producto.impuestoValor,
        flujo: 'INVENTARIO',
        tercero: resultadoOCR.proveedor,
        estado: resultadoOCR.estado,
        factura: resultadoOCR.factura,
        fecha: resultadoOCR.fecha,
        moneda: monedaUsuario,
        fuentePago: fuentePago  // ✅ NUEVO: Guardar fuente de pago
      }, db, userId);
      
      await actualizarInventarioAcumulado(producto.nombre, producto.cantidad, producto.precioUnitario, db, userId);
    }
    
    // 🔥 NUEVO: Registrar gastos personales (NO van a inventario)
    if (productosGastoPersonal.length > 0) {
      let totalGastosPersonales = 0;
      for (const producto of productosGastoPersonal) {
        totalGastosPersonales += producto.cantidad * producto.precioUnitario;
      }
      
      await addDoc(registrosCollection, {
        texto: `Gasto personal: ${productosGastoPersonal.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`,
        concepto: 'Gastos Personales',
        valor: totalGastosPersonales,
        tipo: 'egreso',
        categoria: 'GASTO_NO_OPERACIONAL',
        emoji: '💸',
        cantidad: productosGastoPersonal.reduce((sum, p) => sum + p.cantidad, 0),
        fecha: serverTimestamp(),
        userId: userId,
        fuentePago: fuentePago,  // ✅ NUEVO: Guardar fuente de pago
        esAportePersonal: fuentePago === 'personal'
      });
    }
    
    let mensaje = `✅ Factura procesada: ${productosReventa.length} productos agregados al inventario.`;
    if (productosGastoPersonal.length > 0) {
      mensaje += ` ${productosGastoPersonal.length} productos registrados como gastos personales.`;
    }
    
    return {
      tipo: 'escaneo',
      mensaje: mensaje,
      productosReventa,
      productosGastoPersonal
    };
    
  } catch (err) {
    console.error('Error en escaneo OCR:', err);
    return { tipo: 'error', mensaje: err.message };
  }
};

  // ============================================================
  // PROCESAR COMANDOS (MODIFICADO PARA PREGUNTAR POR VENCIMIENTO)
  // ============================================================
  const procesarComando = async (texto) => {
    if (!usuarioActual?.uid) return { tipo: 'error', mensaje: 'Debes iniciar sesión para registrar operaciones' };
    
    const textoLower = texto.toLowerCase();
    
    if (textoLower.startsWith('escanea:') || textoLower.startsWith('scan:')) {
      setInputValue(texto);
      
      // ✅ NUEVO: Preguntar fuente de pago antes de escanear
      const fuente = window.confirm('¿Esta compra fue pagada con?\n\nOK = Fondos del negocio\nCancelar = Fondos personales');
      const fuentePago = fuente ? 'negocio' : 'personal';
      
      seleccionarImagenFactura(fuentePago);
      return { tipo: 'info', mensaje: 'Selecciona una imagen de la factura para escanear' };
    }
    
    if (textoLower.includes('genera: reporte') || textoLower.includes('genera reporte') ||
        textoLower.includes('presenta: reporte') || textoLower.includes('presenta reporte') ||
        textoLower.includes('generate: report') || textoLower.includes('generate report')) {
      await generarReportePDF(false);
      return { tipo: 'reporte', mensaje: 'Generando reporte PDF...' };
    }
    
    if ((textoLower.includes('compra') || textoLower.includes('purchase')) && textoLower.includes('credito')) {
      const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
      let valor = 0;
      let cantidad = 1;
      
      if (numeros && numeros.length >= 2) {
        cantidad = parseNumberInternational(numeros[0]);
        valor = parseNumberInternational(numeros[numeros.length - 1]);
      } else if (numeros && numeros.length === 1) {
        valor = parseNumberInternational(numeros[0]);
      }
      
      const plazoMatch = texto.match(/plazo\s+(\d+)/i);
      const plazoDias = plazoMatch ? parseInt(plazoMatch[1]) : 30;
      
      let concepto = texto.replace(/^(registra:?|compra|credito|purchase|buy)/i, '').trim();
      concepto = concepto.replace(/\d+(?:[.,]\d+)*/g, '').trim();
      if (concepto.length > 50) concepto = concepto.substring(0, 50);
      
      const resultado = await registrarCompraCredito(texto, concepto, valor, cantidad, plazoDias);
      
      if (resultado.success) {
        return { tipo: 'registro', mensaje: `Compra registrada. Vence: ${resultado.fechaVencimiento}` };
      } else {
        return { tipo: 'error', mensaje: resultado.error };
      }
    }
    
    if (textoLower.includes('compra') || textoLower.includes('purchase') || textoLower.includes('buy')) {
      const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
      let valor = 0;
      let cantidad = 1;
      
      if (numeros && numeros.length >= 2) {
        cantidad = parseNumberInternational(numeros[0]);
        valor = parseNumberInternational(numeros[numeros.length - 1]);
      } else if (numeros && numeros.length === 1) {
        valor = parseNumberInternational(numeros[0]);
      }
      
      let concepto = texto.replace(/^(registra:?|compra|purchase|buy)/i, '').trim();
      concepto = concepto.replace(/\d+(?:[.,]\d+)*/g, '').trim();
      if (concepto.length > 50) concepto = concepto.substring(0, 50);
      
      // ✅ Guardar producto en catálogo
      await guardarProductoEnCatalogo(concepto, usuarioActual.uid);
      
      // Guardar datos pendientes para preguntar por vencimiento
      setProductoPendiente(concepto);
      setCantidadPendiente(cantidad);
      setValorPendiente(valor);
      setTextoComandoPendiente(texto);
      setMostrarModalVencimiento(true);
      
      return { tipo: 'pendiente', mensaje: '¿Deseas registrar fecha de vencimiento para este producto?' };
    }
    
    if (textoLower.includes('venta') || textoLower.includes('sale') ||
        textoLower.includes('vender') || textoLower.includes('sell')) {
      try {
        const matchCantidad = texto.match(/(\d+)\s+(?:unidades?|items?|piezas?)/i);
        const cantidad = matchCantidad ? parseInt(matchCantidad[1]) : 1;
        
        const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
        let valor = 0;
        if (numeros && numeros.length >= 1) {
          valor = parseNumberInternational(numeros[numeros.length - 1]);
        }
        
        let concepto = texto.replace(/^(venta|sale|vender|sell)/i, '').trim();
        concepto = concepto.replace(/\d+(?:[.,]\d+)*/g, '').replace(/por\s+\d+.*/i, '').trim();
        if (concepto.length > 50) concepto = concepto.substring(0, 50);
        
        validarStockDisponible(concepto, cantidad);
        
        await addDoc(registrosCollection, {
          texto: texto,
          concepto: concepto,
          valor: valor,
          tipo: 'ingreso',
          categoria: 'Venta',
          emoji: '💰',
          cantidad: cantidad,
          costoUnitario: valor / cantidad,
          fecha: serverTimestamp(),
          userId: usuarioActual.uid
        });
        
        const qInventario = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
        const snapshotInventario = await getDocs(qInventario);
        
        if (!snapshotInventario.empty) {
          const docInventario = snapshotInventario.docs[0];
          const dataActual = docInventario.data();
          const nuevaCantidad = dataActual.cantidad - cantidad;
          
          await updateDoc(doc(db, 'inventario', docInventario.id), {
            cantidad: nuevaCantidad,
            fechaActualizacion: serverTimestamp()
          });
        }
        
        return { tipo: 'venta', mensaje: `Venta registrada: ${cantidad}x ${concepto} por $${valor.toLocaleString()}` };
        
      } catch (err) {
        return { tipo: 'error', mensaje: err.message };
      }
    }
    
    return null;
  };

// ============================================================
// FUNCIÓN PARA GUARDAR PRODUCTO EN CATÁLOGO
// ============================================================
const guardarProductoEnCatalogo = async (nombreProducto, userId) => {
  if (!nombreProducto || !userId) return;
  
  try {
    const nombreNormalizado = nombreProducto.toLowerCase().trim();
    
    // Buscar si ya existe
    const q = query(
      collection(db, 'products'),
      where('userId', '==', userId),
      where('nombreNormalizado', '==', nombreNormalizado)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Producto nuevo: guardar en catálogo
      await addDoc(collection(db, 'products'), {
        nombre: nombreProducto,
        nombreNormalizado: nombreNormalizado,
        userId: userId,
        fechaCreacion: serverTimestamp(),
        ultimaActualizacion: serverTimestamp()
      });
      console.log(`✅ Producto "${nombreProducto}" agregado al catálogo`);
    }
  } catch (error) {
    console.error('Error guardando producto en catálogo:', error);
  }
};

  // ============================================================
  // FUNCIONES DE OCR
  // ============================================================
  const seleccionarImagenFactura = (fuentePago = 'negocio') => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFactura(file);
      await procesarOCRConImagen(file, fuentePago);
    }
  };
  input.click();
};

  const procesarOCRConImagen = async (imagenFile, fuentePago = 'negocio') => {
  if (!usuarioActual?.uid || !imagenFile) return;
  
  const verificacion = await verificarCreditosYVencimiento();
  if (!verificacion.valido) {
    if (verificacion.necesitaUpgrade) {
      setFuncionBloqueada('Escaneo de facturas');
      setModalUpgradeOpen(true);
    }
    setError(verificacion.mensaje);
    setTimeout(() => setError(null), 5000);
    return;
  }
  
  setProcesandoOCR(true);
  setValidationMessage(`Procesando OCR... ${verificacion.creditosDisponibles} escaneos restantes`);
  
  try {
    const resultado = await procesarEscaneoOCRReal(
      inputValue,
      imagenFile,
      db,
      registrosCollection,
      inventarioCollection,
      usuarioActual.uid,
      moneda.codigo,
      fuentePago  // ✅ NUEVO: Pasar fuente de pago
    );
    
    if (resultado.tipo === 'escaneo') {
      const creditosRestantes = await consumirCreditoOCR();
      setValidationMessage(`${resultado.mensaje}\nTe quedan ${creditosRestantes} escaneos.`);
      setTimeout(() => setValidationMessage(null), 8000);
    } else if (resultado.tipo === 'error') {
      setError(resultado.mensaje);
      setTimeout(() => setError(null), 5000);
    }
    
    setImagenFactura(null);
    setInputValue('');
  } catch (err) {
    console.error('Error procesando OCR:', err);
    setError('Error al procesar la imagen con OCR');
  } finally {
    setProcesandoOCR(false);
  }
};

  // ============================================================
  // BLINDAJE CONTRA NEGATIVOS (VALIDACIÓN DE STOCK)
  // ============================================================
  const validarStockDisponible = useCallback((producto, cantidadSolicitada) => {
    const itemInventario = inventario.find(i =>
      i.producto.toLowerCase().includes(producto.toLowerCase()) ||
      producto.toLowerCase().includes(i.producto.toLowerCase())
    );
    
    if (!itemInventario) {
      throw new Error(`🚨 Sargento Financiero: Producto "${producto}" NO EXISTE en inventario. Verifica el nombre.`);
    }
    
    if (itemInventario.cantidad < cantidadSolicitada) {
      throw new Error(
        `🚨 Sargento Financiero: STOCK INSUFICIENTE para "${producto}".\n` +
        `Solicitado: ${cantidadSolicitada} unidades | Disponible: ${itemInventario.cantidad} unidades\n` +
        `OPERACIÓN BLOQUEADA para evitar descuadre contable.`
      );
    }
    
    if (itemInventario.cantidad - cantidadSolicitada < 0) {
      throw new Error(
        `🚨 Sargento Financiero: OPERACIÓN RECHAZADA. El stock resultante sería NEGATIVO (${itemInventario.cantidad - cantidadSolicitada}).\n` +
        `Máximo permitido para venta: ${itemInventario.cantidad} unidades.`
      );
    }
    
    return true;
  }, [inventario]);

  // ============================================================
  // AUTENTICACIÓN: MONITOREO DE USUARIO
  // ============================================================
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!user.emailVerified) {
        await signOut(auth);
        setErrorAuth('Por favor verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada o spam.');
        setUsuarioActual(null);
        setCargandoAuth(false);
        return;
      }
      
      const userDoc = await getDocs(query(collection(db, 'usuarios'), where('uid', '==', user.uid)));
      
      if (!userDoc.empty) {
        const userDocId = userDoc.docs[0].id;
        const userData = userDoc.docs[0].data();
        
        if (userData.estado === 'pendiente_verificacion') {
          await updateDoc(doc(db, 'usuarios', userDocId), {
            estado: 'activo',
            emailVerificado: true,
            fechaVerificacion: serverTimestamp()
          });
          userData.estado = 'activo';
        }
        
        // ============================================================
        // 🚀 MIGRACIÓN AUTOMÁTICA - Usuarios existentes
        // ============================================================
        const updates = {};
        let necesitaUpdate = false;
        
        // 1. Agregar fecha de vencimiento si no existe (solo para plan gratis)
        if (!userData.fechaVencimiento && userData.plan === 'gratis') {
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
          updates.fechaVencimiento = fechaVencimiento;
          necesitaUpdate = true;
          console.log('📅 Migrando: fecha de vencimiento agregada');
        }
        
        // 2. Agregar créditos OCR si no existen
        if (userData.creditosOCR === undefined) {
          const planCreditos = {
            gratis: 3,
            pro: 30,
            business: 100,
            elite: 500
          };
          updates.creditosOCR = planCreditos[userData.plan] || 3;
          updates.creditosUsados = userData.creditosUsados || 0;
          necesitaUpdate = true;
          console.log('💰 Migrando: créditos OCR agregados');
        }
        
        // 3. Agregar versión de datos
        if (!userData.dataVersion) {
          updates.dataVersion = 2;
          necesitaUpdate = true;
        }
        
        // Aplicar migración si es necesario
        if (necesitaUpdate) {
          await updateDoc(doc(db, 'usuarios', userDocId), updates);
          console.log('✅ Usuario migrado automáticamente a versión 2');
          // Fusionar los cambios con userData para el estado actual
          Object.assign(userData, updates);
        }
        // ============================================================
        
        setUsuarioActual({
          uid: user.uid,
          email: user.email,
          escaneosRealizados: userData.escaneosRealizados || 0,
          mesEscaneos: userData.mesEscaneos || null,
          creditosOCR: userData.creditosOCR || 0,
          creditosUsados: userData.creditosUsados || 0,
          fechaVencimiento: userData.fechaVencimiento,
          fechaInicio: userData.fechaInicio,
          plan: userData.plan || 'gratis',
          whatsappNumber: userData.whatsappNumber || null,
          dataVersion: userData.dataVersion || 2,
          suscripcionActiva: userData.suscripcionActiva || false,
          vigencia: userData.vigencia || 0,
          ...userData
        });
        
        // ✅ EJECUTAR ALERTAS AUTOMÁTICAS AL INICIAR SESIÓN (USUARIO EXISTENTE)
        if (user.email) {
          programarAlertasDiarias(user.email).catch(console.error);
        }
        
      } else {
        // Usuario nuevo: crear con todos los campos correctos
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
        
        await addDoc(collection(db, 'usuarios'), {
          uid: user.uid,
          email: user.email,
          nombre: user.email.split('@')[0],
          plan: 'gratis',
          estado: 'activo',
          emailVerificado: true,
          escaneosRealizados: 0,
          mesEscaneos: null,
          creditosOCR: 3,
          creditosUsados: 0,
          fechaVencimiento: fechaVencimiento,
          fechaInicio: new Date(),
          fechaRegistro: serverTimestamp(),
          dataVersion: 2,
          suscripcionActiva: false,
          vigencia: 0
        });
        
        setUsuarioActual({
          uid: user.uid,
          email: user.email,
          plan: 'gratis',
          estado: 'activo',
          escaneosRealizados: 0,
          mesEscaneos: null,
          creditosOCR: 3,
          creditosUsados: 0,
          fechaVencimiento: fechaVencimiento,
          dataVersion: 2,
          suscripcionActiva: false,
          vigencia: 0
        });
        
        // ✅ EJECUTAR ALERTAS AUTOMÁTICAS AL INICIAR SESIÓN (USUARIO NUEVO)
        if (user.email) {
          programarAlertasDiarias(user.email).catch(console.error);
        }
      }
      setMostrarLogin(false);
    } else {
      setUsuarioActual(null);
      setMostrarLogin(true);
    }
    setCargandoAuth(false);
  });
  
  return () => unsubscribe();
}, []);

  // ============================================================
  // GEOLOCALIZACIÓN
  // ============================================================
  useEffect(() => {
    const detectarUbicacion = async () => {
      try {
        const respuesta = await fetch('https://ipapi.co/json/');
        const datos = await respuesta.json();
        
        if (datos.country_code !== 'CO') {
          setMoneda({
            simbolo: 'USD $',
            codigo: 'USD',
            tasa: 0.00025,
            mostrarCOP: false
          });
        } else {
          setMoneda({
            simbolo: '$',
            codigo: 'COP',
            tasa: 1,
            mostrarCOP: true
          });
        }
      } catch (error) {
        console.log("Error detectando ubicación, por defecto COP.");
        setMoneda({
          simbolo: '$',
          codigo: 'COP',
          tasa: 1,
          mostrarCOP: true
        });
      }
    };
    detectarUbicacion();
  }, []);

  // ============================================================
  // DÍA 4: DETECCIÓN DE VALORES ATÍPICOS
  // ============================================================
  const detectarValoresAtipicos = useCallback(() => {
    if (!usuarioActual?.uid || movimientos.length === 0) return [];
    if (!puedeAccederAFuncion('puedeVerAnomalias')) return [];
    
    const egresos = movimientos.filter(m => m.tipo === 'egreso' && m.userId === usuarioActual.uid);
    if (egresos.length === 0) return [];
    
    const valores = egresos.map(m => m.valor);
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const sumaCuadrados = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0);
    const desviacion = Math.sqrt(sumaCuadrados / valores.length);
    const umbral = media + (desviacion * 3);
    
    const atipicos = egresos
      .filter(m => m.valor > umbral && umbral > 0)
      .map(m => ({
        id: m.id,
        concepto: m.concepto,
        valor: m.valor,
        media: media,
        umbral: umbral,
        fecha: m.fecha
      }));
    
    return atipicos;
  }, [movimientos, usuarioActual, puedeAccederAFuncion]);

  const validarSaldoContable = useCallback(() => {
    if (!usuarioActual?.uid || movimientos.length === 0) return null;
    
    const saldoCalculado = movimientos.reduce((sum, m) => {
      if (m.tipo === 'ingreso') return sum + m.valor;
      return sum - m.valor;
    }, 0);
    
    const saldoKPIs = movimientos.reduce((sum, m) => {
      if (m.tipo === 'ingreso') return sum + m.valor;
      return sum - m.valor;
    }, 0);
    
    const diferencia = Math.abs(saldoCalculado - saldoKPIs);
    
    if (diferencia > 1000) {
      return {
        saldoCalculado: saldoCalculado,
        saldoKPIs: saldoKPIs,
        diferencia: diferencia,
        inconsistente: true
      };
    }
    
    return { saldoCalculado: saldoCalculado, saldoKPIs: saldoKPIs, diferencia: 0, inconsistente: false };
  }, [movimientos, usuarioActual]);

  const cargarLogsEliminaciones = useCallback(async () => {
    if (!usuarioActual?.uid) return;
    if (!puedeAccederAFuncion('puedeVerLogs')) return;
    
    try {
      const q = query(logsEliminacionesCollection, where('userId', '==', usuarioActual.uid), orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      const logs = [];
      snapshot.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLogsEliminaciones(logs);
    } catch (err) {
      console.error('Error cargando logs de eliminaciones:', err);
    }
  }, [usuarioActual, puedeAccederAFuncion]);

  const registrarEliminacionEnLog = async (registroEliminado) => {
    if (!usuarioActual?.uid) return;
    if (!puedeAccederAFuncion('puedeVerLogs')) return;
    
    try {
      await addDoc(logsEliminacionesCollection, {
        userId: usuarioActual.uid,
        userEmail: usuarioActual.email,
        registroId: registroEliminado.id,
        concepto: registroEliminado.concepto,
        valor: registroEliminado.valor,
        tipo: registroEliminado.tipo,
        fechaRegistroOriginal: registroEliminado.fecha,
        fechaEliminacion: serverTimestamp(),
        ip: 'client-side'
      });
      await cargarLogsEliminaciones();
    } catch (err) {
      console.error('Error registrando eliminación:', err);
    }
  };

  // ============================================================
  // CARGAR DATOS DESDE FIREBASE
  // ============================================================
  useEffect(() => {
    if (!usuarioActual?.uid) {
      setMovimientos([]);
      setInventario([]);
      setCuentasPorPagar([]);
      setIsLoading(false);
      return;
    }

    const fechaLimite = obtenerFechaLimiteHistorial();
    
    const q = query(
      registrosCollection,
      where('userId', '==', usuarioActual.uid),
      where('fecha', '>=', fechaLimite),
      orderBy('fecha', 'desc')
    );
    
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const registrosData = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          registrosData.push({
            id: docSnap.id,
            texto: data.texto || data.concepto || 'Sin concepto',
            concepto: data.concepto || data.texto || 'Sin concepto',
            categoria: data.categoria || 'Transacción',
            valor: data.valor || 0,
            tipo: data.tipo || (data.valor >= 0 ? 'ingreso' : 'egreso'),
            emoji: data.emoji || obtenerEmojiPorCategoria(data.categoria),
            recomendacion: data.recomendacion || '',
            cantidad: data.cantidad || 1,
            costoUnitario: data.costoUnitario || 0,
            fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(),
            rawFecha: data.fecha,
            valorNeto: data.valorNeto || 0,
            iva: data.iva || 0,
            proveedor: data.proveedor || '',
            nitProveedor: data.nitProveedor || '',
            numeroFactura: data.numeroFactura || '',
            fechaFactura: data.fechaFactura || '',
            userId: data.userId
          });
        });
        setMovimientos(registrosData);
        setIsLoading(false);
        setError(null);
        generarDictamenGeneral(registrosData);
      },
      (err) => {
        console.error('Error en onSnapshot:', err);
        setError('Error al cargar los registros. Verifica tu conexión a Internet.');
        setIsLoading(false);
      }
    );

    const qInventario = query(inventarioCollection, where('userId', '==', usuarioActual.uid));
    const unsubscribeInventario = onSnapshot(qInventario, (snapshot) => {
      const inventarioData = [];
      snapshot.forEach((docSnap) => {
        inventarioData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setInventario(inventarioData);
    });

    const qCuentas = query(cuentasPorPagarCollection, where('userId', '==', usuarioActual.uid));
    const unsubscribeCuentas = onSnapshot(qCuentas, (snapshot) => {
      const cuentasData = [];
      snapshot.forEach((docSnap) => {
        cuentasData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCuentasPorPagar(cuentasData);
    });

    return () => {
      unsubscribe();
      unsubscribeInventario();
      unsubscribeCuentas();
    };
  }, [usuarioActual, obtenerEmojiPorCategoria, generarDictamenGeneral, obtenerFechaLimiteHistorial]);

  // ============================================================
  // FUNCIONES DE AUTENTICACIÓN (CON PLAN 3 - 500 ESCANEOS)
  // ============================================================
 const handleRegistro = async (e) => {
  e.preventDefault();
  setErrorAuth('');
  
  if (!aceptaTerminos) {
    setErrorAuth('Debes aceptar los Términos y Condiciones para continuar.');
    return;
  }
  
  if (passwordLogin !== confirmPassword) {
    setErrorAuth(t.passwordsDontMatch);
    return;
  }
  
  const planData = {
    gratis: { creditosOCR: 3, duracionDias: 15 },
    starter: { creditosOCR: 10, duracionDias: 30 },
    pro: { creditosOCR: 30, duracionDias: 30 },
    business: { creditosOCR: 120, duracionDias: 30 },
    elite: { creditosOCR: 300, duracionDias: 30 }
  };
  
  const selectedPlan = planData[planSeleccionado];
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + selectedPlan.duracionDias);
  
  try {
    // 1. Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, emailLogin, passwordLogin);
    const user = userCredential.user;
    
    // 2. Enviar correo de verificación
    await sendEmailVerification(user);
    
    // 3. Refrescar token
    await user.getIdToken(true);
    
    // 4. Crear documento en Firestore (usando el UID como ID del documento)
    await setDoc(doc(db, 'usuarios', user.uid), {
      uid: user.uid,
      email: user.email,
      nombre: nombreRegistro || user.email.split('@')[0],
      plan: planSeleccionado,
      modalidad: planSeleccionado === 'gratis' ? null : modalidadSeleccionada,
      creditosOCR: selectedPlan.creditosOCR,
      creditosUsados: 0,
      // ✅ NUEVOS CAMPOS PARA SOPORTE IA
      creditosUsadosSoporte: 0,
      creditosExtraSoporte: 0,
      fechaVencimiento: fechaVencimiento,
      fechaInicio: new Date(),
      estado: 'pendiente_verificacion',
      emailVerificado: false,
      fechaRegistro: new Date(),
      fechaVerificacionEnviada: new Date().toISOString(),
      terminosAceptados: true,
      terminosAceptadosFecha: new Date(),
      terminosAceptadosIP: 'client-side',
      suscripcionActiva: false,
      vigencia: 0,
      deudaConDueño: 0,
      aportesPersonales: 0,
      saldoCaja: 0
    });
    
    setValidationMessage(`📧 Se ha enviado un correo de verificación a ${user.email}. Revisa tu bandeja de entrada o spam.`);
    setEmailLogin('');
    setPasswordLogin('');
    setConfirmPassword('');
    setNombreRegistro('');
    setAceptaTerminos(false);
    setEsRegistro(false);
    setTimeout(() => setValidationMessage(null), 10000);
    
  } catch (err) {
    console.error('Error en registro:', err);
    
    if (err.code === 'auth/email-already-in-use') {
      setErrorAuth('❌ Este correo electrónico ya está registrado. Por favor, inicia sesión o usa otro correo.');
    } else if (err.code === 'auth/weak-password') {
      setErrorAuth('❌ La contraseña es muy débil. Usa al menos 6 caracteres.');
    } else if (err.code === 'auth/invalid-email') {
      setErrorAuth('❌ El correo electrónico no es válido.');
    } else if (err.message && err.message.includes('permissions')) {
      setErrorAuth('⚠️ Error de permisos. Por favor, intenta de nuevo en unos minutos.');
    } else {
      setErrorAuth(`❌ Error: ${err.message}`);
    }
  }
};

  const handleLogin = async (e) => {
  e.preventDefault();
  setErrorAuth('');
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailLogin, passwordLogin);
    const user = userCredential.user;
    
    if (!user.emailVerified) {
      await signOut(auth);
      setErrorAuth('❌ Tu correo electrónico no ha sido verificado. Revisa tu bandeja de entrada o spam.');
      return;
    }
    
    setMostrarLogin(false);
    setEmailLogin('');
    setPasswordLogin('');
    
  } catch (err) {
    console.error('Error en login:', err);
    
    // ✅ Mensajes de error AMIGABLES
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      setErrorAuth('❌ Contraseña incorrecta. Por favor, inténtalo de nuevo.');
    } else if (err.code === 'auth/user-not-found') {
      setErrorAuth('❌ No existe una cuenta con este correo electrónico.');
    } else if (err.code === 'auth/too-many-requests') {
      setErrorAuth('❌ Demasiados intentos fallidos. Intenta más tarde.');
    } else if (err.code === 'auth/invalid-email') {
      setErrorAuth('❌ El correo electrónico no es válido.');
    } else if (err.code === 'auth/user-disabled') {
      setErrorAuth('❌ Esta cuenta ha sido deshabilitada. Contacta a soporte.');
    } else {
      setErrorAuth(`❌ Error al iniciar sesión: ${err.message}`);
    }
  }
};

  const reenviarVerificacion = async () => {
    if (!emailLogin) {
      setErrorAuth('Ingresa tu correo electrónico primero.');
      return;
    }
    
    setErrorAuth('');
    setValidationMessage('Enviando correo de verificación...');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailLogin, passwordLogin);
      const user = userCredential.user;
      
      if (user.emailVerified) {
        setValidationMessage('✅ Tu correo ya está verificado. Puedes iniciar sesión.');
        setTimeout(() => setValidationMessage(null), 3000);
        await signOut(auth);
        return;
      }
      
      await sendEmailVerification(user);
      setValidationMessage(`📧 Nuevo correo de verificación enviado a ${emailLogin}. Válido por 30 minutos.`);
      setTimeout(() => setValidationMessage(null), 8000);
      await signOut(auth);
      
    } catch (err) {
      console.error('Error reenviando verificación:', err);
      setErrorAuth('No se pudo reenviar el correo. Verifica que el email y contraseña sean correctos.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUsuarioActual(null);
      setMovimientos([]);
      setInventario([]);
      setCuentasPorPagar([]);
    } catch (err) {
      console.error('Error en logout:', err);
    }
  };

  // ============================================================
  // CIERRE MENSUAL AUTOMÁTICO
  // ============================================================
  useEffect(() => {
    if (!usuarioActual?.uid) return;
    
    const verificarYEnviarCierreMensual = async () => {
      const hoy = new Date();
      const esPrimerDia = hoy.getDate() === 1;
      const mesActual = hoy.getMonth();
      const añoActual = hoy.getFullYear();
      const clave = `ultimoEnvioReporte_${añoActual}_${mesActual}_${usuarioActual.uid}`;
      const yaEnviado = localStorage.getItem(clave);
      
      if (esPrimerDia && !yaEnviado && movimientos.length > 0) {
        setValidationMessage('🚀 Iniciando cierre mensual automático de STRATIUM AI...');
        await generarReportePDF(true);
        localStorage.setItem(clave, new Date().toISOString());
      }
    };
    
    verificarYEnviarCierreMensual();
    const intervalo = setInterval(verificarYEnviarCierreMensual, 3600000);
    return () => clearInterval(intervalo);
  }, [movimientos.length, generarReportePDF, usuarioActual]);

  // ============================================================
  // EFECTO PARA ACTUALIZAR VALORES ATÍPICOS
  // ============================================================
  useEffect(() => {
    if (movimientos.length > 0 && usuarioActual?.uid) {
      const atipicos = detectarValoresAtipicos();
      setValoresAtipicos(atipicos);
      
      const saldoValidacion = validarSaldoContable();
      setInconsistenciaSaldo(saldoValidacion);
      
      if (puedeAccederAFuncion('puedeVerLogs')) {
        cargarLogsEliminaciones();
      }
    }
  }, [movimientos, usuarioActual, detectarValoresAtipicos, validarSaldoContable, cargarLogsEliminaciones, puedeAccederAFuncion]);

  // ============================================================
  // MÓDULO DE PRODUCCIÓN
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
    const margenUnitario = precioVenta - costoTotal;
    const margenPorcentaje = costoTotal > 0 ? (margenUnitario / costoTotal) * 100 : 0;
    const margenPorHora = horas > 0 ? margenUnitario / horas : 0;
    
    setCosteoResultado({
      costoUnitario: costoTotal,
      costoMateriales: materiales,
      costoManoObra: costoManoObra,
      costoTransporte: transporte,
      margenUnitario: margenUnitario,
      margenPorcentaje: margenPorcentaje,
      margenPorHora: margenPorHora
    });
    
  } catch (err) {
    console.error('Error en cálculo de producción:', err);
    setError('Error al calcular producción.');
  } finally {
    setCalculandoProduccion(false);
  }
}, [produccion]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (produccion.materiales || produccion.horas || produccion.valorHora || produccion.transporte) {
        calcularProduccion();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [produccion, calcularProduccion]);

  const esProduccionRentable = useCallback(() => {
    if (!costeoResultado || !produccion.precioVenta) return true;
    const precioVenta = parseFloat(produccion.precioVenta);
    return costeoResultado.costoUnitario <= precioVenta;
  }, [costeoResultado, produccion.precioVenta]);

  // ============================================================
  // MANEJO DE ARCHIVOS
  // ============================================================
  const handleFileUpload = async (e) => {
    if (!usuarioActual?.uid) {
      setError('Debes iniciar sesión para subir archivos');
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;
    
    setSubiendoArchivo(true);
    setError(null);
    
    try {
      const storageRef = ref(storage, `documentos/${usuarioActual.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'documentos'), {
        nombre: file.name,
        url: url,
        tipo: file.type,
        fecha: serverTimestamp(),
        userId: usuarioActual.uid
      });
      
      alert(`Documento "${file.name}" subido correctamente`);
      
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setError('Error al subir el archivo. Intenta nuevamente.');
    } finally {
      setSubiendoArchivo(false);
      e.target.value = null;
    }
  };

  // ============================================================
  // MANEJAR ENVÍO DEL INPUT MÁGICO
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    try {
      const texto = inputValue.trim();
      
      const comandoResultado = await procesarComando(texto);
      
      if (comandoResultado) {
        if (comandoResultado.tipo === 'pendiente') {
          setValidationMessage(comandoResultado.mensaje);
          setTimeout(() => setValidationMessage(null), 5000);
        } else if (comandoResultado.tipo === 'escaneo') {
          setValidationMessage(comandoResultado.mensaje);
          setTimeout(() => setValidationMessage(null), 5000);
        } else if (comandoResultado.tipo === 'reporte') {
          setValidationMessage(comandoResultado.mensaje);
          setTimeout(() => setValidationMessage(null), 3000);
        } else if (comandoResultado.tipo === 'registro') {
          setValidationMessage(comandoResultado.mensaje);
          setTimeout(() => setValidationMessage(null), 5000);
        } else if (comandoResultado.tipo === 'venta') {
          setValidationMessage(comandoResultado.mensaje);
          setTimeout(() => setValidationMessage(null), 5000);
        } else if (comandoResultado.tipo === 'error') {
          setError(comandoResultado.mensaje);
          setTimeout(() => setError(null), 5000);
        }
        setInputValue('');
        return;
      }
      
      const numerosEncontrados = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
      let valorExtraido = 0;
      
      if (numerosEncontrados) {
        for (let numStr of numerosEncontrados) {
          const num = parseNumberInternational(numStr);
          if (!isNaN(num) && num > 0) {
            valorExtraido = num;
            break;
          }
        }
      }
      
      const saldoActual = movimientos.reduce((sum, m) => {
        if (m.tipo === 'ingreso') return sum + m.valor;
        return sum - m.valor;
      }, 0);
      
      const auditoria = auditarOperacion(texto, valorExtraido, { saldoCaja: saldoActual }, idioma);
      
      if (!auditoria.validado) {
        setValidationMessage(auditoria.mensajeValidacion);
        setTimeout(() => setValidationMessage(null), 5000);
        return;
      }
      
      if (auditoria.tipo === 'ingreso' && auditoria.concepto) {
        try {
          validarStockDisponible(auditoria.concepto, auditoria.cantidad || 1);
        } catch (err) {
          setError(err.message);
          setTimeout(() => setError(null), 5000);
          return;
        }
      }
      
      await addDoc(registrosCollection, {
        texto: texto,
        concepto: auditoria.concepto,
        valor: auditoria.valor,
        tipo: auditoria.tipo,
        categoria: auditoria.categoria,
        emoji: auditoria.emoji,
        recomendacion: auditoria.recomendacion,
        dictamen: auditoria.mensajeValidacion,
        cantidad: auditoria.cantidad || 1,
        costoUnitario: auditoria.valor,
        fecha: serverTimestamp(),
        userId: usuarioActual.uid
      });
      
      setInputValue('');
      setValidationMessage(null);
      
    } catch (err) {
      console.error('Error al guardar registro:', err);
      setError('Error al procesar tu comando. Intenta nuevamente.');
    }
  };

    // ============================================================
  // MODAL DE FECHA DE VENCIMIENTO
  // ============================================================
  const ModalFechaVencimiento = ({ isOpen, onClose, onGuardar, onSaltar, producto }) => {
    const [fechaTemp, setFechaTemp] = useState('');
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-blue-900/30 shadow-2xl">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="text-xl font-bold text-white">{t.preguntarVencimiento}</h3>
            <p className="text-gray-400 text-sm mt-1">
              {t.producto}: <strong className="text-cyan-400">{producto}</strong>
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">{t.fechaVencimiento}</label>
            <input
              type="date"
              value={fechaTemp}
              onChange={(e) => setFechaTemp(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-gray-500 text-xs mt-1">Dejar vacío si no aplica</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => onGuardar(fechaTemp || null)}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 rounded-lg transition-all"
            >
              {t.guardarConVencimiento}
            </button>
            <button
              onClick={onSaltar}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all"
            >
              {t.saltarVencimiento}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ANÁLISIS DE SALUD FINANCIERA
  // ============================================================
  const analisisSalud = useMemo(() => {
  if (movimientos.length === 0) return null;
  const movimientosFormateados = movimientos.map(m => ({
    ...m,
    tipo: m.tipo === 'ingreso' ? 'INGRESO' : 'EGRESO',
    valor: m.valor || 0
  }));
  return analizarSaludFinanciera(movimientosFormateados, inventario, {}, idioma);
}, [movimientos, inventario, idioma]);

// ============================================================
// KPIs
// ============================================================
const ventasTotales = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
const gastosTotales = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
const utilidadEstimada = ventasTotales - gastosTotales;
let margen = 0;
if (ventasTotales > 0) {
  margen = parseFloat(((utilidadEstimada / ventasTotales) * 100).toFixed(1));
}
const saldoCaja = movimientos.reduce((sum, m) => {
  if (m.tipo === 'ingreso') return sum + m.valor;
  return sum - m.valor;
}, 0);

// ✅ NUEVAS MÉTRICAS PARA EL GRÁFICO
const comprasTotales = movimientos
  .filter(m => m.tipo === 'egreso' && m.categoria === 'INVENTARIO')
  .reduce((sum, m) => sum + m.valor, 0);
  
const capitalInyectado = usuarioActual?.aportesPersonales || 0;

const datosGrafico = [
  { nombre: 'Ventas', valor: ventasTotales, color: '#10b981' },
  { nombre: 'Gastos', valor: gastosTotales, color: '#ef4444' },
  { nombre: 'Compras', valor: comprasTotales, color: '#f59e0b' },
  { nombre: 'Capital', valor: capitalInyectado, color: '#8b5cf6' },
  { nombre: 'Utilidad', valor: utilidadEstimada, color: utilidadEstimada >= 0 ? '#06b6d4' : '#f97316' }
];

// ✅ RESUMEN FINANCIERO PARA EL SUPPORTBOT (ANÁLISIS DE SALUD)
// ✅ CORREGIDO: cuentasPorPagar → cuentasPorCobrar
const resumenFinanciero = {
  ventas: ventasTotales,
  gastos: gastosTotales,
  pauta: gastosTotales * 0.15,
  devoluciones: 0,
  cuentasPorCobrar: cuentasPorCobrar?.reduce((sum, c) => sum + (c.valor || 0), 0) || 0,
  movimientos: movimientos,
  inventario: inventario,
  capitalInyectado: capitalInyectado
};

// ============================================================
// COMPARACIÓN MES A MES
// ============================================================
const calcularVariacionMensual = useCallback(() => {
  if (!puedeAccederAFuncion('puedeVerComparacionMensual')) {
    return {
      ventas: { actual: 0, anterior: 0, variacion: 0 },
      gastos: { actual: 0, anterior: 0, variacion: 0 },
      utilidad: { actual: 0, anterior: 0, variacion: 0 }
    };
  }
  
  const hoy = new Date();
  const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const primerDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  const fechaLimite = obtenerFechaLimiteHistorial();
  
  const mesActual = movimientos.filter(m => {
    if (!m.fecha || m.userId !== usuarioActual?.uid) return false;
    const fechaMov = new Date(m.fecha);
    return fechaMov >= primerDiaMesActual && fechaMov <= hoy && fechaMov >= fechaLimite;
  });
  
  const mesAnterior = movimientos.filter(m => {
    if (!m.fecha || m.userId !== usuarioActual?.uid) return false;
    const fechaMov = new Date(m.fecha);
    return fechaMov >= primerDiaMesAnterior && fechaMov <= ultimoDiaMesAnterior && fechaMov >= fechaLimite;
  });
  
  const ventasActual = mesActual.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
  const gastosActual = mesActual.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const utilidadActual = ventasActual - gastosActual;
  
  const ventasAnterior = mesAnterior.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.valor, 0);
  const gastosAnterior = mesAnterior.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.valor, 0);
  const utilidadAnterior = ventasAnterior - gastosAnterior;
  
  const variacionVentas = ventasAnterior > 0 ? ((ventasActual - ventasAnterior) / ventasAnterior) * 100 : 0;
  const variacionGastos = gastosAnterior > 0 ? ((gastosActual - gastosAnterior) / gastosAnterior) * 100 : 0;
  const variacionUtilidad = utilidadAnterior > 0 ? ((utilidadActual - utilidadAnterior) / utilidadAnterior) * 100 : 0;
  
  return {
    ventas: { actual: ventasActual, anterior: ventasAnterior, variacion: variacionVentas },
    gastos: { actual: gastosActual, anterior: gastosAnterior, variacion: variacionGastos },
    utilidad: { actual: utilidadActual, anterior: utilidadAnterior, variacion: variacionUtilidad }
  };
}, [movimientos, usuarioActual, puedeAccederAFuncion, obtenerFechaLimiteHistorial]);

const variaciones = calcularVariacionMensual();

// ============================================================
// PUNTO DE EQUILIBRIO
// ============================================================
const calcularPuntoEquilibrio = useCallback(() => {
  if (!usuarioActual?.uid) return { costosFijos: 0, margenBruto: 0, puntoEquilibrio: 0, ventasActuales: 0, estaDebajo: false };
  if (!puedeAccederAFuncion('puedeVerPuntoEquilibrio')) {
    return { costosFijos: 0, margenBruto: 0, puntoEquilibrio: 0, ventasActuales: 0, estaDebajo: false };
  }
  
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fechaLimite = obtenerFechaLimiteHistorial();
  
  const movimientosMes = movimientos.filter(m => {
    if (!m.fecha || m.userId !== usuarioActual.uid) return false;
    const fechaMov = new Date(m.fecha);
    return fechaMov >= primerDiaMes && fechaMov <= hoy && fechaMov >= fechaLimite;
  });
  
  const categoriasFijas = ['GASTO_FIJO', 'Nómina', 'Servicios', 'Arriendo'];
  const costosFijos = movimientosMes
    .filter(m => m.tipo === 'egreso' && (categoriasFijas.includes(m.categoria) || m.categoria === 'Gasto Fijo'))
    .reduce((sum, m) => sum + m.valor, 0);
  
  const gastosTotalesMes = movimientosMes
    .filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.valor, 0);
  const costosFijosReales = costosFijos > 0 ? costosFijos : gastosTotalesMes * 0.3;
  
  const ventasMes = movimientosMes
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.valor, 0);
  const utilidadMes = ventasMes - gastosTotalesMes;
  const margenBruto = ventasMes > 0 ? (utilidadMes / ventasMes) * 100 : 0;
  
  let puntoEquilibrio = 0;
  if (margenBruto > 0) {
    puntoEquilibrio = costosFijosReales / (margenBruto / 100);
  }
  
  return {
    costosFijos: costosFijosReales,
    margenBruto: margenBruto,
    puntoEquilibrio: puntoEquilibrio,
    ventasActuales: ventasMes,
    estaDebajo: ventasMes > 0 && puntoEquilibrio > 0 && ventasMes < puntoEquilibrio
  };
}, [movimientos, usuarioActual, puedeAccederAFuncion, obtenerFechaLimiteHistorial]);

const puntoEquilibrio = calcularPuntoEquilibrio();

  // ============================================================
  // ROTACIÓN DE INVENTARIO
  // ============================================================
  const calcularRotacionInventario = useCallback(() => {
    if (!usuarioActual?.uid) return { rotacion: 0, diasInventario: 0, costoVentas: 0, inventarioPromedio: 0, tieneDatos: false };
    if (!puedeAccederAFuncion('puedeVerRotacionInventario')) {
      return { rotacion: 0, diasInventario: 0, costoVentas: 0, inventarioPromedio: 0, tieneDatos: false };
    }
    
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaLimite = obtenerFechaLimiteHistorial();
    
    const movimientosMes = movimientos.filter(m => {
      if (!m.fecha || m.userId !== usuarioActual.uid) return false;
      const fechaMov = new Date(m.fecha);
      return fechaMov >= primerDiaMes && fechaMov <= hoy && fechaMov >= fechaLimite;
    });
    
    const costoVentas = movimientosMes
      .filter(m => m.tipo === 'ingreso' && m.costoUnitario && m.cantidad)
      .reduce((sum, m) => sum + (m.costoUnitario * (m.cantidad || 1)), 0);
    
    let inventarioPromedio = 0;
    if (inventario.length > 0) {
      const valorInventario = inventario.reduce((sum, item) => sum + (item.costoUnitario * item.cantidad), 0);
      inventarioPromedio = valorInventario;
    }
    
    let rotacion = 0;
    let diasInventario = 0;
    if (inventarioPromedio > 0 && costoVentas > 0) {
      rotacion = costoVentas / inventarioPromedio;
      diasInventario = rotacion > 0 ? 30 / rotacion : 0;
    }
    
    return {
      rotacion: rotacion.toFixed(2),
      diasInventario: Math.round(diasInventario),
      costoVentas: costoVentas,
      inventarioPromedio: inventarioPromedio,
      tieneDatos: inventario.length > 0 && costoVentas > 0
    };
  }, [movimientos, inventario, usuarioActual, puedeAccederAFuncion, obtenerFechaLimiteHistorial]);

  const rotacionInventario = calcularRotacionInventario();

  // ============================================================
  // DETECCIÓN DE ANOMALÍAS
  // ============================================================
   const detectarAnomaliasProductos = useCallback(() => {
    if (!usuarioActual?.uid) return [];
    if (!puedeAccederAFuncion('puedeVerAnomalias')) return [];
    
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const primerDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const fechaLimite = obtenerFechaLimiteHistorial();
    
    const ventasActual = movimientos.filter(m => {
      if (!m.fecha || m.tipo !== 'ingreso' || m.userId !== usuarioActual.uid) return false;
      const fechaMov = new Date(m.fecha);
      return fechaMov >= primerDiaMesActual && fechaMov <= hoy && fechaMov >= fechaLimite;
    });
    
    const ventasAnterior = movimientos.filter(m => {
      if (!m.fecha || m.tipo !== 'ingreso' || m.userId !== usuarioActual.uid) return false;
      const fechaMov = new Date(m.fecha);
      return fechaMov >= primerDiaMesAnterior && fechaMov <= ultimoDiaMesAnterior && fechaMov >= fechaLimite;
    });
    
    const margenesActual = {};
    ventasActual.forEach(v => {
      const producto = v.concepto;
      const ingreso = v.valor;
      const costo = (v.costoUnitario || 0) * (v.cantidad || 1);
      const margen = ingreso > 0 ? ((ingreso - costo) / ingreso) * 100 : 0;
      if (!margenesActual[producto]) {
        margenesActual[producto] = { totalIngreso: 0, totalCosto: 0, margen: 0, cantidad: 0 };
      }
      margenesActual[producto].totalIngreso += ingreso;
      margenesActual[producto].totalCosto += costo;
      margenesActual[producto].cantidad += v.cantidad || 1;
    });
    
    Object.keys(margenesActual).forEach(producto => {
      const data = margenesActual[producto];
      data.margen = data.totalIngreso > 0 ? ((data.totalIngreso - data.totalCosto) / data.totalIngreso) * 100 : 0;
    });
    
    const margenesAnterior = {};
    ventasAnterior.forEach(v => {
      const producto = v.concepto;
      const ingreso = v.valor;
      const costo = (v.costoUnitario || 0) * (v.cantidad || 1);
      const margen = ingreso > 0 ? ((ingreso - costo) / ingreso) * 100 : 0;
      if (!margenesAnterior[producto]) {
        margenesAnterior[producto] = { totalIngreso: 0, totalCosto: 0, margen: 0, cantidad: 0 };
      }
      margenesAnterior[producto].totalIngreso += ingreso;
      margenesAnterior[producto].totalCosto += costo;
      margenesAnterior[producto].cantidad += v.cantidad || 1;
    });
    
    Object.keys(margenesAnterior).forEach(producto => {
      const data = margenesAnterior[producto];
      data.margen = data.totalIngreso > 0 ? ((data.totalIngreso - data.totalCosto) / data.totalIngreso) * 100 : 0;
    });
    
    const anomalias = [];
    Object.keys(margenesActual).forEach(producto => {
      if (margenesAnterior[producto]) {
        const margenActual = margenesActual[producto].margen;
        const margenAnterior = margenesAnterior[producto].margen;
        const caida = margenAnterior - margenActual;
        if (caida > 10 && margenAnterior > 0) {
          anomalias.push({
            producto: producto,
            margenAnterior: margenAnterior.toFixed(1),
            margenActual: margenActual.toFixed(1),
            caida: caida.toFixed(1),
            tipo: 'MARGEN_CAIDA'
          });
        }
      }
    });
    
    return anomalias;
  }, [movimientos, usuarioActual, puedeAccederAFuncion, obtenerFechaLimiteHistorial]);

  const anomaliasProductos = detectarAnomaliasProductos();

  // ============================================================
  // 🚀 NUEVO: AUDITORÍA DE SOBRECOSTOS DE PROVEEDORES (Business/Elite)
  // ============================================================
  const [sobrecostosProveedores, setSobrecostosProveedores] = useState([]);
  const [ahorroPotencial, setAhorroPotencial] = useState(0);

   // ============================================================
  // 🚀 NUEVO: AUDITORÍA DE SOBRECOSTOS DE PROVEEDORES (Business/Elite)
  // ============================================================
  useEffect(() => {
    if (!usuarioActual?.uid) return;
    
    // Solo ejecutar para Business y Elite
    if (usuarioActual.plan !== 'business' && usuarioActual.plan !== 'elite') {
      setSobrecostosProveedores([]);
      setAhorroPotencial(0);
      return;
    }
    
    // Verificar que la función esté disponible (desde logicEngine)
    if (typeof auditarSobrecostosProveedores !== 'function') return;
    
    const resultado = auditarSobrecostosProveedores(movimientos, inventario, usuarioActual.plan, idioma);
    setSobrecostosProveedores(resultado.sobrecostos || []);
    setAhorroPotencial(resultado.ahorroPotencial || 0);
    
    // Si hay sobrecostos, mostrar mensaje de validación
    if (resultado.sobrecostos && resultado.sobrecostos.length > 0) {
      setValidationMessage(resultado.mensajeResumen);
      setTimeout(() => setValidationMessage(null), 8000);
    }
  }, [movimientos, inventario, usuarioActual?.plan, usuarioActual?.uid, idioma]);

  // ============================================================
  // ONBOARDING - Verificar si el usuario necesita completar onboarding
  // ============================================================
  useEffect(() => {
  if (usuarioActual && usuarioActual.onboardingCompletado !== true) {
    setMostrarOnboarding(true);
  } else {
    setMostrarOnboarding(false);
  }
}, [usuarioActual]);

  // ============================================================
  // MANEJAR GUARDADO CON VENCIMIENTO
  // ============================================================
  const handleGuardarConVencimiento = async (fechaVenc) => {
    if (productoPendiente && cantidadPendiente && valorPendiente) {
      await registrarCompraConVencimiento(
        textoComandoPendiente,
        productoPendiente,
        valorPendiente,
        cantidadPendiente,
        fechaVenc
      );
      setValidationMessage(`✅ Compra registrada: ${cantidadPendiente}x ${productoPendiente} por $${valorPendiente.toLocaleString()}${fechaVenc ? ` con vencimiento ${new Date(fechaVenc).toLocaleDateString('es-CO')}` : ''}`);
      setTimeout(() => setValidationMessage(null), 5000);
    }
    setMostrarModalVencimiento(false);
    setProductoPendiente(null);
    setCantidadPendiente(null);
    setValorPendiente(null);
    setTextoComandoPendiente(null);
    setFechaVencimiento('');
    setInputValue('');
  };

  const handleSaltarVencimiento = async () => {
    if (productoPendiente && cantidadPendiente && valorPendiente) {
      await registrarCompraConVencimiento(
        textoComandoPendiente,
        productoPendiente,
        valorPendiente,
        cantidadPendiente,
        null
      );
      setValidationMessage(`✅ Compra registrada: ${cantidadPendiente}x ${productoPendiente} por $${valorPendiente.toLocaleString()}`);
      setTimeout(() => setValidationMessage(null), 5000);
    }
    setMostrarModalVencimiento(false);
    setProductoPendiente(null);
    setCantidadPendiente(null);
    setValorPendiente(null);
    setTextoComandoPendiente(null);
    setFechaVencimiento('');
    setInputValue('');
  };

  // ============================================================
  // RENDERIZADO CONDICIONAL
  // ============================================================
  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">{t.loadingAuth}</div>
      </div>
    );
  }

  if (!usuarioActual) {
  return (
    <PantallaLogin
      t={t}
      idioma={idioma}
      onChangeIdioma={setIdioma}
      moneda={moneda}
      errorAuth={errorAuth}
      validationMessage={validationMessage}
      esRegistro={esRegistro}
      emailLogin={emailLogin}
      setEmailLogin={setEmailLogin}
      passwordLogin={passwordLogin}
      setPasswordLogin={setPasswordLogin}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      nombreRegistro={nombreRegistro}
      setNombreRegistro={setNombreRegistro}
      planSeleccionado={planSeleccionado}
      setPlanSeleccionado={setPlanSeleccionado}
      modalidadSeleccionada={modalidadSeleccionada}
      setModalidadSeleccionada={setModalidadSeleccionada}
      aceptaTerminos={aceptaTerminos}
      setAceptaTerminos={setAceptaTerminos}
      handleRegistro={handleRegistro}
      handleLogin={handleLogin}
      setEsRegistro={setEsRegistro}
      setErrorAuth={setErrorAuth}
      reenviarVerificacion={reenviarVerificacion}
      handleResetPassword={handleResetPassword}
    />
  );
}

  // Dashboard principal
  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
      <header className="py-6 px-4 border-b border-blue-900/30 sticky top-0 bg-[#0f172a]/95 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            {t.title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="es">🇪🇸 {t.español}</option>
              <option value="en">🇺🇸 {t.ingles}</option>
            </select>
            
            {/* Indicador de plan */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              usuarioActual?.plan === 'gratis' ? 'bg-gray-600/30 text-gray-400' :
              usuarioActual?.plan === 'pro' ? 'bg-cyan-500/20 text-cyan-400' :
              usuarioActual?.plan === 'business' ? 'bg-purple-500/20 text-purple-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {usuarioActual?.plan === 'gratis' ? 'Starter' :
               usuarioActual?.plan === 'pro' ? 'Plan 1' :
               usuarioActual?.plan === 'business' ? 'Plan 2' : 'Plan 3'}
            </div>
            
            {/* Indicador de créditos OCR */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              usuarioActual?.plan === 'elite' ? 'bg-yellow-500/20 text-yellow-400' :
              (usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0) > 0 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              📷 {usuarioActual?.plan === 'elite' 
                ? `${(usuarioActual?.creditosOCR || 500) - (usuarioActual?.creditosUsados || 0)}/${usuarioActual?.creditosOCR || 500}` 
                : `${(usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0)}/${usuarioActual?.creditosOCR || 0}`} escaneos
            </div>
            
            <div className="text-sm text-gray-400 hidden sm:block">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {usuarioActual.email}
              </span>
            </div>
            
            <button
  onClick={() => {
    if (puedeAccederAFuncion('puedeGenerarPDF')) {
      generarReportePDF(false);
    } else {
      generarReportePreview();
    }
  }}
  disabled={generandoReporte || movimientos.length === 0}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
    !puedeAccederAFuncion('puedeGenerarPDF')
      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
      : generandoReporte || movimientos.length === 0
      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
  }`}
>
  <span>📊</span>
  <span className="hidden sm:inline">{generandoReporte ? t.generando : t.reporte}</span>
</button>

<button
  onClick={() => setMostrarConfigModal(true)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-300"
>
  <span>⚙️</span>
  <span className="hidden sm:inline">Auditoría</span>
</button>

                      {/* Botón exportar CSV */}
            <button
              onClick={exportarACSV}
              disabled={movimientos.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                !puedeAccederAFuncion('puedeExportarExcel')
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  : movimientos.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
              }`}
            >
              <span>📎</span>
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            
            {/* Botón Adjuntar documento */}
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 ${subiendoArchivo ? 'opacity-50 cursor-wait' : ''}`}>
              <span>📎</span>
              <span className="hidden sm:inline">{subiendoArchivo ? t.adjuntando : t.adjuntar}</span>
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" disabled={subiendoArchivo} />
            </label>
            
            {/* Botón Escanear factura */}
            <button
              onClick={seleccionarImagenFactura}
              disabled={procesandoOCR}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
            >
              <span>{procesandoOCR ? '⏳' : '📷'}</span>
              <span className="hidden sm:inline">{procesandoOCR ? t.procesandoOCR : t.escanearFactura}</span>
            </button>
            
            {/* Botón Logs de eliminaciones (solo Business/Elite) */}
            {puedeAccederAFuncion('puedeVerLogs') && (
              <button
                onClick={() => setMostrarLogsEliminaciones(!mostrarLogsEliminaciones)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
              >
                <span>📋</span>
                <span className="hidden sm:inline">{t.verLogsEliminaciones}</span>
              </button>
            )}
            
            {/* Botón Cerrar Sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
            
            {/* Estado de conexión */}
            <div className="text-sm text-gray-400">
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                {isLoading ? t.conectar : t.enLinea}
              </span>
            </div>
          </div>
        </div>
      </header>

      <Toaster position="top-center" reverseOrder={false} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {usuarioActual?.suscripcionActiva === true || usuarioActual?.plan === 'gratis' || usuarioActual?.plan === 'starter' ? (
          <>
            {/* CONTENIDO ORIGINAL COMPLETO DEL DASHBOARD */}
            
            {error && (
              <div className={`mb-6 p-4 rounded-xl text-sm ${
                error.includes('NO RENTABLE') || error.includes('excede') || error.includes('Sargento Financiero') || error.includes('OPERACIÓN BLOQUEADA')
                  ? 'bg-red-900/50 border border-red-500/50 text-red-300'
                  : 'bg-red-900/20 border border-red-500/30 text-red-400'
              }`}>
                {error}
              </div>
            )}
            
            {validationMessage && (
              <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                {validationMessage}
              </div>
            )}

            {/* Alertas de valores atípicos */}
            {puedeAccederAFuncion('puedeVerAnomalias') && valoresAtipicos.length > 0 && (
              <div className="mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-xl">
                <h4 className="text-orange-400 font-bold mb-2">{t.alertaValorAtipico}</h4>
                {valoresAtipicos.slice(0, 3).map((atipico, idx) => (
                  <div key={idx} className="text-sm text-orange-200 mb-1">
                    {atipico.concepto}: {formatearValor(atipico.valor)} - {t.alertaValorAtipicoDesc}
                  </div>
                ))}
              </div>
            )}

            {/* Alerta de inconsistencia de saldo */}
            {inconsistenciaSaldo?.inconsistente && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                <h4 className="text-red-400 font-bold mb-2">{t.alertaInconsistenciaSaldo}</h4>
                <p className="text-sm text-red-200">{t.alertaInconsistenciaSaldoDesc}</p>
                <p className="text-xs text-red-300 mt-2">Diferencia: {formatearValor(inconsistenciaSaldo.diferencia)}</p>
              </div>
            )}

            {/* Modal de logs de eliminaciones */}
            {mostrarLogsEliminaciones && (
              <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setMostrarLogsEliminaciones(false)}>
                <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{t.verLogsEliminaciones}</h3>
                    <button onClick={() => setMostrarLogsEliminaciones(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                  </div>
                  {logsEliminaciones.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No hay registros de eliminaciones</p>
                  ) : (
                    <div className="space-y-3">
                      {logsEliminaciones.map((log) => (
                        <div key={log.id} className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-red-400 text-sm font-bold">Eliminado: {log.concepto}</p>
                          <p className="text-gray-400 text-xs">Valor: {formatearValor(log.valor)}</p>
                          <p className="text-gray-500 text-xs">Fecha original: {log.fechaRegistroOriginal ? new Date(log.fechaRegistroOriginal).toLocaleDateString('es-CO') : 'N/A'}</p>
                          <p className="text-gray-500 text-xs">Eliminado por: {log.userEmail}</p>
                          <p className="text-gray-500 text-xs">Fecha eliminación: {log.fechaEliminacion?.toDate ? new Date(log.fechaEliminacion.toDate()).toLocaleString('es-CO') : 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t.ventas}</p>
                      <TooltipIcon text={t.tooltipVentas} />
                    </div>
                    <p className="text-2xl font-bold mt-1 text-emerald-400">{formatearValor(ventasTotales)}</p>
                    {puedeAccederAFuncion('puedeVerComparacionMensual') && variaciones && (
                      <p className={`text-xs mt-1 ${variaciones.ventas.variacion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {variaciones.ventas.variacion >= 0 ? '↑' : '↓'} {Math.abs(variaciones.ventas.variacion).toFixed(1)}% {t.variacionVentas}
                      </p>
                    )}
                    {!puedeAccederAFuncion('puedeVerComparacionMensual') && (
                      <p className="text-xs mt-1 text-gray-500 cursor-pointer hover:text-cyan-400" onClick={() => { setFuncionBloqueada('Comparación mensual'); setModalUpgradeOpen(true); }}>
                        🔒 Actualiza para ver comparación
                      </p>
                    )}
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">💰</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Período actual</span>
                  <span className="text-xs font-medium text-emerald-400">+12%</span>
                </div>
              </div>
              
              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t.utilidad}</p>
                      <TooltipIcon text={t.tooltipUtilidad} />
                    </div>
                    <p className={`text-2xl font-bold mt-1 ${utilidadEstimada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatearValor(utilidadEstimada)}</p>
                    {puedeAccederAFuncion('puedeVerComparacionMensual') && variaciones && (
                      <p className={`text-xs mt-1 ${variaciones.utilidad.variacion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {variaciones.utilidad.variacion >= 0 ? '↑' : '↓'} {Math.abs(variaciones.utilidad.variacion).toFixed(1)}% {t.variacionVentas}
                      </p>
                    )}
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">📈</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Neto del período</span>
                  <span className={`text-xs font-medium ${utilidadEstimada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{utilidadEstimada >= 0 ? '+' : '-'}{Math.abs(utilidadEstimada / ventasTotales * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t.margen}</p>
                      <TooltipIcon text={t.tooltipMargen} />
                    </div>
                    <p className="text-2xl font-bold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">{margen}%</p>
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">📊</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Sobre ventas</span>
                  <span className="text-xs font-medium text-cyan-400">+2.1pp</span>
                </div>
              </div>

              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t.saldo}</p>
                      <TooltipIcon text={t.tooltipSaldo} />
                    </div>
                    <p className={`text-2xl font-bold mt-1 ${saldoCaja >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatearValor(saldoCaja)}</p>
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">💵</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Saldo histórico</span>
                  <span className={`text-xs font-medium ${saldoCaja >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{saldoCaja >= 0 ? 'Positivo' : 'Negativo'}</span>
                </div>
              </div>
            </div>

                                   {/* SECCIÓN MI PLAN - VERSIÓN REDUCIDA Y COMPACTA */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-4 mb-6 border border-blue-500/30">
              <div className="flex flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🎯</span> {t.miPlanActual || 'Mi Plan Actual'}
                  </h3>
                  <p className="text-gray-400 text-xs">{t.gestionaSuscripcion || 'Gestiona tu suscripción'}</p>
                </div>
                <button
                  onClick={() => setModalUpgradeOpen(true)}
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 font-medium transition-all text-xs"
                >
                  {t.cambiarPlan || 'Cambiar Plan'}
                </button>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-[10px] uppercase">{t.plan || 'Plan'}</p>
                  <p className="text-sm font-bold text-white">
                    {usuarioActual?.plan === 'gratis' ? 'Starter' :
                     usuarioActual?.plan === 'pro' ? 'Pro' :
                     usuarioActual?.plan === 'business' ? 'Business' : 'Elite'}
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-[10px] uppercase">{t.escaneos || 'Escaneos'}</p>
                  <p className="text-sm font-bold text-white">
                    {usuarioActual?.plan === 'elite' 
                      ? `${(usuarioActual?.creditosOCR || 300) - (usuarioActual?.creditosUsados || 0)}/${usuarioActual?.creditosOCR || 300}`
                      : `${(usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0)}/${usuarioActual?.creditosOCR || 0}`}
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-[10px] uppercase">{t.dias || 'Días'}</p>
                  <p className="text-sm font-bold text-white">
                    {(() => {
                      if (!usuarioActual?.fechaVencimiento) return '∞';
                      const fechaVenc = usuarioActual.fechaVencimiento?.toDate ? 
                        usuarioActual.fechaVencimiento.toDate() : new Date(usuarioActual.fechaVencimiento);
                      const diasRestantes = Math.ceil((fechaVenc - new Date()) / (1000 * 60 * 60 * 24));
                      if (diasRestantes <= 0) return '0';
                      return diasRestantes;
                    })()}
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-2 text-center col-span-2">
                  <p className="text-gray-400 text-[10px] uppercase">{t.capitalInyectado || 'Capital Inyectado'}</p>
                  <p className={`text-sm font-bold ${(usuarioActual?.deudaConDueño || 0) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {formatearValor(usuarioActual?.deudaConDueño || 0)}
                  </p>
                </div>
              </div>
            </div>

                        {/* PANEL DE ADMINISTRACIÓN */}
            {/* <AdminPanel usuarioActual={usuarioActual} /> */}

            {/* PANEL DEL SARGENTO FINANCIERO */}
            {analisisSalud && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-900/20 shadow-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <span className="text-2xl">🌡️</span> {t.salud}
                    </h3>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${analisisSalud.saludColor}33`, color: analisisSalud.saludColor }}
                    >
                      {analisisSalud.saludMensaje}
                    </span>
                  </div>

                  <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div
                      className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${analisisSalud.saludPorcentaje}%`,
                        backgroundColor: analisisSalud.saludColor,
                        boxShadow: `0 0 20px ${analisisSalud.saludColor}66`
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5">
                      <p className="text-gray-400 text-xs uppercase mb-1">{t.oxigeno}</p>
                      <p className={`text-2xl font-black ${analisisSalud.diasOxigeno < 15 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {analisisSalud.diasOxigeno === 999 ? '∞' : analisisSalud.diasOxigeno} <span className="text-sm font-normal">días</span>
                      </p>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5">
                      <p className="text-gray-400 text-xs uppercase mb-1">Margen Neto</p>
                      <p className="text-2xl font-black text-blue-400">
                        {analisisSalud.margenNeto}%
                      </p>
                    </div>
                  </div>
                  
                  {puedeAccederAFuncion('puedeVerPuntoEquilibrio') && puntoEquilibrio && puntoEquilibrio.puntoEquilibrio > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-900/20">
                      <div className="bg-slate-800/40 p-3 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-gray-400 text-xs uppercase">{t.puntoEquilibrio}</p>
                          <TooltipIcon text={t.puntoEquilibrioDesc} />
                        </div>
                        <p className="text-lg font-bold text-cyan-400">
                          {formatearValor(puntoEquilibrio.puntoEquilibrio)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ventas actuales: {formatearValor(puntoEquilibrio.ventasActuales)}
                        </p>
                        {puntoEquilibrio.estaDebajo && (
                          <p className="text-xs text-red-400 mt-2 font-medium">
                            {t.alertaPuntoEquilibrio}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {puedeAccederAFuncion('puedeVerRotacionInventario') && rotacionInventario && rotacionInventario.tieneDatos && (
                    <div className="mt-4 pt-4 border-t border-blue-900/20">
                      <div className="bg-slate-800/40 p-3 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-gray-400 text-xs uppercase">Rotación de Inventario</p>
                          <TooltipIcon text="Días que tarda en venderse el inventario promedio. A menor número, mejor rotación." />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <p className="text-xs text-gray-500">Rotación (veces/mes)</p>
                            <p className="text-lg font-bold text-cyan-400">{rotacionInventario.rotacion}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Días de inventario</p>
                            <p className={`text-lg font-bold ${rotacionInventario.diasInventario > 30 ? 'text-orange-400' : 'text-emerald-400'}`}>
                              {rotacionInventario.diasInventario} días
                            </p>
                          </div>
                        </div>
                        {rotacionInventario.diasInventario > 30 && (
                          <p className="text-xs text-orange-400 mt-2">
                            ⚠️ Inventario lento. Reduce compras de productos con baja rotación.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-900/20 shadow-lg">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-2xl">🚨</span> {t.alertas}
                  </h3>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    
                    {/* 🚀 NUEVO: ALERTAS DE SOBRECOSTOS DE PROVEEDORES (Business/Elite) */}
                    {(usuarioActual?.plan === 'business' || usuarioActual?.plan === 'elite') && sobrecostosProveedores.length > 0 && (
                      <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                          <span className="text-xl">⚠️</span> 
                          {idioma === 'es' ? 'Sobrecostos Detectados' : 'Overcosts Detected'}
                          {ahorroPotencial > 0 && (
                            <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded-full">
                              {idioma === 'es' ? `Ahorro potencial: ${formatearValor(ahorroPotencial)}` : `Potential savings: ${formatearValor(ahorroPotencial)}`}
                            </span>
                          )}
                        </h4>
                        {sobrecostosProveedores.slice(0, 5).map((alerta, idx) => (
                          <div key={idx} className="text-sm text-red-200 mb-2 border-b border-red-700/50 pb-2">
                            <p className="font-medium">{alerta.mensaje}</p>
                            {alerta.gravedad === 'ALTA' && (
                              <p className="text-xs text-red-300 mt-1">
                                {idioma === 'es' ? '🔴 Revisa esta factura URGENTE' : '🔴 Check this invoice URGENTLY'}
                              </p>
                            )}
                          </div>
                        ))}
                        {sobrecostosProveedores.length > 5 && (
                          <p className="text-xs text-red-300 mt-2">
                            {idioma === 'es' 
                              ? `... y ${sobrecostosProveedores.length - 5} más. Revisa el panel de auditoría.`
                              : `... and ${sobrecostosProveedores.length - 5} more. Check the audit panel.`}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {puedeAccederAFuncion('puedeVerPuntoEquilibrio') && puntoEquilibrio && puntoEquilibrio.estaDebajo && (
                      <div className="p-4 rounded-xl border-l-4 bg-orange-500/10 border-orange-500 text-orange-200">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">⚖️</span>
                          <div>
                            <p className="text-sm font-bold">Por debajo del punto de equilibrio</p>
                            <p className="text-xs">Necesitas vender {formatearValor(puntoEquilibrio.puntoEquilibrio - puntoEquilibrio.ventasActuales)} adicionales para cubrir costos fijos.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {puedeAccederAFuncion('puedeVerAnomalias') && anomaliasProductos && anomaliasProductos.length > 0 && anomaliasProductos.map((anomalia, idx) => (
                      <div key={`anomalia-${idx}`} className="p-4 rounded-xl border-l-4 bg-red-500/10 border-red-500 text-red-200">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">📉</span>
                          <div>
                            <p className="text-sm font-bold">Margen en caída: {anomalia.producto}</p>
                            <p className="text-xs">El margen bajó de {anomalia.margenAnterior}% a {anomalia.margenActual}% (caída de {anomalia.caida}%). Revisa costos o precio de venta.</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {analisisSalud.alertas?.length > 0 ? (
                      analisisSalud.alertas.slice(0, 5).map((alerta, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border-l-4 flex items-start gap-3 ${
                            alerta.urgencia === 'ALTA'
                              ? 'bg-red-500/10 border-red-500 text-red-200'
                              : 'bg-amber-500/10 border-amber-500 text-amber-200'
                          }`}
                        >
                          <span className="text-lg">
                            {alerta.tipo === 'PRODUCTO_HUESO' ? '🦴' : '⚠️'}
                          </span>
                          <p className="text-sm leading-tight font-medium">{alerta.mensaje}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 italic">
                        No hay alertas críticas. El negocio fluye según lo planeado.
                      </div>
                    )}

                    {analisisSalud.alertaQuiebra && (
                      <div className="p-4 rounded-xl border-l-4 bg-red-900/30 border-red-600 text-red-100 animate-pulse">
                        <p className="font-bold mb-1">🔥 {analisisSalud.alertaQuiebra.tipo}</p>
                        <p className="text-xs">{analisisSalud.alertaQuiebra.mensaje}</p>
                        <p className="text-xs mt-2 font-black uppercase italic">Acción: {analisisSalud.alertaQuiebra.recomendacion}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Recomendaciones Estratégicas */}
            {analisisSalud && analisisSalud.recomendaciones?.length > 0 && (
              <section className="mb-12 bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-300">
                  <span className="text-xl">💡</span> {t.recomendaciones}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {analisisSalud.recomendaciones.slice(0, 5).map((rec, idx) => (
                    <div key={idx} className="bg-slate-900/80 px-4 py-2 rounded-lg border border-blue-400/20 text-sm text-blue-100 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa]" />
                      {rec}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CONTENEDOR PRINCIPAL QUE DIVIDE LA PANTALLA EN 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              
              {/* LADO IZQUIERDO: CONFIGURACIÓN DE AUDITORÍA */}
              <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6 h-full">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🛠️</span> Configuración de Auditoría
                </h3>
                <ConfiguracionAuditoria 
                  usuarioActual={usuarioActual} 
                  idioma={t} 
                  onClose={() => {}}
                />
              </div>

              {/* LADO DERECHO: BLOQUE DE GRÁFICOS */}
              <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6 h-full">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📊</span> {t.ingresosVsEgresos}
                </h3>
                {datosGrafico && datosGrafico.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={datosGrafico} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} 
                        stroke="#94a3b8" 
                      />
                      <YAxis dataKey="nombre" type="category" stroke="#94a3b8" width={80} />
                      <Tooltip
                        formatter={(v) => `$${v.toLocaleString()}`}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px' }}
                      />
                      <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#8884d8">
                        {datosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {(!datosGrafico || datosGrafico.length === 0) && (
                  <div className="h-[200px] flex items-center justify-center text-gray-500">
                    No hay datos suficientes para mostrar el gráfico
                  </div>
                )}
                
                {/* Leyenda de colores */}
                <div className="mt-3 flex justify-center gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span>Ventas</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Gastos</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span>Compras</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span>Capital</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-cyan-500"></div><span>Utilidad</span></div>
                </div>
              </div>
            </div>

                        {/* ============================================================
                ACORDEONES PARA MÓVIL (PRODUCCIÓN Y REGISTRO MANUAL)
            ============================================================ */}

            {/* ACORDEÓN: AUDITORÍA DE PRODUCCIÓN */}
            <div className="mb-4">
              <button 
                onClick={() => setShowProduccion(!showProduccion)}
                className="w-full bg-[#1e293b] text-white p-4 rounded-xl flex justify-between items-center border border-blue-900/30 hover:bg-[#2a3a4a] transition-all"
              >
                <span className="font-bold">🏭 {t.produccion || 'Auditoría de Producción'}</span>
                <span>{showProduccion ? '▲' : '▼'}</span>
              </button>
              {showProduccion && (
                <div className="mt-2 p-4 bg-[#0f172a] rounded-xl border border-slate-800">
                  <ProduccionForm 
                    usuarioActual={usuarioActual} 
                    idioma={idioma} 
                    setInventario={setInventario}
                    setMovimientos={setMovimientos}
                    onSuccess={() => {
                      setValidationMessage('✅ Producción auditada y cargada al inventario');
                      setTimeout(() => setValidationMessage(null), 3000);
                    }}
                    onError={(error) => {
                      setError(error.message);
                      setTimeout(() => setError(null), 5000);
                    }}
                  />
                </div>
              )}
            </div>

            {/* DICTAMEN DE AUDITORÍA (SIEMPRE VISIBLE) */}
            <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6 mb-4">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📋 {t.dictamen}</h2>
              <div className="bg-[#0f172a] rounded-xl p-4 h-64 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-300">
                {dictamenGeneral || 'Esperando datos para generar análisis...'}
              </div>
            </div>

            {/* ACORDEÓN: REGISTRO MANUAL DE MOVIMIENTOS */}
            <div className="mb-4">
              <button 
                onClick={() => setShowRegistroManual(!showRegistroManual)}
                className="w-full bg-[#1e293b] text-white p-4 rounded-xl flex justify-between items-center border border-blue-900/30 hover:bg-[#2a3a4a] transition-all"
              >
                <span className="font-bold">✍️ {t.registroManual || 'Registro Manual de Movimientos'}</span>
                <span>{showRegistroManual ? '▲' : '▼'}</span>
              </button>
              {showRegistroManual && (
                <div className="mt-2 p-4 bg-[#0f172a] rounded-xl border border-slate-800">
                  <RegistroManual
                    usuarioActual={usuarioActual}
                    idioma={idioma}
                    saldoActual={saldoCaja}
                    guardarProductoEnCatalogo={guardarProductoEnCatalogo}
                    onSuccess={() => {
                      setValidationMessage(idioma === 'es' ? '✅ Movimiento registrado' : '✅ Transaction recorded');
                      setTimeout(() => setValidationMessage(null), 3000);
                    }}
                    onError={(error) => {
                      setError(error.message);
                      setTimeout(() => setError(null), 5000);
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Carga Masiva - Solo para Business y Elite */}
            {(usuarioActual?.plan === 'business' || usuarioActual?.plan === 'elite') && (
              <MassiveUpload
                usuarioActual={usuarioActual}
                moneda={moneda}
                onComplete={(results) => {
                  const exitosos = results.filter(r => r.success).length;
                  setValidationMessage(`✅ ${exitosos} de ${results.length} documentos procesados exitosamente`);
                  setTimeout(() => setValidationMessage(null), 5000);
                }}
                onError={(error) => {
                  setError(error.message);
                  setTimeout(() => setError(null), 5000);
                }}
              />
            )}

            {/* Mensaje de ayuda */}
            <div className="max-w-3xl mx-auto mb-8">
              <p className="text-center text-gray-500 text-sm">
                {idioma === 'es' 
                  ? '💡 Puedes registrar tus movimientos manualmente arriba. Los usuarios Business y Elite también pueden subir múltiples facturas a la vez.'
                  : '💡 You can register your transactions manually above. Business and Elite users can also upload multiple invoices at once.'}
              </p>
            </div>

            {/* Lista de Movimientos */}
            <section>
              <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h2 className="text-2xl font-bold text-white">{t.registros}</h2>
                <span className="text-cyan-400 text-sm font-medium">{movimientos.length} {t.totalTransacciones}</span>
              </div>

              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="bg-[#1e293b]/50 border border-blue-900/20 rounded-xl p-5 animate-pulse"><div className="flex items-center justify-between"><div className="flex items-center"><div className="w-10 h-10 bg-slate-800 rounded-xl mr-4"></div><div><div className="h-4 w-32 bg-slate-800 rounded"></div><div className="h-3 w-24 bg-slate-800 rounded mt-2"></div></div></div><div className="h-6 w-20 bg-slate-800 rounded"></div></div></div>))}</div>
              ) : movimientos.length === 0 ? (
                <div className="bg-[#1e293b] border border-dashed border-blue-900/30 rounded-xl p-8 text-center"><p className="text-gray-500">No hay registros financieros aún.</p><p className="text-gray-400 text-sm mt-2">Escribe una operación o consulta para comenzar el análisis.</p></div>
              ) : (
                <div className="space-y-3">
                  {movimientos.map((movimiento, index) => (
                    <div key={movimiento.id} className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-cyan-500/40 transition-all duration-300 group animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="flex items-center flex-1 w-full sm:w-auto">
                        <div className="text-3xl mr-4 w-10 flex-shrink-0">{movimiento.emoji || '📄'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white break-words text-sm sm:text-base">{movimiento.concepto || movimiento.texto || 'Sin concepto'}</p>
                          <p className="text-sm text-gray-400">{movimiento.categoria || 'Sin categoría'}</p>
                          {movimiento.recomendacion && <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-md">{movimiento.recomendacion}</p>}
                          {(movimiento.proveedor || movimiento.numeroFactura) && (
                            <p className="text-xs text-cyan-400 mt-1 truncate max-w-[200px] sm:max-w-md">
                              {movimiento.proveedor && `Proveedor: ${movimiento.proveedor}`}
                              {movimiento.numeroFactura && ` | Factura: ${movimiento.numeroFactura}`}
                            </p>
                          )}
                          {movimiento.fechaVencimiento && (
                            <p className="text-xs text-orange-400 mt-1">
                              📅 Vence: {new Date(movimiento.fechaVencimiento).toLocaleDateString('es-CO')}
                              {calcularDiasParaVencer(movimiento.fechaVencimiento) <= 3 && ` (¡URGENTE!)`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto mt-3 sm:mt-0">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${movimiento.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {movimiento.tipo === 'ingreso' ? '+' : '-'} {formatearValor(movimiento.valor || 0)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {movimiento.fecha ? new Date(movimiento.fecha).toLocaleDateString('es-CO') : 'Hoy'}
                          </p>
                        </div>
                        <button 
  onClick={() => handleDelete(
    movimiento.id,
    movimientos,
    setMovimientos,
    setInventario,
    setUsuarioActual,
    setValidationMessage,
    setError,
    setLoading
  )}
  className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-2 rounded-lg"
>
  🗑️
</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* MENSAJE DE ACCESO RESTRINGIDO PARA USUARIOS SIN SUSCRIPCIÓN ACTIVA */
          <div className="bg-[#1e293b] rounded-2xl p-12 mb-8 border border-yellow-500/30 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Acceso Restringido</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Para acceder a todas las funciones de STRATIUM AI, por favor activa tu suscripción.
            </p>
            <button
              onClick={() => {
                setFuncionBloqueada('Dashboard completo');
                setModalUpgradeOpen(true);
              }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
            >
              Activar Suscripción
            </button>
          </div>
        )}
      </main>

      <footer className="py-6 px-4 border-t border-blue-900/20 mt-12">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>STRATIUM AI © {new Date().getFullYear()} • {t.subtitle}</p>
          <p className="mt-1 text-xs text-gray-600">Datos actualizados en tiempo real desde Firebase • Cierre automático mensual el día 1</p>
        </div>
      </footer>
      
            {/* Modales */}
            {/* Modal de pago con Stripe - OCULTO TEMPORALMENTE */}
      {/*
      {mostrarCheckoutStripe && (
        <CheckoutStripe
          plan={planSeleccionadoStripe}
          userEmail={usuarioActual?.email}
          userId={usuarioActual?.uid}
          moneda={moneda}
          onSuccess={() => {
            setMostrarCheckoutStripe(false);
            setValidationMessage('✅ Pago exitoso con Stripe. Tu plan ha sido actualizado.');
            setTimeout(() => setValidationMessage(null), 5000);
            setTimeout(() => window.location.reload(), 2000);
          }}
          onError={(error) => {
            setMostrarCheckoutStripe(false);
            setError('Error en el pago con Stripe: ' + error);
            setTimeout(() => setError(null), 5000);
          }}
          onClose={() => setMostrarCheckoutStripe(false)}
        />
      )}
      */}
            
      {/* Modal Upgrade de Planes */}
      <ModalUpgrade
        isOpen={modalUpgradeOpen}
        onClose={() => setModalUpgradeOpen(false)}
        funcionNombre={funcionBloqueada}
        onSeleccionarPlan={(plan) => {
          setModalUpgradeOpen(false);
          localStorage.setItem('pendingPlan', plan);
          localStorage.setItem('pendingUserId', usuarioActual?.uid);
          setPlanSeleccionadoPago(plan);
          setMostrarCheckout(true);
        }}
        moneda={moneda}
        t={t}
        onComprarCreditosSoporte={(paqueteId, paquete) => {
          console.log('Comprar paquete de soporte:', paqueteId, paquete);
          localStorage.setItem('pendingPaqueteSoporte', paqueteId);
          localStorage.setItem('pendingPaqueteSoporteData', JSON.stringify(paquete));
          setPlanSeleccionadoPago(`creditos_soporte_${paqueteId}`);
          setMostrarCheckout(true);
        }}
      />
      
      {/* Modal Fecha de Vencimiento */}
      <ModalFechaVencimiento
        isOpen={mostrarModalVencimiento}
        onClose={() => setMostrarModalVencimiento(false)}
        onGuardar={handleGuardarConVencimiento}
        onSaltar={handleSaltarVencimiento}
        producto={productoPendiente}
      />

      {/* Modal de pago con Mercado Pago */}
      {mostrarCheckout && (
        <CheckoutMercadoPago
          plan={planSeleccionadoPago}
          userEmail={usuarioActual?.email}
          userId={usuarioActual?.uid}
          moneda={moneda}
          onSuccess={() => {
            setMostrarCheckout(false);
            setValidationMessage('✅ Pago exitoso. Tu plan ha sido actualizado.');
            setTimeout(() => setValidationMessage(null), 5000);
            setTimeout(() => window.location.reload(), 2000);
          }}
          onError={(error) => {
            setMostrarCheckout(false);
            setError('Error en el pago: ' + error);
            setTimeout(() => setError(null), 5000);
          }}
          onClose={() => setMostrarCheckout(false)}
        />
      )}

      {/* Bot de Soporte IA */}
   <SupportBot 
  usuarioActual={usuarioActual}
  idioma={idioma}
  plan={usuarioActual?.plan}
  moneda={moneda}
  resumenFinanciero={resumenFinanciero}        // ✅ DEBE ESTAR
  diagnosticoBienvenida={diagnosticoBienvenida} // ✅ DEBE ESTAR
/>
    </div>
  );
};

export default App;

