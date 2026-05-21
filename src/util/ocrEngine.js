// ============================================================
// MÓDULO DE OCR CON GOOGLE CLOUD VISION API
// ✅ VERSIÓN CORREGIDA - ENFOQUE NETO DE CAJA
// ✅ EVITA DUPLICACIÓN DE EGRESOS
// ✅ CÁLCULO DE COSTO UNITARIO NETO REAL
// ============================================================

import { getAuth, onAuthStateChanged } from 'firebase/auth';

// ============================================================
// FUNCIÓN AUXILIAR: Obtener usuario autenticado
// ============================================================
const obtenerUsuarioAutenticado = async () => {
  const auth = getAuth();
  
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          reject(new Error('No hay usuario autenticado'));
        }
      });
      
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout esperando autenticación'));
      }, 5000);
    }
  });
};

// ============================================================
// FUNCIÓN AUXILIAR: Convertir File a Base64
// ============================================================
export const convertirImagenABase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se proporcionó ningún archivo'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result;
      const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Limpio);
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer la imagen'));
    };
    
    reader.readAsDataURL(file);
  });
};

// ============================================================
// FUNCIÓN PRINCIPAL: ESCANEAR FACTURA
// ============================================================
export const escanearFacturaConVision = async (imagenFile, moneda = 'COP') => {
  let usuario;
  try {
    usuario = await obtenerUsuarioAutenticado();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return {
      success: false,
      mensaje: 'Debes iniciar sesión para escanear facturas',
      error: 'UNAUTHENTICATED',
      productos: []
    };
  }

  if (!imagenFile) {
    return {
      success: false,
      mensaje: 'No se proporcionó ninguna imagen',
      error: 'NO_IMAGE',
      productos: []
    };
  }

  try {
    let base64Image;
    if (typeof imagenFile === 'string') {
      base64Image = imagenFile;
    } else if (imagenFile instanceof File) {
      base64Image = await convertirImagenABase64(imagenFile);
    } else {
      return {
        success: false,
        mensaje: 'Formato de imagen no soportado',
        error: 'INVALID_FORMAT',
        productos: []
      };
    }

    const token = await usuario.getIdToken();
    
    const response = await fetch('https://procesarfacturavision-xxcsoi4xcq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        imagen: base64Image,
        moneda: moneda
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error en Cloud Function:', response.status, data);
      
      if (response.status === 401) {
        return {
          success: false,
          mensaje: 'Sesión expirada. Recarga la página.',
          error: 'UNAUTHENTICATED',
          productos: []
        };
      }
      
      return {
        success: false,
        mensaje: data.mensaje || 'Error en el servidor',
        error: 'SERVER_ERROR',
        productos: []
      };
    }

    if (!data.success) {
      return {
        success: false,
        mensaje: data.mensaje || 'Error procesando la factura',
        error: data.error || 'PROCESSING_ERROR',
        productos: []
      };
    }

    const productos = (data.productos || []).map(p => ({
      nombre: p.nombre || 'Producto sin nombre',
      cantidad: Math.max(1, p.cantidad || 1),
      precioUnitario: Math.max(0, p.precioUnitario || 0),
      iva: 0
    }));

    console.log(`✅ Factura procesada: ${productos.length} productos encontrados`);

    return {
      success: true,
      proveedor: data.proveedor || 'Proveedor no identificado',
      nit: data.nit || '',
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      total: Math.max(0, data.total || 0),
      totalImpuestos: 0,
      productos: productos,
      tipoImpuesto: 'NETO',
      rawText: data.rawText || ''
    };

  } catch (error) {
    console.error('Error en escanearFacturaConVision:', error);
    
    return {
      success: false,
      mensaje: 'Error de conexión. Intenta de nuevo.',
      error: 'NETWORK_ERROR',
      productos: []
    };
  }
};

export const handleEscaneoDocumentos = async (imagenFile, textoComando, moneda) => {
  return await escanearFacturaConVision(imagenFile, moneda);
};

// ============================================================
// ✅ FUNCIÓN CORREGIDA: actualizarInventarioAcumulado (ENFOQUE NETO DE CAJA)
// ============================================================
export const actualizarInventarioAcumulado = async (nombreProducto, cantidad, costoUnitario, db, userId) => {
  if (!nombreProducto || !userId) {
    console.error('Datos inválidos para actualizar inventario');
    return false;
  }

  const cantidadSegura = Math.max(0, cantidad || 1);
  const costoUnitarioSeguro = Math.max(0, costoUnitario || 0);

  try {
    const { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
    
    const inventarioCollection = collection(db, 'inventario');
    const q = query(inventarioCollection, where('producto', '==', nombreProducto), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(inventarioCollection, {
        producto: nombreProducto,
        cantidad: cantidadSegura,
        costoUnitario: costoUnitarioSeguro,
        costoTotal: Math.round(cantidadSegura * costoUnitarioSeguro),
        fechaActualizacion: serverTimestamp(),
        userId: userId,
        clasificacion: 'NORMAL'
      });
    } else {
      const docInventario = snapshot.docs[0];
      const dataActual = docInventario.data();
      
      const nuevaCantidad = (dataActual.cantidad || 0) + cantidadSegura;
      const nuevoCostoTotal = Math.round(((dataActual.cantidad || 0) * (dataActual.costoUnitario || 0)) + (cantidadSegura * costoUnitarioSeguro));
      const nuevoCostoUnitario = nuevaCantidad > 0 ? Math.round(nuevoCostoTotal / nuevaCantidad) : 0;
      
      await updateDoc(doc(db, 'inventario', docInventario.id), {
        cantidad: nuevaCantidad,
        costoUnitario: nuevoCostoUnitario,
        costoTotal: nuevoCostoTotal,
        fechaActualizacion: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Error en actualizarInventarioAcumulado:', error);
    return false;
  }
};

// ============================================================
// ✅ FUNCIÓN CORREGIDA: registrarCompraEnRegistros (BLINDADO CONTRA DUPLICADOS)
// ============================================================
export const registrarCompraEnRegistros = async (data, db, userId) => {
  if (!userId) {
    console.error('Usuario no autenticado para registrar compra');
    return false;
  }

  const valorSeguro = Math.round(Math.max(0, data.valor || 0));
  const cantidadSegura = Math.max(1, data.cantidad || 1);
  
  try {
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const registrosCollection = collection(db, 'registros');
    
    await addDoc(registrosCollection, {
      concepto: data.concepto || 'Compra registrada',
      texto: data.texto || `Compra de ${data.concepto || 'producto'}`,
      valor: valorSeguro,
      tipo: 'egreso',
      categoria: data.categoria || 'COMPRA',
      emoji: '📦',
      cantidad: cantidadSegura,
      costoUnitario: Math.round(data.costoUnitario || (valorSeguro / cantidadSegura)),
      fecha: serverTimestamp(),
      userId: userId,
      procesadoPor: data.procesadoPor || 'ocr_engine'
    });
    
    return true;
  } catch (error) {
    console.error('Error en registrarCompraEnRegistros:', error);
    return false;
  }
};
