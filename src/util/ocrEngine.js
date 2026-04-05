// ============================================================
// OCR ENGINE CON TESSERACT.JS - VERSIÓN GLOBAL
// MULTIMONEDA, MULTIIDIOMA, MULTIREGIÓN
// ============================================================
import Tesseract from 'tesseract.js';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

// ============================================================
// FUNCIÓN PRINCIPAL: handle_escaneo_documentos
// ============================================================
export const handleEscaneoDocumentos = async (imagenFile, mensajeUsuario = '', monedaUsuario = 'COP') => {
  try {
    // 1. Normalizar texto del mensaje del usuario
    const contenidoLimpio = normalizarTexto(mensajeUsuario);
    
    // 2. Procesar imagen con Tesseract OCR (multidioma: español + inglés)
    const resultadoOCR = await Tesseract.recognize(imagenFile, 'spa+eng', {
      logger: m => console.log(m)
    });
    
    const textoExtraido = resultadoOCR.data.text;
    
    // 3. Extraer palabras clave del mensaje del usuario
    const { palabrasClave, palabrasClaveNormalizadas } = extraerPalabrasClave(contenidoLimpio);
    
    // 4. Extraer datos de la factura usando regex
    const datosFactura = extraerDatosFactura(textoExtraido);
    
    // 5. Detectar si es crédito
    const esCredito = detectarCredito(contenidoLimpio);
    const estadoPago = esCredito ? 'PENDIENTE' : 'PAGADO';
    
    // 6. Procesar productos y clasificar entre reventa y personal
    const { productosReventa, totalPersonalNeto, totalPersonalImpuestos } = 
      procesarProductos(datosFactura.productos, palabrasClave, palabrasClaveNormalizadas, monedaUsuario);
    
    // 7. Extraer tercero (proveedor)
    const tercero = extraerTercero(mensajeUsuario) || datosFactura.proveedor || 'General Supplier';
    
    // 8. Preparar productos de reventa
    const registrosExitosos = [];
    
    for (const producto of productosReventa) {
      registrosExitosos.push(`${producto.cantidad} ${producto.nombre}`);
    }
    
    // 9. Gasto personal consolidado
    const totalPersonalFinal = totalPersonalNeto + totalPersonalImpuestos;
    if (totalPersonalFinal > 0) {
      registrosExitosos.push(`Personal Consolidated Expense (${totalPersonalFinal})`);
    }
    
    return {
      success: true,
      mensaje: `✅ Document processed - Invoice ${datosFactura.numeroFactura}\nDate: ${datosFactura.fecha}\nSupplier: ${tercero}\nRecords: ${registrosExitosos.join(', ')}\nStatus: ${estadoPago}\nCurrency: ${monedaUsuario}`,
      productosReventa,
      totalPersonal: totalPersonalFinal,
      factura: datosFactura.numeroFactura,
      fecha: datosFactura.fecha,
      proveedor: tercero,
      estado: estadoPago,
      moneda: monedaUsuario
    };
    
  } catch (error) {
    console.error('Error en escaneo OCR:', error);
    return {
      success: false,
      mensaje: `Error processing document: ${error.message}`
    };
  }
};

// ============================================================
// FUNCIÓN: normalizar_texto
// ============================================================
export const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// ============================================================
// FUNCIÓN: limpiar_producto_factura
// ============================================================
export const limpiarProductoFactura = (nombreProducto) => {
  if (!nombreProducto) return 'Product';
  
  let texto = nombreProducto.trim();
  
  texto = texto.replace(/^[\*\-\_\.\s]+/, '');
  texto = texto.replace(/ref\s*\d+|cod\s*\d+|item\s*\d+|\b\d{4,}\b/gi, '');
  texto = texto.replace(/\s+/g, ' ').trim();
  
  const palabrasProhibidas = ['deportiva', 'ref', 'cod', 'item', 'generic'];
  const tokens = texto.split(' ');
  if (tokens.length > 0 && palabrasProhibidas.includes(tokens[0].toLowerCase())) {
    tokens.shift();
  }
  
  const resultado = tokens.join(' ');
  return resultado ? resultado.charAt(0).toUpperCase() + resultado.slice(1) : nombreProducto;
};

// ============================================================
// FUNCIÓN: safe_float
// ============================================================
export const safeFloat = (valor, defaultValue = 0) => {
  if (valor === null || valor === undefined) return defaultValue;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const limpio = valor.trim().replace(/[$€£¥\s]/g, '').replace(/,/g, '');
    if (limpio === '' || limpio.toLowerCase() === 'null' || limpio.toLowerCase() === 'none') {
      return defaultValue;
    }
    const num = parseFloat(limpio);
    return isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
};

