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
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auditarOperacion, procesarCosteo, analizarSaludFinanciera, auditarSobrecostosProveedores } from './logic/logicEngine';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import emailjs from '@emailjs/browser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// OCR eliminado - ya no se usa
import CheckoutMercadoPago from './components/CheckoutMercadoPago';
import AdminPanel from './components/AdminPanel';
import MassiveUpload from './components/MassiveUpload';
import RegistroManual from './components/RegistroManual';
import { Toaster } from 'react-hot-toast';
import { programarAlertasDiarias, verificarVencimientoProductos, verificarStockBajo } from './services/alertasService';
import ProduccionForm from './components/ProduccionForm';
import ConfiguracionAuditoria from './components/ConfiguracionAuditoria';
import ModalUpgrade from './components/ModalUpgrade';
import SupportBot from './components/SupportBot';
import useDeleteTransaction from './hooks/useDeleteTransaction';
import useCargarProduccion from './hooks/useCargarProduccion';
import OnboardingNegocioExistente from './components/OnboardingNegocioExistente';
// ValidacionFactura eliminado - OCR deshabilitado
import { LanguageProvider, useTranslation } from './hooks/useTranslation';
import OnboardingWizard from './components/OnboardingWizard';
import DashboardInsights from './components/DashboardInsights';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import ExecutiveReport from './components/ExecutiveReport';
import SelectorReporte from './components/SelectorReporte';
import { 
  calcularDiasInactividad, 
  calcularTendenciaSemanal, 
  calcularProductosEstrella,
  calcularProductosHueso,
  calcularMargenNeto
} from './util/dashboardCalculations';
//import CheckoutStripe from './components/CheckoutStripe'; // Oculto Temporalmente

// ============================================================
// NUEVOS IMPORTS (AGREGAR ESTO)
// ============================================================
// Configuración y utilidades
import { getRegionalConfig, formatMoneyUniversal } from './util/formatMoneyUniversal';
import { roundMoney, sumMoney } from './util/roundMoney';

// Servicios
import { iniciarEscuchaVoz, procesarComandoNatural } from './services/voiceInput';
import { configurarNotificaciones, escucharNotificacionesEnTiempoReal, enviarNotificacionLocal } from './services/notifications';
import { responderDudaTributaria, getSugerenciasPreguntas, getVigenciaLegal } from './services/consultorTributario';

