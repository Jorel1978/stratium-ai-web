import React from 'react';
import { usePlanPermissions } from '../hooks/usePlanPermissions';

const SelectorReporte = ({ isOpen, onClose, onSelect, usuarioActual, idioma }) => {
  const { plan, getReportesDisponibles } = usePlanPermissions(usuarioActual);
  const lang = idioma === 'en' ? 'en' : 'es';
  
  if (!isOpen) return null;
  
  const reportesDisponibles = getReportesDisponibles();
  
  const REPORTES = {
    pyg: { nombre: { es: 'Estado de Resultados (PyG)', en: 'Profit & Loss Statement' } },
    ventas: { nombre: { es: 'Reporte de Ventas', en: 'Sales Report' } },
    gastos: { nombre: { es: 'Reporte de Gastos', en: 'Expenses Report' } },
    compras: { nombre: { es: 'Reporte de Compras', en: 'Purchases Report' } },
    inventario: { nombre: { es: 'Reporte de Inventario', en: 'Inventory Report' } },
    cuentasPagar: { nombre: { es: 'Cuentas por Pagar', en: 'Accounts Payable' } },
    cuentasCobrar: { nombre: { es: 'Cuentas por Cobrar', en: 'Accounts Receivable' } },
    flujoCaja: { nombre: { es: 'Flujo de Caja', en: 'Cash Flow' } },
    auditoria: { nombre: { es: 'Auditoría Forense', en: 'Forensic Audit' } },
    utilidades6: { nombre: { es: '6 Tipos de Utilidades', en: '6 Profit Margins' } },
    kpi: { nombre: { es: 'Informe KPI', en: 'KPI Dashboard' } },
    comparativoMes: { nombre: { es: 'Comparativo por Mes', en: 'Monthly Comparison' } },
    comparativoAnio: { nombre: { es: 'Comparativo por Año', en: 'Yearly Comparison' } },
    roi: { nombre: { es: 'ROI por Artículo', en: 'ROI per Product' } },
    proyecciones: { nombre: { es: 'Proyecciones (30/60/90 días)', en: 'Projections (30/60/90 days)' } }
  };
  
  const grupos = [
    { titulo: { es: 'Reportes Básicos', en: 'Basic Reports' }, items: ['pyg', 'ventas', 'gastos', 'compras', 'inventario'] },
    { titulo: { es: 'Reportes de Cartera', en: 'Portfolio Reports' }, items: ['cuentasPagar', 'cuentasCobrar'] },
    { titulo: { es: 'Reportes Financieros', en: 'Financial Reports' }, items: ['flujoCaja', 'auditoria', 'utilidades6', 'kpi'] },
    { titulo: { es: 'Reportes de Análisis', en: 'Analysis Reports' }, items: ['comparativoMes', 'comparativoAnio', 'roi', 'proyecciones'] }
  ];
  
  const estaPermitido = (reporteId) => {
    if (reportesDisponibles === 'todos') return true;
    return reportesDisponibles.includes(reporteId);
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            {lang === 'en' ? 'Select Report Type' : 'Seleccionar tipo de reporte'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="text-sm text-gray-400 mb-4 p-3 bg-slate-800/50 rounded-lg">
          {lang === 'en' 
            ? `Your plan: ${plan.toUpperCase()} - Available reports: ${reportesDisponibles === 'todos' ? 'All reports' : reportesDisponibles.length}`
            : `Tu plan: ${plan.toUpperCase()} - Reportes disponibles: ${reportesDisponibles === 'todos' ? 'Todos los reportes' : reportesDisponibles.length}`}
        </div>
        
        {grupos.map((grupo, idx) => (
          <div key={idx} className="mb-4">
            <h4 className="text-cyan-400 font-bold text-sm mb-2">{grupo.titulo[lang]}</h4>
            <div className="grid grid-cols-2 gap-2">
              {grupo.items.map(reporteId => {
                const reporte = REPORTES[reporteId];
                const permitido = estaPermitido(reporteId);
                
                return (
                  <button
                    key={reporteId}
                    onClick={() => permitido && onSelect(reporteId)}
                    disabled={!permitido}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      permitido
                        ? 'bg-slate-800 border-slate-700 hover:border-cyan-500 hover:bg-slate-700 cursor-pointer'
                        : 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm">{reporte.nombre[lang]}</span>
                      {!permitido && <span className="text-xs text-yellow-500">🔒</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-gray-500">
          {plan === 'starter' && (
            <p>{lang === 'en' 
              ? '✅ You have 1 free report. After that, upgrade to continue generating reports.'
              : '✅ Tienes 1 reporte gratuito. Después, actualiza para seguir generando reportes.'}
            </p>
          )}
          {plan === 'pro' && (
            <p>{lang === 'en'
              ? `📊 You have ${limites?.limiteMensual || 5} reports per month. Upgrade to Business for more.`
              : `📊 Tienes ${limites?.limiteMensual || 5} reportes por mes. Actualiza a Business para más.`}
            </p>
          )}
          {plan === 'business' && (
            <p>{lang === 'en'
              ? `📊 You have ${limites?.limiteMensual || 20} reports per month. Upgrade to Elite for unlimited.`
              : `📊 Tienes ${limites?.limiteMensual || 20} reportes por mes. Actualiza a Elite para ilimitados.`}
            </p>
          )}
          {plan === 'elite' && (
            <p>{lang === 'en'
              ? '✨ Unlimited reports included in your Elite plan.'
              : '✨ Reportes ilimitados incluidos en tu plan Elite.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectorReporte;

