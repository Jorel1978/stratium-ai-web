import React, { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { handleEscaneoDocumentos, registrarCompraEnRegistros, actualizarInventarioAcumulado } from '../util/ocrEngine';

const MassiveUpload = ({ usuarioActual, moneda, onComplete, onError }) => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, results: [] });
  
  const storage = getStorage();
  const db = getFirestore();

  // Calcular escaneos disponibles
  const escaneosDisponibles = (usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // ✅ VALIDACIÓN: Verificar que tenga suficientes escaneos
    if (escaneosDisponibles < selectedFiles.length) {
      const mensaje = `No tienes suficientes escaneos disponibles. Necesitas ${selectedFiles.length} pero solo tienes ${escaneosDisponibles}.`;
      alert(mensaje);
      if (onError) onError(new Error(mensaje));
      return;
    }
    
    setFiles(selectedFiles);
    setProgress({ current: 0, total: selectedFiles.length, results: [] });
  };

  const processFiles = async () => {
    // ✅ VALIDACIÓN ADICIONAL antes de procesar
    if (escaneosDisponibles < files.length) {
      const mensaje = `No tienes suficientes escaneos disponibles. Necesitas ${files.length} pero solo tienes ${escaneosDisponibles}.`;
      alert(mensaje);
      if (onError) onError(new Error(mensaje));
      return;
    }
    
    setProcessing(true);
    const results = [];
    let escaneosUsados = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Subir a Storage
        const storageRef = ref(storage, `facturas/${usuarioActual.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        // Procesar OCR
        const resultadoOCR = await handleEscaneoDocumentos(file, `escanea: factura ${file.name}`, moneda.codigo);
        
        if (resultadoOCR.success) {
          for (const producto of resultadoOCR.productosReventa) {
            await registrarCompraEnRegistros({
              concepto: producto.nombre,
              cantidad: producto.cantidad,
              valor_unitario_base: producto.precioUnitario,
              tax_item: producto.impuestoValor,
              flujo: 'INVENTARIO',
              tercero: resultadoOCR.proveedor,
              estado: resultadoOCR.estado,
              factura: resultadoOCR.factura,
              fecha: resultadoOCR.fecha,
              moneda: moneda.codigo
            }, db, usuarioActual.uid);
            
            await actualizarInventarioAcumulado(producto.nombre, producto.cantidad, producto.precioUnitario, db, usuarioActual.uid);
          }
          
          results.push({ file: file.name, success: true, message: resultadoOCR.mensaje });
          escaneosUsados++;
          
        } else {
          results.push({ file: file.name, success: false, message: resultadoOCR.mensaje });
        }
        
        await addDoc(collection(db, 'logsEscaneos'), {
          userId: usuarioActual.uid,
          fileName: file.name,
          fileUrl: url,
          fecha: serverTimestamp(),
          resultado: resultadoOCR.success ? 'exitoso' : 'fallido'
        });
        
      } catch (err) {
        results.push({ file: file.name, success: false, message: err.message });
      }
      
      setProgress({ current: i + 1, total: files.length, results });
    }
    
    // ✅ Actualizar créditos usados
    if (escaneosUsados > 0) {
      const nuevosCreditosUsados = (usuarioActual.creditosUsados || 0) + escaneosUsados;
      await updateDoc(doc(db, 'usuarios', usuarioActual.uid), {
        creditosUsados: nuevosCreditosUsados
      });
    }
    
    setProcessing(false);
    if (onComplete) onComplete(results);
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>📚</span> Carga Masiva de Documentos
      </h3>
      
      <div className="mb-4 flex justify-between items-center">
        <span className="text-gray-400 text-sm">
          Escaneos disponibles: <strong className={escaneosDisponibles > 0 ? 'text-green-400' : 'text-red-400'}>{escaneosDisponibles}</strong>
        </span>
        {escaneosDisponibles === 0 && (
          <span className="text-yellow-400 text-xs">⚠️ Sin escaneos. Compra un paquete adicional o mejora de plan.</span>
        )}
      </div>
      
      <div className="border-2 border-dashed border-blue-900/30 rounded-xl p-8 text-center">
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          disabled={processing || escaneosDisponibles === 0}
          className="hidden"
          id="massive-upload"
        />
        <label
          htmlFor="massive-upload"
          className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            escaneosDisponibles === 0
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400'
          }`}
        >
          <span>📎</span>
          Seleccionar Documentos (múltiples)
        </label>
        
        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-300 text-sm">{files.length} archivos seleccionados</p>
            <button
              onClick={processFiles}
              disabled={processing || escaneosDisponibles < files.length}
              className={`mt-3 px-6 py-2 font-bold rounded-lg transition-all ${
                processing || escaneosDisponibles < files.length
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
              }`}
            >
              {processing ? `Procesando ${progress.current}/${progress.total}...` : 'Procesar Todos'}
            </button>
          </div>
        )}
        
        {processing && (
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm mt-2">Procesando archivo {progress.current} de {progress.total}</p>
          </div>
        )}
        
        {progress.results.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto text-left">
            {progress.results.map((r, idx) => (
              <div key={idx} className={`text-xs p-1 ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                {r.file}: {r.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MassiveUpload;

