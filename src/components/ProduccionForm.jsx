// components/ProduccionForm.jsx

// STRATIUM AI v2.4-INTERNATIONAL - PRECISIÓN FINANCIERA CON SOPORTE MULTIPAÍS
// Basado en tu v2.3-GOLD original - Solo se agregaron cambios de internacionalización

// Normativa: NIIF para PYMES + Prudencia Contable + Precisión Decimal

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { useAuditEngine } from '../hooks/useAuditEngine';
import { useTranslation } from '../hooks/useTranslation';
import { getRegionalConfig } from '../config/regional';
import { formatMoneyUniversal } from '../util/formatMoneyUniversal';

// 📐 CONSTANTES DE AUDITORÍA (MANTENIDAS)
const FACTOR_PRESTACIONES = 1.52;
const COMISION_CANAL = 0.271;
const PROVISION_SUPERVIVENCIA = 10000;

// 🎯 FUNCIÓN DE REDONDEO FINANCIERO (TU MISMA - MANTENIDA)
const roundMoney = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

const ProduccionForm = ({ usuarioActual, idioma, onSuccess, onError, setInventario, setMovimientos }) => {
  const { t } = useTranslation();

  // ==================== NUEVAS VARIABLES DE REGIONALIZACIÓN ====================
  const paisCodigo = usuarioActual?.pais || 'CO';
  const idiomaUsuario = idioma || usuarioActual?.idioma || 'es';
  const configRegional = getRegionalConfig(paisCodigo, usuarioActual?.config);

  // 1. ESTADO GLOBAL (MANTENIDO)
  const [costosGlobales, setCostosGlobales] = useState({
    horasLaborTotal: '',
    valorHoraPersonalizado: '',
    transporteTotal: '',
    gastosFijosAdicionales: ''
  });
  
  // 2. PRODUCTOS CON CAMPO 'horasPorUnidad' PARA PRORRATEO PRECISO (MANTENIDO)
  const [productos, setProductos] = useState([
    { id: Date.now(), nombre: '', cantidad: 1, precioVenta: '', materialesEspecificos: '', horasPorUnidad: 1, nota: '' }
  ]);
  
  const [resultadosAuditoria, setResultadosAuditoria] = useState([]);
  const [resumenAbsorcion, setResumenAbsorcion] = useState(null);
  const [absorcionAcumulada, setAbsorcionAcumulada] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  
  const db = getFirestore();
  const { configuracion, cargandoConfig } = useAuditEngine(usuarioActual);
  const gastosFijosMensuales = configuracion?.gastosFijosMensuales || 10000000;

  // 3. CARGAR ABSORCIÓN ACUMULADA DEL MES (CAPACIDAD INSTALADA) - MANTENIDO
  useEffect(() => {
    const cargarAbsorcionAcumulada = async () => {
      if (!usuarioActual?.uid) return;
      try {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        
        const q = query(
          collection(db, 'procesosProduccion'),
          where('userId', '==', usuarioActual.uid),
          where('fecha', '>=', inicioMes)
        );
        const snapshot = await getDocs(q);
        
        let totalAbsorbido = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          totalAbsorbido += data.resumen?.utilidadTotal || 0;
        });
        
        setAbsorcionAcumulada(roundMoney(totalAbsorbido));
      } catch (error) {
        console.warn('No se pudo cargar absorción acumulada:', error);
      }
    };
    cargarAbsorcionAcumulada();
  }, [usuarioActual?.uid, db, gastosFijosMensuales]);

  // 4. FORMATO DE MONEDA (ACTUALIZADO A VERSIÓN UNIVERSAL)
  const formatMoney = useCallback((valor) => {
    return formatMoneyUniversal(valor, paisCodigo);
  }, [paisCodigo]);

  // 5. GESTIÓN DE LISTA DE PRODUCTOS (MANTENIDA)
  const handleGlobalChange = (campo, valor) => setCostosGlobales(prev => ({ ...prev, [campo]: valor }));
  
  const agregarProducto = () => setProductos(prev => [...prev, { 
    id: Date.now() + Math.random(), 
    nombre: '', 
    cantidad: 1, 
    precioVenta: '', 
    materialesEspecificos: '', 
    horasPorUnidad: 1, 
    nota: '' 
  }]);
  
  const eliminarProducto = (id) => { if (productos.length > 1) setProductos(prev => prev.filter(p => p.id !== id)); };
  
  const actualizarProducto = (id, campo, valor) => setProductos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  // ==================== NUEVO COMPONENTE: SELECTOR DE PAÍS/IDIOMA ====================
  const RegionalSelector = () => {
    const [mostrarSelector, setMostrarSelector] = useState(false);
    
    if (!usuarioActual?.esAdmin) return null;
    
    return (
      <div className="relative mb-4">
        <button 
          onClick={() => setMostrarSelector(!mostrarSelector)}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-2 py-1 rounded flex items-center gap-1"
        >
          🌐 {configRegional.moneda} / {idiomaUsuario.toUpperCase()}
        </button>
        {mostrarSelector && (
          <div className="absolute right-0 mt-1 bg-slate-800 rounded-lg border border-slate-700 p-2 z-50">
            <p className="text-xs text-gray-400 mb-1">{t('selectorPais') || 'Selecciona tu país'}</p>
            <select 
              className="bg-slate-900 text-white text-xs rounded px-2 py-1 mb-2 w-full"
              value={paisCodigo}
              onChange={(e) => {
                if (usuarioActual?.onUpdatePais) {
                  usuarioActual.onUpdatePais(e.target.value);
                }
                window.location.reload();
              }}
            >
              <option value="CO">🇨🇴 Colombia</option>
              <option value="MX">🇲🇽 México</option>
              <option value="AR">🇦🇷 Argentina</option>
              <option value="CL">🇨🇱 Chile</option>
              <option value="PE">🇵🇪 Perú</option>
              <option value="UY">🇺🇾 Uruguay</option>
              <option value="US">🇺🇸 United States</option>
              <option value="ES">🇪🇸 España</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="DE">🇩🇪 Deutschland</option>
              <option value="FR">🇫🇷 France</option>
              <option value="IT">🇮🇹 Italia</option>
            </select>
            <button 
              onClick={() => setMostrarSelector(false)}
              className="text-xs bg-cyan-600 text-white px-2 py-1 rounded w-full"
            >
              {t('saveConfiguration') || 'Guardar configuración'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // 6. 🏆 MOTOR DE CÁLCULO v2.3-GOLD (COMPLETAMENTE MANTENIDO - SIN CAMBIOS)
  const handleProcesar = useCallback(async () => {
    const productosValidos = productos.filter(p => p.nombre?.trim() && parseInt(p.cantidad) > 0);
    if (productosValidos.length === 0) return alert('⚠️ Agrega al menos un producto válido');

    // A. CÁLCULO DE CARGA HORARIA TOTAL (Para prorrateo preciso por esfuerzo)
    const horasLaboralesLote = parseFloat(costosGlobales.horasLaborTotal) || 0;
    const valorHoraBase = parseFloat(costosGlobales.valorHoraPersonalizado) || 0;
    const valorHoraAuditado = roundMoney(valorHoraBase * FACTOR_PRESTACIONES);
    
    const transporte = parseFloat(costosGlobales.transporteTotal) || 0;
    const gastosAdicionales = parseFloat(costosGlobales.gastosFijosAdicionales) || 0;

    // Costos Indirectos de Fabricación (CIF) - prorrateo por unidad física
    const totalCIF = roundMoney(transporte + gastosAdicionales);
    const totalUnidadesLote = productosValidos.reduce((sum, p) => sum + parseInt(p.cantidad), 0);
    const cifPorUnidad = roundMoney(totalCIF / totalUnidadesLote);

    // 🎯 CALCULAR HORAS TOTALES DEL LOTE (para prorrateo laboral preciso)
    const horasTotalesEstimadas = productosValidos.reduce((sum, p) => {
      const horasPorUnidad = parseFloat(p.horasPorUnidad) || 1;
      const cantidad = parseInt(p.cantidad);
      return sum + (horasPorUnidad * cantidad);
    }, 0);

    const resultados = [];
    let contribucionTotalLote = 0;

    for (const prod of productosValidos) {
      const cantidad = parseInt(prod.cantidad);
      const precioVenta = roundMoney(parseFloat(prod.precioVenta) || 0);
      const materiales = roundMoney(parseFloat(prod.materialesEspecificos) || 0);
      const horasPorUnidad = parseFloat(prod.horasPorUnidad) || 1;

      // 🎯 B. COSTO DE MANO DE OBRA PRORRATEADO POR ESFUERZO REAL
      const proporcionHorasProducto = (horasPorUnidad * cantidad) / (horasTotalesEstimadas || 1);
      const costoLaboralTotalProducto = roundMoney(horasLaboralesLote * valorHoraAuditado * proporcionHorasProducto);
      const costoLaboralUnitario = roundMoney(costoLaboralTotalProducto / cantidad);

      // 🎯 C. CÁLCULO DE UTILIDAD NETO-NETA (Con redondeo en cada paso)
      const comisionUnitaria = roundMoney(precioVenta * COMISION_CANAL);
      const costoVariableTotal = roundMoney(
        materiales + comisionUnitaria + costoLaboralUnitario + cifPorUnidad + PROVISION_SUPERVIVENCIA
      );
      const utilidadNetaAuditada = roundMoney(precioVenta - costoVariableTotal);
      
      const margenAuditado = precioVenta > 0 ? roundMoney((utilidadNetaAuditada / precioVenta) * 100) / 100 : 0;
      
      // 🎯 D. PUNTO DE EQUILIBRIO (Basado en Utilidad Real Auditada)
      let puntoEquilibrio = utilidadNetaAuditada > 0 
        ? Math.ceil(gastosFijosMensuales / utilidadNetaAuditada) 
        : Infinity;

      // 🎯 E. REVERSO DE PRECIOS (Sugerencias 10-40% con precisión)
      const sugerencias = [0.10, 0.20, 0.30, 0.40].map(target => {
        const costosBase = roundMoney(materiales + costoLaboralUnitario + cifPorUnidad + PROVISION_SUPERVIVENCIA);
        const denominador = 1 - COMISION_CANAL - target;
        const precioSugerido = denominador > 0.01 ? Math.ceil(costosBase / denominador) : 0;
        return { margin: target * 100, precio: roundMoney(precioSugerido) };
      });

      // 🎯 F. ESTADO DE ALERTA (Semáforo con márgenes auditados)
      const estadoColor = margenAuditado < 10 ? 'red' : margenAuditado < 40 ? 'orange' : 'green';

      resultados.push({
        id: prod.id,
        nombre: prod.nombre.trim(),
        cantidad,
        precioVenta,
        horasPorUnidad,
        costoLaboralUnitario,
        cifPorUnidad,
        comisionUnitaria,
        utilidadNetaAuditada,
        margenAuditado,
        puntoEquilibrio,
        sugerenciasPrecios: sugerencias,
        costoVariableTotal,
        estadoColor,
        nota: prod.nota
      });

      contribucionTotalLote = roundMoney(contribucionTotalLote + (utilidadNetaAuditada * cantidad));
    }

    // 🎯 G. CÁLCULO DE ABSORCIÓN ACUMULADA (Capacidad Instalada)
    const absorcionTotalProyectada = roundMoney(absorcionAcumulada + contribucionTotalLote);
    const porcentajeAbsorcion = roundMoney(Math.min(100, (absorcionTotalProyectada / gastosFijosMensuales) * 100));
    const diasCubiertos = gastosFijosMensuales > 0 
      ? (absorcionTotalProyectada / (gastosFijosMensuales / 30)).toFixed(1) 
      : '0';

    setResultadosAuditoria(resultados);
    setResumenAbsorcion({
      contribucionLoteActual: contribucionTotalLote,
      absorcionAcumuladaPrev: absorcionAcumulada,
      absorcionTotalProyectada,
      porcentaje: porcentajeAbsorcion,
      diasCubiertos,
      gastosFijosRestantes: roundMoney(gastosFijosMensuales - absorcionTotalProyectada)
    });

  }, [productos, costosGlobales, gastosFijosMensuales, absorcionAcumulada]);

  // 7. PERSISTENCIA CON TRANSACCIONES ATÓMICAS (MANTENIDA - SIN CAMBIOS SIGNIFICATIVOS)
  const handleGuardar = useCallback(async () => {
    if (!resultadosAuditoria.length) return alert('⚠️ Audita primero');
    if (!usuarioActual?.uid) return alert('⚠️ Debes iniciar sesión');
    
    setLoading(true);
    const procesoId = `PROC-${Date.now()}`;

    try {
      await runTransaction(db, async (transaction) => {
        // A. Registro Maestro del Proceso
        const procRef = doc(collection(db, 'procesosProduccion'));
        transaction.set(procRef, {
          procesoId, 
          fecha: serverTimestamp(), 
          userId: usuarioActual.uid,
          version: 'v2.4-International',
          pais: paisCodigo,
          idioma: idiomaUsuario,
          resumen: { 
            totalProductos: resultadosAuditoria.length, 
            utilidadTotal: resumenAbsorcion?.contribucionLoteActual,
            horasTotalesLote: costosGlobales.horasLaborTotal,
            valorHoraAuditado: roundMoney((parseFloat(costosGlobales.valorHoraPersonalizado) || 0) * FACTOR_PRESTACIONES)
          }
        });

        // B. Procesar cada producto con trazabilidad completa
        for (const prod of resultadosAuditoria) {
          // B1. Registro en Compras/Egresos
          const compraRef = doc(collection(db, 'compras'));
          transaction.set(compraRef, {
            concepto: prod.nombre, 
            valor: roundMoney(prod.costoVariableTotal * prod.cantidad),
            tipo: 'egreso', 
            categoria: 'PRODUCCION', 
            subcategoria: 'MANUFACTURA',
            procesoId, 
            userId: usuarioActual.uid, 
            fecha: serverTimestamp(),
            pais: paisCodigo,
            moneda: configRegional.moneda,
            auditoria: {
              margenAuditado: prod.margenAuditado,
              utilidadUnitaria: prod.utilidadNetaAuditada,
              provisionAplicada: PROVISION_SUPERVIVENCIA
            }
          });

          // B2. Actualización de Inventario (Acumulativo con promedio ponderado)
          const inventarioQuery = query(
            collection(db, 'inventario'), 
            where('producto', '==', prod.nombre), 
            where('userId', '==', usuarioActual.uid)
          );
          const snapshot = await transaction.get(inventarioQuery);

          if (snapshot.empty) {
            // Nuevo producto en inventario
            const newInvRef = doc(collection(db, 'inventario'));
            transaction.set(newInvRef, {
              producto: prod.nombre, 
              cantidad: prod.cantidad, 
              costoUnitario: roundMoney(prod.costoVariableTotal),
              precioVentaReferencia: prod.precioVenta,
              margenReferencia: prod.margenAuditado,
              userId: usuarioActual.uid, 
              origen: 'produccion_v2.4-International', 
              procesoId, 
              fecha: serverTimestamp(),
              pais: paisCodigo,
              moneda: configRegional.moneda,
              metadata: {
                horasPorUnidad: prod.horasPorUnidad,
                cifAsignado: prod.cifPorUnidad,
                laborAsignada: prod.costoLaboralUnitario
              }
            });
          } else {
            // Producto existente: Actualización con promedio ponderado preciso
            const docRef = snapshot.docs[0].ref;
            const actual = snapshot.docs[0].data();
            
            const cantidadAnterior = actual.cantidad || 0;
            const costoAnterior = roundMoney(cantidadAnterior * (actual.costoUnitario || 0));
            const costoNuevoLote = roundMoney(prod.cantidad * prod.costoVariableTotal);
            
            const nuevaCant = cantidadAnterior + prod.cantidad;
            const nuevoCostoUnitario = roundMoney((costoAnterior + costoNuevoLote) / nuevaCant);

            transaction.update(docRef, {
              cantidad: nuevaCant,
              costoUnitario: nuevoCostoUnitario,
              costoTotal: roundMoney(nuevoCostoUnitario * nuevaCant),
              precioVentaReferencia: prod.precioVenta || actual.precioVentaReferencia,
              margenReferencia: prod.margenAuditado || actual.margenReferencia,
              fechaModificacion: serverTimestamp(),
              ultimoProcesoId: procesoId,
              pais: paisCodigo,
              moneda: configRegional.moneda,
              historialCostos: actual.historialCostos 
                ? [...actual.historialCostos.slice(-9), { fecha: new Date().toISOString(), costo: nuevoCostoUnitario, pais: paisCodigo }] 
                : [{ fecha: new Date().toISOString(), costo: nuevoCostoUnitario, pais: paisCodigo }]
            });
          }
        }
      });
      
      alert('✅ Lote registrado correctamente con precisión financiera.');
      
      // Resetear formulario manteniendo configuración global
      setProductos([{ id: Date.now(), nombre: '', cantidad: 1, precioVenta: '', materialesEspecificos: '', horasPorUnidad: 1, nota: '' }]);
      setResultadosAuditoria([]);
      
      // Recargar absorción acumulada para reflejar el nuevo lote
      const nuevaAbsorcion = roundMoney(absorcionAcumulada + (resumenAbsorcion?.contribucionLoteActual || 0));
      setAbsorcionAcumulada(nuevaAbsorcion);
      
      if (onSuccess) onSuccess({ procesoId, absorcionActualizada: nuevaAbsorcion });
      
    } catch (e) {
      console.error('Error en transacción:', e);
      alert('❌ Error de persistencia: ' + e.message);
      if (onError) onError(e);
    } finally {
      setLoading(false);
    }
  }, [resultadosAuditoria, resumenAbsorcion, usuarioActual, db, costosGlobales, absorcionAcumulada, onSuccess, onError, paisCodigo, idiomaUsuario, configRegional]);

  // 8. 🎨 COMPONENTE UI: TARJETA DE AUDITORÍA (MANTENIDO)
  const AuditoriaCard = ({ prod }) => {
    const borderColor = prod.estadoColor === 'red' ? 'border-red-500 bg-red-900/10' 
                       : prod.estadoColor === 'orange' ? 'border-orange-500 bg-orange-900/10' 
                       : 'border-green-500 bg-green-900/10';
    
    const textColor = prod.estadoColor === 'red' ? 'text-red-400' 
                       : prod.estadoColor === 'orange' ? 'text-orange-400' 
                       : 'text-green-400';

    return (
      <div className={`rounded-xl border-2 ${borderColor} p-5 mb-4 shadow-md transition-all hover:shadow-lg`}>
        {/* Header con estado visual */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              🏭 {prod.nombre}
              {prod.nota && <span className="text-xs text-gray-400 font-normal bg-slate-800 px-2 py-1 rounded ml-2">{prod.nota}</span>}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {t('quantity') || 'Cantidad'}: {prod.cantidad} und • 
              {t('hoursPerUnit') || 'Horas/Und'}: {prod.horasPorUnidad}h • 
              {t('price') || 'Precio'}: {formatMoney(prod.precioVenta)}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${borderColor.replace('bg-', 'text-').split(' ')[0]} ${prod.estadoColor === 'red' ? 'bg-red-500/20' : prod.estadoColor === 'orange' ? 'bg-orange-500/20' : 'bg-green-500/20'}`}>
            {prod.estadoColor === 'red' ? '⚠️ ' + (t('risk') || 'RIESGO') : prod.estadoColor === 'orange' ? '⚡ ' + (t('optimal') || 'ÓPTIMO') : '🌟 ' + (t('profitable') || 'RENTABLE')}
          </div>
        </div>

        {/* Métricas Principales con Tooltip de Prudencia */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-800 p-3 rounded text-center">
            <p className="text-gray-400 text-xs">{t('sellingPrice') || 'Precio Venta'}</p>
            <p className="text-lg font-bold text-white">{formatMoney(prod.precioVenta)}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center relative group">
            <p className="text-gray-400 text-xs cursor-help">{t('totalVariableCost') || 'Costo Var. Total'} (?)</p>
            <p className="text-lg font-bold text-orange-400">{formatMoney(prod.costoVariableTotal)}</p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-slate-900 text-xs text-gray-300 rounded shadow-lg hidden group-hover:block z-50 border border-slate-700">
              {t('costIncludes') || 'Incluye: Materiales + Comisión 27.1% + Labor'} ({prod.horasPorUnidad}h×1.52) + CIF + {t('provision') || 'Provisión'} $10k
            </div>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center relative group">
            <p className="text-gray-400 text-xs cursor-help">{t('auditedProfit') || 'Utilidad Auditada'} (?)</p>
            <p className={`text-xl font-black ${textColor}`}>{formatMoney(prod.utilidadNetaAuditada)}</p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-xs text-gray-300 rounded shadow-lg hidden group-hover:block z-50 border border-slate-700">
              {t('profitDescription') || 'Utilidad neta después de todos los costos variables + provisión prudencial de $10,000 para gastos fijos mensuales.'}
            </div>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center">
            <p className="text-gray-400 text-xs">{t('auditedMargin') || 'Margen Auditado'}</p>
            <p className={`text-2xl font-black ${textColor}`}>{prod.margenAuditado}%</p>
          </div>
        </div>

        {/* Métricas Secundarias */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-slate-900/50 p-3 rounded">
           <div className="flex justify-between">
             <span className="text-gray-400">{t('breakEvenPoint') || '⚖️ Punto Equilibrio'}:</span>
             <span className="text-white font-bold">{prod.puntoEquilibrio === Infinity ? '∞' : `${prod.puntoEquilibrio.toLocaleString()} und`}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">{t('laborPerUnit') || '🔧 Labor Unit. (Audit.)'}:</span>
             <span className="text-white">{formatMoney(prod.costoLaboralUnitario)}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">{t('cifPerUnit') || '📦 CIF Unitario'}:</span>
             <span className="text-white">{formatMoney(prod.cifPorUnidad)}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">{t('channelCommission') || '💳 Comisión Canal'}:</span>
             <span className="text-white">{formatMoney(prod.comisionUnitaria)}</span>
           </div>
        </div>

        {/* Sugerencias de Precio con Cálculo Inverso */}
        <details className="group">
          <summary className="cursor-pointer text-cyan-400 text-xs font-bold hover:text-cyan-300 flex items-center gap-2 select-none">
            📊 {t('priceSimulator') || 'Simulador de Precios para Márgenes 10-40%'} <span className="group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {prod.sugerenciasPrecios.map((s, i) => (
              <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-cyan-500 transition">
                <p className="text-gray-400 mb-1">{t('forMargin') || 'Para'} {s.margin}% {t('margin') || 'Margen'}</p>
                <p className="text-cyan-400 font-bold">{formatMoney(s.precio)}</p>
                <p className="text-gray-500 text-[10px] mt-1">
                  {s.precio > prod.precioVenta ? '↑ ' + (t('increase') || 'Subir') : s.precio < prod.precioVenta ? '↓ ' + (t('decrease') || 'Bajar') : '✓ ' + (t('current') || 'Actual')}
                </p>
              </div>
            ))}
          </div>
        </details>

        {/* Utilidad Total del Producto en el Lote */}
        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
          <span className="text-gray-400 text-sm">{t('totalContribution') || 'Contribución total'} ({prod.cantidad} und):</span>
          <span className={`text-xl font-bold ${prod.utilidadNetaAuditada * prod.cantidad >= 0 ? 'text-green-400' : 'text-red-500'}`}>
            {formatMoney(prod.utilidadNetaAuditada * prod.cantidad)}
          </span>
        </div>
      </div>
    );
  };

  // 9. 🎨 RENDERIZADO PRINCIPAL
  if (cargandoConfig) {
    return (
      <div className="text-center text-gray-400 p-10">
        {t('loadingAuditEngine') || (idiomaUsuario === 'en' ? 'Loading audit engine...' : 'Cargando motor de auditoría...')}
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30 shadow-2xl">
      {/* Selector de País/Idioma (nuevo) */}
      <RegionalSelector />

      <h2 className="text-2xl font-bold text-white mb-2">{t('productionOrder') || '🏭 Orden de Producción v2.4-International'}</h2>
      <p className="text-gray-400 text-sm mb-6">
        {t('productionSubtitle') || (idiomaUsuario === 'en' 
          ? 'Financial precision with effort-based prorating and installed capacity'
          : 'Precisión financiera con prorrateo por esfuerzo y capacidad instalada')}
      </p>

      {/* Panel de Capacidad Instalada */}
      {resumenAbsorcion && (
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/50 p-4 rounded-xl mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h4 className="text-indigo-300 font-bold text-sm mb-2 flex items-center gap-2">
                📊 {t('installedCapacity') || 'Capacidad Instalada - Absorción de Gastos Fijos'}
              </h4>
              <div className="space-y-1 text-xs text-gray-300">
                <p>{t('monthlyFixedExpenses') || 'Gastos Fijos Mensuales'}: <span className="text-white font-bold">{formatMoney(gastosFijosMensuales)}</span></p>
                <p>{t('accumulatedAbsorption') || 'Absorción Acumulada (mes)'}: <span className="text-cyan-400">{formatMoney(resumenAbsorcion.absorcionAcumuladaPrev)}</span></p>
                <p>{t('currentLotContribution') || 'Contribución Lote Actual'}: <span className="text-green-400">+{formatMoney(resumenAbsorcion.contribucionLoteActual)}</span></p>
                <p className="pt-1 border-t border-slate-700">
                  <strong>{t('totalProjected') || 'Total Proyectado'}:</strong> {formatMoney(resumenAbsorcion.absorcionTotalProyectada)} 
                  <span className={`ml-2 font-bold ${resumenAbsorcion.porcentaje >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    ({resumenAbsorcion.porcentaje}% {t('covered') || 'cubierto'})
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg min-w-[120px]">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                  <path className={`${resumenAbsorcion.porcentaje >= 100 ? 'text-green-500' : 'text-cyan-500'}`} 
                        strokeDasharray={`${resumenAbsorcion.porcentaje}, 100`} 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" stroke="currentColor" strokeWidth="3"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{Math.round(resumenAbsorcion.porcentaje)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {resumenAbsorcion.diasCubiertos} {parseFloat(resumenAbsorcion.diasCubiertos) === 1 
                  ? (idiomaUsuario === 'en' ? 'day' : 'día') 
                  : (idiomaUsuario === 'en' ? 'days' : 'días')} {t('covered') || 'cubiertos'}
              </p>
            </div>
          </div>
          {resumenAbsorcion.gastosFijosRestantes > 0 && resumenAbsorcion.porcentaje < 100 && (
            <p className="text-xs text-yellow-400 mt-2 text-center">
              ⚠️ {t('remainingToCover') || 'Faltan'} {formatMoney(resumenAbsorcion.gastosFijosRestantes)} {t('toCoverFixedCosts') || 'para cubrir gastos fijos del mes'}
            </p>
          )}
          {resumenAbsorcion.porcentaje >= 100 && (
            <p className="text-xs text-green-400 mt-2 text-center">
              ✅ {t('fixedCostsCovered') || 'Gastos fijos mensuales completamente cubiertos'} 🎉
            </p>
          )}
        </div>
      )}

      {/* Inputs Globales de Costos (MANTENIDOS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('totalBatchHours') || 'Horas Totales Lote'}</label>
          <input type="number" value={costosGlobales.horasLaborTotal} onChange={e => handleGlobalChange('horasLaborTotal', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" placeholder={t('exampleHours') || 'Ej: 40'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('hourlyRateValue') || 'Valor Hora Base ($)'}</label>
          <input type="number" value={costosGlobales.valorHoraPersonalizado} onChange={e => handleGlobalChange('valorHoraPersonalizado', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" placeholder={configuracion?.valorHoraLaboral} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('transportLogistics') || 'Transporte/Logística ($)'}</label>
          <input type="number" value={costosGlobales.transporteTotal} onChange={e => handleGlobalChange('transporteTotal', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('additionalExpenses') || 'Gastos Adicionales ($)'}</label>
          <input type="number" value={costosGlobales.gastosFijosAdicionales} onChange={e => handleGlobalChange('gastosFijosAdicionales', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
      </div>

      {/* Lista de Productos con Campo Horas por Unidad (MANTENIDA) */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-cyan-400 font-bold text-sm">{t('batchItems') || '📦 Ítems del Lote (con esfuerzo horario)'}</h3>
          <button onClick={agregarProducto} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded transition">{t('addItem') || '+ Agregar'}</button>
        </div>
        
        {productos.map((prod, idx) => (
          <div key={prod.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800/50 p-2 rounded border border-slate-700">
            <div className="col-span-3">
              <input type="text" placeholder={t('product') || 'Producto'} value={prod.nombre} onChange={e => actualizarProducto(prod.id, 'nombre', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
            </div>
            <div className="col-span-1">
              <input type="number" placeholder={t('quantity') || 'Cant'} value={prod.cantidad} onChange={e => actualizarProducto(prod.id, 'cantidad', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center" />
            </div>
            <div className="col-span-1">
              <input type="number" placeholder={t('hoursPerUnit') || 'H/Und'} value={prod.horasPorUnidad} onChange={e => actualizarProducto(prod.id, 'horasPorUnidad', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center" title={t('estimatedHours') || 'Horas estimadas por unidad'} />
            </div>
            <div className="col-span-2">
              <input type="number" placeholder={t('price') || 'Precio'} value={prod.precioVenta} onChange={e => actualizarProducto(prod.id, 'precioVenta', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
            </div>
            <div className="col-span-3">
              <input type="number" placeholder={t('materialsPerUnit') || 'Materiales/Und'} value={prod.materialesEspecificos} onChange={e => actualizarProducto(prod.id, 'materialesEspecificos', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
            </div>
            <div className="col-span-1 text-center">
              <button onClick={() => eliminarProducto(prod.id)} className="text-red-500 hover:text-red-400 text-lg" title={t('delete') || 'Eliminar'}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón de Auditoría (MANTENIDO) */}
      <button onClick={handleProcesar} disabled={calculando} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg mb-6 shadow-lg hover:from-blue-500 hover:to-cyan-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
        {calculando ? (
          <>
            <span className="animate-spin">⏳</span> {t('auditing') || 'Auditando con precisión...'}
          </>
        ) : (
          <>{t('auditFullBatch') || '🔍 Auditar Lote Completo (v2.4-International)'}</>
        )}
      </button>

      {/* Resultados: Cards de Auditoría (MANTENIDO) */}
      <div className="space-y-4">
        {resultadosAuditoria.map(prod => <AuditoriaCard key={prod.id} prod={prod} />)}
      </div>

      {/* Botón de Guardado con Validación (MANTENIDO, texto corregido a tono consultivo) */}
      {resultadosAuditoria.length > 0 && (
        <button 
          onClick={handleGuardar} 
          disabled={loading || resultadosAuditoria.some(p => p.margenAuditado < 0)} 
          className={`w-full mt-6 font-bold py-3 rounded-lg shadow-lg transition flex items-center justify-center gap-2 ${
            loading || resultadosAuditoria.some(p => p.margenAuditado < 0)
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> {t('registering') || 'Registrando en Blockchain financiero...'}
            </>
          ) : resultadosAuditoria.some(p => p.margenAuditado < 0) ? (
            <>
              ⚠️ {t('negativeMarginWarning') || (idiomaUsuario === 'en' 
                ? 'Some products have negative margin. Would you like to review them before saving?'
                : 'Algunos productos tienen margen negativo. ¿Quieres revisarlos antes de guardar?')}
            </>
          ) : (
            <>💾 {t('registerLot') || 'Registrar Lote con Trazabilidad Completa'}</>
          )}
        </button>
      )}

      {/* Footer de Transparencia (ACTUALIZADO con datos regionales) */}
      <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-gray-500 text-center">
        <p>Stratium AI v2.4-International • {paisCodigo.toUpperCase()} • {idiomaUsuario.toUpperCase()}</p>
        <p className="mt-1">
          {t('footerText2') || (idiomaUsuario === 'en' 
            ? `Labor factor: ${configRegional.factorPrestacional}x • Commission: ${(COMISION_CANAL * 100).toFixed(1)}% • Provision: $${PROVISION_SUPERVIVENCIA.toLocaleString()}/unit`
            : `Factor prestacional: ${configRegional.factorPrestacional}x • Comisión: ${(COMISION_CANAL * 100).toFixed(1)}% • Provisión: $${PROVISION_SUPERVIVENCIA.toLocaleString()}/und`)}
        </p>
        <p className="mt-1">
          {t('footerText3') || (getRegionalConfig?.()?.footerText || (idiomaUsuario === 'en' 
            ? 'Smart financial auditing for real entrepreneurs'
            : 'Auditoría financiera inteligente para emprendedores reales'))}
        </p>
      </div>
    </div>
  );
};

export default ProduccionForm;

