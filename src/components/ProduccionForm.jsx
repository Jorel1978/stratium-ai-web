// components/ProduccionForm.jsx
// Módulo de Producción con Auditoría Implacable v2.1

import React, { useState } from 'react';
import { getFirestore } from 'firebase/firestore';
import { useAuditEngine } from '../hooks/useAuditEngine';
import { generarDictamenEspecialista } from '../util/auditoriaDiagnostico';
import { useCargarProduccion } from '../hooks/useCargarProduccion';

const ProduccionForm = ({ usuarioActual, idioma, t, onSuccess, onError, setInventario, setMovimientos }) => {
  const [formData, setFormData] = useState({
    nombreProducto: '',
    unidadesProducidas: 1,
    materialesTotal: '',
    horasLaborTotal: '',
    valorHoraPersonalizado: '',
    transporteTotal: '',
    precioVentaUnitario: ''
  });
  
  const [resultadoAuditoria, setResultadoAuditoria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [mostrarConfigAlert, setMostrarConfigAlert] = useState(false);
  
  const db = getFirestore();
  const { auditarProduccion, configuracion, cargandoConfig } = useAuditEngine(usuarioActual);
  const { cargarAInventario } = useCargarProduccion(usuarioActual);

  // Si t no existe, usar objeto por defecto
  const safeT = t || {};

  const formatMoney = (valor, moneda = 'COP') => {
    const opciones = {
      'COP': { locale: 'es-CO', currency: 'COP', minimumFractionDigits: 0 },
      'USD': { locale: 'en-US', currency: 'USD', minimumFractionDigits: 2 },
      'EUR': { locale: 'es-ES', currency: 'EUR', minimumFractionDigits: 2 },
      'MXN': { locale: 'es-MX', currency: 'MXN', minimumFractionDigits: 0 },
      'ARS': { locale: 'es-AR', currency: 'ARS', minimumFractionDigits: 0 }
    };
    const config = opciones[moneda] || opciones.COP;
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: config.minimumFractionDigits
    }).format(Math.abs(valor));
  };

  const textos = {
    es: {
      titulo: '🏭 Auditoría de Producción v2.1',
      subtitulo: 'Análisis de rentabilidad real con costos ocultos',
      nombre: 'Nombre del Producto',
      unidades: 'Unidades a producir',
      materiales: 'Inversión en Materiales',
      horas: 'Horas de Trabajo (totales)',
      valorHora: 'Valor Hora (opcional)',
      transporte: 'Gastos de Transporte',
      precioVenta: 'Precio de Venta (unitario)',
      validar: '🔍 Auditar Rentabilidad',
      calculando: 'Auditando...',
      guardar: '📦 Cargar a Inventario',
      guardando: 'Cargando...',
      exito: '✅ Producto cargado al inventario',
      sinConfiguracion: '⚠️ Configuración Incompleta',
      irAConfiguracion: 'Ir a Configuración',
      configNecesaria: 'Para evaluar rentabilidad real, necesitas configurar los gastos fijos de tu negocio.',
      costoBase: 'Costo Base por unidad',
      costoCargado: 'Costo Real Cargado',
      ingresoNeto: 'Ingreso Neto por unidad',
      margen: 'Margen Neto Real',
      dictamen: 'Dictamen del Auditor',
      detalles: 'Desglose de costos',
      materialesLabel: 'Materiales',
      manoObraLabel: 'Mano de obra (con prestaciones)',
      transporteLabel: 'Transporte',
      gastosFijosLabel: 'Gastos fijos aplicados',
      devolucionesLabel: 'Provisión devoluciones',
      comisionesLabel: 'Comisiones y tasas',
      alertas: 'Alertas de Auditoría',
      precioSugerido: 'Precio sugerido',
      dictamenEspecialista: '🔍 Dictamen del Especialista'
    },
    en: {
      titulo: '🏭 Production Audit v2.1',
      subtitulo: 'Real profitability analysis with hidden costs',
      nombre: 'Product Name',
      unidades: 'Units to produce',
      materiales: 'Materials Investment',
      horas: 'Work Hours (total)',
      valorHora: 'Hourly Rate (optional)',
      transporte: 'Shipping Costs',
      precioVenta: 'Selling Price (per unit)',
      validar: '🔍 Audit Profitability',
      calculando: 'Auditing...',
      guardar: '📦 Add to Inventory',
      guardando: 'Loading...',
      exito: '✅ Product added to inventory',
      sinConfiguracion: '⚠️ Incomplete Configuration',
      irAConfiguracion: 'Go to Settings',
      configNecesaria: 'To evaluate real profitability, you need to configure your fixed monthly expenses.',
      costoBase: 'Base Cost per unit',
      costoCargado: 'Loaded Real Cost',
      ingresoNeto: 'Net Income per unit',
      margen: 'Real Net Margin',
      dictamen: 'Audit Verdict',
      detalles: 'Cost breakdown',
      materialesLabel: 'Materials',
      manoObraLabel: 'Labor (with benefits)',
      transporteLabel: 'Shipping',
      gastosFijosLabel: 'Applied fixed costs',
      devolucionesLabel: 'Returns provision',
      comisionesLabel: 'Fees & taxes',
      alertas: 'Audit Alerts',
      precioSugerido: 'Suggested price',
      dictamenEspecialista: '🔍 Specialist Verdict'
    }
  };

  const langTexts = textos[idioma] || textos.es;
  
  // Usar safeT si tiene las propiedades, sino usar langTexts
  const getText = (key) => {
    return safeT[key] || langTexts[key] || key;
  };

  const handleCalcularAuditoria = async () => {
    setCalculando(true);
    setResultadoAuditoria(null);
    
    try {
      const resultado = await auditarProduccion({
        nombreProducto: formData.nombreProducto,
        unidadesProducidas: parseInt(formData.unidadesProducidas) || 1,
        materialesTotal: parseFloat(formData.materialesTotal) || 0,
        horasLaborTotal: parseFloat(formData.horasLaborTotal) || 0,
        valorHoraPersonalizado: parseFloat(formData.valorHoraPersonalizado) || null,
        transporteTotal: parseFloat(formData.transporteTotal) || 0,
        precioVentaUnitario: parseFloat(formData.precioVentaUnitario) || 0
      });
      
      if (resultado.requiereConfiguracion) {
        setMostrarConfigAlert(true);
      }
      
      const hallazgos = generarDictamenEspecialista(resultado, configuracion, idioma);
      resultado.hallazgosEspecialistas = hallazgos;
      
      setResultadoAuditoria(resultado);
      
    } catch (error) {
      console.error('Error en auditoría:', error);
      setResultadoAuditoria({
        error: error.message,
        dictamen: '❌ Error en el cálculo'
      });
    } finally {
      setCalculando(false);
    }
  };

  const handleCargarProduccion = async () => {
    if (!resultadoAuditoria?.aprobado) {
      alert('⚠️ No puedes cargar este producto. El dictamen de auditoría es RECHAZADO.');
      return;
    }
    
    const produccionData = {
      productoNombre: formData.nombreProducto,
      materiales: formData.materialesTotal,
      horas: formData.horasLaborTotal,
      valorHora: formData.valorHoraPersonalizado,
      transporte: formData.transporteTotal,
      precioVenta: formData.precioVentaUnitario
    };
    
    await cargarAInventario(
      produccionData,
      { costoUnitario: resultadoAuditoria.costoUnitarioCargado },
      setFormData,
      setResultadoAuditoria,
      () => {},
      () => {},
      setLoading,
      setInventario,
      setMovimientos
    );
    
    if (onSuccess) onSuccess();
  };

  if (cargandoConfig) {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <p className="text-gray-400 text-center">Cargando configuración de auditoría...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-2">{getText('produccion') || '🏭 Auditoría de Producción v2.1'}</h3>
      <p className="text-gray-400 text-sm mb-4">{getText('produccion') || 'Análisis de rentabilidad real con costos ocultos'}</p>
      
      {mostrarConfigAlert && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-xl">
          <p className="text-yellow-400 font-bold mb-2">{getText('sinConfiguracion')}</p>
          <p className="text-yellow-200 text-sm mb-3">{getText('configNecesaria')}</p>
          <button
            onClick={() => setMostrarConfigAlert(false)}
            className="text-cyan-400 text-sm underline"
          >
            {getText('irAConfiguracion')}
          </button>
        </div>
      )}
      
      <form onSubmit={(e) => { e.preventDefault(); handleCargarProduccion(); }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-gray-400 text-sm mb-1">{getText('nombre') || 'Nombre del Producto'}</label>
            <input
              type="text"
              value={formData.nombreProducto}
              onChange={(e) => setFormData({ ...formData, nombreProducto: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">{getText('unidades') || 'Unidades a producir'}</label>
            <input
              type="number"
              value={formData.unidadesProducidas}
              onChange={(e) => setFormData({ ...formData, unidadesProducidas: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white"
              step="1"
              min="1"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">{getText('materiales') || 'Inversión en Materiales'}</label>
            <input
              type="number"
              value={formData.materialesTotal}
              onChange={(e) => setFormData({ ...formData, materialesTotal: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white"
              step="any"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">{getText('horas') || 'Horas de Trabajo (totales)'}</label>
            <input
              type="number"
              value={formData.horasLaborTotal}
              onChange={(e) => setFormData({ ...formData, horasLaborTotal: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white"
              step="any"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">{getText('valorHora') || 'Valor Hora (opcional)'}</label>
            <input
              type="number"
              value={formData.valorHoraPersonalizado}
              onChange={(e) => setFormData({ ...formData, valorHoraPersonalizado: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white"
              step="any"
              placeholder="Opcional"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">{getText('transporte') || 'Gastos de Transporte'}</label>
            <input
              type="number"
              value={formData.transporteTotal}
              onChange={(e) => setFormData({ ...formData, transporteTotal: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white"
              step="any"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">{getText('precioVenta') || 'Precio de Venta (unitario)'}</label>
            <input
              type="number"
              value={formData.precioVentaUnitario}
              onChange={(e) => setFormData({ ...formData, precioVentaUnitario: e.target.value })}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white"
              step="any"
              required
            />
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleCalcularAuditoria}
          disabled={calculando}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          {calculando ? (getText('calculando') || 'Auditando...') : (getText('validar') || '🔍 Auditar Rentabilidad')}
        </button>
        
        {/* Resultado de auditoría */}
        {resultadoAuditoria && !resultadoAuditoria.error && (
          <div className={`p-4 rounded-lg border-2 ${resultadoAuditoria.aprobado ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-xs">{getText('costoBase') || 'Costo Base por unidad'}</p>
                <p className="text-lg font-bold text-white">
                  {formatMoney(resultadoAuditoria.costoUnitarioBase, resultadoAuditoria.configuracion?.moneda)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">{getText('costoCargado') || 'Costo Real Cargado'}</p>
                <p className="text-lg font-bold text-orange-400">
                  {formatMoney(resultadoAuditoria.costoUnitarioCargado, resultadoAuditoria.configuracion?.moneda)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">{getText('ingresoNeto') || 'Ingreso Neto por unidad'}</p>
                <p className="text-lg font-bold text-cyan-400">
                  {formatMoney(resultadoAuditoria.ingresoNetoUnitario, resultadoAuditoria.configuracion?.moneda)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">{getText('margen') || 'Margen Neto Real'}</p>
                <p className={`text-2xl font-bold ${resultadoAuditoria.color}`}>
                  {resultadoAuditoria.margenNetoReal}%
                </p>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg mb-3 ${resultadoAuditoria.aprobado ? 'bg-green-800/30' : 'bg-red-800/30'}`}>
              <p className={`font-bold ${resultadoAuditoria.color}`}>{resultadoAuditoria.dictamen}</p>
              <p className="text-sm text-gray-300 mt-1">{resultadoAuditoria.mensajeDetallado}</p>
            </div>
            
            {resultadoAuditoria.hallazgosEspecialistas && resultadoAuditoria.hallazgosEspecialistas.length > 0 && (
              <div className="mb-3 p-2 bg-red-900/30 rounded-lg border-l-4 border-red-500">
                <p className="text-red-400 text-xs font-bold mb-1">{getText('dictamenEspecialista') || '🔍 Dictamen del Especialista'}:</p>
                {resultadoAuditoria.hallazgosEspecialistas.map((hallazgo, idx) => (
                  <p key={idx} className="text-red-200 text-xs mb-1">{hallazgo}</p>
                ))}
              </div>
            )}
            
            {resultadoAuditoria.precioSugerido && (
              <div className="mb-3 p-2 bg-blue-900/30 rounded-lg">
                <p className="text-blue-300 text-xs font-bold mb-1">📊 Precios sugeridos:</p>
                <p className="text-xs text-gray-300">💰 Para 40% margen: {resultadoAuditoria.precioSugerido.margen40?.toLocaleString()} {resultadoAuditoria.configuracion?.moneda}</p>
                <p className="text-xs text-gray-300">📈 Para 30% margen: {resultadoAuditoria.precioSugerido.margen30?.toLocaleString()} {resultadoAuditoria.configuracion?.moneda}</p>
                <p className="text-xs text-gray-300">📉 Para 20% margen: {resultadoAuditoria.precioSugerido.margen20?.toLocaleString()} {resultadoAuditoria.configuracion?.moneda}</p>
                <p className="text-xs text-yellow-300">⚖️ Punto de equilibrio: {resultadoAuditoria.precioSugerido.puntoEquilibrio?.toLocaleString()} {resultadoAuditoria.configuracion?.moneda}</p>
              </div>
            )}
            
            {resultadoAuditoria.alertas && resultadoAuditoria.alertas.length > 0 && (
              <div className="mb-3 p-2 bg-yellow-900/30 rounded-lg">
                <p className="text-yellow-400 text-xs font-bold mb-1">{getText('alertas') || 'Alertas de Auditoría'}</p>
                {resultadoAuditoria.alertas.map((alerta, idx) => (
                  <p key={idx} className="text-yellow-200 text-xs">{alerta}</p>
                ))}
              </div>
            )}
            
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer">{getText('detalles') || 'Desglose de costos'}</summary>
              <div className="mt-2 space-y-1 pl-2">
                <p>{getText('materialesLabel') || 'Materiales'}: {formatMoney(resultadoAuditoria.desglose?.materiales, resultadoAuditoria.configuracion?.moneda)}</p>
                <p>{getText('manoObraLabel') || 'Mano de obra (con prestaciones)'}: {formatMoney(resultadoAuditoria.desglose?.manoObra, resultadoAuditoria.configuracion?.moneda)}</p>
                <p>{getText('transporteLabel') || 'Transporte'}: {formatMoney(resultadoAuditoria.desglose?.transporte, resultadoAuditoria.configuracion?.moneda)}</p>
                <p>{getText('gastosFijosLabel') || 'Gastos fijos aplicados'}: {formatMoney(resultadoAuditoria.desglose?.gastosFijosAplicados, resultadoAuditoria.configuracion?.moneda)}</p>
                <p>{getText('devolucionesLabel') || 'Provisión devoluciones'}: {formatMoney(resultadoAuditoria.desglose?.logisticaInversaUnitaria, resultadoAuditoria.configuracion?.moneda)}</p>
                <p>{getText('comisionesLabel') || 'Comisiones y tasas'}: {formatMoney((resultadoAuditoria.desglose?.comisionBase || 0) + (resultadoAuditoria.desglose?.ivaComision || 0) + (resultadoAuditoria.desglose?.retenciones || 0), resultadoAuditoria.configuracion?.moneda)}</p>
              </div>
            </details>
          </div>
        )}
        
        {resultadoAuditoria?.error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 font-bold">{resultadoAuditoria.dictamen}</p>
            <p className="text-red-300 text-sm mt-1">{resultadoAuditoria.error}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || !resultadoAuditoria?.aprobado}
          className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
            loading || !resultadoAuditoria?.aprobado
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg'
          }`}
        >
          {loading ? (getText('guardando') || 'Cargando...') : (getText('guardar') || '📦 Cargar a Inventario')}
        </button>
      </form>
      
      {configuracion?.tieneConfiguracion && (
        <div className="mt-4 pt-4 border-t border-blue-900/30 text-xs text-gray-500">
          <p>Auditoría configurada para: {configuracion.nombre} | 
             Plataforma: {configuracion.plataforma} | 
             Gastos fijos: {formatMoney(configuracion.gastosFijosMensuales, configuracion.moneda)}/mes</p>
        </div>
      )}
    </div>
  );
};

export default ProduccionForm;

