// src/components/PlanesTable.jsx
import React from 'react';
import { PERMISOS, obtenerPermisos } from '../config/permisos';
import { useTranslation } from '../hooks/useTranslation';

const PlanesTable = () => {
  const { t, idioma } = useTranslation();
  const lang = idioma === 'en' ? 'en' : 'es';
  
  const planes = ['starter', 'pro', 'business', 'elite'];
  const funcionalidades = [
    'registroManual',
    'historial',
    'inventario',
    'dashboard',
    'exportarCSV',
    'reportesPDF',
    'alertas',
    'comparacionMensual',
    'puntoEquilibrio',
    'rotacionInventario',
    'produccion',
    'auditoriaSobrecostos',
    'deteccionFugas',
    'flujoCajaProyectado',
    'radarQuiebra',
    'modoConsultor',
    'bot',
    'whatsapp',
    'usuarios',
    'mensajesIA'
  ];
  
  const nombresFuncionalidades = {
    registroManual: { es: "Registro manual", en: "Manual entry" },
    historial: { es: "Historial", en: "History" },
    inventario: { es: "Inventario", en: "Inventory" },
    dashboard: { es: "Dashboard", en: "Dashboard" },
    exportarCSV: { es: "Exportar CSV", en: "Export CSV" },
    reportesPDF: { es: "Reportes PDF", en: "PDF Reports" },
    alertas: { es: "Alertas", en: "Alerts" },
    comparacionMensual: { es: "Comparación mensual", en: "Monthly comparison" },
    puntoEquilibrio: { es: "Punto equilibrio", en: "Break-even point" },
    rotacionInventario: { es: "Rotación inventario", en: "Inventory turnover" },
    produccion: { es: "Módulo Producción", en: "Production Module" },
    auditoriaSobrecostos: { es: "Auditoría sobrecostos", en: "Overcost audit" },
    deteccionFugas: { es: "Detección fugas", en: "Leak detection" },
    flujoCajaProyectado: { es: "Flujo caja proyectado", en: "Projected cash flow" },
    radarQuiebra: { es: "Radar quiebra", en: "Bankruptcy radar" },
    modoConsultor: { es: "Modo Consultor", en: "Consultant Mode" },
    bot: { es: "Bot IA", en: "AI Bot" },
    whatsapp: { es: "Alertas WhatsApp", en: "WhatsApp alerts" },
    usuarios: { es: "Usuarios", en: "Users" },
    mensajesIA: { es: "Mensajes IA/mes", en: "AI messages/month" }
  };
  
  const getValor = (plan, funcionalidad) => {
    const permisos = obtenerPermisos(plan);
    const valor = permisos[funcionalidad];
    
    if (funcionalidad === 'usuarios') return valor;
    if (funcionalidad === 'mensajesIA') return valor;
    
    if (typeof valor === 'boolean') {
      return valor ? '✅' : '❌';
    }
    
    if (typeof valor === 'object' && valor !== null) {
      if (valor.texto) return valor.texto[lang];
      if (valor.nivel) {
        if (funcionalidad === 'bot') {
          const niveles = {
            false: '❌',
            comandos: lang === 'es' ? 'Comandos básicos' : 'Basic commands',
            chat: lang === 'es' ? 'Chat completo' : 'Full chat',
            full: lang === 'es' ? 'Bot activo + alertas' : 'Active bot + alerts'
          };
          return niveles[valor.nivel] || '✅';
        }
        return '✅';
      }
      if (valor.disponible !== undefined) {
        if (!valor.disponible && valor.watermark) return lang === 'es' ? 'Vista previa' : 'Preview';
        return valor.disponible ? '✅' : '❌';
      }
      return '✅';
    }
    
    return valor || '❌';
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-800">
            <th className="p-3 text-left text-white font-bold">{t('feature') || 'Funcionalidad'}</th>
            {planes.map(plan => {
              const p = obtenerPermisos(plan);
              return (
                <th key={plan} className="p-3 text-center text-white font-bold">
                  <div>{p.nombre[lang]}</div>
                  <div className="text-xs text-cyan-400">{p.eslogan[lang]}</div>
                  <div className="text-xs text-gray-400 mt-1">{p.precio[lang]}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {funcionalidades.map(func => (
            <tr key={func} className="border-b border-slate-700 hover:bg-slate-800/50">
              <td className="p-3 text-gray-300 font-medium">
                {nombresFuncionalidades[func][lang]}
              </td>
              {planes.map(plan => (
                <td key={`${plan}-${func}`} className="p-3 text-center text-gray-400">
                  {getValor(plan, func)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanesTable;

