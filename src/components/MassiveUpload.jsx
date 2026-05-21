// src/components/MassiveUpload.jsx
// Motor de Procesamiento Masivo de Facturas XML - Stratium AI
// Optimizado para batch processing con control de concurrencia
// ✅ VERSIÓN CORREGIDA - ENFOQUE NETO DE CAJA (SIN IMPUESTOS)
// ✅ CORRECCIÓN: Totales antibalas con limpieza de caracteres
// ✅ CORRECCIÓN: Input accept ampliado para mayúsculas .XML

import React, { useState, useCallback } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { processUBLAudit } from '../services/ublProcessor';
import { registrarCompraEnRegistros, actualizarInventarioAcumulado } from '../util/ocrEngine';

// ============================================================
// CONFIGURACIÓN DEL MOTOR
// ============================================================
const BATCH_SIZE = 5;
const CREDITOS_POR_XML = 1;
const MAX_FILE_SIZE_MB = 10;

// ============================================================
// UTILIDADES
// ============================================================

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error(`Error leyendo ${file.name}: ${e.target.error?.message}`));
    reader.readAsText(file);
  });
};

const validateXMLFile = (file) => {
  const errors = [];
  if (!file.name.toLowerCase().endsWith('.xml')) {
    errors.push('Formato no soportado. Use archivos .xml');
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    errors.push(`Archivo muy grande. Máximo ${MAX_FILE_SIZE_MB}MB`);
  }
  return errors;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const MassiveUpload = ({ usuarioActual, moneda, onComplete, onError }) => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ 
    current: 0, 
    total: 0, 
    results: [],
    batch: 0 
  });
  
  const storage = getStorage();
  const db = getFirestore();

  const escaneosDisponibles = (usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0);

  // ============================================================
  // MANEJO DE SELECCIÓN DE ARCHIVOS
  // ============================================================
  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const validated = [];
    const rejected = [];
    
    selectedFiles.forEach(file => {
      const errors = validateXMLFile(file);
      if (errors.length === 0) {
        validated.push(file);
      } else {
        rejected.push({ file: file.name, errors });
      }
    });
    
    const creditosNecesarios = validated.length * CREDITOS_POR_XML;
    if (escaneosDisponibles < creditosNecesarios) {
      const mensaje = `No tienes suficientes créditos. Necesitas ${creditosNecesarios} pero solo tienes ${escaneosDisponibles}.`;
      alert(mensaje);
      if (onError) onError(new Error(mensaje));
      return;
    }
    
    if (rejected.length > 0) {
      alert(`⚠️ ${rejected.length} archivo(s) rechazados:\n${rejected.map(r => `${r.file}: ${r.errors.join(', ')}`).join('\n')}`);
    }
    
    setFiles(validated);
    setProgress({ current: 0, total: validated.length, results: [], batch: 0 });
    e.target.value = null;
  }, [escaneosDisponibles, onError]);

  // ============================================================
  // PROCESAMIENTO DE UN SOLO XML (ENFOQUE NETO DE CAJA)
  // ============================================================
  const processSingleXML = useCallback(async (file, fileIndex) => {
    const result = { 
      file: file.name, 
      index: fileIndex,
      success: false, 
      message: '',
      productsProcessed: 0,
      errors: []
    };
    
    try {
      const xmlContent = await readFileAsText(file);
      
      const auditResult = processUBLAudit(xmlContent, usuarioActual?.uid, {
        language: 'es',
        includeLineItems: true
      });
      
      if (!auditResult.success) {
        throw new Error(auditResult.error || 'Error procesando documento UBL');
      }
      
      const { document, parties, totals, items = [], audit: auditMeta } = auditResult;
      const proveedor = document.operationType === 'PURCHASE' 
        ? parties.supplier?.name 
        : parties.customer?.name;
      
      const storageRef = ref(storage, `facturas_xml/${usuarioActual?.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, new Blob([xmlContent], { type: 'application/xml' }));
      const fileUrl = await getDownloadURL(storageRef);
      
      let productsCount = 0;
      for (const item of items) {
        try {
          await registrarCompraEnRegistros({
            concepto: item.description,
            cantidad: item.quantity,
            valor_unitario_base: item.pricing?.unitPrice || 0,
            tax_item: 0,
            flujo: 'INVENTARIO',
            tercero: proveedor,
            estado: 'ACTIVO',
            factura: document.id,
            fecha: document.issueDate,
            moneda: document.currency,
            origen: 'xml_ubl',
            auditFlags: item.audit?.isAnomaly ? ['ANOMALIA_PRECIO'] : []
          }, db, usuarioActual?.uid);
          
          await actualizarInventarioAcumulado(
            item.description,
            item.quantity,
            item.pricing?.unitPrice || 0,
            db,
            usuarioActual?.uid
          );
          
          productsCount++;
        } catch (itemError) {
          result.errors.push(`Producto "${item.description}": ${itemError.message}`);
          console.warn(`Error procesando ítem ${item.id}:`, itemError);
        }
      }
      
      // ✅ METADATA CON TOTALES ANTIBALAS (LIMPIEZA DE CARACTERES)
      await addDoc(collection(db, 'facturasProcesadas'), {
        userId: usuarioActual?.uid,
        documentId: document.id,
        documentType: document.type,
        issueDate: document.issueDate,
        operationType: document.operationType,
        currency: document.currency,
        supplier: parties.supplier,
        customer: parties.customer,
        totals: {
          subtotal: totals.payableAmount ? Number(String(totals.payableAmount).replace(/[^0-9.-]/g, '')) : (totals.subtotal ? Number(String(totals.subtotal).replace(/[^0-9.-]/g, '')) : 0),
          taxes: 0,
          payableAmount: totals.payableAmount ? Number(String(totals.payableAmount).replace(/[^0-9.-]/g, '')) : 0
        },
        itemsCount: items.length,
        productsRegistered: productsCount,
        auditFlags: auditMeta?.alerts || [],
        fileUrl,
        fileName: file.name,
        processedAt: serverTimestamp(),
        creditosConsumidos: CREDITOS_POR_XML
      });
      
      result.success = true;
      result.message = `✅ ${productsCount} productos registrados`;
      result.productsProcessed = productsCount;
      result.summary = {
        subtotal: totals.payableAmount,
        total: totals.payableAmount,
        taxBreakdown: {}
      };
      
      if (auditMeta?.alerts?.length > 0) {
        result.warnings = auditMeta.alerts;
      }
      
    } catch (error) {
      result.success = false;
      result.message = `❌ ${error.message}`;
      result.errors.push(error.message);
      console.error(`Error procesando ${file.name}:`, error);
    }
    
    return result;
  }, [usuarioActual, db, storage]);

  // ============================================================
  // PROCESAMIENTO EN LOTES
  // ============================================================
  const processFiles = useCallback(async () => {
    if (files.length === 0) return;
    
    const creditosNecesarios = files.length * CREDITOS_POR_XML;
    if (escaneosDisponibles < creditosNecesarios) {
      const mensaje = `No tienes suficientes créditos. Necesitas ${creditosNecesarios} pero solo tienes ${escaneosDisponibles}.`;
      alert(mensaje);
      if (onError) onError(new Error(mensaje));
      return;
    }
    
    setProcessing(true);
    const allResults = [];
    let creditosUsados = 0;
    
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
      const batchIndex = Math.floor(batchStart / BATCH_SIZE) + 1;
      
      setProgress(prev => ({ ...prev, batch: batchIndex }));
      
      const batchPromises = batch.map((file, idx) => 
        processSingleXML(file, batchStart + idx)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        allResults.push(result);
        if (result.success) {
          creditosUsados += CREDITOS_POR_XML;
        }
      });
      
      setProgress(prev => ({
        current: Math.min(batchStart + batch.length, files.length),
        total: files.length,
        results: [...allResults],
        batch: batchIndex
      }));
      
      if (batchStart + BATCH_SIZE < files.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    if (creditosUsados > 0) {
      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'usuarios', usuarioActual?.uid);
          const userDoc = await transaction.get(userRef);
          
          if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado');
          }
          
          const currentUsed = userDoc.data().creditosUsados || 0;
          transaction.update(userRef, {
            creditosUsados: currentUsed + creditosUsados,
            lastCreditUpdate: serverTimestamp()
          });
        });
      } catch (err) {
        console.error('Error actualizando créditos:', err);
        allResults.push({
          file: 'SISTEMA',
          success: false,
          message: '⚠️ Error actualizando créditos. Contacte soporte.'
        });
      }
    }
    
    setProcessing(false);
    
    if (onComplete) {
      onComplete({
        total: files.length,
        successful: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length,
        productsRegistered: allResults.reduce((sum, r) => sum + (r.productsProcessed || 0), 0),
        creditosConsumidos: creditosUsados,
        results: allResults
      });
    }
    
  }, [files, usuarioActual, db, escaneosDisponibles, processSingleXML, onComplete, onError]);

  // ============================================================
  // RENDERIZADO DE RESULTADOS
  // ============================================================
  const renderResults = () => {
    if (progress.results.length === 0) return null;
    
    const successful = progress.results.filter(r => r.success);
    const failed = progress.results.filter(r => !r.success);
    
    return (
      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
        {successful.length > 0 && (
          <div className="text-green-400 text-xs">
            ✅ {successful.length} procesados correctamente:
            {successful.slice(0, 3).map((r, i) => (
              <div key={i} className="ml-2">• {r.file}: {r.productsProcessed} productos</div>
            ))}
            {successful.length > 3 && <div className="ml-2">... y {successful.length - 3} más</div>}
          </div>
        )}
        
        {failed.length > 0 && (
          <div className="text-red-400 text-xs">
            ❌ {failed.length} con errores:
            {failed.slice(0, 3).map((r, i) => (
              <div key={i} className="ml-2">• {r.file}: {r.message}</div>
            ))}
            {failed.length > 3 && <div className="ml-2">... y {failed.length - 3} más</div>}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // UI PRINCIPAL
  // ============================================================
  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8 border border-blue-900/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>📄</span> Procesador Masivo de Facturas XML
      </h3>
      
      <div className="mb-4 flex justify-between items-center text-sm">
        <span className="text-gray-400">
          Créditos disponibles: <strong className={escaneosDisponibles > 0 ? 'text-green-400' : 'text-red-400'}>{escaneosDisponibles}</strong>
        </span>
        <span className="text-gray-500">
          Costo: {CREDITOS_POR_XML} crédito por factura XML
        </span>
        {escaneosDisponibles === 0 && (
          <span className="text-yellow-400">⚠️ Sin créditos disponibles</span>
        )}
      </div>
      
      <div className="border-2 border-dashed border-blue-900/30 rounded-xl p-8 text-center">
        {/* ✅ INPUT CORREGIDO: acepta .xml y .XML */}
        <input
          type="file"
          multiple
          accept=".xml,.XML,text/xml,application/xml"
          onChange={handleFileSelect}
          disabled={processing || escaneosDisponibles === 0}
          className="hidden"
          id="massive-xml-upload"
        />
        <label
          htmlFor="massive-xml-upload"
          className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            escaneosDisponibles === 0 || processing
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400'
          }`}
        >
          <span>📎</span>
          Seleccionar Facturas XML (múltiples)
        </label>
        
        {files.length > 0 && !processing && (
          <div className="mt-4 text-left">
            <p className="text-gray-300 text-sm mb-2">
              📋 {files.length} archivo(s) seleccionado(s) • {files.length * CREDITOS_POR_XML} crédito(s) requerido(s)
            </p>
            <ul className="text-xs text-gray-400 max-h-20 overflow-y-auto mb-3">
              {files.slice(0, 5).map((f, i) => (
                <li key={i}>• {f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
              ))}
              {files.length > 5 && <li>... y {files.length - 5} más</li>}
            </ul>
            <button
              onClick={processFiles}
              disabled={processing || escaneosDisponibles < files.length * CREDITOS_POR_XML}
              className={`w-full px-6 py-2 font-bold rounded-lg transition-all ${
                processing || escaneosDisponibles < files.length * CREDITOS_POR_XML
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
              }`}
            >
              🚀 Procesar {files.length} Factura(s)
            </button>
          </div>
        )}
        
        {processing && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Lote {progress.batch} • Archivo {progress.current}/{progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Procesando en lotes de {BATCH_SIZE} para optimizar rendimiento...
            </p>
          </div>
        )}
        
        {renderResults()}
      </div>
      
      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-xs text-gray-400">
        <p>💡 <strong>Requisitos del XML:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Formato UBL 2.1 estándar (Factura Electrónica)</li>
          <li>Debe incluir cac:AccountingSupplierParty y cac:AccountingCustomerParty</li>
          <li>Los productos se extraen de cac:InvoiceLine</li>
          <li>Se valida contra histórico de precios para detectar anomalías</li>
        </ul>
      </div>
    </div>
  );
};

export default MassiveUpload;