// Componentes
import UserGreeting from './components/UserGreeting';
import SleepIndicator from './components/SleepIndicator';
import TrustMeter from './components/TrustMeter';
import BenchmarkCard from './components/BenchmarkCard';
import ConsultorWidget from './components/ConsultorWidget';

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
            {t('title')}
          </h1>
          <p className="text-gray-400 text-sm mt-2">{t('loginSubtitle')}</p>
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
            <label className="block text-gray-400 text-sm mb-2">{t('email')}</label>
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
            <label className="block text-gray-400 text-sm mb-2">{t('password')}</label>
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
                {showPassword ? t('hidePassword') : t('showPassword')}
              </button>
            </div>
          </div>
          
          {esRegistro && (
            <>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">{t('confirmPassword')}</label>
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
                    {showConfirmPassword ? t('hidePassword') : t('showPassword')}
                  </button>
                </div>
                {confirmPassword && passwordLogin !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{t('passwordsDontMatch')}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">{t('nombre')}</label>
                <input
                  type="text"
                  value={nombreRegistro}
                  onChange={(e) => setNombreRegistro(e.target.value)}
                  className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoComplete="name"
                />
              </div>
              
              <div className="mb-4">
  <label className="block text-gray-400 text-sm mb-2">{t('plan')}</label>
  <div className="grid grid-cols-4 gap-2">
    <button
      type="button"
      onClick={() => setPlanSeleccionado('starter')}
      className={`p-2 rounded-lg text-sm font-bold transition-all ${
        planSeleccionado === 'starter'
          ? 'bg-cyan-500 text-white'
          : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
      }`}
    >
      Starter
      <span className="block text-[10px] opacity-80">
        {moneda.mostrarCOP ? '$0 / 15 días' : '$0 / 15 days'}
      </span>
    </button>
                  
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
                    {t('aceptarTerminos')} 
                    <a 
                      href={idioma === 'es' ? '/terminos.html' : '/terms.html'} 
                      target="_blank" 
                      className="text-cyan-400 hover:underline ml-1"
                    >
                      {t('terminosLink')}
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
            {esRegistro ? t('register') : t('login')}
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
            {esRegistro ? `${t('hasAccount')} ${t('switchToLogin')}` : `${t('noAccount')} ${t('switchToRegister')}`}
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
  // ============================================================
  // ESTADOS DE DATOS PRINCIPALES
  // ============================================================
  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  
  // ============================================================
  // ESTADOS DE CARGA Y ERROR
  // ============================================================
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationMessage, setValidationMessage] = useState(null);
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================================
  // ESTADOS DE PRODUCCIÓN
  // ============================================================
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
  
  // ============================================================
  // ESTADOS DE ARCHIVOS Y DICTAMEN
  // ============================================================
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [dictamenGeneral, setDictamenGeneral] = useState('');
  
  // ============================================================
  // ESTADOS DE IDIOMA Y MONEDA
  // ============================================================
  const { t, idioma, cambiarIdioma } = useTranslation();
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
  const [planSeleccionado, setPlanSeleccionado] = useState('starter');  // ← CAMBIADO
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('mensual');
  const [esRegistro, setEsRegistro] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');
  const [gastosFijosMensuales, setGastosFijosMensuales] = useState(10000000);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // ============================================================
  // ESTADOS DE FECHA DE VENCIMIENTO
  // ============================================================
  const [mostrarModalVencimiento, setMostrarModalVencimiento] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [productoPendiente, setProductoPendiente] = useState(null);
  const [cantidadPendiente, setCantidadPendiente] = useState(null);
  const [valorPendiente, setValorPendiente] = useState(null);
  const [textoComandoPendiente, setTextoComandoPendiente] = useState(null);

  // ============================================================
  // ESTADOS DE AUDITORÍA
  // ============================================================
  const [valoresAtipicos, setValoresAtipicos] = useState([]);
  const [inconsistenciaSaldo, setInconsistenciaSaldo] = useState(null);
  const [mostrarLogsEliminaciones, setMostrarLogsEliminaciones] = useState(false);
  const [logsEliminaciones, setLogsEliminaciones] = useState([]);
  
  // ============================================================
  // ESTADOS DE MODAL UPGRADE
  // ============================================================
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false);
  const [funcionBloqueada, setFuncionBloqueada] = useState('');
  
  // ============================================================
  // ESTADOS DE MERCADO PAGO Y CHECKOUT
  // ============================================================
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [planSeleccionadoPago, setPlanSeleccionadoPago] = useState(null);

  // ============================================================
  // ESTADOS DE UI Y MODALES
  // ============================================================
  const [inputValue, setInputValue] = useState('');
  const [mostrarConfigModal, setMostrarConfigModal] = useState(false);
  const [showAuditoria, setShowAuditoria] = useState(false);
  const [showProduccion, setShowProduccion] = useState(false);
  const [showRegistroManual, setShowRegistroManual] = useState(false);
  const [mostrarModalValidacion, setMostrarModalValidacion] = useState(false);
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [itemsOCR, setItemsOCR] = useState([]);
  const [proveedorOCR, setProveedorOCR] = useState('');
  const [totalFacturaOCR, setTotalFacturaOCR] = useState(0);
  const [totalImpuestosOCR, setTotalImpuestosOCR] = useState(0);
  const [productosOCR, setProductosOCR] = useState([]);
  const [totalOCR, setTotalOCR] = useState(0);
  const [impuestosOCR, setImpuestosOCR] = useState(0);
  const [nitOCR, setNitOCR] = useState('');
  const [fechaOCR, setFechaOCR] = useState('');
  const [modalOCRAbierto, setModalOCRAbierto] = useState(false);

  // ============================================================
  // ESTADOS DE MÉTRICAS PARA INSIGHTS
  // ============================================================
  const [diasInactividad, setDiasInactividad] = useState(0);
  const [tendenciaVentas, setTendenciaVentas] = useState({ 
    porcentaje: 0, 
    direccion: 'neutral', 
    valorAnterior: 0, 
    valorActual: 0 
  });
  const [productosEstrella, setProductosEstrella] = useState([]);
  const [productosHueso, setProductosHueso] = useState([]);
  const [margenNeto, setMargenNeto] = useState(0);

// ============================================================
// ESTADOS DE MÉTRICAS DEL DASHBOARD (PARA KPI CARDS)
// ============================================================
const [ventasTotales, setVentasTotales] = useState(0);
const [gastosTotales, setGastosTotales] = useState(0);
const [utilidadEstimada, setUtilidadEstimada] = useState(0);
const [margen, setMargen] = useState(0);
const [saldoCaja, setSaldoCaja] = useState(0);
const [diasCubiertos, setDiasCubiertos] = useState(0);

  // ============================================================
  // ESTADOS DE ONBOARDING Y BIENVENIDA
  // ============================================================
  const [mostrarOnboarding, setMostrarOnboarding] = useState(() => {
    return !localStorage.getItem('onboarding_completed');
  });
  const [diagnosticoBienvenida, setDiagnosticoBienvenida] = useState(null);

  // ✅ FUNCIÓN PARA VERIFICAR ACCESO POR PLAN
  const puedeAccederAFuncion = (funcion) => {
    try {
      const limites = obtenerLimitesPlan();
      return limites && limites[funcion] === true;
    } catch (e) {
      return false;
    }
  };
  
  // ✅ FUNCIÓN PARA CALCULAR DÍAS RESTANTES DE PRUEBA
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

// ✅ GENERAR DIAGNÓSTICO DE CIERRE CUANDO HAY DATOS (CORREGIDO)
useEffect(() => {
  if (inventario.length > 0 && usuarioActual) {
    const capitalActual = usuarioActual?.aportesPersonales || 0;
    const diagnostico = generarDiagnosticoCierre(inventario, movimientos, capitalActual);
    setDiagnosticoBienvenida(diagnostico);
    console.log('📊 Diagnóstico generado:', diagnostico);
  }
}, []); // ✅ ARRAY VACÍO

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
          asunto: `STRATIUM GLOBAL AI: Reporte Maestro de Auditoría - ${periodo}`,
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
// NUEVA FUNCIÓN PARA GENERAR REPORTE POR TIPO
// ============================================================
const handleGenerarReporte = async (tipo) => {
  if (!usuarioActual?.uid) return;
  
  // Verificar límites por plan
  const puede = await puedeGenerarReporte(tipo);
  if (!puede) {
    const mensaje = getMensajeUpgrade(tipo);
    setError(mensaje);
    setTimeout(() => setError(null), 5000);
    return;
  }
  
  setGenerandoReporte(true);
  
  try {
    const doc = await generarReporte(tipo, usuarioActual, movimientos, cuentasPorPagar, inventario, idioma);
    
    if (doc) {
      // Registrar que se generó el reporte
      await registrarReporteGenerado();
      
      // Descargar PDF
      const fecha = new Date();
      const nombreArchivo = `Stratium_${tipo}_${fecha.toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      doc.save(nombreArchivo);
      
      setValidationMessage(`✅ ${idioma === 'en' ? 'Report generated successfully' : 'Reporte generado exitosamente'}`);
      setTimeout(() => setValidationMessage(null), 3000);
    } else {
      setError(idioma === 'en' ? 'Error generating report' : 'Error generando reporte');
    }
    
  } catch (error) {
    console.error('Error:', error);
    setError(error.message);
  } finally {
    setGenerandoReporte(false);
    setModalReporteAbierto(false);
    setTipoReporteSeleccionado(null);
  }
};

// ============================================================
// REPORTE CORTO (PREVIEW) - PARA PLAN STARTER (1 SOLA VEZ)
// ============================================================
const generarReportePreview = () => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('STRATIUM GLOBAL AI', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(idioma === 'en' ? 'Executive Report' : 'Reporte Ejecutivo', 105, 35, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`${idioma === 'en' ? 'Generated' : 'Generado'}: ${new Date().toLocaleString()}`, 105, 45, { align: 'center' });
  
  // Estado de Resultados (PyG)
  doc.setFontSize(12);
  doc.text(idioma === 'en' ? 'Profit & Loss Statement' : 'Estado de Resultados', 20, 65);
  doc.setFontSize(10);
  doc.text(`${idioma === 'en' ? 'Sales' : 'Ventas'}: ${formatearValor(ventasTotales)}`, 25, 80);
  doc.text(`${idioma === 'en' ? 'Expenses' : 'Gastos'}: ${formatearValor(gastosTotales)}`, 25, 90);
  doc.text(`${idioma === 'en' ? 'Profit' : 'Utilidad'}: ${formatearValor(utilidadEstimada)}`, 25, 100);
  doc.text(`${idioma === 'en' ? 'Margin' : 'Margen'}: ${margen}%`, 25, 110);
  
  // Inventario (Top 5)
  doc.setFontSize(12);
  doc.text(idioma === 'en' ? 'Inventory (Top 5)' : 'Inventario (Top 5)', 20, 130);
  doc.setFontSize(9);
  let y = 145;
  const topInventario = inventario.slice(0, 5);
  if (topInventario.length === 0) {
    doc.text(idioma === 'en' ? 'No products in inventory' : 'No hay productos en inventario', 25, y);
  } else {
    topInventario.forEach(item => {
      if (y > 270) return;
      doc.text(`${item.producto}: ${item.cantidad} ${idioma === 'en' ? 'units' : 'unidades'}`, 25, y);
      y += 8;
    });
  }
  
  // Pie de página
  doc.setFontSize(8);
  doc.text(idioma === 'en' 
    ? 'This is a preview report. Upgrade your plan for complete reports.'
    : 'Este es un reporte de prueba. Actualiza tu plan para reportes completos.', 
    105, 285, { align: 'center' });
  
  doc.save(`STRATIUM_${idioma === 'en' ? 'Preview' : 'Vista'}.pdf`);
};

  // ============================================================
  // EXPORTAR A EXCEL/CSV
  // ============================================================
  const exportarACSV = () => {
  if (!usuarioActual?.uid) return;
  
  const plan = usuarioActual.plan || 'starter';
  
  // ✅ Verificar si el plan permite exportar (Pro, Business, Elite)
  if (plan !== 'pro' && plan !== 'business' && plan !== 'elite') {
    setFuncionBloqueada('Exportar a Excel/CSV');
    setModalUpgradeOpen(true);
    return;
  }
  
  if (movimientos.length === 0) {
    setError('No hay registros para exportar');
    setTimeout(() => setError(null), 3000);
    return;
  }
  
  // ✅ Para Starter no debería llegar aquí, pero por si acaso, limitar a 30 registros
  let datosAExportar = movimientos;
  if (plan === 'starter') {
    datosAExportar = movimientos.slice(0, 30);
  }
  
  // Preparar datos para CSV
  const headers = ['Fecha', 'Concepto', 'Categoría', 'Valor', 'Tipo', 'Cantidad', 'Proveedor', 'Factura'];
  const rows = datosAExportar.map(m => [
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
  link.setAttribute('download', `STRATIUM_GLOBAL_AI_Registros_${fecha}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  setValidationMessage(`✅ Exportados ${datosAExportar.length} registros a CSV`);
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
    // ✅ Verificar autenticación primero
    if (!usuarioActual?.uid) {
      setError('Debes iniciar sesión para escanear facturas');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setImagenFactura(file);
        setProcesandoOCR(true);
        try {
          await procesarOCRConImagen(file, fuentePago);
        } catch (err) {
          console.error('Error en OCR:', err);
          setError('Error al procesar la factura');
          setTimeout(() => setError(null), 5000);
          setProcesandoOCR(false);
        }
      }
    };
    input.click();
  };

  const procesarOCRConImagen = async (imagenFile, fuentePago = 'negocio') => {
    if (!usuarioActual?.uid || !imagenFile) {
      setError('Usuario no autenticado o imagen no válida');
      return;
    }
    
    setProcesandoOCR(true);
    
    try {
      // ✅ Usar la nueva función de Google Vision
      const resultado = await escanearFacturaConVision(imagenFile, moneda?.codigo || 'COP');
      
      if (resultado.success) {
        // ✅ Formatear productos para el modal
        const itemsConIVA = (resultado.productos || []).map(producto => {
          const cantidad = producto.cantidad || 1;
          const precioUnitario = producto.precioUnitario || 0;
          const valorProducto = cantidad * precioUnitario;
          const subtotal = (resultado.productos || []).reduce((sum, p) => sum + ((p.cantidad || 1) * (p.precioUnitario || 0)), 0);
          const ivaProporcional = subtotal > 0 ? (valorProducto / subtotal) * (resultado.totalImpuestos || 0) : 0;
          
          return {
            nombre: producto.nombre || 'Producto sin nombre',
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            iva: ivaProporcional
          };
        });
        
        setItemsOCR(itemsConIVA);
        setProveedorOCR(resultado.proveedor || 'Proveedor no identificado');
        setTotalFacturaOCR(resultado.total || 0);
        setTotalImpuestosOCR(resultado.totalImpuestos || 0);
        setMostrarModalValidacion(true);
      } else {
        setError(resultado.mensaje || 'Error al procesar la factura');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Error en OCR:', err);
      setError('Error al procesar la factura. Intenta de nuevo.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcesandoOCR(false);
      setImagenFactura(null);
    }
  };

  const confirmarClasificacionFactura = async (itemsClasificados) => {
    setMostrarModalValidacion(false);
    
    const itemsInventario = itemsClasificados.filter(i => i.clasificacion === 'INVENTARIO');
    const itemsGasto = itemsClasificados.filter(i => i.clasificacion === 'GASTO_ADMIN');
    const itemsPersonal = itemsClasificados.filter(i => i.clasificacion === 'RETIRO_SOCIO');
    
    try {
      // ✅ Guardar inventario
      for (const item of itemsInventario) {
        await actualizarInventarioAcumulado(item.nombre, item.cantidad, item.precioUnitario, db, usuarioActual.uid);
      }
      
      // ✅ Guardar gastos
      if (itemsGasto.length > 0) {
        const totalGastos = itemsGasto.reduce((sum, i) => sum + (i.cantidad * i.precioUnitario), 0);
        await addDoc(registrosCollection, {
          concepto: 'Gastos operativos',
          valor: totalGastos,
          tipo: 'egreso',
          categoria: 'GASTO_ADMIN',
          fecha: serverTimestamp(),
          userId: usuarioActual.uid,
          items: itemsGasto
        });
      }
      
      // ✅ Guardar retiros personales
      if (itemsPersonal.length > 0) {
        const totalPersonal = itemsPersonal.reduce((sum, i) => sum + (i.cantidad * i.precioUnitario), 0);
        await addDoc(registrosCollection, {
          concepto: 'Retiro de socio',
          valor: totalPersonal,
          tipo: 'egreso',
          categoria: 'RETIRO_SOCIO',
          fecha: serverTimestamp(),
          userId: usuarioActual.uid,
          items: itemsPersonal
        });
        
        setValidationMessage(`⚠️ Se registraron $${totalPersonal.toLocaleString()} como retiros personales.`);
        setTimeout(() => setValidationMessage(null), 6000);
      }
      
      // ✅ Mensaje de éxito
      setValidationMessage(`✅ Factura procesada: ${itemsInventario.length} productos al inventario`);
      setTimeout(() => setValidationMessage(null), 5000);
      
    } catch (error) {
      console.error('Error guardando factura:', error);
      setError('Error al guardar la factura. Intenta de nuevo.');
      setTimeout(() => setError(null), 5000);
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

// ✅ AGREGAR ESTE useEffect DEBAJO
useEffect(() => {
  const handleConfigUpdateEvent = (event) => {
    if (event.detail?.gastosFijosMensuales) {
      setGastosFijosMensuales(event.detail.gastosFijosMensuales);
    }
  };
  
  window.addEventListener('config-updated', handleConfigUpdateEvent);
  return () => window.removeEventListener('config-updated', handleConfigUpdateEvent);
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
// CARGAR DATOS - VERSIÓN SIN FILTRO DE FECHA (PARA PRUEBA)
// ============================================================
useEffect(() => {
  if (!usuarioActual?.uid) {
    setMovimientos([]);
    setInventario([]);
    setCuentasPorPagar([]);
    setIsLoading(false);
    return;
  }

  let isMounted = true;

  const cargarDatos = async () => {
  try {
    console.log('🟢 Cargando datos para usuario:', usuarioActual.uid);
    
    // ✅ LIMITAR DÍAS DE HISTORIAL SEGÚN PLAN
    const plan = usuarioActual?.plan || 'starter';
    const hoy = new Date();
    let fechaLimite;
    
    if (plan === 'starter') {
      // Starter: últimos 30 días
      fechaLimite = new Date();
      fechaLimite.setDate(hoy.getDate() - 30);
      console.log('📅 Starter: mostrando últimos 30 días');
    } else if (plan === 'pro') {
      // Pro: últimos 180 días (6 meses)
      fechaLimite = new Date();
      fechaLimite.setDate(hoy.getDate() - 180);
      console.log('📅 Pro: mostrando últimos 180 días');
    } else {
      // Business y Elite: historial completo
      fechaLimite = new Date(0); // 1 de enero de 1970
      console.log('📅 Business/Elite: historial completo');
    }
    
    // ✅ REGISTROS con filtro de fecha
    const registrosQuery = query(
      collection(db, 'registros'),
      where('userId', '==', usuarioActual.uid),
      where('fecha', '>=', fechaLimite),
      orderBy('fecha', 'desc')
    );
    
    // ✅ COMPRAS con filtro de fecha
    const comprasQuery = query(
      collection(db, 'compras'),
      where('userId', '==', usuarioActual.uid),
      where('fecha', '>=', fechaLimite),
      orderBy('fecha', 'desc')
    );
    
    const [registrosSnapshot, comprasSnapshot] = await Promise.all([
      getDocs(registrosQuery),
      getDocs(comprasQuery)
    ]);
    
    console.log('📦 Registros encontrados:', registrosSnapshot.docs.length);
    console.log('📦 Compras encontradas:', comprasSnapshot.docs.length);
    
    let ventas = 0;
    let gastos = 0;
    const todosMovimientos = [];
    
    registrosSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const valor = data.valor || 0;
      const tipo = data.tipo || (valor >= 0 ? 'ingreso' : 'egreso');
      
      if (tipo === 'ingreso') {
        ventas += valor;
        console.log('✅ Venta encontrada:', data.concepto, valor);
      } else {
        gastos += valor;
      }
      
      todosMovimientos.push({
        id: docSnap.id,
        texto: data.texto || data.concepto || 'Sin concepto',
        concepto: data.concepto || data.texto || 'Sin concepto',
        categoria: data.categoria || 'Transacción',
        valor: valor,
        tipo: tipo,
        emoji: data.emoji || '💰',
        recomendacion: data.recomendacion || '',
        cantidad: data.cantidad || 1,
        costoUnitario: data.costoUnitario || 0,
        fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(),
        rawFecha: data.fecha,
        proveedor: data.proveedor || '',
        numeroFactura: data.numeroFactura || '',
        userId: data.userId,
        origen: 'registro'
      });
    });
    
    comprasSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const valor = data.valor || 0;
      gastos += valor;
      
      todosMovimientos.push({
        id: docSnap.id,
        texto: data.concepto || 'Producción',
        concepto: data.concepto || 'Producción',
        categoria: 'PRODUCCION',
        valor: valor,
        tipo: 'egreso',
        emoji: '🏭',
        recomendacion: data.auditoria?.margenAuditado ? `Margen: ${data.auditoria.margenAuditado}%` : '',
        cantidad: 1,
        costoUnitario: valor,
        fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(),
        rawFecha: data.fecha,
        proveedor: data.proveedor || '',
        numeroFactura: data.numeroFactura || '',
        userId: data.userId,
        origen: 'compra'
      });
    });
    
    console.log('💰 Ventas totales:', ventas);
    console.log('📉 Gastos totales:', gastos);
    
    todosMovimientos.sort((a, b) => b.fecha - a.fecha);
    const ultimos10 = todosMovimientos.slice(0, 10);
    
    if (isMounted) {
      setMovimientos(ultimos10);
      setVentasTotales(ventas);
      setGastosTotales(gastos);
      setUtilidadEstimada(ventas - gastos);
      setMargen(ventas > 0 ? ((ventas - gastos) / ventas * 100).toFixed(1) : 0);
      setSaldoCaja(ventas - gastos);
      setIsLoading(false);
      setError(null);
    }
    
  } catch (error) {
    console.error('🔴 Error:', error);
    if (isMounted) {
      setError(error.message);
      setIsLoading(false);
    }
  }
};
  
  const cargarInventario = async () => {
    try {
      const qInventario = query(inventarioCollection, where('userId', '==', usuarioActual.uid));
      const snapshot = await getDocs(qInventario);
      const inventarioData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (isMounted) setInventario(inventarioData);
    } catch (error) {
      console.error('Error inventario:', error);
    }
  };
  
  cargarDatos();
  cargarInventario();
  
  return () => {
    isMounted = false;
  };
  
}, [usuarioActual?.uid]);
  
 // ============================================================
// FUNCIONES DE AUTENTICACIÓN (SIEMPRE STARTER AL REGISTRARSE)
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
  
  // ✅ FORZAR PLAN STARTER (15 días gratis)
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
  
  try {
    // 1. Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, emailLogin, passwordLogin);
    const user = userCredential.user;
    
    // 2. Enviar correo de verificación
    await sendEmailVerification(user);
    
    // 3. Refrescar token
    await user.getIdToken(true);
    
    // 4. Crear documento en Firestore (SIEMPRE COMO STARTER)
    await setDoc(doc(db, 'usuarios', user.uid), {
      uid: user.uid,
      email: user.email,
      nombre: nombreRegistro || user.email.split('@')[0],
      plan: 'starter',  // ✅ SIEMPRE STARTER
      modalidad: null,
      fechaVencimiento: fechaVencimiento,
      fechaInicio: new Date(),
      estado: 'activo',
      emailVerificado: false,
      fechaRegistro: new Date(),
      terminosAceptados: true,
      terminosAceptadosFecha: new Date(),
      terminosAceptadosIP: 'client-side',
      suscripcionActiva: false,
      vigencia: 0,
      deudaConDueño: 0,
      aportesPersonales: 0,
      saldoCaja: 0,
      reportesGenerados: {},
      ultimoReporte: null
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

    // Fallback para componentes antiguos
const generarReportePDF = (esCierreMensual = false) => {
  console.warn('generarReportePDF está obsoleto. Usando selector de reportes.');
  setModalReporteAbierto(true);
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
        setValidationMessage('🚀 Iniciando cierre mensual automático de STRATIUM GLOBAL AI...');
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
}, [movimientos, usuarioActual]); // ✅ SOLO LAS QUE REALMENTE CAMBIAN

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
// IMPORTAR INVENTARIO DESDE CSV
// ============================================================
const importarInventarioDesdeCSV = async (fileContent) => {
  if (!usuarioActual?.uid) {
    setError('Debes iniciar sesión para importar inventario');
    return false;
  }

  try {
    const lines = fileContent.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredColumns = ['producto', 'cantidad', 'costoUnitario'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      setError(`❌ El CSV debe tener: ${missingColumns.join(', ')}`);
      return false;
    }
    
    let importados = 0;
    let errores = 0;
    const inventarioRef = collection(db, 'inventario');
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const productoData = {};
      headers.forEach((header, idx) => { productoData[header] = values[idx] || ''; });
      
      const cantidad = parseFloat(productoData.cantidad);
      const costoUnitario = parseFloat(productoData.costoUnitario);
      
      if (!productoData.producto || isNaN(cantidad) || isNaN(costoUnitario)) {
        errores++;
        continue;
      }
      
      // Verificar si el producto ya existe
      const q = query(inventarioRef, 
        where('producto', '==', productoData.producto), 
        where('userId', '==', usuarioActual.uid)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Producto nuevo
        await addDoc(inventarioRef, {
          producto: productoData.producto,
          cantidad: cantidad,
          costoUnitario: costoUnitario,
          costoTotal: cantidad * costoUnitario,
          precioVentaReferencia: productoData.precioVenta ? parseFloat(productoData.precioVenta) : null,
          userId: usuarioActual.uid,
          fechaIngreso: new Date().toISOString(),
          origen: 'importacion_csv'
        });
        importados++;
      } else {
        // Producto existente - actualizar
        const docRef = snapshot.docs[0].ref;
        const actual = snapshot.docs[0].data();
        const nuevaCantidad = (actual.cantidad || 0) + cantidad;
        const nuevoCostoTotal = ((actual.cantidad || 0) * (actual.costoUnitario || 0)) + (cantidad * costoUnitario);
        const nuevoCostoUnitario = nuevoCostoTotal / nuevaCantidad;
        
        await updateDoc(docRef, {
          cantidad: nuevaCantidad,
          costoUnitario: nuevoCostoUnitario,
          costoTotal: nuevoCostoTotal,
          ultimaActualizacion: new Date().toISOString()
        });
        importados++;
      }
    }
    
    setValidationMessage(`✅ Importados: ${importados} productos, ${errores} errores`);
    setTimeout(() => setValidationMessage(null), 5000);
    setTimeout(() => window.location.reload(), 1500);
    return true;
    
  } catch (error) {
    console.error('Error importando CSV:', error);
    setError(`❌ Error: ${error.message}`);
    return false;
  }
};

// ============================================================
// MANEJO DE ARCHIVOS (SOLO CSV)
// ============================================================
const handleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !usuarioActual?.uid) {
    setError('Debes iniciar sesión');
    return;
  }
  
  // ✅ Solo aceptar archivos CSV
  if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
    setError('❌ Solo se aceptan archivos CSV para importar inventario');
    setSubiendoArchivo(false);
    e.target.value = '';
    return;
  }
  
  setSubiendoArchivo(true);
  setError(null);
  
  try {
    const text = await file.text();
    await importarInventarioDesdeCSV(text);
  } catch (error) {
    console.error('Error:', error);
    setError(`Error: ${error.message}`);
  } finally {
    setSubiendoArchivo(false);
    e.target.value = '';
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
// KPIs - Los valores vienen de los estados del useEffect
// ============================================================
// NOTA: ventasTotales, gastosTotales, utilidadEstimada, margen, saldoCaja
// se actualizan automáticamente en el useEffect que carga los datos.

// ✅ NUEVAS MÉTRICAS PARA EL GRÁFICO (usando los estados, no variables locales)
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

// ✅ RESUMEN FINANCIERO PARA EL SUPPORTBOT
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
  // ✅ CORREGIDO - Solo se ejecuta UNA VEZ cuando el componente se monta
// useEffect(() => {
//   let isMounted = true;
//   
//   const verificarOnboarding = () => {
//     if (usuarioActual && usuarioActual.onboardingCompletado !== true && isMounted) {
//       setMostrarOnboarding(true);
//     } else if (isMounted) {
//       setMostrarOnboarding(false);
//     }
//   };
//   
//   verificarOnboarding();
//   
//   return () => {
//     isMounted = false;
//   };
// }, []); // ✅ ARRAY VACÍO

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
      onChangeIdioma={cambiarIdioma}
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

    // ✅ Dashboard principal - REEMPLAZADO POR COMPONENTE Dashboard
  return (
    <Dashboard
      usuarioActual={usuarioActual}
      movimientos={movimientos}
      inventario={inventario}
      cuentasPorPagar={cuentasPorPagar}
      isLoading={isLoading}
      error={error}
      validationMessage={validationMessage}
      setValidationMessage={setValidationMessage}
      setError={setError}
      generandoReporte={generandoReporte}
      setGenerandoReporte={setGenerandoReporte}
      ventasTotales={ventasTotales}
      gastosTotales={gastosTotales}
      utilidadEstimada={utilidadEstimada}
      margen={margen}
      saldoCaja={saldoCaja}
      diasCubiertos={diasCubiertos}
      margenNeto={margenNeto}
      diasInactividad={diasInactividad}
      productosEstrella={productosEstrella}
      productosHueso={productosHueso}
      gastosFijosMensuales={gastosFijosMensuales}
      tendenciaVentas={tendenciaVentas}
      valoresAtipicos={valoresAtipicos}
      inconsistenciaSaldo={inconsistenciaSaldo}
      mostrarLogsEliminaciones={mostrarLogsEliminaciones}
      setMostrarLogsEliminaciones={setMostrarLogsEliminaciones}
      logsEliminaciones={logsEliminaciones}
      variaciones={variaciones}
      moneda={moneda}
      setGastosFijosMensuales={setGastosFijosMensuales}
      setMostrarConfigModal={setMostrarConfigModal}
      setModalUpgradeOpen={setModalUpgradeOpen}
      setFuncionBloqueada={setFuncionBloqueada}
      exportarACSV={exportarACSV}
      puedeAccederAFuncion={puedeAccederAFuncion}
      subiendoArchivo={subiendoArchivo}
      handleFileUpload={handleFileUpload}
      setModalReporteAbierto={setModalReporteAbierto}
      handleGenerarReporte={handleGenerarReporte}
      modalReporteAbierto={modalReporteAbierto}
      setModalReporteAbierto={setModalReporteAbierto}
      setShowProduccion={setShowProduccion}
      showProduccion={showProduccion}
      setShowRegistroManual={setShowRegistroManual}
      showRegistroManual={showRegistroManual}
      setInventario={setInventario}
      setMovimientos={setMovimientos}
      guardarProductoEnCatalogo={guardarProductoEnCatalogo}
      calcularDiasParaVencer={calcularDiasParaVencer}
      formatearValor={formatearValor}
      handleDelete={handleDelete}
      mostrarCheckout={mostrarCheckout}
      setMostrarCheckout={setMostrarCheckout}
      planSeleccionadoPago={planSeleccionadoPago}
      setPlanSeleccionadoPago={setPlanSeleccionadoPago}
      modalUpgradeOpen={modalUpgradeOpen}
      setModalUpgradeOpen={setModalUpgradeOpen}
      funcionBloqueada={funcionBloqueada}
      mostrarModalVencimiento={mostrarModalVencimiento}
      setMostrarModalVencimiento={setMostrarModalVencimiento}
      handleGuardarConVencimiento={handleGuardarConVencimiento}
      handleSaltarVencimiento={handleSaltarVencimiento}
      productoPendiente={productoPendiente}
      resumenFinanciero={resumenFinanciero}
      diagnosticoBienvenida={diagnosticoBienvenida}
      datosGrafico={datosGrafico}
      setShowAuditoria={setShowAuditoria}
      showAuditoria={showAuditoria}
    />
  );
};

// ✅ Provider wrapper para internacionalización
const AppWithProvider = () => {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
};

export default AppWithProvider;

