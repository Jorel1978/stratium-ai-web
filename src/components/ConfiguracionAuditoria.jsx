// src/components/ConfiguracionAuditoria.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuditEngine } from '../hooks/useAuditEngine';
import { useTranslation } from '../hooks/useTranslation';

const db = getFirestore();

const limpiarNumero = (valor) => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  let limpio = String(valor).replace(/[$,.\s]/g, '');
  limpio = limpio.replace(/[^0-9]/g, '');
  const numero = parseInt(limpio, 10);
  return isNaN(numero) ? 0 : numero;
};

const ConfiguracionAuditoria = ({ usuarioActual, idioma, onClose, onConfigUpdate, gastosFijosActuales }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    region: 'AMERICA_SUR',
    gastosFijosMensuales: gastosFijosActuales || 0,
    plataforma: 'MERCADO_LIBRE',
    comisionPersonalizada: 0,
    comisionPersonalizadaNombre: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [valorInput, setValorInput] = useState('');
  const { regionesDisponibles, plataformasDisponibles } = useAuditEngine(usuarioActual);

  // Cargar configuración existente
  useEffect(() => {
    const cargarConfig = async () => {
      if (!usuarioActual?.uid) return;
      try {
        const configRef = doc(db, 'configuracion_auditoria', usuarioActual.uid);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          const gastosGuardados = data.gastosFijosMensuales || gastosFijosActuales || 0;
          setConfig({
            region: data.region || 'AMERICA_SUR',
            gastosFijosMensuales: gastosGuardados,
            plataforma: data.plataforma || 'MERCADO_LIBRE',
            comisionPersonalizada: data.comisionPersonalizada || 0,
            comisionPersonalizadaNombre: data.comisionPersonalizadaNombre || ''
          });
          setValorInput(gastosGuardados.toLocaleString('es-CO'));
        } else if (gastosFijosActuales) {
          setConfig(prev => ({ ...prev, gastosFijosMensuales: gastosFijosActuales }));
          setValorInput(gastosFijosActuales.toLocaleString('es-CO'));
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    };
    cargarConfig();
  }, [usuarioActual, gastosFijosActuales]);

  const handleGastosChange = (e) => {
    const rawValue = e.target.value;
    setValorInput(rawValue);
    const numeroLimpio = limpiarNumero(rawValue);
    setConfig(prev => ({ ...prev, gastosFijosMensuales: numeroLimpio }));
  };

  const handleGuardar = async () => {
    if (!usuarioActual?.uid) return;
    
    const gastosLimpios = limpiarNumero(config.gastosFijosMensuales);
    
    if (gastosLimpios <= 0) {
      setMensaje(t('fixedCostsRequired') || '⚠️ Los gastos fijos mensuales son obligatorios');
      setTimeout(() => setMensaje(null), 3000);
      return;
    }
    
    setGuardando(true);
    try {
      const configRef = doc(db, 'configuracion_auditoria', usuarioActual.uid);
      await setDoc(configRef, {
        region: config.region,
        gastosFijosMensuales: gastosLimpios,
        plataforma: config.plataforma,
        comisionPersonalizada: config.plataforma === 'CUSTOM' ? config.comisionPersonalizada : 0,
        comisionPersonalizadaNombre: config.plataforma === 'CUSTOM' ? config.comisionPersonalizadaNombre : '',
        userId: usuarioActual.uid,
        actualizado: new Date().toISOString()
      }, { merge: true });
      
      setMensaje(t('configSaved') || '✅ Configuración guardada exitosamente');
      
      if (onConfigUpdate) {
        onConfigUpdate({
          gastosFijosMensuales: gastosLimpios,
          region: config.region,
          plataforma: config.plataforma,
          comisionPersonalizada: config.plataforma === 'CUSTOM' ? config.comisionPersonalizada : 0,
          comisionPersonalizadaNombre: config.plataforma === 'CUSTOM' ? config.comisionPersonalizadaNombre : ''
        });
      }
      
      window.dispatchEvent(new CustomEvent('config-updated', { 
        detail: { gastosFijosMensuales: gastosLimpios }
      }));
      
      setTimeout(() => setMensaje(null), 2000);
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error guardando:', error);
      setMensaje(t('configError') || '❌ Error al guardar la configuración');
      setTimeout(() => setMensaje(null), 3000);
    } finally {
      setGuardando(false);
    }
  };

  // Obtener plataformas base + la opción personalizada
  const plataformasConCustom = [
    ...(plataformasDisponibles || []),
    { id: 'CUSTOM', label: { es: '🎯 Canal Personalizado', en: '🎯 Custom Channel' } }
  ];

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-blue-900/30 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">{t('auditConfigTitle') || '⚙️ Configuración de Auditoría'}</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {t('auditConfigSubtitle') || 'Define los parámetros financieros de tu negocio para una auditoría precisa'}
      </p>
      
      {mensaje && (
        <div className="mb-4 p-3 bg-cyan-900/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm">
          {mensaje}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">{t('operationRegion') || 'Región de operación'}</label>
          <select
            value={config.region}
            onChange={(e) => setConfig({ ...config, region: e.target.value })}
            className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {regionesDisponibles?.map(region => (
              <option key={region.key} value={region.key}>{region.nombre}</option>
            ))}
          </select>
          <p className="text-gray-500 text-xs mt-1">
            {idioma === 'es' ? 'La región define el factor prestacional base (ej: Colombia 1.52, EE.UU. 1.15)' : 'Region defines base labor factor (ex: Colombia 1.52, USA 1.15)'}
          </p>
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-1">{t('monthlyFixedCosts') || 'Gastos Fijos Mensuales'}</label>
          <input
            type="text"
            value={valorInput}
            onChange={handleGastosChange}
            className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder={idioma === 'es' ? 'Ej: 1.500.000' : 'Ex: 1,500,000'}
            required
          />
          <p className="text-gray-500 text-xs mt-1">
            {t('fixedCostsPlaceholder') || 'Arriendo + Servicios + Nómina Administrativa + Software + Publicidad'}
          </p>
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-1">{t('mainSalesPlatform') || 'Plataforma de venta principal'}</label>
          <select
            value={config.plataforma}
            onChange={(e) => setConfig({ ...config, plataforma: e.target.value })}
            className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {plataformasConCustom.map(plat => (
              <option key={plat.id} value={plat.id}>
                {idioma === 'es' ? plat.label.es : plat.label.en}
              </option>
            ))}
          </select>
          
          {/* Campo adicional para comisión personalizada */}
          {config.plataforma === 'CUSTOM' && (
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <label className="block text-gray-400 text-xs mb-1">
                {idioma === 'es' ? 'Nombre del canal' : 'Channel name'}
              </label>
              <input
                type="text"
                value={config.comisionPersonalizadaNombre}
                onChange={(e) => setConfig({ ...config, comisionPersonalizadaNombre: e.target.value })}
                placeholder={idioma === 'es' ? 'Ej: Linio, AliExpress, Rappi...' : 'Ex: Linio, AliExpress, Rappi...'}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-2"
              />
              <label className="block text-gray-400 text-xs mb-1">
                {idioma === 'es' ? 'Porcentaje de comisión (%)' : 'Commission percentage (%)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={config.comisionPersonalizada}
                onChange={(e) => setConfig({ ...config, comisionPersonalizada: parseFloat(e.target.value) || 0 })}
                placeholder={idioma === 'es' ? 'Ej: 20, 25, 30' : 'Ex: 20, 25, 30'}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-gray-500 text-[10px] mt-1">
                {idioma === 'es' 
                  ? '💡 Para comisiones dinámicas (Mercado Libre cobra 27.1%, Amazon 15%, Shopify 3.5%)' 
                  : '💡 For dynamic commissions (Mercado Libre charges 27.1%, Amazon 15%, Shopify 3.5%)'}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            {guardando ? (t('saving') || 'Guardando...') : (t('saveConfig') || 'Guardar Configuración')}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
            >
              {t('closeConfig') || 'Cerrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionAuditoria;

