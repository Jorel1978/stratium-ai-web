// src/components/Dashboard.jsx
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { getAuth, signOut } from 'firebase/auth';
import TrustMeter from './TrustMeter';
import ProduccionForm from './ProduccionForm';
import RegistroManual from './RegistroManual';
import ConfiguracionAuditoria from './ConfiguracionAuditoria';
import Inventario from './Inventario';
import ExecutiveReport from './ExecutiveReport';
import MassiveUpload from './MassiveUpload';
import ModalUpgrade from './ModalUpgrade';
import ModalFechaVencimiento from './ModalFechaVencimiento';
import CheckoutMercadoPago from './CheckoutMercadoPago';
import SupportBot from './SupportBot';
import SelectorReporte from './SelectorReporte';
import TooltipIcon from './TooltipIcon';
import DashboardInsights from './DashboardInsights';
import { useTranslation } from '../hooks/useTranslation';

const Dashboard = ({
  usuarioActual,
  movimientos,
  inventario,
  cuentasPorPagar,
  isLoading,
  error,
  validationMessage,
  setValidationMessage,
  setError,
  generandoReporte,
  setGenerandoReporte,
  ventasTotales,
  gastosTotales,
  utilidadEstimada,
  margen,
  saldoCaja,
  diasCubiertos,
  margenNeto,
  diasInactividad,
  productosEstrella,
  productosHueso,
  gastosFijosMensuales,
  tendenciaVentas,
  valoresAtipicos,
  inconsistenciaSaldo,
  mostrarLogsEliminaciones,
  setMostrarLogsEliminaciones,
  logsEliminaciones,
  variaciones,
  moneda,
  setGastosFijosMensuales,
  setMostrarConfigModal,
  setModalUpgradeOpen,
  setFuncionBloqueada,
  exportarACSV,
  puedeAccederAFuncion,
  subiendoArchivo,
  handleFileUpload,
  setModalReporteAbierto,
  handleGenerarReporte,
  modalReporteAbierto,
  setShowProduccion,
  showProduccion,
  setShowRegistroManual,
  showRegistroManual,
  setInventario,
  setMovimientos,
  guardarProductoEnCatalogo,
  calcularDiasParaVencer,
  formatearValor,
  handleDelete,
  mostrarCheckout,
  setMostrarCheckout,
  planSeleccionadoPago,
  setPlanSeleccionadoPago,
  modalUpgradeOpen,
  funcionBloqueada,
  mostrarModalVencimiento,
  setMostrarModalVencimiento,
  handleGuardarConVencimiento,
  handleSaltarVencimiento,
  productoPendiente,
  resumenFinanciero,
  diagnosticoBienvenida,
  datosGrafico,
  setShowAuditoria,
  showAuditoria
}) => {
  const { t, idioma, cambiarIdioma } = useTranslation();
  const [showAuditoriaLocal, setShowAuditoriaLocal] = useState(false);
  
  // ✅ Calcular días restantes
  const getDiasRestantes = () => {
    if (!usuarioActual?.fechaVencimiento) return 0;
    const fechaVenc = usuarioActual.fechaVencimiento?.toDate 
      ? usuarioActual.fechaVencimiento.toDate() 
      : new Date(usuarioActual.fechaVencimiento);
    const dias = Math.ceil((fechaVenc - new Date()) / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
  };

  const diasRestantes = getDiasRestantes();
  const plan = usuarioActual?.plan || 'starter';

  // ✅ Regla de acceso
  let tieneAcceso = false;
  if (plan === 'starter') {
    tieneAcceso = diasRestantes > 0;
  } else if (plan === 'pro' || plan === 'business' || plan === 'elite') {
    tieneAcceso = true;
  }

  console.log('🔍 Dashboard renderizado - Plan:', plan, 'Días:', diasRestantes, 'Acceso:', tieneAcceso);

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
      <header className="py-6 px-4 border-b border-blue-900/30 sticky top-0 bg-[#0f172a]/95 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            {t('title')}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={idioma}
              onChange={(e) => cambiarIdioma(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="es">🇪🇸 {t('español')}</option>
              <option value="en">🇺🇸 {t('ingles')}</option>
            </select>
            
            {/* Indicador de plan */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              plan === 'starter' ? 'bg-gray-600/30 text-gray-400' :
              plan === 'pro' ? 'bg-cyan-500/20 text-cyan-400' :
              plan === 'business' ? 'bg-purple-500/20 text-purple-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {plan === 'starter' ? t('planStarter') :
               plan === 'pro' ? t('planPro') :
               plan === 'business' ? t('planBusiness') : t('planElite')}
            </div>
            
            <div className="text-sm text-gray-400 hidden sm:block">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {usuarioActual?.email}
              </span>
            </div>
            
            <button
              onClick={() => setModalReporteAbierto(true)}
              disabled={generandoReporte || movimientos.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                generandoReporte || movimientos.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              <span>📊</span>
              <span className="hidden sm:inline">{generandoReporte ? t('generating') : t('report')}</span>
            </button>

            <button
              onClick={() => setMostrarConfigModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-300"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">{t('audit')}</span>
            </button>

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
              <span className="hidden sm:inline">{t('exportCSV')}</span>
            </button>
            
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 ${subiendoArchivo ? 'opacity-50 cursor-wait' : ''}`}>
              <span>📎</span>
              <span className="hidden sm:inline">{subiendoArchivo ? t('attaching') : t('attach')}</span>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".csv" 
                disabled={subiendoArchivo} 
              />
            </label>
            
            {puedeAccederAFuncion('puedeVerLogs') && (
              <button
                onClick={() => setMostrarLogsEliminaciones(!mostrarLogsEliminaciones)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
              >
                <span>📋</span>
                <span className="hidden sm:inline">{t('viewLogs')}</span>
              </button>
            )}
            
            <button
              onClick={async () => {
                try {
                  const auth = getAuth();
                  await signOut(auth);
                  window.location.href = '/';
                } catch (error) {
                  console.error('Error al cerrar sesión:', error);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
            
            <div className="text-sm text-gray-400">
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                {isLoading ? t('connecting') : t('online')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <Toaster position="top-center" reverseOrder={false} />

      <DashboardInsights 
        saldoCaja={saldoCaja}
        ventasTotales={ventasTotales}
        gastosTotales={gastosTotales}
        margenNeto={margenNeto}
        diasInactividad={diasInactividad}
        productosEstrella={productosEstrella}
        productosHueso={productosHueso}
        gastosFijosMensuales={gastosFijosMensuales}
        tendenciaVentas={tendenciaVentas}
        usuarioActual={usuarioActual}
        idioma={idioma}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tieneAcceso ? (
          <>
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

            {puedeAccederAFuncion('puedeVerAnomalias') && valoresAtipicos.length > 0 && (
              <div className="mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-xl">
                <h4 className="text-orange-400 font-bold mb-2">{t('outlierAlert')}</h4>
                {valoresAtipicos.slice(0, 3).map((atipico, idx) => (
                  <div key={idx} className="text-sm text-orange-200 mb-1">
                    {atipico.concepto}: {formatearValor(atipico.valor)} - {t('outlierAlertDesc')}
                  </div>
                ))}
              </div>
            )}

            {inconsistenciaSaldo?.inconsistente && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                <h4 className="text-red-400 font-bold mb-2">{t('inconsistencyAlert')}</h4>
                <p className="text-sm text-red-200">{t('inconsistencyAlertDesc')}</p>
                <p className="text-xs text-red-300 mt-2">Diferencia: {formatearValor(inconsistenciaSaldo.diferencia)}</p>
              </div>
            )}

            {/* Modal de logs de eliminaciones */}
            {mostrarLogsEliminaciones && (
              <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setMostrarLogsEliminaciones(false)}>
                <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{t('viewLogs')}</h3>
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
                      <p className="text-gray-400 text-sm font-medium">{t('sales')}</p>
                      <TooltipIcon text={t('tooltipSales')} />
                    </div>
                    <p className="text-2xl font-bold mt-1 text-emerald-400">{formatearValor(ventasTotales)}</p>
                    {puedeAccederAFuncion('puedeVerComparacionMensual') && variaciones && (
                      <p className={`text-xs mt-1 ${variaciones.ventas.variacion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {variaciones.ventas.variacion >= 0 ? '↑' : '↓'} {Math.abs(variaciones.ventas.variacion).toFixed(1)}% {t('salesVariation')}
                      </p>
                    )}
                    {!puedeAccederAFuncion('puedeVerComparacionMensual') && (
                      <p className="text-xs mt-1 text-gray-500 cursor-pointer hover:text-cyan-400" onClick={() => { setFuncionBloqueada('Comparación mensual'); setModalUpgradeOpen(true); }}>
                        🔒 {t('upgradeToCompare')}
                      </p>
                    )}
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">💰</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{t('currentPeriod')}</span>
                  <span className="text-xs font-medium text-emerald-400">+12%</span>
                </div>
              </div>
              
              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t('profit')}</p>
                      <TooltipIcon text={t('tooltipProfit')} />
                    </div>
                    <p className={`text-2xl font-bold mt-1 ${utilidadEstimada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatearValor(utilidadEstimada)}</p>
                    {puedeAccederAFuncion('puedeVerComparacionMensual') && variaciones && (
                      <p className={`text-xs mt-1 ${variaciones.utilidad.variacion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {variaciones.utilidad.variacion >= 0 ? '↑' : '↓'} {Math.abs(variaciones.utilidad.variacion).toFixed(1)}% {t('salesVariation')}
                      </p>
                    )}
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">📈</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{t('netPeriod')}</span>
                  <span className={`text-xs font-medium ${utilidadEstimada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{utilidadEstimada >= 0 ? '+' : '-'}{Math.abs(utilidadEstimada / ventasTotales * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t('margin')}</p>
                      <TooltipIcon text={t('tooltipMargin')} />
                    </div>
                    <p className="text-2xl font-bold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">{margen}%</p>
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">📊</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{t('onSales')}</span>
                  <span className="text-xs font-medium text-cyan-400">+2.1pp</span>
                </div>
              </div>

              <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <p className="text-gray-400 text-sm font-medium">{t('balance')}</p>
                      <TooltipIcon text={t('tooltipBalance')} />
                    </div>
                    <p className={`text-2xl font-bold mt-1 ${saldoCaja >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatearValor(saldoCaja)}</p>
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">💵</div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-900/20 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{t('historicalBalance')}</span>
                  <span className={`text-xs font-medium ${saldoCaja >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {saldoCaja >= 0 ? t('positive') : t('negative')}
                  </span>
                </div>
              </div>
            </div>

            <TrustMeter 
              registrosCompletos={movimientos.filter(m => m.valor).length}
              registrosTotales={Math.max(10, movimientos.length)}
              pais={moneda.codigo === 'COP' ? 'CO' : 'US'}
              idioma={idioma}
            />

            <div className="mb-6"></div>

            {/* SECCIÓN MI PLAN */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-4 mb-6 border border-blue-500/30">
              <div className="flex flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🎯</span> {t('miPlanActual')}
                  </h3>
                  <p className="text-gray-400 text-xs">{t('gestionaSuscripcion')}</p>
                </div>
                <button
                  onClick={() => setModalUpgradeOpen(true)}
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 font-medium transition-all text-xs"
                >
                  {t('cambiarPlan')}
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-[10px] uppercase">{t('plan')}</p>
                  <p className="text-sm font-bold text-white">
                    {plan === 'starter' ? t('planStarter') :
                     plan === 'pro' ? t('planPro') :
                     plan === 'business' ? t('planBusiness') : t('planElite')}
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-[10px] uppercase">{t('reports') || 'Reportes'}</p>
                  <p className="text-sm font-bold text-white">
                    {plan === 'elite' 
                      ? '∞' 
                      : plan === 'business'
                        ? `${20 - (usuarioActual?.reportesGenerados?.[new Date().toLocaleString('en-CA').slice(0, 7)] || 0)}/${20}`
                        : plan === 'pro'
                          ? `${5 - (usuarioActual?.reportesGenerados?.[new Date().toLocaleString('en-CA').slice(0, 7)] || 0)}/${5}`
                          : `${1 - (usuarioActual?.reportesGenerados?.[new Date().toLocaleString('en-CA').slice(0, 7)] || 0)}/${1}`}
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-[10px] uppercase">{t('days')}</p>
                  <p className="text-sm font-bold text-white">
                    {diasRestantes > 0 ? diasRestantes : '0'}
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-2 text-center col-span-2">
                  <p className="text-gray-400 text-[10px] uppercase">{t('capitalInjected')}</p>
                  <p className={`text-sm font-bold ${(usuarioActual?.deudaConDueño || 0) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {formatearValor(usuarioActual?.deudaConDueño || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* CONTENEDOR PRINCIPAL QUE DIVIDE LA PANTALLA EN 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6 h-full">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🛠️</span> {t('configuracionAuditoria')}
                </h3>
                <ConfiguracionAuditoria 
                  usuarioActual={usuarioActual} 
                  idioma={idioma}
                  onClose={() => setMostrarConfigModal(false)}
                  onConfigUpdate={(nuevaConfig) => {
                    console.log('🔍 Configuración recibida:', nuevaConfig);
                    setGastosFijosMensuales(nuevaConfig.gastosFijosMensuales);
                  }}
                />
              </div>

              <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6 h-full">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📊</span> {t('incomeVsExpenses')}
                </h3>
                {datosGrafico && datosGrafico.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={datosGrafico} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} stroke="#94a3b8" />
                      <YAxis dataKey="nombre" type="category" stroke="#94a3b8" width={80} />
                      <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px' }} />
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
                <div className="mt-3 flex justify-center gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span>{t('sales')}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>{t('expenses')}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span>{t('purchases')}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span>{t('capital')}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-cyan-500"></div><span>{t('profit')}</span></div>
                </div>
              </div>
            </div>

            {/* INVENTARIO */}
            <div className="mb-8">
              <Inventario usuarioActual={usuarioActual} />
            </div>

            {/* ACORDEÓN PRODUCCIÓN */}
            {(() => {
              const puedeAccederProduccion = plan !== 'starter' || diasRestantes > 0;
              
              if (!puedeAccederProduccion) {
                return (
                  <div className="mb-4 p-6 bg-slate-800/30 rounded-xl border border-yellow-500/30 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl">🔒</span>
                      <h4 className="text-yellow-400 font-bold text-lg">
                        {idioma === 'en' ? 'Production Module' : 'Módulo de Producción'}
                      </h4>
                      <p className="text-gray-400 text-sm max-w-md">
                        {idioma === 'en' 
                          ? 'Your trial period has ended. Subscribe to a plan to continue using the production module.'
                          : 'Tu período de prueba ha terminado. Suscríbete a un plan para seguir usando el módulo de producción.'}
                      </p>
                      <button 
                        onClick={() => {
                          setFuncionBloqueada('Módulo de Producción');
                          setModalUpgradeOpen(true);
                        }}
                        className="mt-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                      >
                        {idioma === 'en' ? 'Subscribe Now' : 'Suscribirme ahora'}
                      </button>
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="mb-4">
                  <button 
                    onClick={() => setShowProduccion(!showProduccion)}
                    className="w-full bg-[#1e293b] text-white p-4 rounded-xl flex justify-between items-center border border-blue-900/30 hover:bg-[#2a3a4a] transition-all"
                  >
                    <span className="font-bold">🏭 {t('productionAudit')}</span>
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
              );
            })()}
            
            <ExecutiveReport 
              ventasTotales={ventasTotales}
              gastosTotales={gastosTotales}
              utilidadEstimada={utilidadEstimada}
              onUpgradeClick={() => {
                setFuncionBloqueada('Executive Report');
                setModalUpgradeOpen(true);
              }}
            />

            {/* ACORDEÓN REGISTRO MANUAL */}
            {(() => {
              const puedeAccederRegistro = plan !== 'starter' || diasRestantes > 0;
              
              if (!puedeAccederRegistro) {
                return (
                  <div className="mb-4 p-6 bg-slate-800/30 rounded-xl border border-yellow-500/30 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl">🔒</span>
                      <h4 className="text-yellow-400 font-bold text-lg">
                        {idioma === 'en' ? 'Manual Transaction Entry' : 'Registro Manual de Movimientos'}
                      </h4>
                      <p className="text-gray-400 text-sm max-w-md">
                        {idioma === 'en' 
                          ? 'Your trial period has ended. Subscribe to a plan to continue recording transactions.'
                          : 'Tu período de prueba ha terminado. Suscríbete a un plan para seguir registrando movimientos.'}
                      </p>
                      <button 
                        onClick={() => {
                          setFuncionBloqueada('Registro Manual');
                          setModalUpgradeOpen(true);
                        }}
                        className="mt-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                      >
                        {idioma === 'en' ? 'Subscribe Now' : 'Suscribirme ahora'}
                      </button>
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="mb-4">
                  <button 
                    onClick={() => setShowRegistroManual(!showRegistroManual)}
                    className="w-full bg-[#1e293b] text-white p-4 rounded-xl flex justify-between items-center border border-blue-900/30 hover:bg-[#2a3a4a] transition-all"
                  >
                    <span className="font-bold">✍️ {t('manualTransactionEntry')}</span>
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
              );
            })()}
            
            {(plan === 'business' || plan === 'elite') && (
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

            <div className="max-w-3xl mx-auto mb-8">
              <p className="text-center text-gray-500 text-sm">
                {idioma === 'es' 
                  ? '💡 Puedes registrar tus movimientos manualmente arriba. Los usuarios Business y Elite también pueden subir múltiples facturas a la vez.'
                  : '💡 You can register your transactions manually above. Business and Elite users can also upload multiple invoices at once.'}
              </p>
            </div>

            <section>
              <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h2 className="text-2xl font-bold text-white">{t('financialRecords')}</h2>
                <span className="text-cyan-400 text-sm font-medium">{movimientos.length} {t('totalTransactions')}</span>
              </div>

              {isLoading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="bg-[#1e293b]/50 border border-blue-900/20 rounded-xl p-5 animate-pulse"><div className="flex items-center justify-between"><div className="flex items-center"><div className="w-10 h-10 bg-slate-800 rounded-xl mr-4"></div><div><div className="h-4 w-32 bg-slate-800 rounded"></div><div className="h-3 w-24 bg-slate-800 rounded mt-2"></div></div></div><div className="h-6 w-20 bg-slate-800 rounded"></div></div></div>))}</div>
              ) : movimientos.length === 0 ? (
                <div className="bg-[#1e293b] border border-dashed border-blue-900/30 rounded-xl p-8 text-center"><p className="text-gray-500">{t('noRecords')}</p><p className="text-gray-400 text-sm mt-2">{t('writeOperation')}</p></div>
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
          <div className="bg-[#1e293b] rounded-2xl p-12 mb-8 border border-yellow-500/30 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">
              {idioma === 'en' ? 'Access Restricted' : 'Acceso Restringido'}
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              {plan === 'starter' && diasRestantes === 0
                ? (idioma === 'en' 
                    ? 'Your 15-day free trial has ended. Subscribe to continue using STRATIUM GLOBAL AI.'
                    : 'Tu prueba gratuita de 15 días ha terminado. Suscríbete para seguir usando STRATIUM GLOBAL AI.')
                : (idioma === 'en'
                    ? 'To access all STRATIUM GLOBAL AI features, please activate your subscription.'
                    : 'Para acceder a todas las funciones de STRATIUM GLOBAL AI, por favor activa tu suscripción.')}
            </p>
            <button
              onClick={() => {
                setFuncionBloqueada('Dashboard completo');
                setModalUpgradeOpen(true);
              }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
            >
              {idioma === 'en' ? 'Subscribe Now' : 'Suscribirme ahora'}
            </button>
          </div>
        )}
      </main>

      <footer className="py-6 px-4 border-t border-blue-900/20 mt-12">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>STRATIUM GLOBAL AI © {new Date().getFullYear()} • {t('subtitle')}</p>
        </div>
      </footer>

      {/* Modales */}
      <ModalUpgrade
        isOpen={modalUpgradeOpen}
        onClose={() => setModalUpgradeOpen(false)}
        funcionNombre={funcionBloqueada}
        onSeleccionarPlan={(plan) => {
          console.log('🔍 DEBUG - Plan seleccionado:', plan);
          console.log('🔍 DEBUG - usuarioActual?.uid:', usuarioActual?.uid);
          setModalUpgradeOpen(false);
          localStorage.setItem('pendingPlan', plan);
          localStorage.setItem('pendingUserId', usuarioActual?.uid);
          setPlanSeleccionadoPago(plan);
          console.log('🔍 DEBUG - setPlanSeleccionadoPago llamado con:', plan);
          setMostrarCheckout(true);
          console.log('🔍 DEBUG - mostrarCheckout seteado a true');
        }}
        moneda={moneda}
        t={t}
        onComprarCreditosSoporte={(paqueteId, paquete) => {
          console.log('🔍 DEBUG - Paquete de soporte seleccionado:', paqueteId, paquete);
          localStorage.setItem('pendingPaqueteSoporte', paqueteId);
          localStorage.setItem('pendingPaqueteSoporteData', JSON.stringify(paquete));
          setPlanSeleccionadoPago(`creditos_soporte_${paqueteId}`);
          console.log('🔍 DEBUG - setPlanSeleccionadoPago llamado con:', `creditos_soporte_${paqueteId}`);
          setMostrarCheckout(true);
          console.log('🔍 DEBUG - mostrarCheckout seteado a true (paquete soporte)');
        }}
      />
      
      <ModalFechaVencimiento
        isOpen={mostrarModalVencimiento}
        onClose={() => setMostrarModalVencimiento(false)}
        onGuardar={handleGuardarConVencimiento}
        onSaltar={handleSaltarVencimiento}
        producto={productoPendiente}
      />

      {mostrarCheckout && (
        <CheckoutMercadoPago
          plan={planSeleccionadoPago}
          userEmail={usuarioActual?.email}
          userId={usuarioActual?.uid}
          moneda={moneda?.codigo || 'COP'}
          onSuccess={() => {
            console.log("✅ Pago exitoso");
            setMostrarCheckout(false);
            setValidationMessage('✅ Pago exitoso. Tu plan ha sido actualizado.');
            setTimeout(() => setValidationMessage(null), 5000);
            setTimeout(() => window.location.reload(), 2000);
          }}
          onError={(error) => {
            console.log("❌ Error en pago:", error);
            setMostrarCheckout(false);
            setError('Error en el pago: ' + error);
            setTimeout(() => setError(null), 5000);
          }}
          onClose={() => {
            console.log("❌ Modal cerrado");
            setMostrarCheckout(false);
          }}
        />
      )}

      {modalReporteAbierto && (
        <SelectorReporte
          isOpen={modalReporteAbierto}
          onClose={() => setModalReporteAbierto(false)}
          onSelect={handleGenerarReporte}
          usuarioActual={usuarioActual}
          idioma={idioma}
        />
      )}

      <SupportBot 
        usuarioActual={usuarioActual}
        idioma={idioma}
        plan={plan}
        moneda={moneda}
        resumenFinanciero={resumenFinanciero}
        diagnosticoBienvenida={diagnosticoBienvenida}
      />
    </div>
  );
};

export default Dashboard;

