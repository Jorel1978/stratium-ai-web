import React, { useMemo, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Toaster } from 'react-hot-toast';
import { formatearValor } from './util/formatters';
// Componentes Layout
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import KPICards from './components/layout/KPICards';
import PantallaLogin from './components/auth/PantallaLogin';
// Componentes Financieros
import TermometroSalud from './components/financial/TermometroSalud';
import AlertasFinancieras from './components/financial/AlertasFinancieras';
import DictamenAuditoria from './components/financial/DictamenAuditoria';
// Componentes Inventario
import ProduccionForm from './components/inventory/ProduccionForm';
import RegistroManual from './components/inventory/RegistroManual';
import MassiveUpload from './components/inventory/massive-upload';
// Componentes Modales y Utils
import ModalUpgrade from './components/modals/ModalUpgrade';
import SupportBot from './components/SupportBot';
import ConfiguracionAuditoria from './components/ConfiguracionAuditoria';
import { BentoGrid, BentoCard } from './components/common/BentoGrid';
import { CollapsibleCard } from './components/common/CollapsibleCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CheckoutMercadoPago from './components/CheckoutMercadoPago';
import PacksEscaneos from './components/PacksEscaneos';

function AppContent() {
  const {
  usuarioActual, cargandoAuth, movimientos, inventario, isLoading,
  t, dispatch, validationMessage, error,
  modalUpgradeOpen, funcionBloqueada, mostrarConfigModal, setMostrarConfigModal,
  mostrarCheckout, setMostrarCheckout, planSeleccionadoPago, setPlanSeleccionadoPago,
  ventasTotales, utilidadEstimada, margen, saldoCaja, datosGrafico,
  exportarACSV, generarReportePDF, generarReportePreview, generandoReporte,
  seleccionarImagenFactura, handleFileUpload, subiendoArchivo, procesandoOCR,
  puedeAccederAFuncion, setMostrarLogsEliminaciones, mostrarLogsEliminaciones,
  logsEliminaciones, valoresAtipicos, inconsistenciaSaldo,
  sobrecostosProveedores, ahorroPotencial, analisisSalud, dictamenGeneral,
  guardarProductoEnCatalogo, validarStockDisponible,
  inputValue, setInputValue, handleSubmit, handleLogout,
  productosEstrella, productosHueso, puntoEquilibrio, rotacionInventario, anomaliasProductos,
  idioma, setMoneda, moneda,
  setInventario,        // ✅ AÑADE ESTA
  setMovimientos        // ✅ AÑADE ESTA
} = useApp();

  const movimientosFiltrados = useMemo(() => movimientos?.slice(0, 20) || [], [movimientos]);
  const kpis = { ventasTotales, utilidadEstimada, margen, saldoCaja };

  // ✅ SOLUCIÓN 1: Función explícita para abrir el modal de planes
  const abrirModalPlanes = () => {
    dispatch({ type: 'SET_MODAL_UPGRADE', payload: true });
  };

  // Cambiar idioma desde el contexto
  const onChangeIdioma = (lang) => {
    dispatch({ type: 'SET_IDIOMA', payload: lang });
  };

  useEffect(() => {
    // Esto asegura que los gráficos se rendericen correctamente
  }, [datosGrafico]);

  if (cargandoAuth) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><div className="text-cyan-400 animate-pulse">{t?.loadingAuth || 'Cargando...'}</div></div>;
  }
  if (!usuarioActual) return <PantallaLogin />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
      <Header
        usuarioActual={usuarioActual}
        movimientos={movimientos}
        isLoading={isLoading}
        validationMessage={validationMessage}
        error={error}
        t={t}
        exportarACSV={exportarACSV}
        generarReportePDF={generarReportePDF}
        generarReportePreview={generarReportePreview}
        seleccionarImagenFactura={seleccionarImagenFactura}
        handleFileUpload={handleFileUpload}
        subiendoArchivo={subiendoArchivo}
        procesandoOCR={procesandoOCR}
        puedeAccederAFuncion={puedeAccederAFuncion}
        setMostrarLogsEliminaciones={setMostrarLogsEliminaciones}
        mostrarLogsEliminaciones={mostrarLogsEliminaciones}
        generandoReporte={generandoReporte}
        onChangeIdioma={onChangeIdioma}
        handleLogout={handleLogout}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Notificaciones */}
        {validationMessage && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            {validationMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Alertas valores atípicos */}
        {puedeAccederAFuncion('puedeVerAnomalias') && valoresAtipicos?.length > 0 && (
          <div className="mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-xl">
            <h4 className="text-orange-400 font-bold mb-2">{t.alertaValorAtipico}</h4>
            {valoresAtipicos.slice(0, 3).map((atipico, idx) => (
              <div key={idx} className="text-sm text-orange-200 mb-1">
                {atipico.concepto}: {formatearValor(atipico.valor)} - {t.alertaValorAtipicoDesc}
              </div>
            ))}
          </div>
        )}

        {/* Inconsistencia de saldo */}
        {inconsistenciaSaldo?.inconsistente && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
            <h4 className="text-red-400 font-bold mb-2">{t.alertaInconsistenciaSaldo}</h4>
            <p className="text-sm text-red-200">{t.alertaInconsistenciaSaldoDesc}</p>
          </div>
        )}

        {/* Modal logs eliminaciones */}
        {mostrarLogsEliminaciones && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setMostrarLogsEliminaciones(false)}>
            <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{t.verLogsEliminaciones}</h3>
                <button onClick={() => setMostrarLogsEliminaciones(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>
              {logsEliminaciones?.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay registros de eliminaciones</p>
              ) : (
                logsEliminaciones?.map((log) => (
                  <div key={log.id} className="bg-slate-800/50 p-3 rounded-lg mb-2">
                    <p className="text-red-400 text-sm font-bold">Eliminado: {log.concepto}</p>
                    <p className="text-gray-400 text-xs">Valor: {formatearValor(log.valor)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* KPIs Cards */}
        {/* ✅ SOLUCIÓN 2: Añadido mt-8 para separar del bloque de Plan Actual */}
        <div className="mt-8">
          <KPICards
            kpis={kpis}
            formatearValor={formatearValor}
            t={t}
            ventasTotales={ventasTotales}
            utilidadEstimada={utilidadEstimada}
            margen={margen}
            saldoCaja={saldoCaja}
            puedeAccederAFuncion={puedeAccederAFuncion}
            setFuncionBloqueada={(f) => dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: f })}
          />
        </div>

                {/* Mi Plan Actual - Sección completa */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-4 mt-8 mb-6 border border-blue-500/30">
          <div className="flex flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🎯 {t.miPlanActual || 'Mi Plan Actual'}</h3>
              <p className="text-gray-400 text-xs">{t.gestionaSuscripcion || 'Gestiona tu suscripción'}</p>
            </div>
            <button
              onClick={abrirModalPlanes}
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
                {(usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0)}/{usuarioActual?.creditosOCR || 0}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-[10px] uppercase">{t.dias || 'Días'}</p>
              <p className="text-sm font-bold text-white">
                {(() => {
                  if (!usuarioActual?.fechaVencimiento) return '∞';
                  const fechaVenc = usuarioActual.fechaVencimiento?.toDate?.() || new Date(usuarioActual.fechaVencimiento);
                  const diff = Math.ceil((fechaVenc - new Date()) / (1000 * 60 * 60 * 24));
                  return diff <= 0 ? '0' : diff;
                })()}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center col-span-2">
              <p className="text-gray-400 text-[10px] uppercase">{t.capitalInyectado || 'Capital Inyectado'}</p>
              <p className={`text-sm font-bold ${(usuarioActual?.aportesPersonales || 0) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {formatearValor(usuarioActual?.aportesPersonales || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Configuración de Auditoría - PAÍS, GASTOS FIJOS, PLATAFORMA */}
        <div className="mb-6">
          <ConfiguracionAuditoria 
            usuarioActual={usuarioActual} 
            idioma={t} 
            onClose={() => {}}
          />
        </div>

        {/* Bento Grid - Dashboard principal */}
        <BentoGrid>
          {/* Auditoría de Producción - 8 columnas */}
          <BentoCard colSpan={8}>
            <div className="md:hidden">
              <CollapsibleCard title={t.produccion || 'Auditoría de Producción'} icon="🏭">
                <ProduccionForm 
                  usuarioActual={usuarioActual} 
                  idioma={idioma} 
                  setInventario={setInventario}
                  setMovimientos={setMovimientos}
                  onSuccess={() => dispatch({ type: 'SET_VALIDATION', payload: '✅ Producción auditada y cargada al inventario' })}
                  onError={(e) => dispatch({ type: 'SET_ERROR', payload: e })}
                />
              </CollapsibleCard>
            </div>
            <div className="hidden md:block">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🏭 {t.produccion || 'Auditoría de Producción'}</h2>
              <ProduccionForm 
                usuarioActual={usuarioActual} 
                idioma={idioma} 
                setInventario={setInventario}
                setMovimientos={setMovimientos}
                onSuccess={() => dispatch({ type: 'SET_VALIDATION', payload: '✅ Producción auditada y cargada al inventario' })}
                onError={(e) => dispatch({ type: 'SET_ERROR', payload: e })}
              />
            </div>
          </BentoCard>
          
          {/* Dictamen de Auditoría - 4 columnas */}
          <BentoCard colSpan={4}>
            <div className="md:hidden">
              <CollapsibleCard title={t.dictamen || 'Dictamen de Auditoría'} icon="📋">
                <DictamenAuditoria dictamenGeneral={dictamenGeneral} t={t} />
              </CollapsibleCard>
            </div>
            <div className="hidden md:block">
              <DictamenAuditoria dictamenGeneral={dictamenGeneral} t={t} />
            </div>
          </BentoCard>
          
          {/* Termómetro de Salud - 6 columnas */}
          <BentoCard colSpan={6}>
            <TermometroSalud
              analisisSalud={analisisSalud}
              t={t}
              puntoEquilibrio={puntoEquilibrio}
              rotacionInventario={rotacionInventario}
              puedeAccederAFuncion={puedeAccederAFuncion}
              formatearValor={formatearValor}
            />
          </BentoCard>
          
          {/* Gráficos Ingresos vs Egresos - 6 columnas */}
          <BentoCard colSpan={6}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📊</span> {t.ingresosVsEgresos}
            </h3>
            {datosGrafico && datosGrafico.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={datosGrafico} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} stroke="#94a3b8" />
                  <YAxis dataKey="nombre" type="category" stroke="#94a3b8" width={80} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px' }} />
                  <Bar dataKey="valor" radius={[0,4,4,0]} fill="#8884d8">
                    {datosGrafico.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </BentoCard>
          
          {/* Alertas Financieras - 4 columnas */}
          <BentoCard colSpan={4}>
            <AlertasFinancieras
              analisisSalud={analisisSalud}
              t={t}
              sobrecostosProveedores={sobrecostosProveedores}
              ahorroPotencial={ahorroPotencial}
              formatearValor={formatearValor}
              puntoEquilibrio={puntoEquilibrio}
              anomaliasProductos={anomaliasProductos}
              puedeAccederAFuncion={puedeAccederAFuncion}
            />
          </BentoCard>
        </BentoGrid>

        {/* Registro Manual compactado y centrado */}
        <div className="my-8">
          <div className="max-w-2xl mx-auto">
            <CollapsibleCard title={t.registroManual || 'Registro Manual de Movimientos'} icon="✍️">
              <RegistroManual
                usuarioActual={usuarioActual}
                t={t}
                guardarProductoEnCatalogo={guardarProductoEnCatalogo}
                saldoActual={saldoCaja}
                onSuccess={() => dispatch({ type: 'SET_VALIDATION', payload: '✅ Movimiento registrado' })}
                onError={(e) => dispatch({ type: 'SET_ERROR', payload: e })}
              />
            </CollapsibleCard>
          </div>
        </div>

        {/* Botón escaneo facturas (Visible para todos) */}
        <div className="max-w-3xl mx-auto mb-4 flex justify-end">
          <button
            onClick={seleccionarImagenFactura}
            disabled={procesandoOCR}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
          >
            <span>{procesandoOCR ? '⏳' : '📷'}</span>
            <span>{procesandoOCR ? (t.procesandoOCR || 'Procesando...') : (t.escanearFactura || 'Escanear Factura')}</span>
          </button>
        </div>
        
        {/* Carga Masiva - HABILITADO PARA PRUEBAS */}
        <MassiveUpload
          usuarioActual={usuarioActual}
          onComplete={(r) => dispatch({ type: 'SET_VALIDATION', payload: r.mensaje || `✅ ${r.success} productos importados` })}
          onError={(e) => dispatch({ type: 'SET_ERROR', payload: e })}
        />

        {/* Input Mágico */}
        <form onSubmit={(e) => handleSubmit(e, inventario)} className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.ejemplo || '💬 "Compré 10 gorras por 125.000" o "Genera: Reporte"'}
              className="w-full bg-[#1e293b] border border-blue-900/30 rounded-xl px-6 py-4 pr-24 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
            >
              {t.analizar || 'Analizar'}
            </button>
          </div>
        </form>

        {/* Lista de movimientos recientes */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{t.registros || 'Registros Recientes'}</h2>
            <span className="text-cyan-400 text-sm">{movimientos?.length || 0} {t.totalTransacciones || 'transacciones'}</span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {movimientosFiltrados.map((mov, idx) => (
              <div key={mov.id || idx} className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-3 flex justify-between items-center hover:border-cyan-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mov.emoji || '📄'}</span>
                  <div>
                    <p className="font-medium text-sm">{mov.concepto || mov.producto || mov.texto || 'Sin descripción'}</p>
                    <p className="text-xs text-gray-500">{mov.categoria || 'General'} • {mov.fecha ? new Date(mov.fecha).toLocaleDateString() : 'Fecha no disponible'}</p>
                  </div>
                </div>
                <p className={`font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {mov.tipo === 'ingreso' ? '+' : '-'} {formatearValor(mov.valor || 0)}
                </p>
              </div>
            ))}
            {movimientos?.length === 0 && (
              <div className="text-center py-8 text-gray-500 italic">{t.sinDatos || 'No hay registros aún'}</div>
            )}
          </div>
        </section>
      </main>
      
      <Footer t={t} />
      
            {/* Modales */}
      <ModalUpgrade
        isOpen={modalUpgradeOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_UPGRADE', payload: false })}
        funcionNombre=""
        t={t}
        moneda={moneda || { mostrarCOP: true }}
        onSeleccionarPlan={(plan) => {
          setPlanSeleccionadoPago(plan);
          setMostrarCheckout(true);
        }}
        onComprarCreditosSoporte={(paqueteId, paquete) => {
          setPlanSeleccionadoPago(`creditos_soporte_${paqueteId}`);
          setMostrarCheckout(true);
        }}
      />

      {mostrarCheckout && (
        <CheckoutMercadoPago
          plan={planSeleccionadoPago}
          userEmail={usuarioActual?.email}
          userId={usuarioActual?.uid}
          moneda={moneda}
          onSuccess={() => {
            setMostrarCheckout(false);
            dispatch({ type: 'SET_VALIDATION', payload: '✅ Pago exitoso! Tu plan ha sido actualizado.' });
            setTimeout(() => window.location.reload(), 2000);
          }}
          onError={(error) => {
            setMostrarCheckout(false);
            dispatch({ type: 'SET_ERROR', payload: 'Error en el pago: ' + error });
          }}
          onClose={() => setMostrarCheckout(false)}
        />
      )}

      {mostrarConfigModal && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4" onClick={() => setMostrarConfigModal(false)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <ConfiguracionAuditoria usuarioActual={usuarioActual} idioma={t} onClose={() => setMostrarConfigModal(false)} />
          </div>
        </div>
      )}
      
      <SupportBot usuarioActual={usuarioActual} t={t} plan={usuarioActual?.plan} moneda={{ codigo: 'COP' }} />
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff' } }} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

