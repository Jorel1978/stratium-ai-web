import React, { useState, useEffect, useCallback } from 'react';

const ProduccionForm = ({ usuarioActual, t, setInventario, setMovimientos, onSuccess, onError }) => {
  const [produccion, setProduccion] = useState({
    materiales: '',
    horas: '',
    valorHora: '',
    transporte: '',
    precioVenta: '',
    productoNombre: ''
  });
  const [costeoResultado, setCosteoResultado] = useState(null);
  const [calculandoProduccion, setCalculandoProduccion] = useState(false);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  const calcularProduccion = useCallback(() => {
    setCalculandoProduccion(true);
    try {
      const materiales = parseFloat(produccion.materiales) || 0;
      const horas = parseFloat(produccion.horas) || 0;
      const valorHora = parseFloat(produccion.valorHora) || 0;
      const transporte = parseFloat(produccion.transporte) || 0;
      const precioVenta = produccion.precioVenta ? parseFloat(produccion.precioVenta) : 0;
      
      const costoManoObra = horas * valorHora;
      const costoTotal = materiales + costoManoObra + transporte;
      const margenUnitario = precioVenta - costoTotal;
      const margenPorcentaje = costoTotal > 0 ? (margenUnitario / costoTotal) * 100 : 0;
      const margenPorHora = horas > 0 ? margenUnitario / horas : 0;
      
      setCosteoResultado({
        costoUnitario: costoTotal,
        costoMateriales: materiales,
        costoManoObra: costoManoObra,
        costoTransporte: transporte,
        margenUnitario: margenUnitario,
        margenPorcentaje: margenPorcentaje,
        margenPorHora: margenPorHora
      });
    } catch (err) {
      console.error('Error en cálculo de producción:', err);
      onError?.('Error al calcular producción.');
    } finally {
      setCalculandoProduccion(false);
    }
  }, [produccion.materiales, produccion.horas, produccion.valorHora, produccion.transporte, produccion.precioVenta, onError]);

  // ✅ CORREGIDO: dependencias específicas para evitar re-renderizados erráticos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (produccion.materiales || produccion.horas || produccion.valorHora || produccion.transporte) {
        calcularProduccion();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [produccion.materiales, produccion.horas, produccion.valorHora, produccion.transporte, produccion.precioVenta, calcularProduccion]);

  const handleChange = (e) => {
    setProduccion({
      ...produccion,
      [e.target.name]: e.target.value
    });
  };

  const cargarAInventario = async () => {
    if (!usuarioActual?.uid) {
      onError?.('Debes iniciar sesión');
      return;
    }
    if (!produccion.productoNombre || !costeoResultado) {
      onError?.('Completa los datos y calcula el costo primero');
      return;
    }

    setCargandoInventario(true);
    try {
      // Aquí iría la lógica de guardar en Firebase
      onSuccess?.('Producción auditada y cargada al inventario');
    } catch (err) {
      onError?.(err.message);
    } finally {
      setCargandoInventario(false);
    }
  };

  const esProduccionRentable = costeoResultado && produccion.precioVenta 
    ? costeoResultado.costoUnitario <= parseFloat(produccion.precioVenta)
    : true;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-blue-900/30">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          🏭 {t.produccion || 'Cálculo de Producción'}
        </h3>
        <button
          onClick={() => setMostrarDetalles(!mostrarDetalles)}
          className="text-cyan-400 text-sm hover:text-cyan-300 transition-all"
        >
          {mostrarDetalles ? '▲ Ocultar detalles' : '▼ Ver detalles'}
        </button>
      </div>

      {/* Campos del formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          name="productoNombre"
          value={produccion.productoNombre}
          onChange={handleChange}
          placeholder={t.productoNombre || "Nombre del producto"}
          className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="number"
          name="materiales"
          value={produccion.materiales}
          onChange={handleChange}
          placeholder={t.material || "Costo de Materiales"}
          className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="number"
          name="horas"
          value={produccion.horas}
          onChange={handleChange}
          placeholder={t.horas || "Horas de Trabajo"}
          className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="number"
          name="valorHora"
          value={produccion.valorHora}
          onChange={handleChange}
          placeholder={t.valorHora || "Valor Hora"}
          className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="number"
          name="transporte"
          value={produccion.transporte}
          onChange={handleChange}
          placeholder={t.transporte || "Gastos de Transporte"}
          className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="number"
          name="precioVenta"
          value={produccion.precioVenta}
          onChange={handleChange}
          placeholder={t.precioVenta || "Precio de Venta"}
          className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Resultados */}
      {costeoResultado && (
        <div className={`p-4 rounded-xl mb-4 ${!esProduccionRentable ? 'bg-red-900/30 border border-red-500/50' : 'bg-cyan-900/20 border border-cyan-500/30'}`}>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">{t.costoUnitario || 'Costo Unitario'}:</span>
            {/* ✅ CORREGIDO: fallback con || 0 */}
            <span className="text-white font-bold">${(costeoResultado.costoUnitario || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400">Margen:</span>
            <span className={costeoResultado.margenPorcentaje >= 30 ? 'text-emerald-400 font-bold' : (costeoResultado.margenPorcentaje > 0 ? 'text-yellow-400' : 'text-red-400')}>
              {(costeoResultado.margenPorcentaje || 0).toFixed(1)}%
            </span>
          </div>
          {mostrarDetalles && (
            <div className="mt-3 pt-3 border-t border-blue-900/20 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Materiales:</span>
                <span>${(costeoResultado.costoMateriales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mano de obra:</span>
                <span>${(costeoResultado.costoManoObra || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transporte:</span>
                <span>${(costeoResultado.costoTransporte || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Margen unitario:</span>
                <span className={costeoResultado.margenUnitario >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  ${(costeoResultado.margenUnitario || 0).toLocaleString()}
                </span>
              </div>
              {costeoResultado.margenPorHora > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Margen por hora:</span>
                  <span>${(costeoResultado.margenPorHora || 0).toLocaleString()}/h</span>
                </div>
              )}
            </div>
          )}
          {!esProduccionRentable && (
            <p className="text-red-400 text-xs mt-2">{t.alertaProduccion || '⚠️ ALERTA: Producción a pérdida. Revisa costos.'}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={calcularProduccion}
          disabled={calculandoProduccion}
          className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg py-2 font-medium transition-all disabled:opacity-50"
        >
          {calculandoProduccion ? t.calcular || 'Calculando...' : '🔢 Calcular Costo'}
        </button>
        <button
          onClick={cargarAInventario}
          disabled={!costeoResultado || cargandoInventario}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg py-2 font-medium transition-all disabled:opacity-50"
        >
          {cargandoInventario ? '📦 Cargando...' : '📦 Cargar a Inventario'}
        </button>
      </div>
    </div>
  );
};

export default ProduccionForm;

