import React, { useState, useCallback, useEffect } from 'react';
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
  const [inventarioExistente, setInventarioExistente] = useState({});
  const [fase, setFase] = useState('upload'); // 'upload', 'validating', 'resolving', 'processing'
  
  const [columnMapping, setColumnMapping] = useState({
    nombre: '',
    costo: '',
    precio: '',
    fecha: '',
    cantidad: ''
  });

  // Cargar inventario existente del usuario
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
    setInventarioExistente(existente);
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
    
    // Cargar inventario existente
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
      
      const productoData = {
        nombre,
        nombreNormalizado,
        costoUnitario,
        precioVenta,
        cantidad: Math.max(1, cantidad),
        fecha,
        diffDays: Math.floor((new Date() - fecha) / (1000 * 60 * 60 * 24)),
        row: row
      };
      
      if (existenteProducto) {
        // Producto en conflicto (ya existe en inventario)
        conflictos.push({
          ...productoData,
          existente: existenteProducto,
          decision: null, // 'ignorar', 'crear_nuevo', 'actualizar'
          decisionTomada: false
        });
      } else {
        // Producto nuevo
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
      nuevos[index] = {
        ...nuevos[index],
        decision,
        decisionTomada: true
      };
      return nuevos;
    });
  }, []);

  // Aplicar todas las decisiones y ejecutar batch final
  const ejecutarCargaFinal = useCallback(async () => {
    // Verificar que todos los conflictos tengan decisión
    const conflictosSinDecision = productosEnConflicto.filter(p => !p.decisionTomada);
    if (conflictosSinDecision.length > 0) {
      onError?.(`Falta decidir sobre ${conflictosSinDecision.length} producto(s) en conflicto`);
      return;
    }
    
    setIsProcessing(true);
    setFase('processing');
    
    const batch = writeBatch(db);
    let batchCount = 0;
    let resultados = {
      nuevosAgregados: 0,
      existentesActualizados: 0,
      ignorados: 0,
      errores: 0
    };
    
    const allProductsToProcess = [
      ...productosNuevos.map(p => ({ ...p, accion: 'crear_nuevo' })),
      ...productosEnConflicto.filter(p => p.decision !== 'ignorar')
    ];
    
    const total = allProductsToProcess.length;
    let procesados = 0;
    
    for (const producto of allProductsToProcess) {
      try {
        const accion = producto.accion || producto.decision;
        const nombre = producto.nombre;
        const costoUnitario = producto.costoUnitario;
        const precioVenta = producto.precioVenta;
        const cantidad = producto.cantidad;
        const fecha = producto.fecha;
        
        const diffDays = Math.floor((new Date() - fecha) / (1000 * 60 * 60 * 24));
        const esHueso = diffDays > 15;
        const esEstrella = precioVenta > 0 && (precioVenta - costoUnitario) / costoUnitario > 0.3;
        
        const inventarioData = {
          producto: nombre,
          costoUnitario,
          costoTotal: costoUnitario * cantidad,
          precioVenta: precioVenta || null,
          fechaActualizacion: new Date(),
          fechaRegistro: fecha,
          userId: usuarioActual.uid,
          clasificacion: esEstrella ? 'ESTRELLA' : (esHueso ? 'HUESO' : 'NORMAL'),
          diasSinVenta: esHueso ? diffDays : 0,
          procesadoPor: 'massive_upload_validated'
        };
        
        if (accion === 'crear_nuevo') {
          // Crear nuevo producto
          inventarioData.cantidad = cantidad;
          const newDocRef = doc(inventarioCollection);
          batch.set(newDocRef, inventarioData);
          resultados.nuevosAgregados++;
          
        } else if (accion === 'actualizar' && producto.existente) {
          // Actualizar existente (sumar cantidad)
          const existente = producto.existente;
          const nuevaCantidad = (existente.cantidad || 0) + cantidad;
          const nuevoCostoTotal = (existente.costoTotal || 0) + (costoUnitario * cantidad);
          const nuevoCostoUnitario = nuevoCostoTotal / nuevaCantidad;
          
          inventarioData.cantidad = nuevaCantidad;
          inventarioData.costoTotal = nuevoCostoTotal;
          inventarioData.costoUnitario = nuevoCostoUnitario;
          
          const docRef = doc(db, 'inventario', existente.id);
          batch.update(docRef, inventarioData);
          resultados.existentesActualizados++;
        }
        
        batchCount++;
        
        // Commit cada 500 operaciones
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
        
      } catch (err) {
        resultados.errores++;
        console.error('Error procesando producto:', producto.nombre, err);
      }
      
      procesados++;
      setProgress({ current: procesados, total });
    }
    
    // Commit último batch si quedó pendiente
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Contar ignorados
    resultados.ignorados = productosEnConflicto.filter(p => p.decision === 'ignorar').length;
    
    setIsProcessing(false);
    
    const mensaje = `✅ Carga completada: ${resultados.nuevosAgregados} nuevos, ${resultados.existentesActualizados} actualizados, ${resultados.ignorados} ignorados, ${resultados.errores} errores`;
    onComplete?.({
      ...resultados,
      mensaje,
      totalProcesados: allProductsToProcess.length
    });
    
    // Resetear estado
    setFase('upload');
    setFullData([]);
    setPreviewData([]);
    setProductosNuevos([]);
    setProductosEnConflicto([]);
    setColumnMapping({
      nombre: '',
      costo: '',
      precio: '',
      fecha: '',
      cantidad: ''
    });
    
  }, [productosNuevos, productosEnConflicto, usuarioActual, onComplete, onError]);

  // Renderizar lista de conflictos para decisión individual
  const renderConflictosLista = () => {
    return (
      <div className="mb-6">
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 mb-4">
          <h4 className="text-yellow-400 font-bold flex items-center gap-2">
            ⚠️ {productosEnConflicto.length} producto(s) ya existen en tu inventario
          </h4>
          <p className="text-gray-300 text-sm mt-1">
            Por favor, decide qué hacer con cada uno:
          </p>
        </div>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {productosEnConflicto.map((producto, idx) => (
            <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div className="flex-1">
                  <p className="font-bold text-white text-lg">{producto.nombre}</p>
                  <p className="text-sm text-gray-400">
                    Costo: {formatearValor(producto.costoUnitario)} | 
                    Cantidad CSV: {producto.cantidad} | 
                    {producto.precioVenta > 0 && ` Precio: ${formatearValor(producto.precioVenta)}`}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-2 text-center min-w-[150px]">
                  <p className="text-xs text-gray-400">Inventario actual</p>
                  <p className="text-sm font-bold text-cyan-400">
                    {producto.existente.cantidad} unidades
                  </p>
                  <p className="text-xs text-gray-500">
                    Costo: {formatearValor(producto.existente.costoUnitario)}
                  </p>
                </div>
              </div>
              
              <p className="text-yellow-300 text-sm mb-3 italic">
                💬 "He notado que "{producto.nombre}" ya existe en tu inventario con {producto.existente.cantidad} unidades. ¿Qué deseas hacer?"
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => actualizarDecision(idx, 'ignorar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    producto.decision === 'ignorar'
                      ? 'bg-gray-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🚫 Ignorar (no subir)
                </button>
                <button
                  onClick={() => actualizarDecision(idx, 'crear_nuevo')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    producto.decision === 'crear_nuevo'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50 border border-emerald-500/30'
                  }`}
                >
                  ✨ Aprobar como nuevo producto
                </button>
                <button
                  onClick={() => actualizarDecision(idx, 'actualizar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    producto.decision === 'actualizar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 border border-blue-500/30'
                  }`}
                >
                  🔄 Actualizar existente (sumar {producto.cantidad} unidades)
                </button>
              </div>
              
              {producto.decision && (
                <p className="text-xs text-green-400 mt-2">
                  ✅ Decisión tomada: {
                    producto.decision === 'ignorar' ? 'Producto ignorado' :
                    producto.decision === 'crear_nuevo' ? 'Se creará como nuevo producto' :
                    'Se actualizará el stock existente'
                  }
                </p>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              // Marcar todos los conflictos como ignorar
              productosEnConflicto.forEach((_, idx) => {
                actualizarDecision(idx, 'ignorar');
              });
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-all"
          >
            Ignorar todos
          </button>
          <button
            onClick={() => {
              // Marcar todos los conflictos como actualizar
              productosEnConflicto.forEach((_, idx) => {
                actualizarDecision(idx, 'actualizar');
              });
            }}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm font-medium transition-all"
          >
            Actualizar todos
          </button>
        </div>
      </div>
    );
  };

  // Renderizar resumen de productos nuevos
  const renderProductosNuevos = () => {
    if (productosNuevos.length === 0) return null;
    
    return (
      <div className="mb-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
        <h4 className="text-emerald-400 font-bold flex items-center gap-2">
          ✨ {productosNuevos.length} producto(s) nuevo(s) detectados
        </h4>
        <div className="flex flex-wrap gap-2 mt-2">
          {productosNuevos.slice(0, 10).map((p, idx) => (
            <span key={idx} className="text-xs bg-emerald-800/30 px-2 py-1 rounded-full text-emerald-300">
              {p.nombre}
            </span>
          ))}
          {productosNuevos.length > 10 && (
            <span className="text-xs text-gray-400">+{productosNuevos.length - 10} más</span>
          )}
        </div>
        <p className="text-xs text-emerald-300 mt-2">
          ✅ Estos productos se agregarán automáticamente al inventario.
        </p>
      </div>
    );
  };

  // Fase: Subida y mapeo de columnas
  if (fase === 'upload') {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          📤 Carga Masiva de Inventario
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Sube un archivo CSV con columnas: Nombre, Costo, Precio (opcional), Cantidad (opcional), Fecha (opcional)
        </p>
        <p className="text-gray-500 text-xs mb-4">
          💡 El sistema detectará automáticamente productos duplicados y te permitirá decidir individualmente.
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="mb-4 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
        />

        {csvHeaders.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Mapear columnas:</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select 
                value={columnMapping.nombre}
                onChange={(e) => setColumnMapping({ ...columnMapping, nombre: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">→ Nombre del producto *</option>
                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select 
                value={columnMapping.costo}
                onChange={(e) => setColumnMapping({ ...columnMapping, costo: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">→ Costo unitario *</option>
                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select 
                value={columnMapping.precio}
                onChange={(e) => setColumnMapping({ ...columnMapping, precio: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">→ Precio venta</option>
                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select 
                value={columnMapping.cantidad}
                onChange={(e) => setColumnMapping({ ...columnMapping, cantidad: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">→ Cantidad (default: 1)</option>
                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select 
                value={columnMapping.fecha}
                onChange={(e) => setColumnMapping({ ...columnMapping, fecha: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">→ Fecha registro</option>
                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}

        {previewData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Vista previa (primeras 5 filas):</h4>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    {csvHeaders.map(h => <th key={h} className="p-2 text-left font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t border-slate-700">
                      {csvHeaders.map(h => <td key={h} className="p-2 truncate max-w-[150px]" title={row[h]}>{row[h] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fullData.length > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                + {fullData.length - 5} filas más (serán validadas individualmente)
              </p>
            )}
          </div>
        )}

        <button
          onClick={realizarEscaneoInicial}
          disabled={!columnMapping.nombre || !columnMapping.costo || fullData.length === 0 || isValidating}
          className={`w-full py-3 rounded-xl font-bold transition-all ${
            !columnMapping.nombre || !columnMapping.costo || fullData.length === 0 || isValidating
              ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
          }`}
        >
          {isValidating 
            ? '🔍 Escaneando inventario...' 
            : fullData.length === 0 
              ? '📁 Selecciona un archivo CSV primero'
              : `🔍 Validar ${fullData.length} productos contra inventario`}
        </button>
      </div>
    );
  }

  // Fase: Resolución de conflictos
  if (fase === 'resolving') {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🔍 Validación de Inventario - Revisión Manual
        </h3>
        
        {renderProductosNuevos()}
        {renderConflictosLista()}
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setFase('upload')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all"
          >
            ← Volver atrás
          </button>
          <button
            onClick={ejecutarCargaFinal}
            disabled={productosEnConflicto.some(p => !p.decisionTomada)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              productosEnConflicto.some(p => !p.decisionTomada)
                ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
            }`}
          >
            ✅ Ejecutar Carga Final ({productosNuevos.length + productosEnConflicto.filter(p => p.decision !== 'ignorar').length} productos)
          </button>
        </div>
        
        {productosEnConflicto.some(p => !p.decisionTomada) && (
          <p className="text-center text-yellow-400 text-sm mt-4">
            ⚠️ Debes tomar una decisión para todos los productos en conflicto antes de continuar
          </p>
        )}
      </div>
    );
  }

  // Fase: Procesamiento final
  if (fase === 'processing') {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          ⏳ Procesando Carga Masiva
        </h3>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Subiendo productos a Firebase...</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
        
        <p className="text-center text-gray-400 text-sm">
          Por favor espera, no cierres esta ventana...
        </p>
      </div>
    );
  }

  return null;
};

export default MassiveUpload;

