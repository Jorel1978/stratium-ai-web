// hooks/useDeleteTransaction.js
// Módulo de eliminación atómica de transacciones - Stratium AI v2.3

import { useCallback } from 'react';
import { db } from '../firebase';
import { 
  doc, 
  collection, 
  runTransaction, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export const useDeleteTransaction = (usuarioActual, puedeAccederAFuncion, formatearValor) => {
  
  const handleDelete = useCallback(async (id, movimientos, setMovimientos, setInventario, setUsuarioActual, setValidationMessage, setError, setLoading) => {
    if (!usuarioActual?.uid) {
      setError('No autenticado');
      return;
    }

    const registroAEliminar = movimientos.find(m => m.id === id);
    if (!registroAEliminar) {
      setError('Registro no encontrado');
      return;
    }

    const confirmMessage = `¿Eliminar este registro permanentemente?
━━━━━━━━━━━━━━━━━━━━━
📌 Concepto: ${registroAEliminar.concepto}
💰 Valor: ${formatearValor(registroAEliminar.valor || 0)}
📦 Cantidad: ${registroAEliminar.cantidad || 1}
🔄 Tipo: ${registroAEliminar.tipo === 'ingreso' ? 'Venta/Ingreso' : registroAEliminar.categoria === 'PRODUCCION' ? 'Producción' : 'Compra/Gasto'}
━━━━━━━━━━━━━━━━━━━━━
⚠️ Esta acción revertirá TODOS los efectos en:
• Saldo de caja
• Inventario (si aplica)
• Bitácora de auditoría

¿Deseas continuar?`;

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        // ============================================================
        // 1. LEER DOCUMENTOS ACTUALES
        // ============================================================
        
        const userRef = doc(db, 'usuarios', usuarioActual.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('Usuario no encontrado en Firestore');
        }
        const userData = userSnap.data();
        let nuevoSaldo = userData.saldoCaja || 0;

        let inventarioRef = null;
        let inventarioSnap = null;
        let productoData = null;
        let nuevaCantidad = 0;

        if (registroAEliminar.productoId) {
          inventarioRef = doc(db, 'inventario', registroAEliminar.productoId);
          inventarioSnap = await transaction.get(inventarioRef);
          if (inventarioSnap.exists()) {
            productoData = inventarioSnap.data();
            nuevaCantidad = productoData.cantidad;
          }
        } else if (registroAEliminar.concepto) {
          const inventarioQuery = query(
            collection(db, 'inventario'),
            where('producto', '==', registroAEliminar.concepto),
            where('userId', '==', usuarioActual.uid)
          );
          const snapshot = await getDocs(inventarioQuery);
          if (!snapshot.empty) {
            inventarioRef = snapshot.docs[0].ref;
            productoData = snapshot.docs[0].data();
            nuevaCantidad = productoData.cantidad;
          }
        }

        // ============================================================
        // 2. CALCULAR NUEVOS VALORES (REVERSIÓN)
        // ============================================================
        
        let ajusteSaldo = 0;
        let ajusteInventario = 0;
        let tipoMovimiento = '';

        if (registroAEliminar.tipo === 'ingreso') {
          ajusteSaldo = -registroAEliminar.valor;
          ajusteInventario = registroAEliminar.cantidad || 1;
          tipoMovimiento = 'VENTA';
        } 
        else if (registroAEliminar.tipo === 'egreso') {
          if (registroAEliminar.categoria === 'PRODUCCION') {
            ajusteSaldo = 0;
            ajusteInventario = -(registroAEliminar.cantidad || 1);
            tipoMovimiento = 'PRODUCCION';
          } else {
            ajusteSaldo = registroAEliminar.valor;
            ajusteInventario = -(registroAEliminar.cantidad || 1);
            tipoMovimiento = 'COMPRA';
          }
        }

        if (inventarioRef && ajusteInventario !== 0) {
          const nuevaCantidadFinal = nuevaCantidad + ajusteInventario;
          if (nuevaCantidadFinal < 0) {
            throw new Error(`Error de consistencia: El inventario de "${registroAEliminar.concepto}" quedaría negativo (${nuevaCantidadFinal}). No se puede eliminar este registro.`);
          }
        }

        if (ajusteSaldo !== 0) {
          const nuevoSaldoFinal = nuevoSaldo + ajusteSaldo;
          if (nuevoSaldoFinal < 0) {
            throw new Error(`Error de consistencia: El saldo de caja quedaría negativo (${formatearValor(nuevoSaldoFinal)}). No se puede eliminar este registro.`);
          }
        }

        // ============================================================
        // 3. ACTUALIZAR DOCUMENTOS DENTRO DE LA TRANSACCIÓN
        // ============================================================
        
        if (ajusteSaldo !== 0) {
          transaction.update(userRef, {
            saldoCaja: nuevoSaldo + ajusteSaldo
          });
        }

        if (inventarioRef && ajusteInventario !== 0) {
          transaction.update(inventarioRef, {
            cantidad: nuevaCantidad + ajusteInventario,
            fechaActualizacion: serverTimestamp()
          });
        }

        const registroRef = doc(db, 'registros', id);
        transaction.delete(registroRef);

        if (puedeAccederAFuncion('puedeVerLogs')) {
          const logRef = doc(collection(db, 'logsEliminaciones'));
          transaction.set(logRef, {
            userId: usuarioActual.uid,
            userEmail: usuarioActual.email,
            registroId: registroAEliminar.id,
            concepto: registroAEliminar.concepto,
            valor: registroAEliminar.valor,
            tipo: registroAEliminar.tipo,
            categoria: registroAEliminar.categoria,
            cantidad: registroAEliminar.cantidad || 1,
            productoId: registroAEliminar.productoId || null,
            fechaRegistroOriginal: registroAEliminar.fecha,
            fechaEliminacion: serverTimestamp(),
            accionReversada: `Saldo: ${ajusteSaldo > 0 ? '+' : ''}${ajusteSaldo}, Inventario: ${ajusteInventario > 0 ? '+' : ''}${ajusteInventario}`,
            tipoMovimiento: tipoMovimiento,
            ip: 'client-side'
          });
        }
      });

      // ============================================================
      // 4. ACTUALIZAR UI LOCALMENTE
      // ============================================================
      
      setMovimientos(prevMovimientos => prevMovimientos.filter(m => m.id !== id));
      
      if (registroAEliminar.concepto) {
        setInventario(prevInventario => {
          const productoIndex = prevInventario.findIndex(
            i => i.producto === registroAEliminar.concepto
          );
          if (productoIndex >= 0) {
            const nuevoInventario = [...prevInventario];
            let ajuste = 0;
            if (registroAEliminar.tipo === 'ingreso') {
              ajuste = registroAEliminar.cantidad || 1;
            } else if (registroAEliminar.tipo === 'egreso') {
              ajuste = -(registroAEliminar.cantidad || 1);
            }
            nuevoInventario[productoIndex] = {
              ...nuevoInventario[productoIndex],
              cantidad: (nuevoInventario[productoIndex].cantidad || 0) + ajuste
            };
            return nuevoInventario;
          }
          return prevInventario;
        });
      }
      
      let ajusteSaldoUI = 0;
      if (registroAEliminar.tipo === 'ingreso') {
        ajusteSaldoUI = -registroAEliminar.valor;
      } else if (registroAEliminar.tipo === 'egreso') {
        if (registroAEliminar.categoria !== 'PRODUCCION') {
          ajusteSaldoUI = registroAEliminar.valor;
        }
      }
      
      if (ajusteSaldoUI !== 0) {
        setUsuarioActual(prev => ({
          ...prev,
          saldoCaja: (prev?.saldoCaja || 0) + ajusteSaldoUI
        }));
      }

      const mensajeExito = `✅ Registro eliminado exitosamente.
━━━━━━━━━━━━━━━━━━━━━
📌 Concepto: ${registroAEliminar.concepto}
💰 Valor: ${formatearValor(registroAEliminar.valor || 0)}
🔄 Se revirtieron todos los efectos en saldo e inventario.
📋 La eliminación quedó registrada en la bitácora de auditoría.`;
      
      setValidationMessage(mensajeExito);
      setTimeout(() => setValidationMessage(null), 6000);

    } catch (error) {
      console.error('❌ Error en transacción de eliminación:', error);
      
      let errorMsg = 'Error al eliminar el registro. No se completó la reversión.';
      if (error.message.includes('inventario quedaría negativo')) {
        errorMsg = `❌ ${error.message}`;
      } else if (error.message.includes('saldo de caja quedaría negativo')) {
        errorMsg = `❌ ${error.message}`;
      } else if (error.message.includes('permiso')) {
        errorMsg = '❌ No tienes permisos para eliminar este registro.';
      }
      
      setError(errorMsg);
      setTimeout(() => setError(null), 6000);
    } finally {
      setLoading(false);
    }
  }, [usuarioActual, puedeAccederAFuncion, formatearValor]);

  return { handleDelete };
};

export default useDeleteTransaction;

