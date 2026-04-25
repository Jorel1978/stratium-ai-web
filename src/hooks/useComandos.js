import { useState, useCallback } from 'react';
import { addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { registrosCollection, inventarioCollection, db } from '../services/firebase';
import { parseNumberInternational } from '../util/formatters';
import { auditarOperacion } from '../logic/logicEngine';

export function useComandos(usuarioActual, movimientos, setMovimientos, setValidationMessage, setError) {
  const [inputValue, setInputValue] = useState('');

  const validarStockDisponible = useCallback((producto, cantidadSolicitada, inventario) => {
    const itemInventario = inventario.find(i =>
      i.producto?.toLowerCase().includes(producto.toLowerCase()) ||
      producto.toLowerCase().includes(i.producto?.toLowerCase() || '')
    );
    if (!itemInventario) throw new Error(`Producto "${producto}" no existe en inventario`);
    if (itemInventario.cantidad < cantidadSolicitada) {
      throw new Error(`Stock insuficiente: disponible ${itemInventario.cantidad}, solicitado ${cantidadSolicitada}`);
    }
    return true;
  }, []);

  const procesarComando = useCallback(async (texto, inventarioActual) => {
    if (!usuarioActual?.uid) return { tipo: 'error', mensaje: 'No autenticado' };
    
    const textoLower = texto.toLowerCase();
    
    // Comandos especiales
    if (textoLower.includes('genera: reporte') || textoLower.includes('genera reporte')) {
      return { tipo: 'reporte', mensaje: 'Generando reporte...' };
    }
    
    // Compras
    if (textoLower.includes('compra') || textoLower.includes('purchase')) {
      const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
      let valor = 0, cantidad = 1;
      if (numeros && numeros.length >= 2) {
        cantidad = parseNumberInternational(numeros[0]);
        valor = parseNumberInternational(numeros[numeros.length - 1]);
      } else if (numeros) valor = parseNumberInternational(numeros[0]);
      
      let concepto = texto.replace(/^(registra:?|compra|purchase)/i, '').trim();
      concepto = concepto.replace(/\d+(?:[.,]\d+)*/g, '').trim();
      if (concepto.length > 50) concepto = concepto.substring(0, 50);
      
      await addDoc(registrosCollection, {
        texto, concepto, valor, cantidad,
        tipo: 'egreso', categoria: 'Compra', emoji: '📦',
        costoUnitario: valor / cantidad,
        fecha: serverTimestamp(), userId: usuarioActual.uid
      });
      
      // Actualizar inventario
      const q = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(inventarioCollection, {
          producto: concepto, cantidad, costoUnitario: valor / cantidad,
          costoTotal: valor, fechaActualizacion: serverTimestamp(), userId: usuarioActual.uid
        });
      } else {
        const docInv = snap.docs[0];
        const data = docInv.data();
        const nuevaCantidad = data.cantidad + cantidad;
        const nuevoCostoTotal = (data.cantidad * data.costoUnitario) + valor;
        await updateDoc(doc(db, 'inventario', docInv.id), {
          cantidad: nuevaCantidad,
          costoUnitario: nuevoCostoTotal / nuevaCantidad,
          costoTotal: nuevoCostoTotal
        });
      }
      return { tipo: 'exito', mensaje: `Compra registrada: ${cantidad}x ${concepto} por $${valor.toLocaleString()}` };
    }
    
    // Ventas
    if (textoLower.includes('venta') || textoLower.includes('sale')) {
      const matchCantidad = texto.match(/(\d+)\s+(?:unidades?|items?)/i);
      const cantidad = matchCantidad ? parseInt(matchCantidad[1]) : 1;
      const numeros = texto.match(/\d+(?:[.,]\d+)*(?:[.,]\d{1,2})?/g);
      let valor = numeros ? parseNumberInternational(numeros[numeros.length - 1]) : 0;
      
      let concepto = texto.replace(/^(venta|sale)/i, '').trim();
      concepto = concepto.replace(/\d+(?:[.,]\d+)*/g, '').replace(/por\s+\d+.*/i, '').trim();
      
      validarStockDisponible(concepto, cantidad, inventarioActual);
      
      await addDoc(registrosCollection, {
        texto, concepto, valor, cantidad, tipo: 'ingreso', categoria: 'Venta', emoji: '💰',
        costoUnitario: valor / cantidad, fecha: serverTimestamp(), userId: usuarioActual.uid
      });
      
      const q = query(inventarioCollection, where('producto', '==', concepto), where('userId', '==', usuarioActual.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docInv = snap.docs[0];
        const data = docInv.data();
        await updateDoc(doc(db, 'inventario', docInv.id), { cantidad: data.cantidad - cantidad });
      }
      return { tipo: 'exito', mensaje: `Venta registrada: ${cantidad}x ${concepto} por $${valor.toLocaleString()}` };
    }
    
    return null;
  }, [usuarioActual]);

  const handleSubmit = useCallback(async (e, inventarioActual) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const resultado = await procesarComando(inputValue, inventarioActual);
    if (resultado) {
      if (resultado.tipo === 'exito') setValidationMessage(resultado.mensaje);
      else if (resultado.tipo === 'error') setError(resultado.mensaje);
      setTimeout(() => { setValidationMessage(null); setError(null); }, 5000);
      setInputValue('');
    }
  }, [inputValue, procesarComando, setValidationMessage, setError]);

  return { inputValue, setInputValue, handleSubmit, procesarComando };
}

