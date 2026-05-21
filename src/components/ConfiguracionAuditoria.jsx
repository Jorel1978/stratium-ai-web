// components/ConfiguracionAuditoria.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuditEngine } from '../hooks/useAuditEngine';
import { useTranslation } from '../hooks/useTranslation';

const db = getFirestore();

const ConfiguracionAuditoria = ({ usuarioActual, idioma, onClose }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    region: 'AMERICA_SUR',
    gastosFijosMensuales: 0,
    plataforma: 'MERCADO_LIBRE'
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const { regionesDisponibles, plataformasDisponibles } = useAuditEngine(usuarioActual);

  useEffect(() => {
    const cargarConfig = async () => {
      if (!usuarioActual?.uid) return;
      try {
        const configRef = doc(db, 'configuracion_auditoria', usuarioActual.uid);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          setConfig({
            region: data.region || 'AMERICA_SUR',
            gastosFijosMensuales: data.gastosFijosMensuales || 0,
            plataforma: data.plataforma || 'MERCADO_LIBRE'
          });
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    };
    cargarConfig();
  }, [usuarioActual]);

  const handleGuardar = async () => {
    if (!usuarioActual?.uid) return;
    if (config.gastosFijosMensuales <= 0) {
      setMensaje(t('fixedCostsRequired') || '⚠️ Los gastos fijos mensuales son obligatorios');
      setTimeout(() => setMensaje(null), 3000);
      return;
    }
    setGuardando(true);
    try {
      const configRef = doc(db, 'configuracion_auditoria', usuarioActual.uid);
      await setDoc(configRef, {
        region: config.region,
        gastosFijosMensuales: config.gastosFijosMensuales,
        plataforma: config.plataforma,
        userId: usuarioActual.uid,
        actualizado: new Date().toISOString()
      });
      setMensaje(t('configSaved') || '✅ Configuración guardada exitosamente');
      setTimeout(() => setMensaje(null), 3000);
      setTimeout(() => {
        if (onClose) onClose();
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error guardando:', error);
      setMensaje(t('configError') || '❌ Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

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
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-1">{t('monthlyFixedCosts') || 'Gastos Fijos Mensuales'}</label>
          <input
            type="number"
            value={config.gastosFijosMensuales}
            onChange={(e) => setConfig({ ...config, gastosFijosMensuales: parseFloat(e.target.value) || 0 })}
            className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Ej: 2000000"
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
            {plataformasDisponibles?.map(plat => (
              <option key={plat} value={plat}>{plat}</option>
            ))}
          </select>
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

