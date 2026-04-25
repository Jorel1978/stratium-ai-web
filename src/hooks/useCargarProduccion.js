// hooks/useCargarProduccion.js
// Módulo de carga de producción atómica - Stratium AI v2.3

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

export const useCargarProduccion = (usuarioActual) => {
  
  const cargarAInventario = useCallback(async (
    produccion,
    costeoResultado,
    setProduccion,
    setCosteoResultado,
    setValidationMessage,
    setError,
    setCargandoInventario,
    setInventario,
    setMovimientos
  ) => {
    if (!usuarioActual?.uid) {
      setError('Debes iniciar sesión para guardar datos');
      return false;
    }
    
    if (!costeoResultado || !produccion.productoNombre) {
      setError('Complete el nombre del producto y calcule el costo primero');
      return false;
    }
    
    setCargandoInventario(true);
    
    try {
      const productoNombre = produccion.productoNombre.trim();
      const unidades = 1;
      const costoUnitario = costeoResultado.costoUnitario;
      const costoTotal = costoUnitario * unidades;
      
      let resultado = null;
      
      await runTransaction(db, async (transaction) => {
        // ============================================================
        // 1. BUSCAR O CREAR PRODUCTO EN INVENTARIO
        // ============================================================
        
        let inventarioRef = null;
        let inventarioSnap = null;
        let productoData = null;
        let esProductoNuevo = false;
        
        const inventarioQuery = query(
          collection(db, 'inventario'),
          where('producto', '==', productoNombre),
          where('userId', '==', usuarioActual.uid)
        );
        const snapshot = await getDocs(inventarioQuery);
        
        if (!snapshot.empty) {
          inventarioRef = snapshot.docs[0].ref;
          inventarioSnap = await transaction.get(inventarioRef);
          productoData = inventarioSnap.data();
        } else {
          inventarioRef = doc(collection(db, 'inventario'));
          esProductoNuevo = true;
          productoData = {
            producto: productoNombre,
            cantidad: 0,
            costoUnitario: 0,
            costoTotal: 0,
            userId: usuarioActual.uid
          };
        }
        
        const cantidadActual = productoData.cantidad || 0;
        const costoTotalActual = productoData.costoTotal || 0;
        const nuevaCantidad = cantidadActual + unidades;
        const nuevoCostoTotal = costoTotalActual + costoTotal;
        const nuevoCostoUnitario = nuevaCantidad > 0 ? nuevoCostoTotal / nuevaCantidad : costoUnitario;
        
        // ============================================================
        // 2. ACTUALIZAR O CREAR INVENTARIO
        // ============================================================
        
        if (esProductoNuevo) {
          transaction.set(inventarioRef, {
            producto: productoNombre,
            cantidad: nuevaCantidad,
            costoUnitario: nuevoCostoUnitario,
            costoTotal: nuevoCostoTotal,
            userId: usuarioActual.uid,
            fechaActualizacion: serverTimestamp(),
            origen: 'produccion'
          });
        } else {
          transaction.update(inventarioRef, {
            cantidad: nuevaCantidad,
            costoUnitario: nuevoCostoUnitario,
            costoTotal: nuevoCostoTotal,
            fechaActualizacion: serverTimestamp()
          });
        }
        
        // ============================================================
        // 3. CREAR REGISTRO DE PRODUCCIÓN (CON PRODUCTO_ID)
        // ✅ CAPTURAR EL ID REAL ANTES DE SETEAR
        // ============================================================
        
        const registroRef = doc(collection(db, 'registros'));
        const nuevoRegistroId = registroRef.id;  // ← ID REAL de Firestore
        
        transaction.set(registroRef, {
          texto: `Producción: ${productoNombre}`,
          concepto: productoNombre,
          valor: costoTotal,
          tipo: 'inventario',
          categoria: 'PRODUCCION',
          emoji: '🏭',
          cantidad: unidades,
          costoUnitario: costoUnitario,
          productoId: inventarioRef.id,
          fecha: serverTimestamp(),
          userId: usuarioActual.uid
        });
        
        resultado = {
          inventarioId: inventarioRef.id,
          nuevoRegistroId: nuevoRegistroId,  // ✅ ID real del registro
          nuevaCantidad,
          nuevoCostoUnitario,
          nuevoCostoTotal
        };
      });
      
      // ============================================================
      // 4. ACTUALIZAR UI LOCALMENTE CON EL ID REAL
      // ============================================================
      
      // Actualizar inventario en el estado local
      setInventario(prevInventario => {
        const productoIndex = prevInventario.findIndex(
          i => i.producto === productoNombre
        );
        
        if (productoIndex >= 0) {
          const nuevoInventario = [...prevInventario];
          nuevoInventario[productoIndex] = {
            ...nuevoInventario[productoIndex],
            id: resultado.inventarioId,
            cantidad: resultado.nuevaCantidad,
            costoUnitario: resultado.nuevoCostoUnitario,
            costoTotal: resultado.nuevoCostoTotal,
            fechaActualizacion: new Date()
          };
          return nuevoInventario;
        } else {
          return [...prevInventario, {
            id: resultado.inventarioId,
            producto: productoNombre,
            cantidad: resultado.nuevaCantidad,
            costoUnitario: resultado.nuevoCostoUnitario,
            costoTotal: resultado.nuevoCostoTotal,
            userId: usuarioActual.uid,
            fechaActualizacion: new Date(),
            origen: 'produccion'
          }];
        }
      });
      
      // ✅ Agregar registro de producción con el ID REAL de Firestore
      const nuevoRegistro = {
        id: resultado.nuevoRegistroId,  // ← ID real, no Date.now()
        texto: `Producción: ${productoNombre}`,
        concepto: productoNombre,
        valor: costoTotal,
        tipo: 'inventario',
        categoria: 'PRODUCCION',
        emoji: '🏭',
        cantidad: unidades,
        costoUnitario: costoUnitario,
        productoId: resultado.inventarioId,
        fecha: new Date(),
        userId: usuarioActual.uid
      };
      setMovimientos(prev => [nuevoRegistro, ...prev]);
      
      // Limpiar formulario
      setProduccion({
        materiales: '',
        horas: '',
        valorHora: '',
        transporte: '',
        precioVenta: '',
        productoNombre: ''
      });
      setCosteoResultado(null);
      
      const mensajeExito = `✅ Producto "${productoNombre}" agregado al inventario.
━━━━━━━━━━━━━━━━━━━━━
📦 Stock actual: ${resultado.nuevaCantidad} unidades
💰 Costo unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(resultado.nuevoCostoUnitario)}
💰 Costo total: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(resultado.nuevoCostoTotal)}
📌 La producción NO afecta tu saldo de caja.`;
      
      setValidationMessage(mensajeExito);
      setTimeout(() => setValidationMessage(null), 6000);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error en producción atómica:', error);
      setError(`Error al cargar el producto: ${error.message}`);
      setTimeout(() => setError(null), 6000);
      return false;
    } finally {
      setCargandoInventario(false);
    }
  }, [usuarioActual]);
  
  return { cargarAInventario };
};

export default useCargarProduccion;
