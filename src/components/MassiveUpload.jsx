import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { writeBatch, doc, getDocs, query, where, collection } from 'firebase/firestore';
import { db, inventarioCollection } from '../../services/firebase';
import { parseNumberInternational, formatearValor } from '../../util/formatters';

const MassiveUpload = ({ usuarioActual, onComplete, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [fullData, setFullData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Estados para el flujo de validación
  const [productosNuevos, setProductosNuevos] = useState([]);
  const [productosEnConflicto, setProductosEnConflicto] = useState([]);
  const [fase, setFase] = useState('upload');
  
  const [columnMapping, setColumnMapping] = useState({
    nombre: '',
    costo: '',
    precio: '',
    fecha: '',
    cantidad: ''
  });

  // Cargar inventario existente
  const cargarInventarioExistente = useCallback(async () => {
    if (!usuarioActual?.uid) return {};
    const q = query(inventarioCollection, where('userId', '==', usuarioActual.uid));
    const snapshot = await getDocs(q);
    const existente = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const nombreNormalizado = data.producto?.toLowerCase().trim();
      if (nombreNormalizado) {
        existente[nombreNormalizado] = {
          id: docSnap.id,
          producto: data.producto,
          cantidad: data.cantidad || 0,
          costoUnitario: data.costoUnitario,
          costoTotal: data.costoTotal
        };
      }
    });
    return existente;
  }, [usuarioActual?.uid]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setFullData(results.data);
        setPreviewData(results.data.slice(0, 5));
        setFase('upload');
        setProductosNuevos([]);
        setProductosEnConflicto([]);
      },
      error: (err) => onError?.(`Error leyendo CSV: ${err.message}`)
    });
  }, [onError]);

  // Escaneo inicial: separar productos nuevos vs en conflicto
  const realizarEscaneoInicial = useCallback(async () => {
    if (!usuarioActual?.uid) {
      onError?.('No autenticado');
      return;
    }
    if (!columnMapping.nombre || !columnMapping.costo) {
      onError?.('Debes mapear las columnas de Nombre y Costo');
      return;
    }
    if (fullData.length === 0) {
      onError?.('No hay datos para procesar. Sube un archivo CSV primero.');
      return;
    }

    setIsValidating(true);
    setFase('validating');
    
    const existente = await cargarInventarioExistente();
    const nuevos = [];
    const conflictos = [];
    
    for (const row of fullData) {
      const nombre = row[columnMapping.nombre]?.trim();
      const costoUnitario = parseNumberInternational(row[columnMapping.costo]);
      const precioVenta = columnMapping.precio ? parseNumberInternational(row[columnMapping.precio]) : 0;
      const cantidad = columnMapping.cantidad ? parseNumberInternational(row[columnMapping.cantidad]) : 1;
      let fecha = columnMapping.fecha && row[columnMapping.fecha] ? new Date(row[columnMapping.fecha]) : new Date();
      
      if (!nombre || costoUnitario <= 0) continue;
      
      const nombreNormalizado = nombre.toLowerCase().trim();
      const existenteProducto = existente[nombreNormalizado];
      
      // Clasificación Estrella/Hueso basada en fecha
      const fechaObj = new Date(fecha);
      const hoy = new Date();
      const diffDays = Math.floor((hoy - fechaObj) / (1000 * 60 * 60 * 24));
      const esHueso = diffDays > 15;
      const esEstrella = precioVenta > 0 && (precioVenta - costoUnitario) / costoUnitario > 0.3;
      
      const productoData = {
        nombre,
        nombreNormalizado,
        costoUnitario,
        precioVenta,
        cantidad: Math.max(1, cantidad),
        fecha,
        diffDays,
        clasificacion: esEstrella ? 'ESTRELLA' : (esHueso ? 'HUESO' : 'NORMAL'),
        diasSinVenta: esHueso ? diffDays : 0
      };
      
      if (existenteProducto) {
        conflictos.push({
          ...productoData,
          existente: existenteProducto,
          decision: null,
          decisionTomada: false
        });
      } else {
        nuevos.push(productoData);
      }
    }
    
    setProductosNuevos(nuevos);
    setProductosEnConflicto(conflictos);
    setFase('resolving');
    setIsValidating(false);
  }, [usuarioActual, columnMapping, fullData, cargarInventarioExistente, onError]);

  // Actualizar decisión de un producto en conflicto
  const actualizarDecision = useCallback((index, decision) => {
    setProductosEnConflicto(prev => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], decision, decisionTomada: true };
      return nuevos;
    });
  }, []);

  // Ejecutar carga final con batch
  const ejecutarCargaFinal = useCallback(async () => {
    const conflictosSinDecision = productosEnConflicto.filter(p => !p.decisionTomada);
    if (conflictosSinDecision.length > 0) {
      onError?.(`Falta decidir sobre ${conflictosSinDecision.length} producto(s)`);
      return;
    }
    
    setIsProcessing(true);
    setFase('processing');
    
    const batch = writeBatch(db);
    let batchCount = 0;
    let resultados = { nuevosAgregados: 0, existentesActualizados: 0, ignorados: 0, errores: 0 };
    
    const allProductsToProcess = [
      ...productosNuevos.map(p => ({ ...p, accion: 'crear_nuevo' })),
      ...productosEnConflicto.filter(p => p.decision !== 'ignorar')
    ];
    
    const total = allProductsToProcess.length;
    let procesados = 0;
    
    for (const producto of allProductsToProcess) {
      try {
        const accion = producto.accion || producto.decision;
        const inventarioData = {
          producto: producto.nombre,
          costoUnitario: producto.costoUnitario,
          costoTotal: producto.costoUnitario * producto.cantidad,
          precioVenta: producto.precioVenta || null,
          cantidad: producto.cantidad,
          fechaActualizacion: new Date(),
          fechaRegistro: producto.fecha,
          userId: usuarioActual.uid,
          clasificacion: producto.clasificacion,
          diasSinVenta: producto.diasSinVenta || 0,
          procesadoPor: 'massive_upload_validated'
        };
        
        if (accion === 'crear_nuevo') {
          const newDocRef = doc(inventarioCollection);
          batch.set(newDocRef, inventarioData);
          resultados.nuevosAgregados++;
        } else if (accion === 'actualizar' && producto.existente) {
          const existente = producto.existente;
          const nuevaCantidad = (existente.cantidad || 0) + producto.cantidad;
          const nuevoCostoTotal = (existente.costoTotal || 0) + (producto.costoUnitario * producto.cantidad);
          inventarioData.cantidad = nuevaCantidad;
          inventarioData.costoTotal = nuevoCostoTotal;
          inventarioData.costoUnitario = nuevoCostoTotal / nuevaCantidad;
          const docRef = doc(db, 'inventario', existente.id);
          batch.update(docRef, inventarioData);
          resultados.existentesActualizados++;
        }
        
        batchCount++;
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      } catch (err) {
        resultados.errores++;
        console.error('Error:', err);
      }
      procesados++;
      setProgress({ current: procesados, total });
    }
    
    if (batchCount > 0) await batch.commit();
    resultados.ignorados = productosEnConflicto.filter(p => p.decision === 'ignorar').length;
    
    setIsProcessing(false);
    onComplete?.({ ...resultados, mensaje: `✅ ${resultados.nuevosAgregados} nuevos, ${resultados.existentesActualizados} actualizados, ${resultados.ignorados} ignorados` });
    
    setFase('upload');
    setFullData([]);
    setPreviewData([]);
    setProductosNuevos([]);
    setProductosEnConflicto([]);
  }, [productosNuevos, productosEnConflicto, usuarioActual, onComplete, onError]);

  // Renderizar lista de conflictos
  const renderConflictosLista = () => {
    if (productosEnConflicto.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 mb-4">
          <h4 className="text-yellow-400 font-bold">⚠️ {productosEnConflicto.length} producto(s) ya existen</h4>
        </div>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {productosEnConflicto.map((producto, idx) => (
            <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-white text-lg">{producto.nombre}</p>
                  <p className="text-sm text-gray-400">
                    Costo: {formatearValor(producto.costoUnitario)} | Cantidad: {producto.cantidad}
                    {producto.precioVenta > 0 && ` | Precio: ${formatearValor(producto.precioVenta)}`}
                  </p>
                  <p className={`text-xs mt-1 ${producto.clasificacion === 'ESTRELLA' ? 'text-emerald-400' : producto.clasificacion === 'HUESO' ? 'text-red-400' : 'text-gray-400'}`}>
                    Clasificación: {producto.clasificacion} {producto.diasSinVenta > 0 && `(${producto.diasSinVenta} días sin venta)`}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-2 text-center min-w-[120px]">
                  <p className="text-xs text-gray-400">Inventario actual</p>
                  <p className="text-sm font-bold text-cyan-400">{producto.existente.cantidad} unidades</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => actualizarDecision(idx, 'ignorar')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
                  🚫 Ignorar
                </button>
                <button onClick={() => actualizarDecision(idx, 'crear_nuevo')} className="px-4 py-2 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50 rounded-lg text-sm border border-emerald-500/30">
                  ✨ Crear nuevo
                </button>
                <button onClick={() => actualizarDecision(idx, 'actualizar')} className="px-4 py-2 bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 rounded-lg text-sm border border-blue-500/30">
                  🔄 Actualizar (+{producto.cantidad})
                </button>
              </div>
              
              {producto.decision && (
                <p className="text-xs text-green-400 mt-2">
                  ✅ Decisión: {producto.decision === 'ignorar' ? 'Ignorado' : producto.decision === 'crear_nuevo' ? 'Se creará nuevo' : 'Se actualizará stock'}
                </p>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex gap-3">
          <button onClick={() => productosEnConflicto.forEach((_, i) => actualizarDecision(i, 'ignorar'))} className="px-4 py-2 bg-gray-700 rounded-lg text-sm">Ignorar todos</button>
          <button onClick={() => productosEnConflicto.forEach((_, i) => actualizarDecision(i, 'actualizar'))} className="px-4 py-2 bg-blue-700 rounded-lg text-sm">Actualizar todos</button>
        </div>
      </div>
    );
  };

  const renderProductosNuevos = () => {
    if (productosNuevos.length === 0) return null;
    
    return (
      <div className="mb-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
        <h4 className="text-emerald-400 font-bold">✨ {productosNuevos.length} producto(s) nuevo(s)</h4>
        <div className="flex flex-wrap gap-2 mt-2">
          {productosNuevos.slice(0, 10).map((p, idx) => (
            <span key={idx} className="text-xs bg-emerald-800/30 px-2 py-1 rounded-full text-emerald-300">
              {p.nombre} ({p.cantidad})
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Fase: Upload
  if (fase === 'upload') {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <h3 className="text-xl font-bold mb-4">📤 Carga Masiva de Inventario</h3>
        <p className="text-gray-400 text-sm mb-4">
          Sube un archivo CSV con columnas: Nombre, Costo, Precio (opcional), Cantidad (opcional), Fecha (opcional)
        </p>

        <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-cyan-500 file:text-white file:border-0" />

        {csvHeaders.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2">Mapear columnas:</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['nombre', 'costo', 'precio', 'cantidad', 'fecha'].map(field => (
                <select key={field} value={columnMapping[field]} onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                  <option value="">→ {field}</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              ))}
            </div>
          </div>
        )}

        {previewData.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <h4 className="text-sm font-semibold mb-2">Vista previa:</h4>
            <table className="min-w-full text-xs">
              <thead className="bg-slate-800"><tr>{csvHeaders.map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
              <tbody>{previewData.map((row, i) => <tr key={i} className="border-t border-slate-700">{csvHeaders.map(h => <td key={h} className="p-2">{row[h]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}

        <button onClick={realizarEscaneoInicial} disabled={!columnMapping.nombre || !columnMapping.costo || fullData.length === 0} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold disabled:opacity-50">
          🔍 Validar {fullData.length} productos
        </button>
      </div>
    );
  }

  // Fase: Resolving
  if (fase === 'resolving') {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <h3 className="text-xl font-bold mb-4">🔍 Validación de Inventario</h3>
        {renderProductosNuevos()}
        {renderConflictosLista()}
        
        <div className="flex gap-3 mt-6">
          <button onClick={() => setFase('upload')} className="px-6 py-3 bg-slate-700 rounded-xl">← Volver</button>
          <button onClick={ejecutarCargaFinal} disabled={productosEnConflicto.some(p => !p.decisionTomada)} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-bold disabled:opacity-50">
            ✅ Ejecutar Carga ({productosNuevos.length + productosEnConflicto.filter(p => p.decision !== 'ignorar').length} productos)
          </button>
        </div>
      </div>
    );
  }

  // Fase: Processing
  if (fase === 'processing') {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <h3 className="text-xl font-bold mb-4">⏳ Procesando...</h3>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
        </div>
        <p className="text-center text-gray-400 text-sm mt-2">{progress.current} / {progress.total}</p>
      </div>
    );
  }

  return null;
};

export default MassiveUpload;