// ============================================================
// FUNCIÓN: corregir_magnitud_moneda
// ============================================================
export const corregirMagnitudMoneda = (valor, monedaUsuario) => {
  if (monedaUsuario === 'COP' && valor < 1000 && valor > 0) {
    console.log(`Corrección de magnitud COP: ${valor} -> ${valor * 1000}`);
    return valor * 1000;
  }
  return valor;
};

// ============================================================
// FUNCIÓN: extraer_tercero
// ============================================================
export const extraerTercero = (mensajeOriginal) => {
  if (!mensajeOriginal) return null;
  
  const patrones = [
    /\b(?:to|from|supplier|vendor|seller|payable to|pay to)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\s*(?:\d|\.|$))/i,
    /\b(?:debe a|se le debe a)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\s*(?:\d|\.|$))/i,
    /\b(?:owe to|payable to)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\s*(?:\d|\.|$))/i,
    /\b(?:supplier|vendor|seller):\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\n|$)/i,
    /\b(?:proveedor|vendedor):\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\n|$)/i
  ];
  
  for (const patron of patrones) {
    const match = mensajeOriginal.match(patron);
    if (match) {
      let tercero = match[1].trim();
      const palabrasGenericas = [
        'distribuidora', 'distribuidor', 'empresa', 'proveedor', 'cliente', 'tienda', 'almacen',
        'distributor', 'company', 'supplier', 'customer', 'store', 'warehouse', 'corporation', 'inc', 'llc'
      ];
      for (const palabra of palabrasGenericas) {
        tercero = tercero.replace(new RegExp(`\\b${palabra}\\b`, 'gi'), '');
      }
      tercero = tercero.replace(/\s+/g, ' ').trim();
      return tercero ? tercero.charAt(0).toUpperCase() + tercero.slice(1) : 'General';
    }
  }
  
  return 'General';
};

// ============================================================
// FUNCIÓN: categorizador_auditor
// ============================================================
export const categorizadorAuditor = (concepto) => {
  if (!concepto) return 'other_expenses';
  
  const conceptoLower = concepto.toLowerCase();
  
  const categorias = {
    operational: ['rent', 'lease', 'salary', 'wages', 'utilities', 'electricity', 'water', 'internet', 'arriendo', 'nomina', 'servicios', 'luz', 'agua'],
    logistics: ['transport', 'freight', 'shipping', 'delivery', 'gas', 'fuel', 'transporte', 'flete', 'gasolina', 'domicilio'],
    marketing: ['advertising', 'facebook', 'instagram', 'ads', 'flyers', 'commission', 'publicidad', 'volantes', 'comision'],
    direct: ['merchandise', 'raw material', 'supplies', 'inventory', 'purchase', 'mercancia', 'materia prima', 'insumos', 'compra']
  };
  
  for (const [categoria, palabras] of Object.entries(categorias)) {
    if (palabras.some(p => conceptoLower.includes(p))) {
      return categoria;
    }
  }
  
  return 'other_expenses';
};

// ============================================================
// FUNCIÓN: registrar_compra_en_registros (MEJORADA)
// ============================================================
export const registrarCompraEnRegistros = async (datos, db, userId) => {
  try {
    const { 
      concepto, cantidad, valor_unitario_base, tax_item, flujo, 
      tercero, estado, factura, fecha, moneda 
    } = datos;
    
    const totalItem = (valor_unitario_base * cantidad) + (tax_item || 0);
    
    const registrosCollection = collection(db, 'registros');
    
    const registro = {
      texto: `Purchase: ${cantidad} ${concepto} for ${totalItem} ${moneda || 'COP'}`,
      concepto: concepto,
      valor: totalItem,
      tipo: 'egreso',
      // Mantenemos la lógica de auditoría: si no es para revender, es un gasto personal/operacional
      categoria: flujo === 'INVENTARIO' ? 'INVENTARIO' : 'GASTO_OPERACIONAL',
      emoji: flujo === 'INVENTARIO' ? '📦' : '🛍️',
      cantidad: cantidad,
      costoUnitario: valor_unitario_base,
      fecha: serverTimestamp(), // Mejor para auditoría internacional (UTC)
      userId: userId,
      proveedor: tercero,
      numeroFactura: factura,
      fechaFactura: fecha,
      estado: estado,
      moneda: moneda || 'COP',
      notas: ''
    };
    
    await addDoc(registrosCollection, registro);
    return { exito: true, mensaje: `Registered: ${cantidad} ${concepto}` };
    
  } catch (error) {
    console.error('Error en registro Firestore:', error);
    return { exito: false, mensaje: error.message };
  }
};

