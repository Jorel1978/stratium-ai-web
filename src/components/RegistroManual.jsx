import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, increment, query, getDocs, where } from 'firebase/firestore';
import { auditarOperacion } from '../logic/logicEngine';
import { useEstrellaHueso } from '../hooks/useEstrellaHueso';

const RegistroManual = ({ usuarioActual, idioma, saldoActual = 0, guardarProductoEnCatalogo, onSuccess, onError }) => {
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
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [infoProductoSeleccionado, setInfoProductoSeleccionado] = useState(null);
  const [productosCriticos, setProductosCriticos] = useState([]);
  const [productosEstrella, setProductosEstrella] = useState([]);
  const db = getFirestore();
  const { alertaCompraHueso } = useEstrellaHueso();

  // Formatear moneda según idioma
  const formatMoney = (valor, lang) => {
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.abs(valor));
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(valor));
  };

  // ============================================================
  // 🆕 FUNCIÓN PARA CALCULAR PRECIO SUGERIDO DE LIQUIDACIÓN
  // ============================================================
  const calcularPrecioLiquidacion = (costoUnitario, diasEnStock) => {
    if (!costoUnitario || costoUnitario <= 0) return null;
    
    let precio = null;
    let estrategia = '';
    let urgencia = '';
    
    if (diasEnStock >= 180) {
      precio = costoUnitario * 0.8;
      estrategia = '💀 PÉRDIDA CONTROLADA';
      urgencia = '⚠️ URGENTE: más de 180 días';
    } else if (diasEnStock >= 90) {
      precio = costoUnitario * 0.9;
      estrategia = '💰 RECUPERAR CAPITAL';
      urgencia = '⚠️ Alerta: más de 90 días';
    } else if (diasEnStock >= 60) {
      precio = costoUnitario * 1.0;
      estrategia = '📦 AL COSTO';
      urgencia = '⚡ Recupera inversión';
    } else if (diasEnStock >= 30) {
      precio = costoUnitario * 1.1;
      estrategia = '🔥 PROMOCIÓN LIGERA';
      urgencia = '💡 Libera flujo de caja';
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
  // 🆕 FUNCIÓN PARA OBTENER INFORMACIÓN DE PRODUCTO DESDE INVENTARIO
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
  // 🆕 FUNCIÓN PARA CARGAR PRODUCTOS CRÍTICOS Y ESTRELLA
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

  // Cargar productos del catálogo
  useEffect(() => {
    const cargarProductos = async () => {
      if (!usuarioActual?.uid) return;
      try {
        const q = query(collection(db, 'products'), where('userId', '==', usuarioActual.uid));
        const snapshot = await getDocs(q);
        const lista = [];
        snapshot.forEach(doc => {
          lista.push({ id: doc.id, ...doc.data() });
        });
        setProductos(lista);
        
        // Cargar productos críticos y estrella
        await cargarProductosAuditoria();
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    };
    cargarProductos();
  }, [usuarioActual?.uid, db]);

  // Filtrar productos según lo que escribe el usuario
  const handleConceptoChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, concepto: value }));
    setValidationError(null);
    setSuccessMessage(null);
    setInfoProductoSeleccionado(null);
    
    if (value.length > 0) {
      const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(value.toLowerCase())
      );
      setProductosFiltrados(filtrados.slice(0, 10));
      setMostrarLista(filtrados.length > 0);
      
      // Buscar información del producto seleccionado
      const productoExistente = filtrados.find(p => p.nombre.toLowerCase() === value.toLowerCase());
      if (productoExistente) {
        const info = await obtenerInfoProducto(productoExistente.nombre);
        setInfoProductoSeleccionado(info);
      }
    } else {
      setProductosFiltrados([]);
      setMostrarLista(false);
    }
  };

  const seleccionarProducto = async (producto) => {
    setFormData(prev => ({ ...prev, concepto: producto.nombre }));
    setMostrarLista(false);
    setProductosFiltrados([]);
    
    // Obtener información del producto seleccionado
    const info = await obtenerInfoProducto(producto.nombre);
    setInfoProductoSeleccionado(info);
  };

  const textos = {
    es: {
      titulo: 'Registro Manual de Movimientos',
      tipo: 'Tipo de movimiento',
      gasto: 'Gasto',
      ingreso: 'Ingreso',
      compra: 'Compra (inventario)',
      venta: 'Venta',
      fuentePago: 'Pagado con...',
      fuenteNegocio: '💰 Fondos del negocio',
      fuentePersonal: '👤 Fondos personales (Inyección de capital)',
      monto: 'Monto Total',
      cantidad: 'Cantidad (unidades)',
      concepto: 'Producto',
      fecha: 'Fecha',
      tercero: 'Proveedor / Cliente',
      tipoPago: 'Tipo de pago',
      contado: '💰 Contado',
      credito: '📅 Crédito',
      fechaLimitePago: 'Fecha límite de pago',
      fechaVencimientoProducto: 'Fecha de vencimiento del producto',
      ejemploConcepto: 'Escribe el nombre del producto...',
      guardar: 'Registrar Movimiento',
      guardando: 'Guardando...',
      exito: '✅ Movimiento registrado exitosamente',
      advertenciaPersonal: '⚠️ Estás inyectando capital personal al negocio. Esto genera una deuda del negocio contigo.',
      saldoInsuficiente: (saldo, monto) => `❌ No se puede registrar este gasto. Saldo insuficiente. Disponible: ${formatMoney(saldo, 'es')}. Necesitas: ${formatMoney(monto, 'es')}.`,
      stockInsuficiente: (stock, solicitado) => `❌ No se puede registrar la venta. Stock insuficiente. Disponible: ${stock} unidades. Solicitado: ${solicitado} unidades.`,
      productosCriticos: '🦴 Productos Críticos (HUESO)',
      productosEstrella: '⭐ Productos Estrella',
      sinProductosCriticos: '✅ No hay productos HUESO en inventario',
      sinProductosEstrella: '⚠️ Aún no hay productos ESTRELLA',
      infoProducto: '📊 Información del Producto',
      clasificacion: 'Clasificación',
      diasSinVentas: 'Días sin ventas',
      margen: 'Margen',
      precioLiquidacion: 'Precio sugerido para liquidar',
      estrategia: 'Estrategia'
    },
    en: {
      titulo: 'Manual Transaction Entry',
      tipo: 'Transaction type',
      gasto: 'Expense',
      ingreso: 'Income',
      compra: 'Purchase (inventory)',
      venta: 'Sale',
      fuentePago: 'Paid with...',
      fuenteNegocio: '💰 Business funds',
      fuentePersonal: '👤 Personal funds (Capital injection)',
      monto: 'Total Amount',
      cantidad: 'Quantity (units)',
      concepto: 'Product',
      fecha: 'Date',
      tercero: 'Supplier / Customer',
      tipoPago: 'Payment type',
      contado: '💰 Cash',
      credito: '📅 Credit',
      fechaLimitePago: 'Payment deadline',
      fechaVencimientoProducto: 'Product expiration date',
      ejemploConcepto: 'Type the product name...',
      guardar: 'Register Transaction',
      guardando: 'Saving...',
      exito: '✅ Transaction recorded successfully',
      advertenciaPersonal: '⚠️ You are injecting personal capital into the business. This creates a debt from the business to you.',
      saldoInsuficiente: (saldo, monto) => `❌ Cannot register this expense. Insufficient balance. Available: ${formatMoney(saldo, 'en')}. Needed: ${formatMoney(monto, 'en')}.`,
      stockInsuficiente: (stock, solicitado) => `❌ Cannot register sale. Insufficient stock. Available: ${stock} units. Requested: ${solicitado} units.`,
      productosCriticos: '🦴 Critical Products (BONE)',
      productosEstrella: '⭐ Star Products',
      sinProductosCriticos: '✅ No BONE products in inventory',
      sinProductosEstrella: '⚠️ No star products yet',
      infoProducto: '📊 Product Information',
      clasificacion: 'Classification',
      diasSinVentas: 'Days without sales',
      margen: 'Margin',
      precioLiquidacion: 'Suggested liquidation price',
      estrategia: 'Strategy'
    }
  };

  const t = textos[idioma] || textos.es;

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
    setMostrarLista(false);
    setProductosFiltrados([]);
    setInfoProductoSeleccionado(null);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setValidationError(null);
  setSuccessMessage(null);

  try {
    const montoNum = parseFloat(formData.monto);
    const cantidadNum = parseInt(formData.cantidad);
    
    // 👇 ALERTA DE PRODUCTO HUESO (NO BLOQUEANTE)
    // Solo mostrar alerta si es COMPRA (no para ventas)
    if (formData.tipo === 'compra' && formData.concepto) {
      // Creamos un objeto producto temporal para la alerta
      const productoParaAlerta = {
        nombre: formData.concepto,
        clasificacion: 'HUESO', // La alerta se dispara si el producto es HUESO
        diasEnStock: 0
      };
      alertaCompraHueso(productoParaAlerta);
    }
    
    if (isNaN(montoNum) || montoNum <= 0) {
      setValidationError(idioma === 'es' 
        ? '❌ El monto debe ser un número mayor a cero'
        : '❌ Amount must be a number greater than zero');
      setLoading(false);
      return;
    }
        
      const tipoFlujo = getTipoFlujo(formData.tipo);
      const categoria = getCategoria(formData.tipo);
      const costoUnitario = montoNum / cantidadNum;
      
      const tipoTexto = {
        gasto: 'Gasto', ingreso: 'Ingreso', compra: 'Compra', venta: 'Venta'
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

      // ✅ VALIDACIÓN 1: Saldo insuficiente para gastos del negocio
      if (esGastoNegocio && saldoActual < montoNum) {
        setValidationError(t.saldoInsuficiente(saldoActual, montoNum));
        setLoading(false);
        return;
      }

      // ✅ VALIDACIÓN 2: Stock insuficiente para ventas
      if (formData.tipo === 'venta') {
        const inventarioRef = collection(db, 'inventario');
        const qInventario = query(inventarioRef, where('producto', '==', formData.concepto), where('userId', '==', usuarioActual.uid));
        const snapshotInventario = await getDocs(qInventario);
        
        let stockActual = 0;
        if (!snapshotInventario.empty) {
          stockActual = snapshotInventario.docs[0].data().cantidad;
        }
        
        if (stockActual < cantidadNum) {
          setValidationError(t.stockInsuficiente(stockActual, cantidadNum));
          setLoading(false);
          return;
        }
      }

      // Guardar producto en catálogo
      if (formData.tipo === 'compra' && guardarProductoEnCatalogo) {
        await guardarProductoEnCatalogo(formData.concepto, usuarioActual.uid);
      }

      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      
      if (esAportePersonal) {
        await updateDoc(userRef, {
          deudaConDueño: increment(montoNum),
          aportesPersonales: increment(montoNum)
        });
        setValidationError(t.advertenciaPersonal);
        setTimeout(() => setValidationError(null), 5000);
      } else if (esGastoNegocio) {
        await updateDoc(userRef, {
          saldoCaja: increment(-montoNum)
        });
      }

      // Guardar el movimiento en registros
      const registroData = {
        texto: textoCompleto,
        concepto: formData.concepto,
        valor: montoNum,
        tipo: tipoFlujo,
        categoria: categoria,
        emoji: formData.tipo === 'compra' ? '📦' : formData.tipo === 'venta' ? '💰' : auditoria.emoji,
        recomendacion: esAportePersonal 
          ? (idioma === 'es' ? '💰 Aporte de capital personal. El negocio te debe este dinero.' : '💰 Personal capital injection. The business owes you this money.')
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

      // Actualizar inventario si es compra o venta
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

      setSuccessMessage(t.exito);
      limpiarFormulario();
      
      // Recargar productos críticos y estrella después de guardar
      await cargarProductosAuditoria();
      
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Error guardando registro:', error);
      setValidationError(`${t.errorGeneral || 'Error'}: ${error.message}`);
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>✏️</span> 
        {t.titulo}
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

      {/* 🆕 SECCIÓN: PRODUCTOS CRÍTICOS Y ESTRELLA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Productos Críticos (HUESO) */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <h4 className="text-red-400 text-sm font-bold mb-2">{t.productosCriticos}</h4>
          {productosCriticos.length === 0 ? (
            <p className="text-gray-500 text-xs">{t.sinProductosCriticos}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {productosCriticos.map((p, idx) => {
                const precioLiq = calcularPrecioLiquidacion(p.costoUnitario, p.diasEnStock);
                return (
                  <div key={idx} className="border-b border-red-500/20 pb-2">
                    <p className="text-white text-sm font-medium">{p.nombre}</p>
                    <p className="text-gray-400 text-xs">📦 {p.cantidad} und | ⏱️ {p.diasEnStock} días sin rotación</p>
                    {precioLiq && (
                      <p className="text-cyan-400 text-xs">💰 Sugerido: {formatMoney(precioLiq.precio, idioma)} ({precioLiq.estrategia})</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Productos Estrella */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <h4 className="text-green-400 text-sm font-bold mb-2">{t.productosEstrella}</h4>
          {productosEstrella.length === 0 ? (
            <p className="text-gray-500 text-xs">{t.sinProductosEstrella}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {productosEstrella.map((p, idx) => (
                <div key={idx} className="border-b border-green-500/20 pb-2">
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  <p className="text-green-400 text-xs">⭐ Margen: {p.margen}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🆕 SECCIÓN: INFORMACIÓN DEL PRODUCTO SELECCIONADO */}
      {infoProductoSeleccionado && infoProductoSeleccionado.existe && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-blue-400 text-sm font-bold mb-2">{t.infoProducto}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="text-gray-400">{t.clasificacion}:</p>
            <p className={`font-bold ${
              infoProductoSeleccionado.clasificacion === 'ESTRELLA' ? 'text-green-400' :
              infoProductoSeleccionado.clasificacion === 'HUESO' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {infoProductoSeleccionado.clasificacion}
            </p>
            <p className="text-gray-400">{t.diasSinVentas}:</p>
            <p className="text-white">{infoProductoSeleccionado.diasEnStock} días</p>
            {infoProductoSeleccionado.margenNeto > 0 && (
              <>
                <p className="text-gray-400">{t.margen}:</p>
                <p className="text-white">{infoProductoSeleccionado.margenNeto}%</p>
              </>
            )}
            {infoProductoSeleccionado.precioLiquidacion && (
              <>
                <p className="text-gray-400">{t.precioLiquidacion}:</p>
                <p className="text-cyan-400">{formatMoney(infoProductoSeleccionado.precioLiquidacion.precio, idioma)}</p>
                <p className="text-gray-400">{t.estrategia}:</p>
                <p className="text-yellow-400">{infoProductoSeleccionado.precioLiquidacion.estrategia}</p>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de movimiento */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t.tipo}</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="gasto">{t.gasto}</option>
              <option value="ingreso">{t.ingreso}</option>
              <option value="compra">{t.compra}</option>
              <option value="venta">{t.venta}</option>
            </select>
          </div>

          {/* Fuente de pago (solo para egresos) */}
          {(formData.tipo === 'gasto' || formData.tipo === 'compra') && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">{t.fuentePago}</label>
              <select
                name="fuentePago"
                value={formData.fuentePago}
                onChange={(e) => setFormData(prev => ({ ...prev, fuentePago: e.target.value }))}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="negocio">{t.fuenteNegocio}</option>
                <option value="personal">{t.fuentePersonal}</option>
              </select>
            </div>
          )}

          {/* Cantidad */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t.cantidad}</label>
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

          {/* Monto */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t.monto}</label>
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

          {/* Fecha */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t.fecha}</label>
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

          {/* Proveedor / Cliente */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t.tercero}</label>
            <input
              type="text"
              name="tercero"
              value={formData.tercero}
              onChange={(e) => setFormData(prev => ({ ...prev, tercero: e.target.value }))}
              placeholder={formData.tipo === 'compra' ? 'Ej: Distribuidora XYZ' : 'Ej: Juan Pérez'}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Tipo de pago (solo para compras y ventas) */}
          {(formData.tipo === 'compra' || formData.tipo === 'venta') && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">{t.tipoPago}</label>
              <select
                name="tipoPago"
                value={formData.tipoPago}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoPago: e.target.value, fechaLimitePago: '' }))}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="contado">{t.contado}</option>
                <option value="credito">{t.credito}</option>
              </select>
            </div>
          )}

          {/* Fecha límite de pago (solo si es crédito) */}
          {(formData.tipo === 'compra' || formData.tipo === 'venta') && formData.tipoPago === 'credito' && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">{t.fechaLimitePago}</label>
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

          {/* Producto */}
          <div className="md:col-span-2 relative">
            <label className="block text-gray-400 text-sm mb-1">{t.concepto}</label>
            <input
              type="text"
              name="concepto"
              value={formData.concepto}
              onChange={handleConceptoChange}
              onFocus={() => {
                if (formData.concepto.length > 0 && productosFiltrados.length > 0) {
                  setMostrarLista(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setMostrarLista(false), 200);
              }}
              placeholder={t.ejemploConcepto}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              autoComplete="off"
            />
            
            {/* Lista desplegable de productos */}
            {mostrarLista && productosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full bg-[#0f172a] border border-blue-900/30 rounded-lg mt-1 max-h-48 overflow-y-auto">
                {productosFiltrados.map(producto => (
                  <div
                    key={producto.id}
                    onClick={() => seleccionarProducto(producto)}
                    className="px-4 py-2 hover:bg-cyan-500/20 cursor-pointer text-white text-sm border-b border-blue-900/20 last:border-0"
                  >
                    {producto.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fecha de vencimiento del producto (solo para compras) */}
          {formData.tipo === 'compra' && (
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">{t.fechaVencimientoProducto}</label>
              <input
                type="date"
                name="fechaVencimientoProducto"
                value={formData.fechaVencimientoProducto}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimientoProducto: e.target.value }))}
                min={new Date().toLocaleDateString('en-CA')}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {idioma === 'es' ? 'Dejar en blanco si no aplica' : 'Leave blank if not applicable'}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          {loading ? t.guardando : t.guardar}
        </button>
      </form>
    </div>
  );
};

export default RegistroManual;

