import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, increment, query, getDocs, where } from 'firebase/firestore';
import { auditarOperacion } from '../logic/logicEngine';
import { useEstrellaHueso } from '../hooks/useEstrellaHueso';
import { useTranslation } from '../hooks/useTranslation';
import AutocompleteInput from './AutocompleteInput';
import { formatMoneyUniversal } from '../util/formatMoneyUniversal';

const RegistroManual = ({ usuarioActual, idioma, saldoActual = 0, guardarProductoEnCatalogo, onSuccess, onError }) => {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    monto: '',
    cantidad: '1',
    concepto: '',
    tipo: 'gasto',
    fuentePago: 'negocio',
    fecha: new Date().toLocaleDateString('en-CA'),
    tercero: '',
    tipoPago: 'contado',
    fechaLimitePago: '',
    fechaVencimientoProducto: ''
  });
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [productos, setProductos] = useState([]);
  const [infoProductoSeleccionado, setInfoProductoSeleccionado] = useState(null);
  const [productosCriticos, setProductosCriticos] = useState([]);
  const [productosEstrella, setProductosEstrella] = useState([]);
  const db = getFirestore();
  const { alertaCompraHueso } = useEstrellaHueso();

  // Formatear moneda según idioma
  const formatMoney = (valor, lang) => {
    const pais = lang === 'en' ? 'US' : 'CO';
    return formatMoneyUniversal(valor, pais);
  };

  // ============================================================
  // FUNCIÓN PARA CALCULAR PRECIO SUGERIDO DE LIQUIDACIÓN
  // ============================================================
  const calcularPrecioLiquidacion = (costoUnitario, diasEnStock) => {
    if (!costoUnitario || costoUnitario <= 0) return null;
    
    let precio = null;
    let estrategia = '';
    let urgencia = '';
    
    if (diasEnStock >= 180) {
      precio = costoUnitario * 0.8;
      estrategia = t('liquidacionPerdida') || '💀 PÉRDIDA CONTROLADA';
      urgencia = t('urgencia180') || '⚠️ URGENTE: más de 180 días';
    } else if (diasEnStock >= 90) {
      precio = costoUnitario * 0.9;
      estrategia = t('recuperarCapital') || '💰 RECUPERAR CAPITAL';
      urgencia = t('urgencia90') || '⚠️ Alerta: más de 90 días';
    } else if (diasEnStock >= 60) {
      precio = costoUnitario * 1.0;
      estrategia = t('alCosto') || '📦 AL COSTO';
      urgencia = t('urgencia60') || '⚡ Recupera inversión';
    } else if (diasEnStock >= 30) {
      precio = costoUnitario * 1.1;
      estrategia = t('promocionLigera') || '🔥 PROMOCIÓN LIGERA';
      urgencia = t('urgencia30') || '💡 Libera flujo de caja';
    } else {
      return null;
    }
    
    return {
      precio: Math.round(precio),
      estrategia,
      urgencia
    };
  };

  // ============================================================
  // FUNCIÓN PARA OBTENER INFORMACIÓN DE PRODUCTO DESDE INVENTARIO
  // ============================================================
  const obtenerInfoProducto = async (nombreProducto) => {
    if (!usuarioActual?.uid || !nombreProducto) return null;
    
    try {
      const inventarioRef = collection(db, 'inventario');
      const q = query(inventarioRef, 
        where('userId', '==', usuarioActual.uid),
        where('producto', '==', nombreProducto)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const producto = snapshot.docs[0].data();
      const clasificacion = producto.clasificacion || 'NEUTRO';
      const diasEnStock = producto.diasEnStock || 0;
      const margenNeto = producto.margenNetoReal || 0;
      const costoUnitario = producto.costoUnitario || 0;
      
      let precioLiquidacion = null;
      if (clasificacion === 'HUESO') {
        precioLiquidacion = calcularPrecioLiquidacion(costoUnitario, diasEnStock);
      }
      
      return {
        nombre: nombreProducto,
        clasificacion,
        diasEnStock,
        margenNeto,
        costoUnitario,
        precioLiquidacion,
        existe: true
      };
    } catch (error) {
      console.error('Error obteniendo info producto:', error);
      return null;
    }
  };

  // ============================================================
  // FUNCIÓN PARA CARGAR PRODUCTOS CRÍTICOS Y ESTRELLA
  // ============================================================
  const cargarProductosAuditoria = async () => {
    if (!usuarioActual?.uid) return;
    
    try {
      const inventarioRef = collection(db, 'inventario');
      const q = query(inventarioRef, where('userId', '==', usuarioActual.uid));
      const snapshot = await getDocs(q);
      
      const criticos = [];
      const estrellas = [];
      
      snapshot.forEach(doc => {
        const producto = doc.data();
        const clasificacion = producto.clasificacion || 'NEUTRO';
        const cantidad = producto.cantidad || 0;
        
        if (clasificacion === 'HUESO' && cantidad > 0) {
          criticos.push({
            nombre: producto.producto,
            cantidad: producto.cantidad,
            diasEnStock: producto.diasEnStock || 0,
            costoUnitario: producto.costoUnitario || 0
          });
        } else if (clasificacion === 'ESTRELLA' && cantidad > 0) {
          estrellas.push({
            nombre: producto.producto,
            margen: producto.margenNetoReal || 0
          });
        }
      });
      
      criticos.sort((a, b) => b.diasEnStock - a.diasEnStock);
      setProductosCriticos(criticos.slice(0, 5));
      setProductosEstrella(estrellas.slice(0, 5));
    } catch (error) {
      console.error('Error cargando productos auditoría:', error);
    }
  };

  // ============================================================
  // Cargar productos desde INVENTARIO (NO desde products)
  // ============================================================
  useEffect(() => {
    const cargarProductos = async () => {
      if (!usuarioActual?.uid) return;
      try {
        const q = query(collection(db, 'inventario'), where('userId', '==', usuarioActual.uid));
        const snapshot = await getDocs(q);
        const lista = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          lista.push({ 
            id: doc.id, 
            nombre: data.producto,
            ...data 
          });
        });
        setProductos(lista);
        console.log('📦 Productos cargados desde inventario:', lista.length);
        
        await cargarProductosAuditoria();
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    };
    cargarProductos();
  }, [usuarioActual?.uid, db]);

  const getCategoria = (tipo) => {
    switch(tipo) {
      case 'gasto': return 'GASTO_NO_OPERACIONAL';
      case 'ingreso': return 'INGRESO';
      case 'compra': return 'INVENTARIO';
      case 'venta': return 'VENTA';
      default: return 'OTROS';
    }
  };

  const getTipoFlujo = (tipo) => {
    switch(tipo) {
      case 'gasto':
      case 'compra':
        return 'egreso';
      case 'ingreso':
      case 'venta':
        return 'ingreso';
      default: return 'egreso';
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      monto: '',
      cantidad: '1',
      concepto: '',
      tipo: 'gasto',
      fuentePago: 'negocio',
      fecha: new Date().toLocaleDateString('en-CA'),
      tercero: '',
      tipoPago: 'contado',
      fechaLimitePago: '',
      fechaVencimientoProducto: ''
    });
    setInfoProductoSeleccionado(null);
  };