// ============================================================
// FUNCIÓN: actualizar_inventario_acumulado (MEJORADA)
// ============================================================
export const actualizarInventarioAcumulado = async (producto, cantidad, costoUnitario, db, userId) => {
  try {
    const inventarioCollection = collection(db, 'inventario');
    const q = query(inventarioCollection, where('producto', '==', producto), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(inventarioCollection, {
        producto: producto,
        cantidad: cantidad,
        costoUnitario: costoUnitario,
        costoTotal: cantidad * costoUnitario,
        fechaActualizacion: serverTimestamp(),
        userId: userId
      });
    } else {
      const docInventario = snapshot.docs[0];
      const dataActual = docInventario.data();
      
      // Lógica de Costo Promedio Ponderado (Esencial para Auditoría Internacional)
      const nuevaCantidad = dataActual.cantidad + cantidad;
      const nuevoCostoTotal = (dataActual.cantidad * dataActual.costoUnitario) + (cantidad * costoUnitario);
      const nuevoCostoUnitario = nuevoCostoTotal / nuevaCantidad;
      
      await updateDoc(doc(db, 'inventario', docInventario.id), {
        cantidad: nuevaCantidad,
        costoUnitario: nuevoCostoUnitario,
        costoTotal: nuevoCostoTotal,
        fechaActualizacion: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Error en inventario:', error);
    return false;
  }
};

// ============================================================
// FUNCIONES AUXILIARES INTERNAS
// ============================================================

const extraerPalabrasClave = (contenido) => {
  const palabrasClave = [];
  const palabrasClaveNormalizadas = [];
  
  const patronProductoES = /(?:compra|registra)\s+(?:de\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\s+(?:para|a|por)/i;
  const matchProductoES = contenido.match(patronProductoES);
  if (matchProductoES) {
    const clave = matchProductoES[1].trim();
    palabrasClave.push(clave);
    palabrasClaveNormalizadas.push(normalizarPlural(clave));
  }
  
  const patronProductoEN = /(?:buy|purchase)\s+(?:of\s+)?([a-z]+(?:\s+[a-z]+)?)\s+(?:for|to)/i;
  const matchProductoEN = contenido.match(patronProductoEN);
  if (matchProductoEN) {
    const clave = matchProductoEN[1].trim();
    palabrasClave.push(clave);
    palabrasClaveNormalizadas.push(normalizarPlural(clave));
  }
  
  const patronRevender = /(?:para\s+(?:revender|inventario|stock)|for\s+(?:resale|inventory|stock))\s+(?:de\s+)?([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i;
  const matchRevender = contenido.match(patronRevender);
  if (matchRevender) {
    const clave = matchRevender[1].trim();
    palabrasClave.push(clave);
    palabrasClaveNormalizadas.push(normalizarPlural(clave));
  }
  
  if (palabrasClave.length === 0) {
    const productosComunes = [
      'flour', 'oil', 'rice', 'milk', 'egg', 'bread', 'cookie', 'soda', 'bottle', 'box', 'bag',
      'harina', 'aceite', 'arroz', 'leche', 'huevo', 'pan', 'galleta', 'gaseosa', 'botella', 'caja', 'bulto'
    ];
    for (const producto of productosComunes) {
      if (contenido.includes(producto)) {
        palabrasClave.push(producto);
        palabrasClaveNormalizadas.push(normalizarPlural(producto));
      }
    }
  }
  
  return { palabrasClave, palabrasClaveNormalizadas };
};

const normalizarPlural = (texto) => {
  texto = texto.toLowerCase().trim();
  if (texto.endsWith('s') && !texto.endsWith('es')) {
    return texto.slice(0, -1);
  } else if (texto.endsWith('es')) {
    return texto.slice(0, -2);
  }
  return texto;
};

const detectarCredito = (contenido) => {
  const palabrasCredito = [
    'credito', 'crédito', 'fiado', 'por pagar', 'deuda', 'pendiente', 'a credito', 'a crédito',
    'credit', 'pending', 'debt', 'on credit', 'pay later', 'installment'
  ];
  const contenidoNormalizado = normalizarTexto(contenido);
  return palabrasCredito.some(p => contenidoNormalizado.includes(p));
};

const extraerDatosFactura = (textoOCR) => {
  let numeroFactura = 'S/N';
  const patronesFactura = [
    /(?:invoice|factura|ticket|receipt|bill|N°|No\.?|Folio|FACTURA|INVOICE)\s*[:\s]*([A-Z0-9\-]+)/i,
    /(?:INVOICE|FACTURA)\s+(?:OF|DE)\s+(?:SALE|VENTA)\s+([A-Z0-9\-]+)/i,
    /(?:TICKET|RECEIPT)\s+NO\.?\s*([A-Z0-9\-]+)/i,
    /(?:FOLIO|REFERENCE)\s*[:\s]*([A-Z0-9\-]+)/i
  ];
  
  for (const patron of patronesFactura) {
    const match = textoOCR.match(patron);
    if (match && match[1] && !match[1].match(/^\d{10,}$/)) {
      numeroFactura = match[1].trim();
      break;
    }
  }
  
  let fecha = '';
  const patronesFecha = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
    /(\d{2})\s+of\s+([a-z]+)\s+of\s+(\d{4})/i,
    /(\d{2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i
  ];
  
  for (const patron of patronesFecha) {
    const match = textoOCR.match(patron);
    if (match) {
      if (patron === patronesFecha[1]) {
        fecha = `${match[1]}/${match[2]}/${match[3]}`;
      } else if (patron === patronesFecha[2]) {
        fecha = `${match[3]}/${match[2]}/${match[1]}`;
      } else {
        fecha = match[0];
      }
      break;
    }
  }
  
  if (!fecha) {
    const hoy = new Date();
    fecha = `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
  }
  
  let proveedor = '';
  const patronesProveedor = [
    /(?:supplier|vendor|seller|proveedor|vendedor|issuer|emitter)\s*[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\n|$)/i,
    /(?:NIT|RUT|TAX ID|VAT ID)\s*[:\s]*[\d\w\-]+[\s\n]+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?=\n|$)/i,
    /^([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+(?:S\.A\.?|S\.A\.S\.?|LTDA\.?|C\.A\.?|INC\.?|LLC\.?|CORP\.?)?)\s*$/im
  ];
  
  for (const patron of patronesProveedor) {
    const match = textoOCR.match(patron);
    if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
      proveedor = match[1].trim();
      break;
    }
  }
  
  if (!proveedor) proveedor = 'General Supplier';
  
  const productos = [];
  const lineas = textoOCR.split('\n');
  
  for (const linea of lineas) {
    const matchProducto = linea.match(/(\d+)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)\s+(\d+[\.,]?\d*)\s*$/i);
    if (matchProducto) {
      const cantidad = parseInt(matchProducto[1]);
      const nombreRaw = matchProducto[2].trim();
      const precioBruto = parseFloat(matchProducto[3].replace(',', '.'));
      
      const nombre = limpiarProductoFactura(nombreRaw);
      const precioUnitario = precioBruto;
      
      productos.push({
        nombre,
        cantidad,
        precioUnitario,
        impuestoValor: 0,
        impuestoTipo: 'NO_TAX',
        tasaImpuesto: 0
      });
    }
  }
  
  if (productos.length === 0) {
    productos.push({
      nombre: 'Product',
      cantidad: 1,
      precioUnitario: 0,
      impuestoValor: 0,
      impuestoTipo: 'NO_TAX',
      tasaImpuesto: 0
    });
  }
  
  return {
    numeroFactura,
    fecha,
    proveedor,
    productos
  };
};

const procesarProductos = (productos, palabrasClave, palabrasClaveNormalizadas, monedaUsuario) => {
  const productosReventa = [];
  let totalPersonalNeto = 0;
  let totalPersonalImpuestos = 0;
  
  for (const producto of productos) {
    const nombreLimpio = limpiarProductoFactura(producto.nombre);
    const cantidad = safeFloat(producto.cantidad, 1);
    let precioNeto = safeFloat(producto.precioUnitario, 0);
    let impuestoValor = safeFloat(producto.impuestoValor, 0);
    
    precioNeto = corregirMagnitudMoneda(precioNeto, monedaUsuario);
    impuestoValor = corregirMagnitudMoneda(impuestoValor, monedaUsuario);
    
    const totalNetoProducto = precioNeto * cantidad;
    const totalImpuestoProducto = impuestoValor * cantidad;
    
    let esProductoReventa = false;
    const nombreNormalizado = normalizarPlural(nombreLimpio.toLowerCase());
    
    for (let i = 0; i < palabrasClave.length; i++) {
      const claveOriginal = palabrasClave[i];
      const claveNormalizada = palabrasClaveNormalizadas[i];
      
      if (claveNormalizada === nombreNormalizado ||
          nombreNormalizado.includes(claveNormalizada) ||
          claveNormalizada.includes(nombreNormalizado) ||
          claveOriginal.toLowerCase() === nombreLimpio.toLowerCase() ||
          nombreLimpio.toLowerCase().includes(claveOriginal.toLowerCase())) {
        esProductoReventa = true;
        break;
      }
    }
    
    if (esProductoReventa) {
      productosReventa.push({
        nombre: nombreLimpio,
        cantidad,
        precioUnitario: precioNeto,
        impuestoValor: impuestoValor,
        total: totalNetoProducto + totalImpuestoProducto
      });
    } else {
      totalPersonalNeto += totalNetoProducto;
      totalPersonalImpuestos += totalImpuestoProducto;
    }
  }
  
  return { productosReventa, totalPersonalNeto, totalPersonalImpuestos };
};

