// src/hooks/useEstrellaHueso.js
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// ============================================
// 🌍 CONFIGURACIÓN GLOBAL DE SALARIOS
// ============================================
const SALARIOS_MINIMOS_HORA = {
  'CO': 5800,   // Colombia - COP/hora
  'US': 7.25,   // USA - USD/hora
  'UK': 11.44,  // Reino Unido - GBP/hora
  'ES': 8.45,   // España - EUR/hora
  'MX': 45.00,  // México - MXN/hora
  'CA': 15.00,  // Canadá - CAD/hora
  'AU': 23.23,  // Australia - AUD/hora
  'CL': 3500,   // Chile - CLP/hora
  'PE': 10.50,  // Perú - PEN/hora
  'AR': 1200,   // Argentina - ARS/hora
  'default': 10.0  // USD/hora estándar global
};

const MONEDA_POR_PAIS = {
  'CO': 'COP', 'US': 'USD', 'UK': 'GBP', 'ES': 'EUR',
  'MX': 'MXN', 'CA': 'CAD', 'AU': 'AUD', 'CL': 'CLP',
  'PE': 'PEN', 'AR': 'ARS', 'default': 'USD'
};

// ============================================
// 🔹 FUNCIÓN PRINCIPAL: Calcular clasificación
// ============================================
const calcularClasificacionProducto = (producto, valorHora = null, pais = 'default') => {
  // Validación mínima
  if (!producto.precioVenta || producto.precioVenta <= 0) {
    return {
      clasificacion: 'NEUTRO',
      velocidadRetorno: 0,
      margenAbsoluto: 0,
      diasEnStock: 0,
      tiempoProduccionDias: 0,
      razon: 'Sin precio de venta'
    };
  }

  // 1. Calcular Margen Absoluto
  const costoTotal = (producto.precioCompra || 0) + (producto.costoManoObra || 0);
  const margenAbsoluto = producto.precioVenta - costoTotal;

  // 2. Calcular Días en Stock
  let diasEnStock = 0;
  if (producto.fechaRegistro) {
    const fechaRegistro = producto.fechaRegistro.toDate ? producto.fechaRegistro.toDate() : new Date(producto.fechaRegistro);
    diasEnStock = Math.max(0, Math.floor((Date.now() - fechaRegistro.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (producto.fechaCompra) {
    const fechaCompra = producto.fechaCompra.toDate ? producto.fechaCompra.toDate() : new Date(producto.fechaCompra);
    diasEnStock = Math.max(0, Math.floor((Date.now() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // 3. Obtener valor hora efectivo
  let valorHoraEfectivo = valorHora;
  if (!valorHoraEfectivo || valorHoraEfectivo <= 0) {
    valorHoraEfectivo = SALARIOS_MINIMOS_HORA[pais] || SALARIOS_MINIMOS_HORA.default;
  }

  // 4. Calcular Horas de Producción
  const horasProduccion = (valorHoraEfectivo > 0 && producto.costoManoObra) 
    ? producto.costoManoObra / valorHoraEfectivo 
    : 0;
  const tiempoProduccionDias = horasProduccion / 8; // 8 horas por día laboral

  // 5. Calcular Velocidad de Retorno
  const divisor = diasEnStock + tiempoProduccionDias;
  let velocidadRetorno = 0;
  if (divisor > 0 && margenAbsoluto > 0) {
    velocidadRetorno = margenAbsoluto / divisor;
  }

  // 6. Clasificación con reglas de negocio
  let clasificacion = 'NEUTRO';
  let razon = 'Rendimiento estándar';

  const cantidad = typeof producto.cantidad === 'number' ? producto.cantidad : (producto.stock || 0);

  // REGLA 1: HUESO por días en stock (> 60 días)
  if (diasEnStock > 60 && cantidad > 0) {
    clasificacion = 'HUESO';
    razon = `Capital atrapado por ${diasEnStock} días en stock`;
  }
  // REGLA 2: HUESO por velocidad muy baja
  else if (velocidadRetorno > 0 && velocidadRetorno < 10 && cantidad > 0) {
    clasificacion = 'HUESO';
    razon = 'Velocidad de retorno muy baja (< 10)';
  }
  // REGLA 3: ESTRELLA por alta velocidad y rotación rápida
  else if (velocidadRetorno >= 100 && diasEnStock < 15) {
    clasificacion = 'ESTRELLA';
    razon = 'Alta velocidad de retorno con rotación rápida';
  }
  // REGLA 4: ESTRELLA por buen margen y stock controlado
  else if (velocidadRetorno >= 50 && cantidad > 0 && cantidad < 10) {
    clasificacion = 'ESTRELLA';
    razon = 'Margen excelente con stock óptimo';
  }
  // REGLA 5: ESTRELLA por margen absoluto alto
  else if (margenAbsoluto > 100000 && diasEnStock < 30) {
    clasificacion = 'ESTRELLA';
    razon = 'Margen absoluto alto con rotación aceptable';
  }

  return {
    clasificacion,
    velocidadRetorno: parseFloat(velocidadRetorno.toFixed(4)),
    margenAbsoluto: parseFloat(margenAbsoluto.toFixed(2)),
    diasEnStock,
    tiempoProduccionDias: parseFloat(tiempoProduccionDias.toFixed(2)),
    razon,
    valorHoraAplicado: valorHoraEfectivo,
    monedaAplicada: MONEDA_POR_PAIS[pais] || MONEDA_POR_PAIS.default
  };
};

// ============================================
// 🔹 FUNCIÓN: Obtener país del usuario
// ============================================
const obtenerPaisUsuario = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', userId));
    const userData = userDoc.data();
    return userData?.pais || 'default';
  } catch (error) {
    console.warn('⚠️ Error obteniendo país:', error.message);
    return 'default';
  }
};

// ============================================
// 🔹 FUNCIÓN: Obtener valor hora del usuario
// ============================================
const obtenerValorHoraUsuario = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', userId));
    const userData = userDoc.data();
    if (userData?.valorHora && userData.valorHora > 0) {
      return userData.valorHora;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Error obteniendo valorHora:', error.message);
    return null;
  }
};

// ============================================
// 🎯 HOOK PRINCIPAL
// ============================================
export const useEstrellaHueso = () => {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [productosEstrella, setProductosEstrella] = useState([]);
  const [productosHueso, setProductosHueso] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculando, setRecalculando] = useState(false);
  const { t, i18n } = useTranslation();

  // 🔹 Función: Recalcular clasificación de un producto específico
  const recalcularProducto = useCallback(async (productoId, productoData) => {
    if (!usuarioActual?.uid) return null;

    try {
      const pais = await obtenerPaisUsuario(usuarioActual.uid);
      const valorHora = await obtenerValorHoraUsuario(usuarioActual.uid);
      
      const resultado = calcularClasificacionProducto(productoData, valorHora, pais);
      
      // Actualizar en Firestore
      const productoRef = doc(db, 'inventario', productoId);
      await updateDoc(productoRef, {
        clasificacion: resultado.clasificacion,
        velocidadRetorno: resultado.velocidadRetorno,
        margenAbsoluto: resultado.margenAbsoluto,
        diasEnStock: resultado.diasEnStock,
        tiempoProduccionDias: resultado.tiempoProduccionDias,
        razonClasificacion: resultado.razon,
        valorHoraAplicado: resultado.valorHoraAplicado,
        monedaAplicada: resultado.monedaAplicada,
        analizadoEl: new Date().toISOString()
      });
      
      return resultado;
    } catch (error) {
      console.error('❌ Error recalculando producto:', error);
      return null;
    }
  }, [usuarioActual]);

  // 🔹 Función: Recalcular TODOS los productos del usuario
  const recalcularTodosLosProductos = useCallback(async () => {
    if (!usuarioActual?.uid) {
      toast.error('Debes iniciar sesión primero');
      return false;
    }

    setRecalculando(true);
    let exitosos = 0;
    let fallidos = 0;

    try {
      const productosRef = collection(db, 'inventario');
      const q = query(productosRef, where('userId', '==', usuarioActual.uid));
      const snapshot = await getDocs(q);
      
      const pais = await obtenerPaisUsuario(usuarioActual.uid);
      const valorHora = await obtenerValorHoraUsuario(usuarioActual.uid);
      
      for (const doc of snapshot.docs) {
        try {
          const productoData = doc.data();
          const resultado = calcularClasificacionProducto(productoData, valorHora, pais);
          
          await updateDoc(doc.ref, {
            clasificacion: resultado.clasificacion,
            velocidadRetorno: resultado.velocidadRetorno,
            margenAbsoluto: resultado.margenAbsoluto,
            diasEnStock: resultado.diasEnStock,
            tiempoProduccionDias: resultado.tiempoProduccionDias,
            razonClasificacion: resultado.razon,
            analizadoEl: new Date().toISOString()
          });
          exitosos++;
        } catch (err) {
          console.error('Error con producto:', doc.id, err);
          fallidos++;
        }
      }
      
      toast.success(`✅ Recalculados ${exitosos} productos${fallidos > 0 ? ` (${fallidos} fallaron)` : ''}`);
      return true;
    } catch (error) {
      console.error('❌ Error en recalcularTodos:', error);
      toast.error('Error al recalcular productos');
      return false;
    } finally {
      setRecalculando(false);
    }
  }, [usuarioActual]);

  // 🔹 Efecto 1: Escuchar cambios de autenticación
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioActual(user);
      if (!user) {
        setProductos([]);
        setProductosEstrella([]);
        setProductosHueso([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Efecto 2: Escuchar cambios en inventario del usuario
  useEffect(() => {
    if (!usuarioActual?.uid) return;

    const productosRef = collection(db, 'inventario');
    const q = query(productosRef, where('userId', '==', usuarioActual.uid));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const productosData = [];
          const productosSinClasificar = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const producto = {
              id: doc.id,
              nombre: data.producto ?? data.nombre ?? 'Sin nombre',
              clasificacion: data.clasificacion ?? 'NEUTRO',
              velocidadRetorno: data.velocidadRetorno ?? 0,
              diasEnStock: data.diasEnStock ?? 0,
              precioVenta: data.precioVenta ?? 0,
              stock: data.cantidad ?? data.stock ?? 0,
              precioCompra: data.precioCompra ?? 0,
              costoManoObra: data.costoManoObra ?? 0,
              fechaRegistro: data.fechaRegistro ?? data.fechaCompra ?? null,
              razon: data.razonClasificacion ?? ''
            };
            
            productosData.push(producto);
            
            // Detectar productos sin clasificar (recién agregados)
            if (!data.clasificacion && (data.precioVenta > 0)) {
              productosSinClasificar.push({ id: doc.id, data: producto });
            }
          });
          
          setProductos(productosData);
          setProductosEstrella(productosData.filter(p => p.clasificacion === 'ESTRELLA'));
          setProductosHueso(productosData.filter(p => p.clasificacion === 'HUESO'));
          
          // Auto-recalcular productos nuevos sin clasificar
          if (productosSinClasificar.length > 0) {
            console.log(`🔄 Auto-recalculando ${productosSinClasificar.length} productos nuevos...`);
            for (const item of productosSinClasificar) {
              await recalcularProducto(item.id, item.data);
            }
          }
          
          setError(null);
        } catch (err) {
          console.error('❌ Error procesando snapshot:', err);
          setError('Error al procesar los productos');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('❌ Error en onSnapshot:', {
          code: err.code,
          message: err.message
        });
        
        if (err.code === 'permission-denied') {
          setError('No tienes permisos para acceder a este inventario');
        } else if (err.code === 'failed-precondition') {
          setError('Se requiere un índice. Revisa la consola para crearlo.');
        } else {
          setError('Error al cargar los productos: ' + err.message);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [usuarioActual, recalcularProducto]);

  // 🔹 Alerta NO bloqueante para productos HUESO
  const alertaCompraHueso = useCallback((producto) => {
    if (producto?.clasificacion === 'HUESO') {
      const mensaje = t('alerts.capitalTrapped', {
        producto: producto.nombre ?? 'Producto',
        dias: producto.diasEnStock ?? 0
      });
      
      toast.error(mensaje, {
        duration: 8000,
        position: 'top-center',
        icon: '🦴',
        style: {
          background: '#dc2626',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '14px',
          padding: '16px',
          border: '2px solid #991b1b',
          borderRadius: '8px'
        }
      });
    }
  }, [t]);

  // 🔹 Ícono según clasificación
  const getIcono = useCallback((clasificacion) => {
    switch(clasificacion) {
      case 'ESTRELLA': return '⭐';
      case 'HUESO': return '🦴';
      default: return '⚪';
    }
  }, []);

  // 🔹 Mensaje de auditoría personalizado
  const getMensajeAuditoria = useCallback((producto) => {
    if (!producto) return '';
    
    if (producto.clasificacion === 'ESTRELLA') {
      return t('audit.starMessage', { 
        producto: producto.nombre ?? 'Producto',
        velocidad: (producto.velocidadRetorno ?? 0).toFixed(2)
      });
    } else if (producto.clasificacion === 'HUESO') {
      return t('audit.boneMessage', {
        producto: producto.nombre ?? 'Producto',
        dias: producto.diasEnStock ?? 0
      });
    }
    return t('audit.neutralMessage', { producto: producto.nombre ?? 'Producto' });
  }, [t]);

  // 🔹 Obtener razón de clasificación (para debugging)
  const getRazonClasificacion = useCallback((producto) => {
    if (!producto) return '';
    return producto.razon || (producto.clasificacion === 'ESTRELLA' 
      ? 'Alto rendimiento' 
      : producto.clasificacion === 'HUESO' 
      ? 'Bajo rendimiento' 
      : 'Rendimiento estándar');
  }, []);

  return {
    productos,
    productosEstrella,
    productosHueso,
    loading,
    recalculando,
    error,
    alertaCompraHueso,
    getIcono,
    getMensajeAuditoria,
    getRazonClasificacion,
    recalcularProducto,
    recalcularTodosLosProductos  // ✅ Nueva: función para recalcular todo
  };
};

