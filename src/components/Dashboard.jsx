import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Componentes
import Header from './layout/Header';
import Footer from './layout/Footer';
import KPICards from './layout/KPICards';
import TermometroSalud from './financial/TermometroSalud';
import AlertasFinancieras from './financial/AlertasFinancieras';
import DictamenAuditoria from './financial/DictamenAuditoria';
import ProduccionForm from './inventory/ProduccionForm';
import RegistroManual from './inventory/RegistroManual';
import MassiveUpload from './inventory/massive-upload';
import ModalUpgrade from './modals/ModalUpgrade';
import SupportBot from './SupportBot';
import { BentoGrid, BentoCard } from './common/BentoGrid';
import { CollapsibleCard } from './common/CollapsibleCard';

const TooltipIcon = ({ text }) => (
  <div className="relative group ml-1 inline-block">
    <span className="cursor-help text-gray-500 text-xs bg-gray-800 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-gray-300 text-xs rounded-lg shadow-lg z-50 border border-gray-700">{text}</div>
  </div>
);

const Dashboard = () => {
  const {
    t, dispatch, validationMessage, error,
    usuarioActual, movimientos, inventario, isLoading,
    ventasTotales, utilidadEstimada, margen, saldoCaja,
    datosGrafico, analisisSalud, dictamenGeneral,
    exportarACSV, generarReportePDF, generarReportePreview,
    guardarProductoEnCatalogo, validarStockDisponible,
    puedeAccederAFuncion, formatearValor,
    produccion, setProduccion, costeoResultado,
    calcularProduccion, calculandoProduccion, cargandoInventario,
    sobrecostosProveedores, ahorroPotencial,
    valoresAtipicos, inconsistenciaSaldo,
    logsEliminaciones, mostrarLogsEliminaciones, setMostrarLogsEliminaciones,
    seleccionarImagenFactura, handleFileUpload, procesandoOCR, subiendoArchivo,
    modalUpgradeOpen, funcionBloqueada,
    generandoReporte
  } = useApp();

  const [movimientosFiltrados, setMovimientosFiltrados] = useState([]);
  useEffect(() => setMovimientosFiltrados(movimientos.slice(0, 20)), [movimientos]);

  const variaciones = useMemo(() => {
    if (!puedeAccederAFuncion('puedeVerComparacionMensual')) return null;
    return { ventas: { variacion: 12 }, utilidad: { variacion: 8 } };
  }, [puedeAccederAFuncion]);

  const puntoEquilibrio = useMemo(() => {
    if (!puedeAccederAFuncion('puedeVerPuntoEquilibrio')) return null;
    return { puntoEquilibrio: 5000000, ventasActuales: ventasTotales, estaDebajo: ventasTotales < 5000000 };
  }, [puedeAccederAFuncion, ventasTotales]);

  const rotacionInventario = useMemo(() => {
    if (!puedeAccederAFuncion('puedeVerRotacionInventario')) return null;
    return { rotacion: 2.5, diasInventario: 12, tieneDatos: inventario.length > 0 };
  }, [puedeAccederAFuncion, inventario]);

  const anomaliasProductos = useMemo(() => {
    if (!puedeAccederAFuncion('puedeVerAnomalias')) return [];
    return [];
  }, [puedeAccederAFuncion]);

  if (usuarioActual?.suscripcionActiva === true || usuarioActual?.plan === 'gratis' || usuarioActual?.plan === 'starter') {
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
        />

        <main className="max-w-7xl mx-auto px-4 py-6">
          {validationMessage && <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">{validationMessage}</div>}
          {error && <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

          {/* Alertas de valores atípicos */}
          {puedeAccederAFuncion('puedeVerAnomalias') && valoresAtipicos.length > 0 && (
            <div className="mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-xl">
              <h4 className="text-orange-400 font-bold mb-2">{t.alertaValorAtipico}</h4>
              {valoresAtipicos.slice(0, 3).map((atipico, idx) => (
                <div key={idx} className="text-sm text-orange-200 mb-1">{atipico.concepto}: {formatearValor(atipico.valor)} - {t.alertaValorAtipicoDesc}</div>
              ))}
            </div>
          )}

          {/* Alerta inconsistencia saldo */}
          {inconsistenciaSaldo?.inconsistente && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
              <h4 className="text-red-400 font-bold mb-2">{t.alertaInconsistenciaSaldo}</h4>
              <p className="text-sm text-red-200">{t.alertaInconsistenciaSaldoDesc}</p>
              <p className="text-xs text-red-300 mt-2">Diferencia: {formatearValor(inconsistenciaSaldo.diferencia)}</p>
            </div>
          )}

          {/* Modal logs eliminaciones */}
          {mostrarLogsEliminaciones && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setMostrarLogsEliminaciones(false)}>
              <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">{t.verLogsEliminaciones}</h3><button onClick={() => setMostrarLogsEliminaciones(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button></div>
                {logsEliminaciones.length === 0 ? <p className="text-gray-400 text-center py-8">No hay registros de eliminaciones</p> : logsEliminaciones.map((log) => (
                  <div key={log.id} className="bg-slate-800/50 p-3 rounded-lg mb-2"><p className="text-red-400 text-sm font-bold">Eliminado: {log.concepto}</p><p className="text-gray-400 text-xs">Valor: {formatearValor(log.valor)}</p><p className="text-gray-500 text-xs">Fecha eliminación: {log.fechaEliminacion?.toDate ? new Date(log.fechaEliminacion.toDate()).toLocaleString('es-CO') : 'N/A'}</p></div>
                ))}
              </div>
            </div>
          )}

          <KPICards kpis={{ ventasTotales, utilidadEstimada, margen, saldoCaja }} formatearValor={formatearValor} t={t} variaciones={variaciones} puedeAccederAFuncion={puedeAccederAFuncion} setFuncionBloqueada={() => dispatch({ type: 'SET_MODAL_UPGRADE', payload: true, funcion: 'Comparación mensual' })} />

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

          {/* Registro Manual - Mobile collapsible */}
          <div className="md:hidden mb-6">
            <CollapsibleCard title="Registro Manual de Movimientos" icon="✍️">
              <RegistroManual usuarioActual={usuarioActual} t={t} />
            </CollapsibleCard>
          </div>
          <div className="hidden md:block mb-6">
            <RegistroManual usuarioActual={usuarioActual} t={t} />
          </div>

          {/* Carga Masiva */}
          {(usuarioActual?.plan === 'business' || usuarioActual?.plan === 'elite') && (
            <MassiveUpload usuarioActual={usuarioActual} onComplete={(r) => dispatch({ type: 'SET_VALIDATION', payload: `✅ ${r.success} productos importados, ${r.errors} errores` })} onError={(e) => dispatch({ type: 'SET_ERROR', payload: e })} />
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><span>📊</span> {t.ingresosVsEgresos}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={datosGrafico} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} stroke="#94a3b8" />
                  <YAxis dataKey="nombre" type="category" stroke="#94a3b8" width={80} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px' }} />
                  <Bar dataKey="valor" radius={[0,4,4,0]} fill="#8884d8">{datosGrafico.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista de movimientos */}
          <section><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{t.registros || 'Registros Recientes'}</h2><span className="text-cyan-400 text-sm">{movimientos.length} {t.totalTransacciones || 'transacciones'}</span></div><div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">{movimientosFiltrados.map((mov, idx) => <div key={mov.id || idx} className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-3 flex justify-between items-center hover:border-cyan-500/40 transition-all"><div className="flex items-center gap-3"><span className="text-2xl">{mov.emoji || '📄'}</span><div><p className="font-medium text-sm">{mov.concepto || mov.producto || mov.texto || 'Sin descripción'}</p><p className="text-xs text-gray-500">{mov.categoria || 'General'} • {mov.fecha ? new Date(mov.fecha).toLocaleDateString() : 'Fecha no disponible'}</p></div></div><p className={`font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>{mov.tipo === 'ingreso' ? '+' : '-'} {formatearValor(mov.valor || 0)}</p></div>)}</div></section>
        </main>

        <Footer t={t} />
        <ModalUpgrade isOpen={modalUpgradeOpen} onClose={() => dispatch({ type: 'SET_MODAL_UPGRADE', payload: false })} funcionNombre={funcionBloqueada} t={t} />
        <SupportBot usuarioActual={usuarioActual} t={t} />
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff' } }} />
      </div>
    );
  }

  // Acceso restringido
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-12 max-w-md w-full border border-yellow-500/30 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Acceso Restringido</h2>
        <p className="text-gray-400 mb-6">Para acceder a todas las funciones, activa tu suscripción.</p>
        <button onClick={() => dispatch({ type: 'SET_MODAL_UPGRADE', payload: true })} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-lg">Activar Suscripción</button>
      </div>
    </div>
  );
};

export default Dashboard;

