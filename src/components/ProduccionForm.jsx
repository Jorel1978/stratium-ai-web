// components/ProduccionForm.jsx

// STRATIUM GLOBAL AI - v3.0-International
// CORREGIDO: Simetría perfecta entre realCostPerHour y Labor Unit. (Audit.)

import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { useAuditEngine } from '../hooks/useAuditEngine';
import { useTranslation } from '../hooks/useTranslation';
import { getRegionalConfig } from '../config/regional';
import { formatMoneyUniversal } from '../util/formatMoneyUniversal';

const roundMoney = (valor) => Math.round((Number(valor) || 0) * 100) / 100;
const PROVISION_PORCENTAJE = 0.15;

const ProduccionForm = ({ usuarioActual, idioma, onSuccess, onError }) => {
  const { t } = useTranslation();
  const idiomaActual = t('idioma') === 'en' ? 'en' : 'es';
  
  const { configuracion, cargandoConfig } = useAuditEngine(usuarioActual);
  
  const paisCodigo = usuarioActual?.pais || 'CO';
  const configRegional = getRegionalConfig(paisCodigo, usuarioActual?.config);

  const [costosGlobales, setCostosGlobales] = useState({
    horasLaborTotal: '',
    valorHoraPersonalizado: '',
    transporteTotal: '',
    gastosFijosAdicionales: ''
  });

  const [productos, setProductos] = useState([
    { 
      id: Date.now(), 
      nombre: '', 
      cantidad: 1, 
      precioVenta: '', 
      materialesEspecificos: '', 
      horasPorUnidad: 1, 
      nota: '', 
      fechaIngreso: new Date().toISOString() 
    }
  ]);

  const [resultadosAuditoria, setResultadosAuditoria] = useState([]);
  const [resumenAbsorcion, setResumenAbsorcion] = useState(null);
  const [absorcionAcumulada, setAbsorcionAcumulada] = useState(0);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);

  const db = getFirestore();
  
  const gastosFijosMensuales = configuracion?.gastosFijosMensuales || 1500000;
  const region = configuracion?.region || 'AMERICA_SUR';
  const plataforma = configuracion?.plataforma || 'PROPIA';
  const factorPrestacional = configuracion?.factorPrestacional || 1.52;
  
  const getComisionPorcentaje = () => {
    if (plataforma === 'MERCADO_LIBRE') return 0.271;
    if (plataforma === 'AMAZON') return 0.15;
    if (plataforma === 'SHOPIFY') return 0.035;
    if (plataforma === 'PROPIA') return 0;
    if (plataforma === 'CUSTOM') return (configuracion?.comisionPersonalizada || 0) / 100;
    return 0;
  };
  
  const getComisionLetrero = () => {
    if (plataforma === 'MERCADO_LIBRE') return '27.1%';
    if (plataforma === 'AMAZON') return '15%';
    if (plataforma === 'SHOPIFY') return '3.5%';
    if (plataforma === 'PROPIA') return '0%';
    if (plataforma === 'CUSTOM') return `${configuracion?.comisionPersonalizada || 0}%`;
    return '0%';
  };
  
  const getNombrePlataforma = () => {
    const nombres = {
      'MERCADO_LIBRE': 'Mercado Libre',
      'AMAZON': 'Amazon',
      'SHOPIFY': 'Shopify',
      'PROPIA': idiomaActual === 'en' ? 'Own Platform' : 'Plataforma Propia',
      'CUSTOM': configuracion?.comisionPersonalizadaNombre || (idiomaActual === 'en' ? 'Custom Channel' : 'Canal Personalizado')
    };
    return nombres[plataforma] || plataforma;
  };

  const getNombreRegion = () => {
    const nombres = {
      'AMERICA_SUR': idiomaActual === 'en' ? 'South America' : 'América del Sur',
      'CENTROAMERICA_CARIBE': idiomaActual === 'en' ? 'Central America & Caribbean' : 'Centroamérica y Caribe',
      'NORTEAMERICA': idiomaActual === 'en' ? 'North America' : 'Norteamérica',
      'EUROPA': idiomaActual === 'en' ? 'Europe' : 'Europa',
      'DEFAULT': idiomaActual === 'en' ? 'International' : 'Internacional'
    };
    return nombres[region] || region;
  };

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
  }, [usuarioActual?.uid, db]);

  const formatMoney = useCallback((valor) => {
    return formatMoneyUniversal(valor, paisCodigo);
  }, [paisCodigo]);

  const handleGlobalChange = (campo, valor) => setCostosGlobales(prev => ({ ...prev, [campo]: valor }));

  const agregarProducto = () => setProductos(prev => [...prev, { 
    id: Date.now() + Math.random(), 
    nombre: '', 
    cantidad: 1, 
    precioVenta: '', 
    materialesEspecificos: '', 
    horasPorUnidad: 1, 
    nota: '',
    fechaIngreso: new Date().toISOString()
  }]);

  const eliminarProducto = (id) => { 
    if (productos.length > 1) setProductos(prev => prev.filter(p => p.id !== id)); 
  };

  const actualizarProducto = (id, campo, valor) => setProductos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const calcularDiasEnStock = (fechaIngreso) => {
    if (!fechaIngreso) return 0;
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    const diffTime = hoy - ingreso;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const calcularPrecioSugerido = (costoVariable, margenObjetivo) => {
    const porcentaje = 1 - margenObjetivo;
    if (porcentaje <= 0) return 0;
    return Math.ceil(costoVariable / porcentaje);
  };

  // ==================== MOTOR DE CÁLCULO - SIMETRÍA PERFECTA ====================
  const handleProcesar = useCallback(async () => {
    const productosValidos = productos.filter(p => p.nombre?.trim() && parseInt(p.cantidad) > 0);
    if (productosValidos.length === 0) {
      alert(idiomaActual === 'en' ? '⚠️ Add at least one valid product' : '⚠️ Agrega al menos un producto válido');
      return;
    }

    setCalculando(true);

    try {
      const horasLaboralesLote = parseFloat(costosGlobales.horasLaborTotal) || 0;
      const valorHoraBase = parseFloat(costosGlobales.valorHoraPersonalizado) || 0;
      
      const transporte = parseFloat(costosGlobales.transporteTotal) || 0;
      const gastosAdicionales = parseFloat(costosGlobales.gastosFijosAdicionales) || 0;

      if (horasLaboralesLote <= 0) {
        alert(idiomaActual === 'en' ? '⚠️ Total Batch Hours is required' : '⚠️ Debes ingresar las Horas Totales del Lote');
        setCalculando(false);
        return;
      }

      // ==================== CÁLCULO DEL COSTO POR HORA REAL (UNIFICADO) ====================
      const valorHoraConPrestaciones = roundMoney(valorHoraBase * factorPrestacional);
      const costoManoObraTotalLote = roundMoney(horasLaboralesLote * valorHoraConPrestaciones);
      const costoTotalLote = roundMoney(costoManoObraTotalLote + transporte + gastosAdicionales);
      const realCostPerHour = roundMoney(costoTotalLote / horasLaboralesLote);
      
      // Desglose para UI transparente
      const costoOperativoPorHora = roundMoney((transporte + gastosAdicionales) / horasLaboralesLote);
      const costosFijosPorHora = roundMoney(gastosFijosMensuales / (22 * 8 * 4)); // Aprox 704h mes

      const comisionPorcentaje = getComisionPorcentaje();
      const comisionLetrero = getComisionLetrero();
      const nombrePlataforma = getNombrePlataforma();

      const resultados = [];
      let contribucionTotalLote = 0;

      for (const prod of productosValidos) {
        const cantidad = parseInt(prod.cantidad);
        const precioVenta = roundMoney(parseFloat(prod.precioVenta) || 0);
        const materialesTotales = parseFloat(prod.materialesEspecificos) || 0;
        const horasProducto = parseFloat(prod.horasPorUnidad) || 1;
        const fechaIngreso = prod.fechaIngreso || new Date().toISOString();
        const diasEnStock = calcularDiasEnStock(fechaIngreso);

        // ==================== FÓRMULA ÚNICA E INALTERABLE ====================
        // Labor Unit. (Audit.) = (horasProducto * realCostPerHour) / cantidad
        const laborUnitario = roundMoney((horasProducto * realCostPerHour) / cantidad);
        
        // CIF Unitario (transporte + adicionales prorrateados por horas)
        const cifUnitario = roundMoney((horasProducto * costoOperativoPorHora) / cantidad);
        
        // Materiales unitarios
        const materialesUnitarios = roundMoney(materialesTotales / cantidad);
        
        // Provisión 15% sobre materiales
        const provisionUnitario = roundMoney(materialesUnitarios * PROVISION_PORCENTAJE);
        
        // Comisión
        const comisionUnitaria = roundMoney(precioVenta * comisionPorcentaje);
        
        // Costo variable total unitario
        const costoVariableTotal = roundMoney(
          laborUnitario + cifUnitario + materialesUnitarios + provisionUnitario + comisionUnitaria
        );
        
        // Utilidad y margen
        const utilidadNetaAuditada = roundMoney(precioVenta - costoVariableTotal);
        const margenAuditado = precioVenta > 0 ? (utilidadNetaAuditada / precioVenta) * 100 : 0;
        
        // Punto de equilibrio
        let puntoEquilibrio = utilidadNetaAuditada > 0 
          ? Math.ceil(gastosFijosMensuales / utilidadNetaAuditada) 
          : Infinity;

        // Sugerencias de precio (base sin margen objetivo)
        const costosBaseSinMargen = roundMoney(materialesUnitarios + laborUnitario + cifUnitario + provisionUnitario);
        
        const sugerencias = [0.10, 0.20, 0.30, 0.40].map(target => {
          const denominador = 1 - comisionPorcentaje - target;
          const precioSugerido = denominador > 0.01 ? Math.ceil(costosBaseSinMargen / denominador) : 0;
          return { margin: target * 100, precio: roundMoney(precioSugerido) };
        });

        const precioIdeal50 = calcularPrecioSugerido(costoVariableTotal, 0.50);
        const precioFase30_40 = calcularPrecioSugerido(costoVariableTotal, 0.40);
        const precioFase60_30 = calcularPrecioSugerido(costoVariableTotal, 0.30);
        const precioFase90_10 = calcularPrecioSugerido(costoVariableTotal, 0.10);

        // ==================== DICTAMEN (con regla de punto de equilibrio) ====================
        let estadoColor = 'green';
        let estadoTexto = '';
        let estrategiaBanner = null;

        const generarMensajeEstrategia = (dias, precio, margen) => {
          if (idiomaActual === 'en') {
            return `⚠️ Product with ${dias} days in stock and negative margin. Suggested price: ${formatMoney(precio)} (${margen}% margin)`;
          }
          return `⚠️ Producto con ${dias} días en stock y margen negativo. Precio sugerido: ${formatMoney(precio)} (margen ${margen}%)`;
        };

        if (utilidadNetaAuditada <= 0 || diasEnStock >= 90) {
          estadoColor = 'red';
          estadoTexto = idiomaActual === 'en' ? '⚠️ RISK' : '⚠️ RIESGO';
          estrategiaBanner = {
            tipo: idiomaActual === 'en' ? 'URGENT CLEARANCE' : 'REMATE URGENTE',
            mensaje: generarMensajeEstrategia(diasEnStock, precioFase90_10, 10),
            precioSugerido: precioFase90_10,
            margenSugerido: 10
          };
        } else if (puntoEquilibrio !== Infinity && cantidad < puntoEquilibrio) {
          estadoColor = 'orange';
          estadoTexto = idiomaActual === 'en' ? '⚠️ OBSERVED - INSUFFICIENT LOT' : '⚠️ OBSERVADO - LOTE INSUFICIENTE';
          const cobertura = Math.round((cantidad / puntoEquilibrio) * 100);
          estrategiaBanner = {
            tipo: idiomaActual === 'en' ? 'SCALING NEEDED' : 'NECESITA ESCALAR',
            mensaje: idiomaActual === 'en'
              ? `⚠️ You need to produce ${puntoEquilibrio - cantidad} more units to reach break-even point. Current lot covers ${cobertura}% of fixed costs.`
              : `⚠️ Necesitas producir ${puntoEquilibrio - cantidad} unidades más para alcanzar el punto de equilibrio. El lote actual cubre el ${cobertura}% de los costos fijos.`,
            precioSugerido: null,
            margenSugerido: null
          };
        } else if (diasEnStock >= 60 || margenAuditado < 10) {
          estadoColor = 'red';
          estadoTexto = idiomaActual === 'en' ? '⚠️ RISK' : '⚠️ RIESGO';
          estrategiaBanner = {
            tipo: idiomaActual === 'en' ? 'LIQUIDATION' : 'LIQUIDACIÓN',
            mensaje: generarMensajeEstrategia(diasEnStock, precioFase60_30, 30),
            precioSugerido: precioFase60_30,
            margenSugerido: 30
          };
        } else if (diasEnStock >= 30 || margenAuditado < 20) {
          estadoColor = 'orange';
          estadoTexto = idiomaActual === 'en' ? '⚡ OPTIMAL' : '⚡ ÓPTIMO';
          estrategiaBanner = {
            tipo: idiomaActual === 'en' ? 'EARLY WARNING' : 'ALERTA TEMPRANA',
            mensaje: generarMensajeEstrategia(diasEnStock, precioFase30_40, 40),
            precioSugerido: precioFase30_40,
            margenSugerido: 40
          };
        } else if (margenAuditado >= 30) {
          estadoColor = 'green';
          estadoTexto = idiomaActual === 'en' ? '🌟 PROFITABLE' : '🌟 RENTABLE';
        } else if (margenAuditado >= 20) {
          estadoColor = 'orange';
          estadoTexto = idiomaActual === 'en' ? '⚡ OPTIMAL' : '⚡ ÓPTIMO';
        }

        resultados.push({
          id: prod.id,
          nombre: prod.nombre.trim(),
          cantidad,
          precioVenta,
          horasProducto,
          laborUnitario,
          cifUnitario,
          materialesUnitarios,
          provisionImprevistos: provisionUnitario,
          comisionUnitaria,
          comisionPorcentaje: comisionPorcentaje * 100,
          comisionLetrero,
          plataforma: nombrePlataforma,
          utilidadNetaAuditada,
          margenAuditado: parseFloat(margenAuditado.toFixed(2)),
          puntoEquilibrio,
          sugerenciasPrecios: sugerencias,
          costoVariableTotal,
          estadoColor,
          estadoTexto,
          diasEnStock,
          estrategiaBanner,
          precioIdeal50,
          precioFase30_40,
          precioFase60_30,
          precioFase90_10,
          nota: prod.nota,
          parametrosUsados: {
            factorPrestacional: factorPrestacional,
            porcentajeProvision: PROVISION_PORCENTAJE * 100,
            plataforma: plataforma,
            comisionAplicada: comisionPorcentaje * 100,
            region: region,
            realCostPerHour: realCostPerHour
          }
        });

        contribucionTotalLote = roundMoney(contribucionTotalLote + (utilidadNetaAuditada * cantidad));
      }

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
        gastosFijosRestantes: roundMoney(gastosFijosMensuales - absorcionTotalProyectada),
        plataforma: nombrePlataforma,
        comisionAplicada: comisionLetrero,
        costoTotalLote,
        realCostPerHour,
        costoOperativoPorHora,
        costosFijosPorHora,
        horasLote: horasLaboralesLote,
        regionNombre: getNombreRegion(),
        factorPrestacionalUsado: factorPrestacional,
        provisionUsada: PROVISION_PORCENTAJE * 100,
        valorHoraConPrestaciones,
        parametrosUsados: {
          factorPrestacional: factorPrestacional,
          porcentajeProvision: PROVISION_PORCENTAJE * 100,
          region: region
        }
      });

    } catch (error) {
      console.error('Error en auditoría:', error);
      alert(idiomaActual === 'en' ? '❌ Audit error' : '❌ Error al auditar');
    } finally {
      setCalculando(false);
    }
  }, [productos, costosGlobales, gastosFijosMensuales, absorcionAcumulada, factorPrestacional, plataforma, region, idiomaActual, formatMoney]);

 // ==================== PERSISTENCIA - VERSIÓN SIMPLIFICADA Y FUNCIONAL ====================