// Verificar límite de transacciones según plan
const verificarLimiteTransacciones = async () => {
  if (!usuarioActual?.uid) return true;
  
  const plan = usuarioActual.plan || 'starter';
  
  // Business y Elite no tienen límite
  if (plan === 'business' || plan === 'elite') return true;
  
  // Calcular inicio del mes actual
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  
  const q = query(
    collection(db, 'registros'),
    where('userId', '==', usuarioActual.uid),
    where('fecha', '>=', inicioMes)
  );
  const snapshot = await getDocs(q);
  const transaccionesMes = snapshot.size;
  
  // Pro: 1000 transacciones/mes, Starter: 100 transacciones/mes
  const limite = plan === 'pro' ? 1000 : 100;
  
  if (transaccionesMes >= limite) {
    const mensaje = idioma === 'en'
      ? `❌ You have reached the limit of ${limite} transactions for this month. Upgrade to Business for unlimited transactions.`
      : `❌ Has alcanzado el límite de ${limite} transacciones de este mes. Actualiza a Business para transacciones ilimitadas.`;
    setValidationError(mensaje);
    return false;
  }
  
  return true;
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setValidationError(null);
  setSuccessMessage(null);

  try {
    const montoNum = parseFloat(formData.monto);
    const cantidadNum = parseInt(formData.cantidad);
    
    if (formData.tipo === 'compra' && formData.concepto) {
      const productoParaAlerta = {
        nombre: formData.concepto,
        clasificacion: 'HUESO',
        diasEnStock: 0
      };
      alertaCompraHueso(productoParaAlerta);
    }
    
    if (isNaN(montoNum) || montoNum <= 0) {
      setValidationError(t('montoInvalido') || '❌ El monto debe ser un número mayor a cero');
      setLoading(false);
      return;
    }
      
    const tipoFlujo = getTipoFlujo(formData.tipo);
    const categoria = getCategoria(formData.tipo);
    const costoUnitario = montoNum / cantidadNum;
    
    // ✅ LIMITAR PRODUCTOS EN INVENTARIO (STARTER) - SOLO PARA COMPRAS
    if (formData.tipo === 'compra') {
      const plan = usuarioActual?.plan || 'starter';
      if (plan === 'starter') {
        const inventarioRef = collection(db, 'inventario');
        const q = query(inventarioRef, where('userId', '==', usuarioActual.uid));
        const snapshot = await getDocs(q);
        const cantidadProductos = snapshot.size;
        
        // Verificar si el producto ya existe
        const productoQuery = query(inventarioRef, 
          where('producto', '==', formData.concepto), 
          where('userId', '==', usuarioActual.uid)
        );
        const productoSnapshot = await getDocs(productoQuery);
        const productoExiste = !productoSnapshot.empty;
        
        // Starter: máximo 20 productos
        if (!productoExiste && cantidadProductos >= 20) {
          setValidationError('❌ Has alcanzado el límite de 20 productos en inventario. Actualiza a Pro o Business.');
          setLoading(false);
          return;
        }
      }
    }
    
    const tipoTexto = {
      gasto: t('gasto') || 'Gasto', 
      ingreso: t('ingreso') || 'Ingreso', 
      compra: t('compraInventario') || 'Compra', 
      venta: t('venta') || 'Venta'
    };
    
    let textoCompleto = `${tipoTexto[formData.tipo]}: ${cantidadNum}x ${formData.concepto} por ${montoNum}`;
    
    if (formData.tercero) {
      textoCompleto += ` - ${formData.tipo === 'compra' ? 'Proveedor' : 'Cliente'}: ${formData.tercero}`;
    }
    
    if (formData.tipoPago === 'credito' && formData.fechaLimitePago) {
      textoCompleto += ` (Crédito, vence: ${formData.fechaLimitePago})`;
    }
    
    const auditoria = auditarOperacion(
      textoCompleto,
      montoNum,
      { saldoCaja: saldoActual },
      idioma
    );

    if (!auditoria.validado) {
      setValidationError(auditoria.mensajeValidacion);
      setLoading(false);
      return;
    }

    const esAportePersonal = (tipoFlujo === 'egreso' && formData.fuentePago === 'personal');
    const esGastoNegocio = (tipoFlujo === 'egreso' && formData.fuentePago === 'negocio');

    if (esGastoNegocio && saldoActual < montoNum) {
      setValidationError(t('saldoInsuficiente', { saldo: formatMoney(saldoActual, idioma), monto: formatMoney(montoNum, idioma) }));
      setLoading(false);
      return;
    }

    if (formData.tipo === 'venta') {
      const inventarioRef = collection(db, 'inventario');
      const qInventario = query(inventarioRef, where('producto', '==', formData.concepto), where('userId', '==', usuarioActual.uid));
      const snapshotInventario = await getDocs(qInventario);
      
      let stockActual = 0;
      if (!snapshotInventario.empty) {
        stockActual = snapshotInventario.docs[0].data().cantidad;
      }
      
      if (stockActual < cantidadNum) {
        setValidationError(t('stockInsuficiente', { stock: stockActual, solicitado: cantidadNum }));
        setLoading(false);
        return;
      }
    }

    if (formData.tipo === 'compra' && guardarProductoEnCatalogo) {
      await guardarProductoEnCatalogo(formData.concepto, usuarioActual.uid);
    }

    const userRef = doc(db, 'usuarios', usuarioActual.uid);
    
    if (esAportePersonal) {
      await updateDoc(userRef, {
        deudaConDueño: increment(montoNum),
        aportesPersonales: increment(montoNum)
      });
      setValidationError(t('advertenciaPersonal'));
      setTimeout(() => setValidationError(null), 5000);
    } else if (esGastoNegocio) {
      await updateDoc(userRef, {
        saldoCaja: increment(-montoNum)
      });
    }

    const registroData = {
      texto: textoCompleto,
      concepto: formData.concepto,
      valor: montoNum,
      tipo: tipoFlujo,
      categoria: categoria,
      emoji: formData.tipo === 'compra' ? '📦' : formData.tipo === 'venta' ? '💰' : auditoria.emoji,
      recomendacion: esAportePersonal 
        ? t('aportePersonalRecomendacion') || '💰 Aporte de capital personal. El negocio te debe este dinero.'
        : auditoria.recomendacion,
      cantidad: cantidadNum,
      costoUnitario: costoUnitario,
      fecha: new Date(formData.fecha + 'T12:00:00'),
      serverTimestamp: serverTimestamp(),
      userId: usuarioActual?.uid,
      metodo: 'manual',
      fechaRegistro: formData.fecha,
      tipoOperacion: formData.tipo,
      fuentePago: formData.fuentePago,
      esAportePersonal: esAportePersonal,
      tercero: formData.tercero || null,
      tipoPago: formData.tipoPago,
      fechaLimitePago: formData.tipoPago === 'credito' ? formData.fechaLimitePago : null,
      fechaVencimientoProducto: (formData.tipo === 'compra' && formData.fechaVencimientoProducto) ? formData.fechaVencimientoProducto : null
    };
    
    await addDoc(collection(db, 'registros'), registroData);

    if (formData.tipo === 'compra' || formData.tipo === 'venta') {
      const inventarioRef = collection(db, 'inventario');
      const qInv = query(inventarioRef, where('producto', '==', formData.concepto), where('userId', '==', usuarioActual.uid));
      const snapshotInv = await getDocs(qInv);
      
      if (snapshotInv.empty) {
        const inventarioData = {
          producto: formData.concepto,
          cantidad: formData.tipo === 'compra' ? cantidadNum : -cantidadNum,
          costoUnitario: costoUnitario,
          costoTotal: montoNum,
          userId: usuarioActual.uid,
          fechaActualizacion: serverTimestamp()
        };
        
        if (formData.tipo === 'compra' && formData.fechaVencimientoProducto) {
          inventarioData.fechaVencimiento = formData.fechaVencimientoProducto;
          inventarioData.alertaVencimientoEnviada = false;
        }
        
        await addDoc(inventarioRef, inventarioData);
      } else {
        const inventarioDoc = snapshotInv.docs[0];
        const dataActual = inventarioDoc.data();
        let nuevaCantidad;
        let nuevoCostoTotal;
        let nuevoCostoUnitario;
        
        if (formData.tipo === 'compra') {
          nuevaCantidad = dataActual.cantidad + cantidadNum;
          nuevoCostoTotal = (dataActual.cantidad * dataActual.costoUnitario) + montoNum;
          nuevoCostoUnitario = nuevoCostoTotal / nuevaCantidad;
        } else {
          nuevaCantidad = dataActual.cantidad - cantidadNum;
          nuevoCostoTotal = dataActual.costoTotal - montoNum;
          nuevoCostoUnitario = dataActual.costoUnitario;
        }
        
        const updateData = {
          cantidad: nuevaCantidad,
          costoTotal: nuevoCostoTotal,
          costoUnitario: nuevoCostoUnitario,
          fechaActualizacion: serverTimestamp()
        };
        
        if (formData.tipo === 'compra' && formData.fechaVencimientoProducto) {
          updateData.fechaVencimiento = formData.fechaVencimientoProducto;
          updateData.alertaVencimientoEnviada = false;
        }
        
        await updateDoc(doc(db, 'inventario', inventarioDoc.id), updateData);
      }
    }

    setSuccessMessage(t('exito') || '✅ Movimiento registrado exitosamente');
    limpiarFormulario();
    await cargarProductosAuditoria();
    
    if (onSuccess) onSuccess();

  } catch (error) {
    console.error('Error guardando registro:', error);
    setValidationError(`${t('errorGeneral') || 'Error'}: ${error.message}`);
    if (onError) onError(error);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>✏️</span> 
        {t('tituloRegistroManual') || 'Registro Manual de Movimientos'}
      </h3>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {validationError && !successMessage && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          {validationError}
        </div>
      )}

      {/* Productos Críticos y Estrella */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Productos Críticos (HUESO) */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <h4 className="text-red-400 text-sm font-bold mb-2">{t('critical_products_title')}</h4>
          {productosCriticos.length === 0 ? (
            <p className="text-gray-500 text-xs">{t('no_critical_products')}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {productosCriticos.map((p, idx) => {
                const precioLiq = calcularPrecioLiquidacion(p.costoUnitario, p.diasEnStock);
                return (
                  <div key={idx} className="border-b border-red-500/20 pb-2">
                    <p className="text-white text-sm font-medium">📉 {p.nombre}</p>
                    <p className="text-gray-400 text-xs">📦 {p.cantidad} und | ⏱️ {p.diasEnStock} {t('diasSinRotacion') || 'días sin rotación'}</p>
                    {precioLiq && (
                      <p className="text-cyan-400 text-xs">{t('precioSugerido') || '💰 Sugerido'}: {formatMoney(precioLiq.precio, idioma)} ({precioLiq.estrategia})</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Productos Estrella */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <h4 className="text-green-400 text-sm font-bold mb-2">{t('productosEstrella') || '⭐ Productos Estrella'}</h4>
          {productosEstrella.length === 0 ? (
            <p className="text-gray-500 text-xs">{t('sinProductosEstrella') || '⚠️ Aún no hay productos ESTRELLA'}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {productosEstrella.map((p, idx) => (
                <div key={idx} className="border-b border-green-500/20 pb-2">
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  <p className="text-green-400 text-xs">⭐ {t('margen') || 'Margen'}: {p.margen}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Información del producto seleccionado */}
      {infoProductoSeleccionado && infoProductoSeleccionado.existe && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-blue-400 text-sm font-bold mb-2">{t('infoProducto') || '📊 Información del Producto'}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="text-gray-400">{t('clasificacion') || 'Clasificación'}:</p>
            <p className={`font-bold ${
              infoProductoSeleccionado.clasificacion === 'ESTRELLA' ? 'text-green-400' :
              infoProductoSeleccionado.clasificacion === 'HUESO' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {infoProductoSeleccionado.clasificacion}
            </p>
            <p className="text-gray-400">{t('diasSinVentas') || 'Días sin ventas'}:</p>
            <p className="text-white">{infoProductoSeleccionado.diasEnStock} días</p>
            {infoProductoSeleccionado.margenNeto > 0 && (
              <>
                <p className="text-gray-400">{t('margen') || 'Margen'}:</p>
                <p className="text-white">{infoProductoSeleccionado.margenNeto}%</p>
              </>
            )}
            {infoProductoSeleccionado.precioLiquidacion && (
              <>
                <p className="text-gray-400">{t('precioLiquidacion') || 'Precio sugerido para liquidar'}:</p>
                <p className="text-cyan-400">{formatMoney(infoProductoSeleccionado.precioLiquidacion.precio, idioma)}</p>
                <p className="text-gray-400">{t('estrategia') || 'Estrategia'}:</p>
                <p className="text-yellow-400">{infoProductoSeleccionado.precioLiquidacion.estrategia}</p>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('tipoMovimiento') || 'Tipo de movimiento'}</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="gasto">{t('gasto') || 'Gasto'}</option>
              <option value="ingreso">{t('ingreso') || 'Ingreso'}</option>
              <option value="compra">{t('compraInventario') || 'Compra (inventario)'}</option>
              <option value="venta">{t('venta') || 'Venta'}</option>
            </select>
          </div>

          {(formData.tipo === 'gasto' || formData.tipo === 'compra') && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">{t('fuentePago') || 'Pagado con...'}</label>
              <select
                name="fuentePago"
                value={formData.fuentePago}
                onChange={(e) => setFormData(prev => ({ ...prev, fuentePago: e.target.value }))}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="negocio">{t('businessFunds') || '💰 Fondos del negocio'}</option>
                <option value="personal">{t('personalFunds') || '👤 Fondos personales (Inyección de capital)'}</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('cantidad') || 'Cantidad (unidades)'}</label>
            <input
              type="number"
              name="cantidad"
              value={formData.cantidad}
              onChange={(e) => setFormData(prev => ({ ...prev, cantidad: e.target.value }))}
              placeholder="1"
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              step="1"
              min="1"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('montoTotal') || 'Monto Total'}</label>
            <input
              type="number"
              name="monto"
              value={formData.monto}
              onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              step="any"
              min="0.01"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('fecha') || 'Fecha'}</label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
              max={new Date().toLocaleDateString('en-CA')}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('tercero') || 'Proveedor / Cliente'}</label>
            <input
              type="text"
              name="tercero"
              value={formData.tercero}
              onChange={(e) => setFormData(prev => ({ ...prev, tercero: e.target.value }))}
              placeholder={formData.tipo === 'compra' ? 'Ej: Distribuidora XYZ' : 'Ej: Juan Pérez'}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {(formData.tipo === 'compra' || formData.tipo === 'venta') && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">{t('tipoPago') || 'Tipo de pago'}</label>
              <select
                name="tipoPago"
                value={formData.tipoPago}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoPago: e.target.value, fechaLimitePago: '' }))}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="contado">{t('contado') || '💰 Contado'}</option>
                <option value="credito">{t('credito') || '📅 Crédito'}</option>
              </select>
            </div>
          )}

          {(formData.tipo === 'compra' || formData.tipo === 'venta') && formData.tipoPago === 'credito' && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">{t('fechaLimitePago') || 'Fecha límite de pago'}</label>
              <input
                type="date"
                name="fechaLimitePago"
                value={formData.fechaLimitePago}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaLimitePago: e.target.value }))}
                min={new Date().toLocaleDateString('en-CA')}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* ✅ CAMBIO PRINCIPAL: Usar AutocompleteInput en lugar del input normal */}
          <div className="md:col-span-2">
            <label className="block text-gray-400 text-sm mb-1">{t('producto') || 'Producto'}</label>
            <AutocompleteInput
              value={formData.concepto}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, concepto: val }));
                setValidationError(null);
                setSuccessMessage(null);
                setInfoProductoSeleccionado(null);
              }}
              options={productos.map(p => p.nombre).filter(Boolean)}
              placeholder={t('ejemploConcepto') || 'Escribe el nombre del producto...'}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onSelect={async (selected) => {
                const productoSeleccionado = productos.find(p => p.nombre === selected);
                if (productoSeleccionado) {
                  const info = await obtenerInfoProducto(productoSeleccionado.nombre);
                  setInfoProductoSeleccionado(info);
                }
              }}
            />
          </div>

          {formData.tipo === 'compra' && (
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">{t('fechaVencimientoProducto') || 'Fecha de vencimiento del producto'}</label>
              <input
                type="date"
                name="fechaVencimientoProducto"
                value={formData.fechaVencimientoProducto}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimientoProducto: e.target.value }))}
                min={new Date().toLocaleDateString('en-CA')}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('dejarBlanco') || 'Dejar en blanco si no aplica'}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          {loading ? (t('guardando') || 'Guardando...') : (t('guardar') || 'Registrar Movimiento')}
        </button>
      </form>
    </div>
  );
};

export default RegistroManual;

