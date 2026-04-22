// hooks/useAuditEngine.js
// Stratium AI v2.2-PRO - AUDITOR ENGINE (HARDENED + OPTIMIZED)
// Validaciones estrictas, sin NaN, consistencia matemática garantizada
// Correcciones: sin doble castigo por devoluciones, factor flete realista, márgenes duales

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================
// CONFIGURACIÓN GLOBAL POR REGIÓN (Single Source of Truth)
// ============================================================
const REGIONES = {
  'AMERICA_SUR': {
    nombre: 'América del Sur',
    paises: ['CO', 'AR', 'BR', 'CL', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE'],
    moneda: 'COP',
    factorPrestacional: 1.52,
    impuestoVentas: 0.19,
    retencionFuente: 0.025,
    ica: 0.008,
    salarioMinimoHora: 6500,
    costoEnvioEstimado: 8000,
    tasasDevolucion: {
      MERCADO_LIBRE: 0.12,
      SHOPIFY: 0.08,
      AMAZON: 0.15,
      PROPIA: 0.05
    },
    factoresReacondicionamiento: {
      electronica: 0.15,
      moda: 0.10,
      hogar: 0.05,
      default: 0.08
    },
    plataformas: {
      MERCADO_LIBRE: { comision: 0.20, ivaComision: 0.19, cuotaFija: 0 },
      SHOPIFY: { comision: 0.029, ivaComision: 0.19, cuotaFija: 0.30 },
      AMAZON: { comision: 0.15, ivaComision: 0, cuotaFija: 0 },
      PROPIA: { comision: 0, ivaComision: 0, cuotaFija: 0 }
    }
  },
  'CENTROAMERICA_CARIBE': {
    nombre: 'Centroamérica y Caribe',
    paises: ['MX', 'PA', 'CR', 'GT', 'DO', 'PR', 'SV', 'HN', 'NI', 'CU'],
    moneda: 'MXN',
    factorPrestacional: 1.35,
    impuestoVentas: 0.16,
    retencionFuente: 0.015,
    ica: 0.004,
    salarioMinimoHora: 45,
    costoEnvioEstimado: 80,
    tasasDevolucion: {
      MERCADO_LIBRE: 0.10,
      SHOPIFY: 0.07,
      AMAZON: 0.13,
      PROPIA: 0.04
    },
    factoresReacondicionamiento: {
      electronica: 0.12,
      moda: 0.08,
      hogar: 0.04,
      default: 0.06
    },
    plataformas: {
      MERCADO_LIBRE: { comision: 0.18, ivaComision: 0.16, cuotaFija: 0 },
      SHOPIFY: { comision: 0.029, ivaComision: 0.16, cuotaFija: 0.30 },
      AMAZON: { comision: 0.15, ivaComision: 0, cuotaFija: 0 },
      PROPIA: { comision: 0, ivaComision: 0, cuotaFija: 0 }
    }
  },
  'NORTEAMERICA': {
    nombre: 'Norteamérica',
    paises: ['US', 'CA'],
    moneda: 'USD',
    factorPrestacional: 1.18,
    impuestoVentas: 0.10,
    retencionFuente: 0,
    ica: 0,
    salarioMinimoHora: 7.25,
    costoEnvioEstimado: 5,
    tasasDevolucion: {
      MERCADO_LIBRE: 0.11,
      SHOPIFY: 0.06,
      AMAZON: 0.14,
      PROPIA: 0.03
    },
    factoresReacondicionamiento: {
      electronica: 0.10,
      moda: 0.07,
      hogar: 0.03,
      default: 0.05
    },
    plataformas: {
      MERCADO_LIBRE: { comision: 0.18, ivaComision: 0, cuotaFija: 0 },
      SHOPIFY: { comision: 0.029, ivaComision: 0, cuotaFija: 0.30 },
      AMAZON: { comision: 0.15, ivaComision: 0, cuotaFija: 0 },
      PROPIA: { comision: 0, ivaComision: 0, cuotaFija: 0 }
    }
  },
  'EUROPA': {
    nombre: 'Europa',
    paises: ['ES', 'FR', 'DE', 'IT', 'UK', 'PT', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI', 'IE', 'AT', 'CH', 'GR', 'PL'],
    moneda: 'EUR',
    factorPrestacional: 1.32,
    impuestoVentas: 0.21,
    retencionFuente: 0.02,
    ica: 0,
    salarioMinimoHora: 7.50,
    costoEnvioEstimado: 5,
    tasasDevolucion: {
      MERCADO_LIBRE: 0.09,
      SHOPIFY: 0.05,
      AMAZON: 0.12,
      PROPIA: 0.03
    },
    factoresReacondicionamiento: {
      electronica: 0.09,
      moda: 0.06,
      hogar: 0.03,
      default: 0.04
    },
    plataformas: {
      MERCADO_LIBRE: { comision: 0.15, ivaComision: 0.21, cuotaFija: 0 },
      SHOPIFY: { comision: 0.029, ivaComision: 0.21, cuotaFija: 0.30 },
      AMAZON: { comision: 0.15, ivaComision: 0, cuotaFija: 0 },
      PROPIA: { comision: 0, ivaComision: 0, cuotaFija: 0 }
    }
  },
  'DEFAULT': {
    nombre: 'Internacional',
    paises: [],
    moneda: 'USD',
    factorPrestacional: 1.40,
    impuestoVentas: 0.15,
    retencionFuente: 0.02,
    ica: 0.002,
    salarioMinimoHora: 5.00,
    costoEnvioEstimado: 5,
    tasasDevolucion: {
      MERCADO_LIBRE: 0.12,
      SHOPIFY: 0.08,
      AMAZON: 0.15,
      PROPIA: 0.05
    },
    factoresReacondicionamiento: {
      electronica: 0.15,
      moda: 0.10,
      hogar: 0.05,
      default: 0.08
    },
    plataformas: {
      MERCADO_LIBRE: { comision: 0.18, ivaComision: 0.15, cuotaFija: 0 },
      SHOPIFY: { comision: 0.029, ivaComision: 0.15, cuotaFija: 0.30 },
      AMAZON: { comision: 0.15, ivaComision: 0, cuotaFija: 0 },
      PROPIA: { comision: 0, ivaComision: 0, cuotaFija: 0 }
    }
  }
};

// ============================================================
// UTILIDADES DE VALIDACIÓN (CRÍTICAS - NO NEGOCIABLES)
// ============================================================
const validateNumber = (value, fieldName, options = {}) => {
  const { min = -Infinity, max = Infinity, required = true, defaultValue = 0 } = options;
  
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`${fieldName} es requerido`);
    }
    return defaultValue;
  }
  
  const num = Number(value);
  
  if (!isFinite(num)) {
    throw new Error(`${fieldName} debe ser un número válido`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} debe estar entre ${min} y ${max}`);
  }
  
  return num;
};

const safeMultiply = (a, b, context = '') => {
  const result = a * b;
  if (!isFinite(result)) {
    throw new Error(`Operación inválida${context ? ` en ${context}` : ''}: ${a} × ${b}`);
  }
  return result;
};

const safeDivide = (numerator, denominator, context = '') => {
  if (denominator === 0) {
    throw new Error(`División por cero${context ? ` en ${context}` : ''}`);
  }
  const result = numerator / denominator;
  if (!isFinite(result)) {
    throw new Error(`Operación inválida${context ? ` en ${context}` : ''}: ${numerator} ÷ ${denominator}`);
  }
  return result;
};

// ============================================================
// DETECCIÓN DE REGIÓN
// ============================================================
const detectarRegionPorPais = (paisCode) => {
  if (!paisCode) return { regionKey: 'DEFAULT', regionData: REGIONES.DEFAULT };
  
  const code = paisCode.toUpperCase();
  for (const [regionKey, regionData] of Object.entries(REGIONES)) {
    if (regionData.paises.includes(code)) {
      return { regionKey, regionData };
    }
  }
  return { regionKey: 'DEFAULT', regionData: REGIONES.DEFAULT };
};

const detectarRegionPorIP = async () => {
  try {
    const respuesta = await fetch('https://ipwhois.app/json/');
    if (!respuesta.ok) throw new Error('IP detection failed');
    const datos = await respuesta.json();
    return detectarRegionPorPais(datos.country_code);
  } catch (error) {
    const paisGuardado = localStorage.getItem('stratium_pais');
    if (paisGuardado) return detectarRegionPorPais(paisGuardado);
    return { regionKey: 'DEFAULT', regionData: REGIONES.DEFAULT };
  }
};

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export const useAuditEngine = (usuarioActual) => {
  const [configuracion, setConfiguracion] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [errorConfig, setErrorConfig] = useState(null);
  const [regionDetectada, setRegionDetectada] = useState(null);

  // Detectar región al montar
  useEffect(() => {
    const detectar = async () => {
      const { regionKey, regionData } = await detectarRegionPorIP();
      setRegionDetectada({ regionKey, regionData });
      if (regionData.paises[0]) {
        localStorage.setItem('stratium_pais', regionData.paises[0]);
      }
    };
    detectar();
  }, []);

  // Cargar configuración del usuario
  useEffect(() => {
    const cargar = async () => {
      if (!usuarioActual?.uid) {
        setCargandoConfig(false);
        return;
      }
      try {
        const configRef = doc(db, 'configuracion_auditoria', usuarioActual.uid);
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const data = configSnap.data();
          let regionData = REGIONES.DEFAULT;
          
          if (data.region) {
            regionData = REGIONES[data.region] || REGIONES.DEFAULT;
          } else if (data.pais) {
            regionData = detectarRegionPorPais(data.pais).regionData;
          } else {
            regionData = regionDetectada?.regionData || REGIONES.DEFAULT;
          }
          
          setConfiguracion({ 
            ...data, 
            ...regionData, 
            region: data.region || regionDetectada?.regionKey || 'AMERICA_SUR', 
            tieneConfiguracion: true 
          });
        } else {
          const regionInicial = regionDetectada?.regionData || REGIONES.DEFAULT;
          setConfiguracion({ 
            ...regionInicial, 
            region: regionDetectada?.regionKey || 'AMERICA_SUR',
            gastosFijosMensuales: 0, 
            plataforma: 'MERCADO_LIBRE', 
            tieneConfiguracion: false 
          });
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
        setErrorConfig(error.message);
        setConfiguracion({ 
          ...REGIONES.DEFAULT, 
          gastosFijosMensuales: 0, 
          plataforma: 'MERCADO_LIBRE', 
          tieneConfiguracion: false 
        });
      } finally {
        setCargandoConfig(false);
      }
    };
    
    if (regionDetectada !== null) cargar();
  }, [usuarioActual?.uid, regionDetectada]);

  // ============================================================
  // FUNCIÓN PRINCIPAL DE AUDITORÍA (v2.2-PRO - CORREGIDO)
  // ============================================================
  const auditarProduccion = useCallback(async (datosProduccion) => {
    try {
      // === VALIDACIONES INICIALES ===
      if (!configuracion) {
        throw new Error('Configuración no cargada');
      }
      
      if (!configuracion.tieneConfiguracion) {
        throw new Error('CONFIGURACIÓN INCOMPLETA: Define gastos fijos y plataforma');
      }
      
      const gastosFijos = validateNumber(configuracion.gastosFijosMensuales, 'Gastos fijos mensuales', { min: 0, required: false, defaultValue: 0 });

      // === VALIDAR INPUTS ===
      const { 
        nombreProducto, 
        unidadesProducidas, 
        materialesTotal, 
        horasLaborTotal, 
        valorHoraPersonalizado, 
        transporteTotal, 
        precioVentaUnitario,
        categoria = 'default'
      } = datosProduccion;
      
      const unidades = validateNumber(unidadesProducidas !== undefined ? unidadesProducidas : 1, 'Unidades producidas', { min: 1, required: false, defaultValue: 1 });
      const precioVenta = validateNumber(precioVentaUnitario !== undefined ? precioVentaUnitario : 0, 'Precio venta', { min: 0.01, required: false, defaultValue: 0 });
      const materiales = validateNumber(materialesTotal !== undefined ? materialesTotal : 0, 'Materiales', { min: 0, required: false, defaultValue: 0 });
      const horas = validateNumber(horasLaborTotal !== undefined ? horasLaborTotal : 1, 'Horas trabajo', { min: 0, required: false, defaultValue: 1 });
      const transporte = validateNumber(transporteTotal !== undefined ? transporteTotal : 0, 'Transporte', { min: 0, required: false, defaultValue: 0 });
      
      let valorHoraCustom = null;
      if (valorHoraPersonalizado !== undefined && valorHoraPersonalizado !== null && valorHoraPersonalizado !== '') {
        valorHoraCustom = validateNumber(valorHoraPersonalizado, 'Valor hora personalizado', { min: 0, required: false });
      }
      
      if (!nombreProducto) {
        throw new Error('Nombre del producto es requerido');
      }
      
      if (precioVenta <= 0) {
        throw new Error('El precio de venta debe ser mayor a 0');
      }
      
      if (materiales <= 0 && horas <= 0) {
        throw new Error('Debes ingresar al menos materiales o horas de trabajo');
      }
      
      if (horas <= 0) {
        throw new Error('FRAUDE OPERATIVO: Debes imputar horas de trabajo');
      }

      // === OBTENER CONFIGURACIÓN ESPECÍFICA ===
      const plataforma = configuracion.plataforma || 'PROPIA';
      const plataformaConfig = configuracion.plataformas?.[plataforma] || configuracion.plataformas.PROPIA;
      
      console.log('=== DEBUG AUDITORÍA ===');
      console.log('Plataforma:', plataforma);
      console.log('Precio venta:', precioVenta);
      console.log('Unidades:', unidades);
      
      const tasaDevolucion = validateNumber(
        configuracion.tasasDevolucion?.[plataforma], 
        'Tasa de devolución', 
        { min: 0, max: 1, defaultValue: 0.10 }
      );
      
      const factorReacondicionamiento = validateNumber(
        configuracion.factoresReacondicionamiento?.[categoria] || configuracion.factoresReacondicionamiento?.default,
        'Factor reacondicionamiento',
        { min: 0, max: 1, defaultValue: 0.08 }
      );

      // === 1. CÁLCULO DE COSTOS DE PRODUCCIÓN ===
      
      const salarioMinimoHora = validateNumber(configuracion.salarioMinimoHora, 'Salario mínimo hora', { min: 0 });
      const factorPrestacional = validateNumber(configuracion.factorPrestacional, 'Factor prestacional', { min: 1, max: 3 });
      
      const valorHoraEfectivo = valorHoraCustom !== null && valorHoraCustom >= salarioMinimoHora 
        ? valorHoraCustom 
        : salarioMinimoHora;
      
      const costoManoObraTotal = safeMultiply(
        safeMultiply(horas, valorHoraEfectivo, 'mano de obra base'),
        factorPrestacional,
        'mano de obra con prestaciones'
      );
      
      const costoBaseLote = materiales + costoManoObraTotal + transporte;
      const costoUnitarioBase = safeDivide(costoBaseLote, unidades, 'costo unitario base');
      
      const minutosTotalesMes = 22 * 8 * 60;
      const costoPorMinutoOperativo = safeDivide(gastosFijos, minutosTotalesMes, 'costo por minuto');
      const minutosLote = horas * 60;
      const gastosFijosAplicados = safeMultiply(costoPorMinutoOperativo, minutosLote, 'gastos fijos aplicados');
      const gastosFijosPorUnidad = safeDivide(gastosFijosAplicados, unidades, 'gastos fijos por unidad');
      
      const costoUnitarioSinExtras = costoUnitarioBase + gastosFijosPorUnidad;
      const costoEnvioUnitario = validateNumber(configuracion.costoEnvioEstimado, 'Costo envío', { min: 0, defaultValue: 0 });

      // === 2. LOGÍSTICA INVERSA ===
      
      const factorFleteDevolucion = {
        MERCADO_LIBRE: 1.2,
        SHOPIFY: 2.0,
        AMAZON: 1.5,
        PROPIA: 2.0
      }[plataforma] || 1.5;
      
      const costoLogisticaInversaUnitario = safeMultiply(
        safeMultiply(costoEnvioUnitario, factorFleteDevolucion, 'flete devolución'),
        tasaDevolucion,
        'logística inversa unitaria'
      );
      
      const costoReacondicionamientoUnitario = safeMultiply(
        safeMultiply(costoUnitarioSinExtras, factorReacondicionamiento, 'factor reacondicionamiento'),
        tasaDevolucion,
        'reacondicionamiento unitario'
      );
      
      const costoUnitarioCargado = costoUnitarioSinExtras + costoEnvioUnitario + costoLogisticaInversaUnitario + costoReacondicionamientoUnitario;
      console.log('Costo unitario cargado:', costoUnitarioCargado);

      // === 3. CÁLCULO DE INGRESOS NETOS ===
      
      const comisionBase = safeMultiply(precioVenta, plataformaConfig.comision, 'comisión base');
      const ivaComision = safeMultiply(comisionBase, plataformaConfig.ivaComision || 0, 'IVA comisión');
      const retencionFuente = safeMultiply(precioVenta, configuracion.retencionFuente || 0, 'retención fuente');
      const ica = safeMultiply(precioVenta, configuracion.ica || 0, 'ICA');
      const cuotaFija = plataformaConfig.cuotaFija || 0;
      
      console.log('Comisión base:', comisionBase);
      console.log('IVA comisión:', ivaComision);
      console.log('Retención fuente:', retencionFuente);
      console.log('ICA:', ica);
      console.log('Cuota fija:', cuotaFija);
      
      const tasaEfectivaTotal = comisionBase + ivaComision + retencionFuente + ica + cuotaFija;
      const tasaEfectivaPorcentaje = safeDivide(tasaEfectivaTotal, precioVenta, 'tasa efectiva %');
      
      console.log('Tasa efectiva total:', tasaEfectivaTotal);
      console.log('Tasa efectiva porcentaje:', tasaEfectivaPorcentaje);
      
      const ingresoNetoUnitario = precioVenta - tasaEfectivaTotal;
      console.log('Ingreso neto unitario:', ingresoNetoUnitario);
      
      const ingresoRealUnitario = ingresoNetoUnitario;
      const ingresoRealTotal = safeMultiply(ingresoRealUnitario, unidades, 'ingreso real total');

      // === 4. UTILIDAD Y MÁRGENES ===
      
      const utilidadPorUnidad = ingresoNetoUnitario - costoUnitarioCargado;
      const utilidadTotal = safeMultiply(utilidadPorUnidad, unidades, 'utilidad total');
      
      const margenContable = ingresoNetoUnitario > 0 
        ? safeDivide(utilidadPorUnidad, ingresoNetoUnitario, 'margen contable') * 100 
        : -100;

      const margenOperativo = ingresoRealUnitario > 0 
        ? safeDivide(utilidadPorUnidad, ingresoRealUnitario, 'margen operativo') * 100 
        : -100;

      const margenParaDictamen = margenOperativo;
      
      console.log('Utilidad por unidad:', utilidadPorUnidad);
      console.log('Margen para dictamen:', margenParaDictamen);

      if ((utilidadPorUnidad > 0 && margenParaDictamen < 0) || (utilidadPorUnidad < 0 && margenParaDictamen > 0)) {
        throw new Error(`INCONSISTENCIA CRÍTICA: Utilidad=${utilidadPorUnidad.toFixed(2)}, Margen=${margenParaDictamen.toFixed(1)}%`);
      }
      
      if (!isFinite(margenParaDictamen)) {
        throw new Error('Margen calculado inválido (NaN o Infinity)');
      }

      // === 5. PRECIOS SUGERIDOS ===
      
      const factorPlataforma = 1 - tasaEfectivaPorcentaje;
      
      const calcularPrecioConMargen = (costo, margenObjetivo, factorPlat) => {
        if (factorPlat <= 0.01) return Infinity;
        const denominador = (1 - margenObjetivo) * factorPlat;
        if (denominador <= 0) return Infinity;
        return costo / denominador;
      };
      
      const precio40 = calcularPrecioConMargen(costoUnitarioCargado, 0.40, factorPlataforma);
      const precio30 = calcularPrecioConMargen(costoUnitarioCargado, 0.30, factorPlataforma);
      const precio20 = calcularPrecioConMargen(costoUnitarioCargado, 0.20, factorPlataforma);
      const puntoEquilibrio = calcularPrecioConMargen(costoUnitarioCargado, 0, factorPlataforma);

      // === 6. DICTAMEN DEL AUDITOR ===
      
      let dictamen = '', color = '', clasificacion = '', aprobado = false, mensaje = '';
      
      if (margenParaDictamen >= 40) {
        dictamen = '✅ APROBADO - PRODUCTO ESTRELLA';
        color = 'text-green-400';
        clasificacion = 'ESTRELLA';
        aprobado = true;
        mensaje = `Margen operativo del ${margenParaDictamen.toFixed(1)}%. Excelente rentabilidad.`;
      } else if (margenParaDictamen >= 25) {
        dictamen = '⚠️ OBSERVADO - PRODUCTO DE TRACCIÓN';
        color = 'text-yellow-400';
        clasificacion = 'NEUTRO';
        aprobado = true;
        mensaje = `Margen operativo del ${margenParaDictamen.toFixed(1)}%. Revisa costos o precio.`;
      } else if (margenParaDictamen > 0) {
        dictamen = '❌ RECHAZADO - RIESGO DE QUIEBRA TÉCNICA';
        color = 'text-red-400';
        clasificacion = 'HUESO';
        aprobado = false;
        mensaje = `Margen operativo del ${margenParaDictamen.toFixed(1)}%. Flujo insuficiente.`;
      } else {
        dictamen = '❌ RECHAZADO - MODELO INVIABLE';
        color = 'text-red-400';
        clasificacion = 'HUESO';
        aprobado = false;
        mensaje = `Margen negativo (${margenParaDictamen.toFixed(1)}%). Estás perdiendo dinero.`;
      }

      const alertas = [];
      if (tasaEfectivaPorcentaje > 0.25) {
        alertas.push(`🟡 COMISIONES: Te descuentan ${(tasaEfectivaPorcentaje * 100).toFixed(1)}% del precio`);
      }
      if (tasaDevolucion > 0.10) {
        alertas.push(`🔴 DEVOLUCIONES: Tasa alta (${(tasaDevolucion*100).toFixed(1)}%). Considera mejorar descripción/fotos`);
      }
      if (margenParaDictamen < 20 && margenParaDictamen > 0) {
        alertas.push('🔴 MODELO FRÁGIL: Cualquier variación genera pérdida');
      }
      if (precioVenta < puntoEquilibrio * 1.2 && puntoEquilibrio !== Infinity) {
        alertas.push('⚠️ PRECIO CERCA DEL PUNTO DE EQUILIBRIO');
      }
      if (margenParaDictamen < 40 && aprobado) {
        alertas.push(`💡 Para 40% de margen: ${Math.round(precio40).toLocaleString()} ${configuracion.moneda}`);
      }
      if (costoUnitarioCargado > precioVenta * 2) {
        alertas.push("🔴 COSTO DESPROPORCIONADO: revisa estructura de costos");
      }
      if (tasaEfectivaPorcentaje > 0.35) {
        alertas.push("🔴 PLATAFORMA INVIABLE: comisiones excesivas (>35%)");
      }

      console.log('=== FIN DEBUG ===');
      
      return {
        costoUnitarioBase: parseFloat(costoUnitarioBase.toFixed(2)),
        costoUnitarioCargado: parseFloat(costoUnitarioCargado.toFixed(2)),
        ingresoNetoUnitario: parseFloat(ingresoNetoUnitario.toFixed(2)),
        ingresoRealUnitario: parseFloat(ingresoRealUnitario.toFixed(2)),
        utilidadPorUnidad: parseFloat(utilidadPorUnidad.toFixed(2)),
        utilidadTotal: parseFloat(utilidadTotal.toFixed(2)),
        
        margenContable: parseFloat(margenContable.toFixed(1)),
        margenOperativo: parseFloat(margenOperativo.toFixed(1)),
        margenNetoReal: parseFloat(margenParaDictamen.toFixed(1)),
        
        dictamen,
        color,
        clasificacion,
        aprobado,
        mensajeDetallado: mensaje,
        alertas,
        
        precioSugerido: {
          margen40: isFinite(precio40) ? Math.round(precio40) : null,
          margen30: isFinite(precio30) ? Math.round(precio30) : null,
          margen20: isFinite(precio20) ? Math.round(precio20) : null,
          puntoEquilibrio: isFinite(puntoEquilibrio) ? Math.round(puntoEquilibrio) : null
        },
        
        desglose: {
          materiales: parseFloat(materiales.toFixed(2)),
          manoObra: parseFloat(costoManoObraTotal.toFixed(2)),
          transporte: parseFloat(transporte.toFixed(2)),
          gastosFijosAplicados: parseFloat(gastosFijosAplicados.toFixed(2)),
          gastosFijosPorUnidad: parseFloat(gastosFijosPorUnidad.toFixed(2)),
          costoEnvioUnitario: parseFloat(costoEnvioUnitario.toFixed(2)),
          costoEnvioTotal: parseFloat(safeMultiply(costoEnvioUnitario, unidades).toFixed(2)),
          logisticaInversaUnitaria: parseFloat(costoLogisticaInversaUnitario.toFixed(2)),
          logisticaInversaTotal: parseFloat((safeMultiply(costoLogisticaInversaUnitario || 0, unidades || 0)).toFixed(2)),
          reacondicionamientoUnitario: parseFloat(costoReacondicionamientoUnitario.toFixed(2)),
          reacondicionamientoTotal: parseFloat(safeMultiply(costoReacondicionamientoUnitario, unidades).toFixed(2)),
          comisionBase: parseFloat(comisionBase.toFixed(2)),
          ivaComision: parseFloat(ivaComision.toFixed(2)),
          retenciones: parseFloat((retencionFuente + ica).toFixed(2)),
          cuotaFija: parseFloat(cuotaFija.toFixed(2)),
          totalDeduccionesUnitarias: parseFloat(tasaEfectivaTotal.toFixed(2)),
          totalDeduccionesLote: parseFloat(safeMultiply(tasaEfectivaTotal, unidades).toFixed(2)),
          tasaDevolucionAplicada: parseFloat((tasaDevolucion * 100).toFixed(1)),
          factorReacondicionamiento: parseFloat((factorReacondicionamiento * 100).toFixed(1)),
          factorFleteDevolucion: parseFloat(factorFleteDevolucion.toFixed(1))
        },
        
        configuracion: {
          moneda: configuracion.moneda,
          plataforma,
          gastosFijosMensuales: gastosFijos,
          tasaEfectiva: parseFloat((tasaEfectivaPorcentaje * 100).toFixed(1)),
          factorPrestacional,
          tasaDevolucion: parseFloat((tasaDevolucion * 100).toFixed(1))
        },
        
        fechaAuditoria: new Date().toISOString(),
        requiereConfiguracion: false,
        version: '2.2-pro'
      };
      
    } catch (error) {
      console.error('🚨 ERROR EN AUDITORÍA:', error.message);
      
      return {
        error: error.message,
        dictamen: '❌ ERROR DE CÁLCULO',
        color: 'text-red-600',
        clasificacion: 'ERROR',
        aprobado: false,
        mensajeDetallado: 'No se pudo completar la auditoría. Revisa los datos de entrada.',
        alertas: [`🔴 ${error.message}`],
        requiereConfiguracion: error.message.includes('CONFIGURACIÓN'),
        fechaAuditoria: new Date().toISOString()
      };
    }
  }, [configuracion]);

  return {
    auditarProduccion,
    configuracion,
    cargandoConfig,
    errorConfig,
    regionesDisponibles: Object.keys(REGIONES)
      .filter(k => k !== 'DEFAULT')
      .map(k => ({ key: k, nombre: REGIONES[k].nombre })),
    plataformasDisponibles: ['MERCADO_LIBRE', 'SHOPIFY', 'AMAZON', 'PROPIA'],
    categoriasDisponibles: ['electronica', 'moda', 'hogar', 'default']
  };
};

export default useAuditEngine;