const handleGuardar = useCallback(async () => {
  if (!resultadosAuditoria.length) {
    alert(idiomaActual === 'en' ? '⚠️ Audit first' : '⚠️ Audita primero');
    return;
  }
  if (!usuarioActual?.uid) {
    alert(idiomaActual === 'en' ? '⚠️ You must log in' : '⚠️ Debes iniciar sesión');
    return;
  }
  
  setLoading(true);
  const procesoId = `PROC-${Date.now()}`;

  try {
    // ============================================================
    // ✅ VERIFICAR LÍMITE DE PRODUCTOS EN INVENTARIO (STARTER)
    // ============================================================
    const plan = usuarioActual?.plan || 'starter';
    if (plan === 'starter') {
      const inventarioRef = collection(db, 'inventario');
      const q = query(inventarioRef, where('userId', '==', usuarioActual.uid));
      const snapshot = await getDocs(q);
      const cantidadProductosActual = snapshot.size;
      
      // Contar cuántos productos NUEVOS se van a crear en este lote
      let nuevosProductos = 0;
      for (const prod of resultadosAuditoria) {
        const productoQuery = query(inventarioRef, 
          where('producto', '==', prod.nombre), 
          where('userId', '==', usuarioActual.uid)
        );
        const productoSnapshot = await getDocs(productoQuery);
        if (productoSnapshot.empty) {
          nuevosProductos++;
        }
      }
      
      const totalProductosDespues = cantidadProductosActual + nuevosProductos;
      
      // Starter: máximo 20 productos
      if (totalProductosDespues > 20) {
        alert('❌ Has alcanzado el límite de 20 productos en inventario. Actualiza a Pro o Business para tener productos ilimitados.');
        setLoading(false);
        return;
      }
    }
    
    // ============================================================
    // PRIMERO: Guardar el proceso de producción
    // ============================================================
    const procRef = doc(collection(db, 'procesosProduccion'));
    await setDoc(procRef, {
      procesoId, 
      fecha: serverTimestamp(), 
      userId: usuarioActual.uid,
      version: 'v3.0-International',
      pais: paisCodigo,
      idioma: idiomaActual,
      resumen: { 
        totalProductos: resultadosAuditoria.length, 
        utilidadTotal: resumenAbsorcion?.contribucionLoteActual || 0,
        horasTotalesLote: resumenAbsorcion?.horasLote || 0,
        realCostPerHour: resumenAbsorcion?.realCostPerHour || 0,
        plataforma: resumenAbsorcion?.plataforma || '',
        comisionAplicada: resumenAbsorcion?.comisionAplicada || '0%',
        parametrosGlobales: resumenAbsorcion?.parametrosUsados || {},
        factorPrestacionalUsado: resumenAbsorcion?.factorPrestacionalUsado || 1.52,
        provisionUsada: resumenAbsorcion?.provisionUsada || 15
      }
    });
    
    // ============================================================
    // SEGUNDO: Guardar cada compra y actualizar inventario
    // ============================================================
    for (const prod of resultadosAuditoria) {
      // 2.1 Guardar compra/egreso
      const compraRef = doc(collection(db, 'compras'));
      await setDoc(compraRef, {
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
          provisionAplicada: prod.provisionImprevistos,
          comisionAplicada: prod.comisionPorcentaje,
          plataforma: prod.plataforma,
          diasEnStock: prod.diasEnStock || 0,
          laborUnitario: prod.laborUnitario,
          realCostPerHour: resumenAbsorcion?.realCostPerHour || 0,
          parametrosUsados: prod.parametrosUsados || {}
        }
      });
      
      // 2.2 Actualizar inventario
      const inventarioQuery = query(
        collection(db, 'inventario'), 
        where('producto', '==', prod.nombre), 
        where('userId', '==', usuarioActual.uid)
      );
      const snapshot = await getDocs(inventarioQuery);
      
      if (snapshot.empty) {
        // Nuevo producto - crear
        await setDoc(doc(collection(db, 'inventario')), {
          producto: prod.nombre, 
          cantidad: prod.cantidad, 
          costoUnitario: roundMoney(prod.costoVariableTotal),
          precioVentaReferencia: prod.precioVenta,
          margenReferencia: prod.margenAuditado,
          userId: usuarioActual.uid, 
          origen: 'produccion_v3.0-International', 
          procesoId, 
          fecha: serverTimestamp(),
          pais: paisCodigo,
          moneda: configRegional.moneda,
          fechaIngreso: new Date().toISOString(),
          parametrosGlobales: prod.parametrosUsados || {},
          metadata: {
            horasProducto: prod.horasProducto,
            laborUnitario: prod.laborUnitario,
            cifUnitario: prod.cifUnitario,
            plataforma: prod.plataforma,
            comisionAplicada: prod.comisionPorcentaje,
            diasEnStock: prod.diasEnStock || 0,
            realCostPerHour: resumenAbsorcion?.realCostPerHour || 0,
            precioIdeal50: prod.precioIdeal50,
            precioFase30_40: prod.precioFase30_40,
            precioFase60_30: prod.precioFase60_30,
            precioFase90_10: prod.precioFase90_10
          }
        });
      } else {
        // Producto existente - actualizar con promedio ponderado
        const docRef = snapshot.docs[0].ref;
        const actual = snapshot.docs[0].data();
        const cantidadAnterior = actual.cantidad || 0;
        const costoAnterior = roundMoney(cantidadAnterior * (actual.costoUnitario || 0));
        const costoNuevoLote = roundMoney(prod.cantidad * prod.costoVariableTotal);
        const nuevaCant = cantidadAnterior + prod.cantidad;
        const nuevoCostoUnitario = roundMoney((costoAnterior + costoNuevoLote) / nuevaCant);
        
        await updateDoc(docRef, {
          cantidad: nuevaCant,
          costoUnitario: nuevoCostoUnitario,
          costoTotal: roundMoney(nuevoCostoUnitario * nuevaCant),
          precioVentaReferencia: prod.precioVenta || actual.precioVentaReferencia,
          margenReferencia: prod.margenAuditado || actual.margenReferencia,
          fechaModificacion: serverTimestamp(),
          ultimoProcesoId: procesoId,
          pais: paisCodigo,
          moneda: configRegional.moneda,
          ultimosParametrosGlobales: prod.parametrosUsados || {},
          ultimaPlataforma: prod.plataforma,
          ultimaComision: prod.comisionPorcentaje,
          diasEnStock: prod.diasEnStock || 0,
          ultimoRealCostPerHour: resumenAbsorcion?.realCostPerHour || 0,
          precioIdeal50: prod.precioIdeal50,
          precioFase30_40: prod.precioFase30_40,
          precioFase60_30: prod.precioFase60_30,
          precioFase90_10: prod.precioFase90_10
        });
      }
    }
    
    const mensajeExito = idiomaActual === 'en' 
      ? '✅ Lot successfully registered with global financial precision.'
      : '✅ Lote registrado correctamente con precisión financiera global.';
    alert(mensajeExito);
    
    // Resetear formulario
    setProductos([{ id: Date.now(), nombre: '', cantidad: 1, precioVenta: '', materialesEspecificos: '', horasPorUnidad: 1, nota: '', fechaIngreso: new Date().toISOString() }]);
    setResultadosAuditoria([]);
    
    const nuevaAbsorcion = roundMoney(absorcionAcumulada + (resumenAbsorcion?.contribucionLoteActual || 0));
    setAbsorcionAcumulada(nuevaAbsorcion);
    
    if (onSuccess) onSuccess({ procesoId, absorcionActualizada: nuevaAbsorcion });
    
  } catch (e) {
    console.error('Error al guardar:', e);
    alert('❌ ' + (idiomaActual === 'en' ? 'Error saving: ' : 'Error al guardar: ') + e.message);
    if (onError) onError(e);
  } finally {
    setLoading(false);
  }
}, [resultadosAuditoria, resumenAbsorcion, usuarioActual, db, absorcionAcumulada, onSuccess, onError, paisCodigo, configRegional, idiomaActual]);

  // ==================== COMPONENTE UI ====================
  const AuditoriaCard = ({ prod }) => {
    const borderColor = prod.estadoColor === 'red' ? 'border-red-500 bg-red-900/10' 
                       : prod.estadoColor === 'orange' ? 'border-orange-500 bg-orange-900/10' 
                       : 'border-green-500 bg-green-900/10';
    
    const textColor = prod.estadoColor === 'red' ? 'text-red-400' 
                       : prod.estadoColor === 'orange' ? 'text-orange-400' 
                       : 'text-green-400';

    return (
      <div className={`rounded-xl border-2 ${borderColor} p-5 mb-4 shadow-md transition-all hover:shadow-lg`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              🏭 {prod.nombre}
              {prod.nota && <span className="text-xs text-gray-400 font-normal bg-slate-800 px-2 py-1 rounded ml-2">{prod.nota}</span>}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {t('quantity') || (idiomaActual === 'en' ? 'Quantity' : 'Cantidad')}: {prod.cantidad} und •
              {t('assignedEffort') || (idiomaActual === 'en' ? 'Assigned Effort' : 'Esfuerzo Asignado')}: {prod.horasProducto}h •
              {t('price') || (idiomaActual === 'en' ? 'Price' : 'Precio')}: {formatMoney(prod.precioVenta)} •
              {t('channel') || (idiomaActual === 'en' ? 'Channel' : 'Canal')}: {prod.plataforma} ({prod.comisionLetrero})
              {prod.diasEnStock > 0 && ` • 📆 ${prod.diasEnStock} ${idiomaActual === 'en' ? 'days in stock' : 'días en stock'}`}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${borderColor.replace('bg-', 'text-').split(' ')[0]} ${prod.estadoColor === 'red' ? 'bg-red-500/20' : prod.estadoColor === 'orange' ? 'bg-orange-500/20' : 'bg-green-500/20'}`}>
            {prod.estadoTexto}
          </div>
        </div>

        {prod.estrategiaBanner && (
          <div className={`mb-4 p-3 rounded-lg ${prod.estadoColor === 'red' ? 'bg-red-900/50 border border-red-500' : 'bg-yellow-900/50 border border-yellow-500'}`}>
            <p className="text-sm font-bold text-yellow-300 flex items-center gap-2">
              <span>💡</span> {t('suggestedStrategy') || (idiomaActual === 'en' ? 'SUGGESTED STRATEGY:' : 'ESTRATEGIA SUGERIDA:')}
            </p>
            <p className="text-xs text-white mt-1">{prod.estrategiaBanner.mensaje}</p>
            {prod.estrategiaBanner.precioSugerido && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-800 p-2 rounded text-center">
                  <p className="text-gray-400">{t('ideal50') || 'Ideal (50%)'}</p>
                  <p className="text-green-400 font-bold">{formatMoney(prod.precioIdeal50)}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded text-center">
                  <p className="text-gray-400">{t('phase30_40') || (idiomaActual === 'en' ? '30 days (40%)' : '30 días (40%)')}</p>
                  <p className="text-cyan-400 font-bold">{formatMoney(prod.precioFase30_40)}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded text-center">
                  <p className="text-gray-400">{t('phase60_30') || (idiomaActual === 'en' ? '60 days (30%)' : '60 días (30%)')}</p>
                  <p className="text-yellow-400 font-bold">{formatMoney(prod.precioFase60_30)}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded text-center">
                  <p className="text-gray-400">{t('phase90_10') || (idiomaActual === 'en' ? '90 days (10%)' : '90 días (10%)')}</p>
                  <p className="text-red-400 font-bold">{formatMoney(prod.precioFase90_10)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-800 p-3 rounded text-center">
            <p className="text-gray-400 text-xs">{t('sellingPrice') || (idiomaActual === 'en' ? 'Selling Price' : 'Precio Venta')}</p>
            <p className="text-lg font-bold text-white">{formatMoney(prod.precioVenta)}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center relative group">
            <p className="text-gray-400 text-xs cursor-help">{t('totalVariableCost') || (idiomaActual === 'en' ? 'Total Var. Cost' : 'Costo Var. Total')} (?)</p>
            <p className="text-lg font-bold text-orange-400">{formatMoney(prod.costoVariableTotal)}</p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-xs text-gray-300 rounded shadow-lg hidden group-hover:block z-50 border border-slate-700">
              <div className="grid grid-cols-2 gap-1">
                <span>🔧 Labor:</span><span className="text-right">{formatMoney(prod.laborUnitario)}</span>
                <span>📦 CIF:</span><span className="text-right">{formatMoney(prod.cifUnitario)}</span>
                <span>📦 Materiales:</span><span className="text-right">{formatMoney(prod.materialesUnitarios)}</span>
                <span>🛡️ Provisión (15%):</span><span className="text-right">{formatMoney(prod.provisionImprevistos)}</span>
                <span>💳 Comisión ({prod.comisionLetrero}):</span><span className="text-right">{formatMoney(prod.comisionUnitaria)}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center relative group">
            <p className="text-gray-400 text-xs cursor-help">{t('auditedProfit') || (idiomaActual === 'en' ? 'Audited Profit' : 'Utilidad Auditada')} (?)</p>
            <p className={`text-xl font-black ${textColor}`}>{formatMoney(prod.utilidadNetaAuditada)}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center">
            <p className="text-gray-400 text-xs">{t('auditedMargin') || (idiomaActual === 'en' ? 'Audited Margin' : 'Margen Auditado')}</p>
            <p className={`text-2xl font-black ${textColor}`}>{prod.margenAuditado}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-slate-900/50 p-3 rounded">
           <div className="flex justify-between">
             <span className="text-gray-400">{t('breakEvenPoint') || (idiomaActual === 'en' ? 'Break-even Point' : '⚖️ Punto Equilibrio')}:</span>
             <span className="text-white font-bold">{prod.puntoEquilibrio === Infinity ? '∞' : `${prod.puntoEquilibrio.toLocaleString()} und`}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">🔧 {t('laborPerUnit') || (idiomaActual === 'en' ? 'Labor Unit (Audit.)' : 'Labor Unit. (Audit.)')}:</span>
             <span className="text-white">{formatMoney(prod.laborUnitario)}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">📦 {t('cifPerUnit') || (idiomaActual === 'en' ? 'CIF Unit' : 'CIF Unitario')}:</span>
             <span className="text-white">{formatMoney(prod.cifUnitario)}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">💳 {t('channelCommission') || (idiomaActual === 'en' ? 'Channel Commission' : 'Comisión Canal')}:</span>
             <span className="text-white">{formatMoney(prod.comisionUnitaria)}</span>
           </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-cyan-400 text-xs font-bold hover:text-cyan-300 flex items-center gap-2 select-none">
            📊 {t('priceSimulator') || (idiomaActual === 'en' ? 'Price Simulator for 10-40% Margins' : 'Simulador de Precios para Márgenes 10-40%')} <span className="group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {prod.sugerenciasPrecios.map((s, i) => (
              <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-cyan-500 transition">
                <p className="text-gray-400 mb-1">{t('forMargin') || (idiomaActual === 'en' ? 'For' : 'Para')} {s.margin}% {t('margin') || (idiomaActual === 'en' ? 'Margin' : 'Margen')}</p>
                <p className="text-cyan-400 font-bold">{formatMoney(s.precio)}</p>
                <p className="text-gray-500 text-[10px] mt-1">
                  {s.precio > prod.precioVenta ? '↑ ' + (t('increase') || (idiomaActual === 'en' ? 'Increase' : 'Subir')) : s.precio < prod.precioVenta ? '↓ ' + (t('decrease') || (idiomaActual === 'en' ? 'Decrease' : 'Bajar')) : '✓ ' + (t('current') || (idiomaActual === 'en' ? 'Current' : 'Actual'))}
                </p>
              </div>
            ))}
          </div>
        </details>

        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
          <span className="text-gray-400 text-sm">{t('totalContribution') || (idiomaActual === 'en' ? 'Total contribution' : 'Contribución total')} ({prod.cantidad} und):</span>
          <span className={`text-xl font-bold ${prod.utilidadNetaAuditada * prod.cantidad >= 0 ? 'text-green-400' : 'text-red-500'}`}>
            {formatMoney(prod.utilidadNetaAuditada * prod.cantidad)}
          </span>
        </div>
      </div>
    );
  };

  // ==================== RENDERIZADO PRINCIPAL ====================
  if (cargandoConfig) {
    return (
      <div className="text-center text-gray-400 p-10">
        {idiomaActual === 'en' ? 'Loading audit engine...' : 'Cargando motor de auditoría...'}
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30 shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-2">
        {idiomaActual === 'en' ? '🏭 Production Order v3.0-International' : '🏭 Orden de Producción v3.0-International'}
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        {idiomaActual === 'en' 
          ? 'Global financial precision with configurable country parameters'
          : 'Precisión financiera global con parámetros configurables por país'}
      </p>

      {/* Panel de Capacidad Instalada */}
      {resumenAbsorcion && (
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/50 p-4 rounded-xl mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h4 className="text-indigo-300 font-bold text-sm mb-2 flex items-center gap-2">
                📊 {t('installedCapacity') || (idiomaActual === 'en' ? 'Installed Capacity - Fixed Expenses Absorption' : 'Capacidad Instalada - Absorción de Gastos Fijos')}
              </h4>
              <div className="space-y-1 text-xs text-gray-300">
                <p>{t('monthlyFixedExpenses') || (idiomaActual === 'en' ? 'Monthly Fixed Expenses' : 'Gastos Fijos Mensuales')}: <span className="text-white font-bold">{formatMoney(gastosFijosMensuales)}</span></p>
                <p>{t('platform') || (idiomaActual === 'en' ? 'Platform' : 'Plataforma')}: <span className="text-cyan-400">{resumenAbsorcion.plataforma} ({resumenAbsorcion.comisionAplicada})</span></p>
                <p>{t('accumulatedAbsorption') || (idiomaActual === 'en' ? 'Accumulated Absorption (month)' : 'Absorción Acumulada (mes)')}: <span className="text-cyan-400">{formatMoney(resumenAbsorcion.absorcionAcumuladaPrev)}</span></p>
                <p>{t('currentLotContribution') || (idiomaActual === 'en' ? 'Current Lot Contribution' : 'Contribución Lote Actual')}: <span className="text-green-400">+{formatMoney(resumenAbsorcion.contribucionLoteActual)}</span></p>
                <p className="pt-1 border-t border-slate-700">
                  <strong>{t('totalProjected') || (idiomaActual === 'en' ? 'Total Projected' : 'Total Proyectado')}:</strong> {formatMoney(resumenAbsorcion.absorcionTotalProyectada)} 
                  <span className={`ml-2 font-bold ${resumenAbsorcion.porcentaje >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    ({resumenAbsorcion.porcentaje}% {t('covered') || (idiomaActual === 'en' ? 'covered' : 'cubierto')})
                  </span>
                </p>
   
                   <div className="relative group inline-block">
  <p className="text-xs text-gray-400 cursor-help">
    🔧 {t('realCostPerHour') || (idiomaActual === 'en' ? 'Real cost per hour' : 'Costo por hora real')}: {formatMoney(resumenAbsorcion.realCostPerHour)}/h
    <span className="ml-1 text-cyan-400">ⓘ</span>
  </p>
  <div className="absolute bottom-full left-0 mb-2 w-72 p-2 bg-slate-900 text-xs text-gray-300 rounded shadow-lg hidden group-hover:block z-50 border border-slate-700">
    <div className="grid grid-cols-2 gap-1">
      <span>💰 {idiomaActual === 'en' ? 'Base hourly rate' : 'Valor Hora Base'}:</span>
      <span className="text-right">{formatMoney(parseFloat(costosGlobales.valorHoraPersonalizado) || 0)}/h</span>
      <span>⚙️ {idiomaActual === 'en' ? 'Labor factor' : 'Factor Prestacional'}:</span>
      <span className="text-right">{factorPrestacional}x</span>
      <span className="border-t border-slate-700 pt-1 mt-1">🔧 {idiomaActual === 'en' ? 'Effective labor cost' : 'Costo Laboral Real'}:</span>
      <span className="text-right border-t border-slate-700 pt-1 mt-1">{formatMoney(resumenAbsorcion.valorHoraConPrestaciones)}/h</span>
      <span>📦 {idiomaActual === 'en' ? 'Operational cost' : 'Carga Operativa'}:</span>
      <span className="text-right">{formatMoney(resumenAbsorcion.costoOperativoPorHora)}/h</span>
      <span className="border-t border-slate-700 pt-1 mt-1 font-bold">✅ {idiomaActual === 'en' ? 'Total cost per hour' : 'Total por Hora'}:</span>
      <span className="text-right border-t border-slate-700 pt-1 mt-1 font-bold">{formatMoney(resumenAbsorcion.realCostPerHour)}/h</span>
    </div>
  </div>
</div>
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
                {resumenAbsorcion.diasCubiertos} {t('projectedDays') || (idiomaActual === 'en' ? 'projected coverage days' : 'días proyectados de cobertura')}
              </p>
            </div>
          </div>
          {resumenAbsorcion.gastosFijosRestantes > 0 && resumenAbsorcion.porcentaje < 100 && (
            <p className="text-xs text-yellow-400 mt-2 text-center">
              ⚠️ {t('remainingToCover') || (idiomaActual === 'en' ? 'Remaining' : 'Faltan')} {formatMoney(resumenAbsorcion.gastosFijosRestantes)} {t('toCoverFixedCosts') || (idiomaActual === 'en' ? 'to cover monthly fixed expenses' : 'para cubrir gastos fijos del mes')}
            </p>
          )}
          {resumenAbsorcion.porcentaje >= 100 && (
            <p className="text-xs text-green-400 mt-2 text-center">
              ✅ {t('fixedCostsCovered') || (idiomaActual === 'en' ? 'Monthly fixed expenses fully covered' : 'Gastos fijos mensuales completamente cubiertos')} 🎉
            </p>
          )}
        </div>
      )}

      {/* Inputs Globales de Costos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('totalBatchHours') || (idiomaActual === 'en' ? 'Total Batch Hours' : 'Horas Totales Lote')}</label>
          <input type="number" value={costosGlobales.horasLaborTotal} onChange={e => handleGlobalChange('horasLaborTotal', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" placeholder={t('exampleHours') || (idiomaActual === 'en' ? 'Ex: 10' : 'Ej: 10')} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('hourlyRateValue') || (idiomaActual === 'en' ? 'Hourly Base Rate ($)' : 'Valor Hora Base ($)')}</label>
          <input type="number" value={costosGlobales.valorHoraPersonalizado} onChange={e => handleGlobalChange('valorHoraPersonalizado', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('transportLogistics') || (idiomaActual === 'en' ? 'Transport/Logistics ($)' : 'Transporte/Logística ($)')}</label>
          <input type="number" value={costosGlobales.transporteTotal} onChange={e => handleGlobalChange('transporteTotal', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('additionalExpenses') || (idiomaActual === 'en' ? 'Additional Expenses ($)' : 'Gastos Adicionales ($)')}</label>
          <input type="number" value={costosGlobales.gastosFijosAdicionales} onChange={e => handleGlobalChange('gastosFijosAdicionales', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
      </div>

      {/* Tabla de Productos - SIN TOOLTIPS VISIBLES */}
<div className="space-y-3 mb-6">
  <div className="flex justify-between items-center">
    <h3 className="text-cyan-400 font-bold text-sm">
      {idiomaActual === 'en' ? '📦 Batch Items (with hourly effort)' : '📦 Ítems del Lote (con esfuerzo horario)'}
    </h3>
    <button onClick={agregarProducto} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded transition">
      {idiomaActual === 'en' ? '+ Add' : '+ Agregar'}
    </button>
  </div>
  
  {/* ENCABEZADOS - CORRECTOS */}
  <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-bold px-2">
    <div className="col-span-3">{idiomaActual === 'en' ? 'Product Detail' : 'Detalle del producto'}</div>
    <div className="col-span-1 text-center">{idiomaActual === 'en' ? 'Batch Quantity' : 'Cantidad del lote'}</div>
    <div className="col-span-1 text-center">{idiomaActual === 'en' ? 'Assigned Effort' : 'Esfuerzo Asignado'}</div>
    <div className="col-span-2">{idiomaActual === 'en' ? 'Estimated Selling Price' : 'Precio estimado de venta'}</div>
    <div className="col-span-3">{idiomaActual === 'en' ? 'Material Cost per Batch' : 'Costo de materiales por lote'}</div>
    <div className="col-span-1 text-center">{idiomaActual === 'en' ? 'Delete' : 'Eliminar'}</div>
    <div className="col-span-1"></div>
  </div>
  
  {/* FILAS DE PRODUCTOS - SIN TOOLTIPS */}
  {productos.map((prod, idx) => (
    <div key={prod.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800/50 p-2 rounded border border-slate-700">
      <div className="col-span-3">
        <input 
          type="text" 
          placeholder={idiomaActual === 'en' ? 'Product name' : 'Nombre del producto'} 
          value={prod.nombre} 
          onChange={e => actualizarProducto(prod.id, 'nombre', e.target.value)} 
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" 
        />
      </div>
      <div className="col-span-1">
        <input 
          type="number" 
          placeholder={idiomaActual === 'en' ? 'Qty' : 'Cant'} 
          value={prod.cantidad} 
          onChange={e => actualizarProducto(prod.id, 'cantidad', e.target.value)} 
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center" 
        />
      </div>
      <div className="col-span-1">
        <input 
          type="number" 
          placeholder={idiomaActual === 'en' ? 'Hours' : 'Horas'} 
          value={prod.horasPorUnidad} 
          onChange={e => actualizarProducto(prod.id, 'horasPorUnidad', e.target.value)} 
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center" 
        />
      </div>
      <div className="col-span-2">
        <input 
          type="number" 
          placeholder={idiomaActual === 'en' ? 'Price' : 'Precio'} 
          value={prod.precioVenta} 
          onChange={e => actualizarProducto(prod.id, 'precioVenta', e.target.value)} 
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" 
        />
      </div>
      <div className="col-span-3">
        <input 
          type="number" 
          placeholder={idiomaActual === 'en' ? 'Total materials' : 'Materiales totales'} 
          value={prod.materialesEspecificos} 
          onChange={e => actualizarProducto(prod.id, 'materialesEspecificos', e.target.value)} 
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" 
        />
      </div>
      <div className="col-span-1 text-center">
        <button onClick={() => eliminarProducto(prod.id)} className="text-red-500 hover:text-red-400 text-lg" title={idiomaActual === 'en' ? 'Delete' : 'Eliminar'}>🗑️</button>
      </div>
      <div className="col-span-1"></div>
    </div>
  ))}
</div>

      {/* Botón de Auditoría */}
      <button onClick={handleProcesar} disabled={calculando} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg mb-6 shadow-lg hover:from-blue-500 hover:to-cyan-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
        {calculando ? (
          <>
            <span className="animate-spin">⏳</span> {t('auditing') || (idiomaActual === 'en' ? 'Auditing with precision...' : 'Auditando con precisión...')}
          </>
        ) : (
          <>{t('auditFullBatch') || (idiomaActual === 'en' ? '🔍 Audit Full Batch (v3.0-International)' : '🔍 Auditar Lote Completo (v3.0-International)')}</>
        )}
      </button>

      {/* Resultados */}
      <div className="space-y-4">
        {resultadosAuditoria.map(prod => <AuditoriaCard key={prod.id} prod={prod} />)}
      </div>

      {/* Botón de Guardado */}
      {resultadosAuditoria.length > 0 && (
        <button 
          onClick={handleGuardar} 
          disabled={loading} 
          className={`w-full mt-6 font-bold py-3 rounded-lg shadow-lg transition flex items-center justify-center gap-2 ${
            loading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> {t('registering') || (idiomaActual === 'en' ? 'Registering in financial blockchain...' : 'Registrando en Blockchain financiero...')}
            </>
          ) : (
            <>💾 {t('registerLot') || (idiomaActual === 'en' ? 'Register Lot with Full Traceability' : 'Registrar Lote con Trazabilidad Completa')}</>
          )}
        </button>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-gray-500 text-center">
        <p>Stratium Global AI v3.0-International • {paisCodigo.toUpperCase()}</p>
        <p className="mt-1">
          {idiomaActual === 'en' 
            ? `Region: ${resumenAbsorcion?.regionNombre || getNombreRegion()} • Labor factor: ${factorPrestacional}x • Commission: ${getComisionLetrero()} • Provision: ${PROVISION_PORCENTAJE * 100}% over materials`
            : `Región: ${resumenAbsorcion?.regionNombre || getNombreRegion()} • Factor prestacional: ${factorPrestacional}x • Comisión: ${getComisionLetrero()} • Provisión: ${PROVISION_PORCENTAJE * 100}% sobre materiales`}
        </p>
        <p className="mt-1">
          {t('footerText') || (idiomaActual === 'en' 
            ? 'Smart financial auditing for global entrepreneurs'
            : 'Auditoría financiera inteligente para emprendedores globales')}
        </p>
      </div>
    </div>
  );
};

export default ProduccionForm;

