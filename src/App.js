import React, { useMemo } from 'react';
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
import { BentoGrid, BentoCard } from './components/common/BentoGrid';
import { CollapsibleCard } from './components/common/CollapsibleCard';

function AppContent() {
  const { 
    usuarioActual, cargandoAuth, movimientos, inventario, isLoading, 
    t, dispatch, validationMessage, error, modalUpgradeOpen, funcionBloqueada,
    setMovimientos, setInventario, ventasTotales, utilidadEstimada, margen, saldoCaja,
    exportarACSV, generarReportePDF, generandoReporte,
    seleccionarImagenFactura, handleFileUpload, subiendoArchivo, procesandoOCR,
    puedeAccederAFuncion, setMostrarLogsEliminaciones, mostrarLogsEliminaciones,
    logsEliminaciones, valoresAtipicos, inconsistenciaSaldo,
    sobrecostosProveedores, ahorroPotencial, analisisSalud, dictamenGeneral,
    puntoEquilibrio, rotacionInventario, anomaliasProductos,
    guardarProductoEnCatalogo, validarStockDisponible
  } = useApp();

  const movimientosFiltrados = useMemo(() => movimientos?.slice(0, 20) || [], [movimientos]);

  const kpis = { ventasTotales, utilidadEstimada, margen, saldoCaja };

  if (cargandoAuth) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><div className="text-cyan-400 animate-pulse">{t?.loadingAuth || 'Cargando...'}</div></div>;
  }
  if (!usuarioActual) return <PantallaLogin />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100">
      <Header 
        usuarioActual={usuarioActual}
        movimientos={movimientos}
        isLoading={isLoading}
        validationMessage={validationMessage}
        error={error}
        t={t}
        exportarACSV={exportarACSV}
        generarReportePDF={generarReportePDF}
        generarReportePreview={() => {}}
        seleccionarImagenFactura={seleccionarImagenFactura}
        handleFileUpload={handleFileUpload}
        subiendoArchivo={subiendoArchivo}
        procesandoOCR={procesandoOCR}
        puedeAccederAFuncion={puedeAccederAFuncion}
        setMostrarLogsEliminaciones={setMostrarLogsEliminaciones}
        mostrarLogsEliminaciones={mostrarLogsEliminaciones}
        generandoReporte={generandoReporte}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {validationMessage && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm animate-fade-in">
            {validationMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Alertas valores atípicos */}
        {puedeAccederAFuncion('puedeVerAnomalias') && valoresAtipicos?.length > 0 && (
          <div className="mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-xl">
            <h4 className="text-orange-400 font-bold mb-2">{t.alertaValorAtipico}</h4>
            {valoresAtipicos.slice(0, 3).map((atipico, idx) => (
              <div key={idx} className="text-sm text-orange-200 mb-1">{atipico.concepto}: {formatearValor(atipico.valor)} - {t.alertaValorAtipicoDesc}</div>
            ))}
          </div>
        )}

        {/* Modal logs eliminaciones */}
        {mostrarLogsEliminaciones && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setMostrarLogsEliminaciones(false)}>
            <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">{t.verLogsEliminaciones}</h3><button onClick={() => setMostrarLogsEliminaciones(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button></div>
              {logsEliminaciones?.length === 0 ? <p className="text-gray-400 text-center py-8">No hay registros de eliminaciones</p> : logsEliminaciones?.map((log) => (
                <div key={log.id} className="bg-slate-800/50 p-3 rounded-lg mb-2"><p className="text-red-400 text-sm font-bold">Eliminado: {log.concepto}</p><p className="text-gray-400 text-xs">Valor: {formatearValor(log.valor)}</p></div>
              ))}
            </div>
          </div>
        )}

        <KPICards 
          kpis={kpis} 
          formatearValor={formatearValor} 
          t={t}
          ventasTotales={ventasTotales}
          utilidadEstimada={utilidadEstimada}
          margen={margen}
          saldoCaja={saldoCaja}
          variaciones={null}
          puedeAccederAFuncion={puedeAccederAFuncion}
          setFuncionBloqueada={(f) => dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: f })}
        />

        {/* Mi Plan Actual */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-4 mb-6 border border-blue-500/30">
          <div className="flex flex-row justify-between items-center gap-4">
            <div><h3 className="text-lg font-bold text-white flex items-center gap-2">🎯 {t.miPlanActual || 'Mi Plan Actual'}</h3><p className="text-gray-400 text-xs">{t.gestionaSuscripcion || 'Gestiona tu suscripción'}</p></div>
            <button onClick={() => dispatch({ type: 'SET_MODAL_UPGRADE', payload: true })} className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 font-medium text-xs">{t.cambiarPlan || 'Cambiar Plan'}</button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
            <div className="bg-slate-800/50 rounded-lg p-2 text-center"><p className="text-gray-400 text-[10px] uppercase">{t.plan || 'Plan'}</p><p className="text-sm font-bold text-white">{usuarioActual?.plan === 'gratis' ? 'Starter' : usuarioActual?.plan === 'pro' ? 'Pro' : usuarioActual?.plan === 'business' ? 'Business' : 'Elite'}</p></div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center"><p className="text-gray-400 text-[10px] uppercase">{t.escaneos || 'Escaneos'}</p><p className="text-sm font-bold text-white">{(usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0)}/{usuarioActual?.creditosOCR || 0}</p></div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center"><p className="text-gray-400 text-[10px] uppercase">{t.dias || 'Días'}</p><p className="text-sm font-bold text-white">{(() => { if (!usuarioActual?.fechaVencimiento) return '∞'; const diff = Math.ceil((new Date(usuarioActual.fechaVencimiento) - new Date()) / (1000*60*60*24)); return diff <= 0 ? '0' : diff; })()}</p></div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center col-span-2"><p className="text-gray-400 text-[10px] uppercase">{t.capitalInyectado || 'Capital Inyectado'}</p><p className={`text-sm font-bold ${(usuarioActual?.aportesPersonales || 0) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{formatearValor(usuarioActual?.aportesPersonales || 0)}</p></div>
          </div>
        </div>

        <BentoGrid>
          <BentoCard colSpan={8}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🏭 {t.produccion || 'Auditoría de Producción'}</h2>
            <ProduccionForm usuarioActual={usuarioActual} t={t} />
          </BentoCard>
          <BentoCard colSpan={4}>
            <DictamenAuditoria dictamenGeneral={dictamenGeneral} t={t} />
          </BentoCard>
          <BentoCard colSpan={8}>
            <TermometroSalud analisisSalud={analisisSalud} t={t} puntoEquilibrio={puntoEquilibrio} rotacionInventario={rotacionInventario} puedeAccederAFuncion={puedeAccederAFuncion} formatearValor={formatearValor} />
          </BentoCard>
          <BentoCard colSpan={4}>
            <AlertasFinancieras analisisSalud={analisisSalud} t={t} sobrecostosProveedores={sobrecostosProveedores} ahorroPotencial={ahorroPotencial} formatearValor={formatearValor} puntoEquilibrio={puntoEquilibrio} anomaliasProductos={anomaliasProductos} puedeAccederAFuncion={puedeAccederAFuncion} />
          </BentoCard>
        </BentoGrid>

        <div className="md:hidden mb-6">
          <CollapsibleCard title="Registro Manual de Movimientos" icon="✍️">
            <RegistroManual usuarioActual={usuarioActual} t={t} guardarProductoEnCatalogo={guardarProductoEnCatalogo} saldoActual={saldoCaja} onSuccess={() => {}} onError={() => {}} />
          </CollapsibleCard>
        </div>
        <div className="hidden md:block mb-6">
          <RegistroManual usuarioActual={usuarioActual} t={t} guardarProductoEnCatalogo={guardarProductoEnCatalogo} saldoActual={saldoCaja} onSuccess={() => {}} onError={() => {}} />
        </div>

        {(usuarioActual?.plan === 'business' || usuarioActual?.plan === 'elite') && (
          <MassiveUpload usuarioActual={usuarioActual} onComplete={(r) => dispatch({ type: 'SET_VALIDATION', payload: `✅ ${r.success} productos importados, ${r.errors} errores` })} onError={(e) => dispatch({ type: 'SET_ERROR', payload: e })} />
        )}

        {/* Input Mágico - temporalmente deshabilitado hasta implementar handleSubmit */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder={t.ejemplo || '💬 "Compré 10 gorras por 125.000" o "Genera: Reporte"'}
              className="w-full bg-[#1e293b] border border-blue-900/30 rounded-xl px-6 py-4 pr-24 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
              {t.analizar || 'Analizar'}
            </button>
          </div>
        </div>

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
                <p className={`font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>{mov.tipo === 'ingreso' ? '+' : '-'} {formatearValor(mov.valor || 0)}</p>
              </div>
            ))}
            {movimientos?.length === 0 && <div className="text-center py-8 text-gray-500 italic">{t.sinDatos || 'No hay registros aún'}</div>}
          </div>
        </section>
      </main>

      <Footer t={t} />
      
      <ModalUpgrade isOpen={modalUpgradeOpen} onClose={() => dispatch({ type: 'SET_MODAL_UPGRADE', payload: false })} funcionNombre={funcionBloqueada} t={t} />
      
      <SupportBot usuarioActual={usuarioActual} t={t} />
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

