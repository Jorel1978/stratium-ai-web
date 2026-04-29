import React, { useState } from 'react';
import { getFirestore, doc, setDoc, collection, addDoc, writeBatch } from 'firebase/firestore';
import { parseNumberInternational, formatearValor } from '../util/formatters';

const OnboardingNegocioExistente = ({ usuarioActual, onComplete, onSkip, onDiagnostico, idioma = 'es' }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    capitalInicial: '',
    inventario: [],
    cuentasPorCobrar: [],
    nuevoProducto: {
      nombre: '',
      sku: '',
      cantidad: 1,
      costoUnitario: '',
      precioVenta: ''
    },
    nuevaCuenta: {
      cliente: '',
      valor: '',
      fechaVencimiento: '',
      concepto: ''
    }
  });

  const db = getFirestore();

  const textos = {
    es: {
      titulo: '🏢 Configura tu negocio existente',
      subtitulo: 'Completa estos datos para que STRATIUM AI pueda analizar tu situación actual',
      paso1: '💰 Capital Invertido',
      paso2: '📦 Inventario Actual',
      paso3: '📋 Cuentas por Cobrar',
      capitalLabel: 'Capital invertido inicial',
      capitalPlaceholder: 'Ej: 5,000,000',
      capitalDesc: 'Dinero que ya has invertido en el negocio (equipos, mercancía, etc.)',
      productoNombre: 'Nombre del producto',
      sku: 'Código SKU (opcional)',
      skuPlaceholder: 'Ej: CAM-001',
      cantidad: 'Cantidad',
      costoUnitario: 'Costo unitario',
      precioVenta: 'Precio de venta',
      agregarProducto: '+ Agregar producto',
      eliminar: 'Eliminar',
      cliente: 'Cliente / Deudor',
      clientePlaceholder: 'Ej: Distribuidora XYZ',
      valor: 'Valor',
      fechaVencimiento: 'Fecha de vencimiento',
      concepto: 'Concepto',
      agregarCuenta: '+ Agregar cuenta',
      continuar: 'Continuar',
      atras: 'Atrás',
      finalizar: 'Finalizar y comenzar',
      saltar: 'Saltar por ahora',
      procesando: 'Procesando...',
      inventarioVacio: 'Aún no has agregado productos',
      cuentasVacio: 'Aún no has agregado cuentas por cobrar',
      resumen: 'Resumen de configuración',
      capitalMostrado: 'Capital invertido',
      productosMostrados: 'Productos en inventario',
      deudasMostradas: 'Cuentas por cobrar'
    },
    en: {
      titulo: '🏢 Set up your existing business',
      subtitulo: 'Complete this data so STRATIUM AI can analyze your current situation',
      paso1: '💰 Invested Capital',
      paso2: '📦 Current Inventory',
      paso3: '📋 Accounts Receivable',
      capitalLabel: 'Initial invested capital',
      capitalPlaceholder: 'Ex: 5,000,000',
      capitalDesc: 'Money you have already invested in the business',
      productoNombre: 'Product name',
      sku: 'SKU code (optional)',
      skuPlaceholder: 'Ex: CAM-001',
      cantidad: 'Quantity',
      costoUnitario: 'Unit cost',
      precioVenta: 'Selling price',
      agregarProducto: '+ Add product',
      eliminar: 'Delete',
      cliente: 'Customer / Debtor',
      clientePlaceholder: 'Ex: Distributor XYZ',
      valor: 'Amount',
      fechaVencimiento: 'Due date',
      concepto: 'Concept',
      agregarCuenta: '+ Add account',
      continuar: 'Continue',
      atras: 'Back',
      finalizar: 'Finish and start',
      saltar: 'Skip for now',
      procesando: 'Processing...',
      inventarioVacio: 'You have not added any products yet',
      cuentasVacio: 'You have not added any accounts receivable yet',
      resumen: 'Configuration summary',
      capitalMostrado: 'Invested capital',
      productosMostrados: 'Products in inventory',
      deudasMostradas: 'Accounts receivable'
    }
  };

  const t = textos[idioma] || textos.es;

  const agregarProducto = () => {
    if (!formData.nuevoProducto.nombre || !formData.nuevoProducto.costoUnitario || !formData.nuevoProducto.precioVenta) {
      alert(idioma === 'es' ? 'Completa nombre, costo y precio' : 'Complete name, cost and price');
      return;
    }

    const nuevoProducto = {
      id: Date.now(),
      nombre: formData.nuevoProducto.nombre,
      sku: formData.nuevoProducto.sku || null,
      cantidad: parseInt(formData.nuevoProducto.cantidad) || 1,
      costoUnitario: parseNumberInternational(formData.nuevoProducto.costoUnitario),
      precioVenta: parseNumberInternational(formData.nuevoProducto.precioVenta),
      fechaRegistro: new Date()
    };

    setFormData({
      ...formData,
      inventario: [...formData.inventario, nuevoProducto],
      nuevoProducto: { nombre: '', sku: '', cantidad: 1, costoUnitario: '', precioVenta: '' }
    });
  };

  const eliminarProducto = (id) => {
    setFormData({
      ...formData,
      inventario: formData.inventario.filter(p => p.id !== id)
    });
  };

  const agregarCuenta = () => {
    if (!formData.nuevaCuenta.cliente || !formData.nuevaCuenta.valor) {
      alert(idioma === 'es' ? 'Completa cliente y valor' : 'Complete customer and amount');
      return;
    }

    const nuevaCuenta = {
      id: Date.now(),
      cliente: formData.nuevaCuenta.cliente,
      valor: parseNumberInternational(formData.nuevaCuenta.valor),
      fechaVencimiento: formData.nuevaCuenta.fechaVencimiento || null,
      concepto: formData.nuevaCuenta.concepto || 'Venta a crédito',
      estado: 'PENDIENTE',
      fechaRegistro: new Date()
    };

    setFormData({
      ...formData,
      cuentasPorCobrar: [...formData.cuentasPorCobrar, nuevaCuenta],
      nuevaCuenta: { cliente: '', valor: '', fechaVencimiento: '', concepto: '' }
    });
  };

  const eliminarCuenta = (id) => {
    setFormData({
      ...formData,
      cuentasPorCobrar: formData.cuentasPorCobrar.filter(c => c.id !== id)
    });
  };

  const guardarConfiguracion = async () => {
    if (!usuarioActual?.uid) {
      alert(idioma === 'es' ? 'Usuario no autenticado' : 'User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);
      const configRef = doc(db, 'configuracionNegocio', usuarioActual.uid);

      batch.set(configRef, {
        capitalInicial: parseNumberInternational(formData.capitalInicial) || 0,
        inventarioInicial: formData.inventario,
        cuentasPorCobrarIniciales: formData.cuentasPorCobrar,
        fechaConfiguracion: new Date(),
        onboardingCompletado: true,
        usuarioId: usuarioActual.uid
      });

      for (const producto of formData.inventario) {
        const inventarioRef = doc(collection(db, 'inventario'));
        batch.set(inventarioRef, {
          producto: producto.nombre,
          sku: producto.sku || null,
          cantidad: producto.cantidad,
          costoUnitario: producto.costoUnitario,
          costoTotal: producto.costoUnitario * producto.cantidad,
          precioVenta: producto.precioVenta,
          fechaRegistro: producto.fechaRegistro,
          fechaActualizacion: new Date(),
          userId: usuarioActual.uid,
          clasificacion: producto.precioVenta > producto.costoUnitario ? 'ESTRELLA' : 'NORMAL',
          procesadoPor: 'onboarding'
        });
      }

      for (const cuenta of formData.cuentasPorCobrar) {
        const cuentaRef = doc(collection(db, 'cuentasPorCobrar'));
        batch.set(cuentaRef, {
          cliente: cuenta.cliente,
          concepto: cuenta.concepto,
          valor: cuenta.valor,
          fechaVencimiento: cuenta.fechaVencimiento ? new Date(cuenta.fechaVencimiento) : null,
          fechaRegistro: cuenta.fechaRegistro,
          estado: cuenta.estado,
          texto: `Cuenta por cobrar: ${cuenta.cliente} - ${cuenta.concepto}`,
          userId: usuarioActual.uid,
          esCuentaPorCobrar: true,
          procesadoPor: 'onboarding'
        });
      }

      const userRef = doc(db, 'usuarios', usuarioActual.uid);
      batch.update(userRef, {
        aportesPersonales: (usuarioActual?.aportesPersonales || 0) + (parseNumberInternational(formData.capitalInicial) || 0),
        onboardingCompletado: true,
        fechaOnboarding: new Date()
      });

      await batch.commit();

      // ============================================================
      // DIAGNÓSTICO DE BIENVENIDA (CORREGIDO)
      // ============================================================
      const totalInventarioCosto = formData.inventario.reduce((sum, p) => sum + (p.costoUnitario * p.cantidad), 0);
      const totalCuentasPorCobrar = formData.cuentasPorCobrar.reduce((sum, c) => sum + c.valor, 0);
      const capitalInvertido = parseNumberInternational(formData.capitalInicial) || 0;
      
      let productoMasRentable = null;
      let mayorMargen = 0;
      for (const producto of formData.inventario) {
        if (producto.precioVenta > 0 && producto.costoUnitario > 0) {
          const margen = ((producto.precioVenta - producto.costoUnitario) / producto.costoUnitario) * 100;
          if (margen > mayorMargen) {
            mayorMargen = margen;
            productoMasRentable = { 
              nombre: producto.nombre, 
              sku: producto.sku,
              margen: mayorMargen, 
              costo: producto.costoUnitario, 
              precio: producto.precioVenta 
            };
          }
        }
      }
      
      let margenPromedio = 0;
      let tiempoRecuperacion = null;
      const productosConPrecio = formData.inventario.filter(p => p.precioVenta > 0 && p.costoUnitario > 0);
      
      if (productosConPrecio.length > 0) {
        const sumaMargenes = productosConPrecio.reduce((sum, p) => sum + ((p.precioVenta - p.costoUnitario) / p.costoUnitario * 100), 0);
        margenPromedio = sumaMargenes / productosConPrecio.length;
        
        const ventaPromedio = productosConPrecio.reduce((sum, p) => sum + p.precioVenta, 0) / productosConPrecio.length;
        const gananciaPorVenta = ventaPromedio * (margenPromedio / 100);
        
        if (gananciaPorVenta > 0 && capitalInvertido > 0) {
          tiempoRecuperacion = Math.ceil(capitalInvertido / gananciaPorVenta);
        }
      }
      
      const datosDiagnostico = {
        totalInventarioCosto,
        totalCuentasPorCobrar,
        capitalInvertido,
        productoMasRentable,
        margenPromedio: margenPromedio > 0 ? margenPromedio.toFixed(1) : '0',
        tiempoRecuperacion,
        totalProductos: formData.inventario.length
      };
      
      console.log('📊 Diagnóstico de Bienvenida:', datosDiagnostico);
      
      if (onDiagnostico) {
        onDiagnostico(datosDiagnostico);
      }

      if (onComplete) onComplete({
        capitalInicial: parseNumberInternational(formData.capitalInicial) || 0,
        productosAgregados: formData.inventario.length,
        cuentasAgregadas: formData.cuentasPorCobrar.length
      });

    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert(idioma === 'es' 
        ? 'Error al guardar la configuración. Intenta de nuevo.' 
        : 'Error saving configuration. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPaso1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-400 text-sm mb-2">{t.capitalLabel}</label>
        <input
          type="text"
          value={formData.capitalInicial}
          onChange={(e) => setFormData({ ...formData, capitalInicial: e.target.value })}
          placeholder={t.capitalPlaceholder}
          className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <p className="text-gray-500 text-xs mt-1">{t.capitalDesc}</p>
      </div>
    </div>
  );

  const renderPaso2 = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 p-4 rounded-lg">
        <h4 className="text-cyan-400 text-sm font-bold mb-3">{t.agregarProducto}</h4>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={formData.nuevoProducto.nombre}
            onChange={(e) => setFormData({ ...formData, nuevoProducto: { ...formData.nuevoProducto, nombre: e.target.value } })}
            placeholder={t.productoNombre}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            value={formData.nuevoProducto.sku}
            onChange={(e) => setFormData({ ...formData, nuevoProducto: { ...formData.nuevoProducto, sku: e.target.value } })}
            placeholder={t.skuPlaceholder}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="number"
            value={formData.nuevoProducto.cantidad}
            onChange={(e) => setFormData({ ...formData, nuevoProducto: { ...formData.nuevoProducto, cantidad: e.target.value } })}
            placeholder={t.cantidad}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
            min="1"
          />
          <input
            type="text"
            value={formData.nuevoProducto.costoUnitario}
            onChange={(e) => setFormData({ ...formData, nuevoProducto: { ...formData.nuevoProducto, costoUnitario: e.target.value } })}
            placeholder={t.costoUnitario}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            value={formData.nuevoProducto.precioVenta}
            onChange={(e) => setFormData({ ...formData, nuevoProducto: { ...formData.nuevoProducto, precioVenta: e.target.value } })}
            placeholder={t.precioVenta}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <button onClick={agregarProducto} className="mt-3 text-cyan-400 text-sm hover:text-cyan-300 transition-all">
          {t.agregarProducto}
        </button>
      </div>

      {formData.inventario.length > 0 ? (
        <div>
          <h4 className="text-gray-400 text-xs uppercase mb-2">{t.productosMostrados} ({formData.inventario.length})</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {formData.inventario.map((producto) => (
              <div key={producto.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-white text-sm font-medium">{producto.nombre}</p>
                  <p className="text-gray-400 text-xs">
                    {producto.sku && `SKU: ${producto.sku} | `}{producto.cantidad} und • Costo: {formatearValor(producto.costoUnitario)} • Precio: {formatearValor(producto.precioVenta)}
                  </p>
                </div>
                <button onClick={() => eliminarProducto(producto.id)} className="text-red-400 hover:text-red-300 text-sm">
                  {t.eliminar}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">{t.inventarioVacio}</p>
      )}
    </div>
  );

  const renderPaso3 = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 p-4 rounded-lg">
        <h4 className="text-cyan-400 text-sm font-bold mb-3">{t.agregarCuenta}</h4>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={formData.nuevaCuenta.cliente}
            onChange={(e) => setFormData({ ...formData, nuevaCuenta: { ...formData.nuevaCuenta, cliente: e.target.value } })}
            placeholder={t.cliente}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            value={formData.nuevaCuenta.valor}
            onChange={(e) => setFormData({ ...formData, nuevaCuenta: { ...formData.nuevaCuenta, valor: e.target.value } })}
            placeholder={t.valor}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="date"
            value={formData.nuevaCuenta.fechaVencimiento}
            onChange={(e) => setFormData({ ...formData, nuevaCuenta: { ...formData.nuevaCuenta, fechaVencimiento: e.target.value } })}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            value={formData.nuevaCuenta.concepto}
            onChange={(e) => setFormData({ ...formData, nuevaCuenta: { ...formData.nuevaCuenta, concepto: e.target.value } })}
            placeholder={t.concepto}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <button onClick={agregarCuenta} className="mt-3 text-cyan-400 text-sm hover:text-cyan-300 transition-all">
          {t.agregarCuenta}
        </button>
      </div>

      {formData.cuentasPorCobrar.length > 0 ? (
        <div>
          <h4 className="text-gray-400 text-xs uppercase mb-2">{t.deudasMostradas} ({formData.cuentasPorCobrar.length})</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {formData.cuentasPorCobrar.map((cuenta) => (
              <div key={cuenta.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-white text-sm font-medium">{cuenta.cliente}</p>
                  <p className="text-gray-400 text-xs">
                    {formatearValor(cuenta.valor)} • {cuenta.concepto}
                    {cuenta.fechaVencimiento && ` • Vence: ${new Date(cuenta.fechaVencimiento).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => eliminarCuenta(cuenta.id)} className="text-red-400 hover:text-red-300 text-sm">
                  {t.eliminar}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">{t.cuentasVacio}</p>
      )}
    </div>
  );

  const renderResumen = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 p-4 rounded-lg">
        <h4 className="text-cyan-400 text-sm font-bold mb-3">{t.resumen}</h4>
        <div className="space-y-2">
          <p className="text-gray-300 text-sm">
            💰 {t.capitalMostrado}: <span className="text-white font-bold">{formatearValor(parseNumberInternational(formData.capitalInicial) || 0)}</span>
          </p>
          <p className="text-gray-300 text-sm">
            📦 {t.productosMostrados}: <span className="text-white font-bold">{formData.inventario.length}</span>
          </p>
          <p className="text-gray-300 text-sm">
            📋 {t.deudasMostradas}: <span className="text-white font-bold">{formData.cuentasPorCobrar.length}</span>
            {formData.cuentasPorCobrar.length > 0 && (
              <span className="text-gray-400 ml-2">
                Total: {formatearValor(formData.cuentasPorCobrar.reduce((sum, c) => sum + c.valor, 0))}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl w-full border border-blue-900/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚀</div>
          <h2 className="text-2xl font-bold text-white">{t.titulo}</h2>
          <p className="text-gray-400 text-sm mt-2">{t.subtitulo}</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${
              step === s ? 'bg-cyan-500 w-6' : step > s ? 'bg-green-500' : 'bg-slate-700'
            }`} />
          ))}
        </div>

        <h3 className="text-lg font-bold text-white mb-4">
          {step === 1 && t.paso1}
          {step === 2 && t.paso2}
          {step === 3 && t.paso3}
          {step === 4 && t.resumen}
        </h3>

        <div className="mb-6">
          {step === 1 && renderPaso1()}
          {step === 2 && renderPaso2()}
          {step === 3 && renderPaso3()}
          {step === 4 && renderResumen()}
        </div>

        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} disabled={loading} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg">
              {t.atras}
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 rounded-lg">
              {t.continuar}
            </button>
          ) : (
            <button onClick={guardarConfiguracion} disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2 rounded-lg disabled:opacity-50">
              {loading ? t.procesando : t.finalizar}
            </button>
          )}
        </div>

        {onSkip && (
          <button onClick={onSkip} disabled={loading} className="w-full mt-3 text-gray-500 text-sm hover:text-gray-400">
            {t.saltar}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingNegocioExistente;

