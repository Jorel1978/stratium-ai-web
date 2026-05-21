// src/services/voiceInput.js
// Comandos de voz nativos para Stratium AI (Web Speech API - Costo: $0)
// Soporte multi-país con normalización numérica y categorización regional

import { parseMoneyUniversal } from '../util/formatMoneyUniversal';
import { roundMoney } from '../util/roundMoney';

/**
 * Normalizar números escritos en palabras (mil, millones, lucas, etc.)
 * @param {string} texto - Texto a normalizar
 * @param {string} paisCode - Código del país (CO, MX, AR, ES, US, etc.)
 * @returns {string} - Texto con números normalizados
 * 
 * @example
 * normalizarNumerosTexto("5 mil 800", "CO") // "5 800"
 * normalizarNumerosTexto("1 millón 200 mil", "CO") // "1 200 000"
 * normalizarNumerosTexto("2 lucas", "AR") // "2000"
 */
const normalizarNumerosTexto = (texto, paisCode = 'CO') => {
  let resultado = texto.toLowerCase();
  
  // Diccionario de palabras numéricas por región
  const palabrasNuméricas = {
    // Español general
    'millón': 1000000,
    'millones': 1000000,
    'mil': 1000,
    'ciento': 100,
    'cien': 100,
    'quinientos': 500,
    'quinientas': 500,
    'doscientos': 200,
    'doscientas': 200,
    'trescientos': 300,
    'trescientas': 300,
    'cuatrocientos': 400,
    'cuatrocientas': 400,
    'quinientos': 500,
    'quinientas': 500,
    'seiscientos': 600,
    'seiscientas': 600,
    'setecientos': 700,
    'setecientas': 700,
    'ochocientos': 800,
    'ochocientas': 800,
    'novecientos': 900,
    'novecientas': 900,
    // Regionalismos
    'luca': 1000,      // Argentina, Chile, Uruguay
    'lucas': 1000,     // Argentina, Chile, Uruguay
    'gamba': 100,      // Argentina
    'gambas': 100,     // Argentina
    'palo': 1000000,   // Argentina, Uruguay
    'palos': 1000000,  // Argentina, Uruguay
    'vara': 1000,      // Costa Rica
    'varas': 1000,     // Costa Rica
    'barra': 1000,     // México, Colombia
    'barras': 1000,    // México, Colombia
    'kilo': 1000,      // España
    'kilos': 1000      // España
  };
  
  // Reemplazar "5 mil" → "5 1000" (luego se multiplica)
  for (const [palabra, valor] of Object.entries(palabrasNuméricas)) {
    const regex = new RegExp(`(\\d+)\\s+${palabra}`, 'gi');
    resultado = resultado.replace(regex, `$1 ${valor}`);
  }
  
  // Procesar expresiones como "5 1000 800" → 5 * 1000 + 800 = 5800
  // Buscar patrones: número + espacio + número grande + espacio + número
  const patronMultiplicacion = /(\d+)\s+(\d{3,6})(?:\s+(\d+))?/g;
  let match;
  while ((match = patronMultiplicacion.exec(resultado)) !== null) {
    const base = parseInt(match[1]);
    const multiplicador = parseInt(match[2]);
    const resto = match[3] ? parseInt(match[3]) : 0;
    const valorCalculado = (base * multiplicador) + resto;
    resultado = resultado.replace(match[0], valorCalculado.toString());
  }
  
  return resultado;
};

/**
 * Extraer valor numérico de un texto (maneja "5 mil", "$5.000", "5,000.50")
 * @param {string} texto - Texto que contiene el número
 * @param {string} paisCode - Código del país para parseo regional
 * @returns {number} - Valor numérico extraído
 */
const extraerValorNumerico = (texto, paisCode = 'CO') => {
  // Primero normalizar palabras numéricas
  let normalizado = normalizarNumerosTexto(texto, paisCode);
  
  // Buscar cualquier patrón de número (incluye decimales)
  const patronNumero = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/g;
  const matches = normalizado.match(patronNumero);
  
  if (!matches || matches.length === 0) return 0;
  
  // Tomar el primer número encontrado
  const numeroStr = matches[0];
  
  // Usar parseMoneyUniversal para manejo regional
  return parseMoneyUniversal(numeroStr, paisCode);
};

/**
 * Categorizar gasto según país
 * @param {string} texto - Texto del gasto
 * @param {string} paisCode - Código del país
 * @returns {string} - Categoría identificada
 */
const categorizarGasto = (texto, paisCode = 'CO') => {
  const textoLower = texto.toLowerCase();
  
  // Diccionario de categorías por país
  const categoriasPorPais = {
    // Colombia
    CO: {
      transporte: ['bus', 'taxi', 'uber', 'didí', 'picap', 'transmilenio', 'sitp', 'colectivo', 'mototaxi'],
      alimentacion: ['café', 'almuerzo', 'comida', 'empanada', 'pan', 'gaseosa', 'agua', 'onces', 'desayuno'],
      insumos: ['bolsa', 'empaque', 'material', 'insumo', 'proveedor', 'materia prima', 'cajas', 'etiquetas'],
      fijos: ['arriendo', 'luz', 'agua', 'internet', 'teléfono', 'gas', 'administración', 'predial'],
      marketing: ['publicidad', 'facebook', 'instagram', 'google', 'redes', 'anuncio', 'promoción']
    },
    // México
    MX: {
      transporte: ['camión', 'metro', 'taxi', 'uber', 'didí', 'colectivo', 'pesero', 'micro'],
      alimentacion: ['café', 'comida', 'taco', 'tortilla', 'almuerzo', 'desayuno', 'cenar'],
      insumos: ['bolsa', 'empaque', 'material', 'insumo', 'proveedor', 'materia prima'],
      fijos: ['renta', 'luz', 'agua', 'internet', 'teléfono', 'gas', 'mantenimiento'],
      marketing: ['publicidad', 'facebook', 'instagram', 'google', 'anuncio', 'promoción']
    },
    // Argentina
    AR: {
      transporte: ['bondi', 'colectivo', 'taxi', 'uber', 'didí', 'subte', 'tren'],
      alimentacion: ['café', 'comida', 'factura', 'medialuna', 'almuerzo', 'desayuno', 'merienda'],
      insumos: ['bolsa', 'empaque', 'material', 'insumo', 'proveedor', 'materia prima'],
      fijos: ['alquiler', 'luz', 'agua', 'internet', 'teléfono', 'gas', 'expensas'],
      marketing: ['publicidad', 'facebook', 'instagram', 'google', 'anuncio', 'promoción']
    },
    // España
    ES: {
      transporte: ['autobús', 'metro', 'taxi', 'uber', 'cabify', 'cercanías', 'tren'],
      alimentacion: ['café', 'comida', 'bocadillo', 'menú', 'almuerzo', 'desayuno', 'merienda'],
      insumos: ['bolsa', 'envase', 'material', 'insumo', 'proveedor', 'materia prima'],
      fijos: ['alquiler', 'luz', 'agua', 'internet', 'teléfono', 'gas', 'comunidad'],
      marketing: ['publicidad', 'facebook', 'instagram', 'google', 'anuncio', 'promoción']
    },
    // Estados Unidos
    US: {
      transport: ['bus', 'taxi', 'uber', 'lyft', 'subway', 'train', 'metro'],
      food: ['coffee', 'lunch', 'meal', 'breakfast', 'dinner', 'snack'],
      supplies: ['bag', 'packaging', 'material', 'supply', 'raw material', 'boxes'],
      fixed: ['rent', 'electricity', 'water', 'internet', 'phone', 'gas', 'maintenance'],
      marketing: ['advertising', 'facebook', 'instagram', 'google', 'ad', 'promotion']
    },
    // Reino Unido
    UK: {
      transport: ['bus', 'taxi', 'uber', 'tube', 'train', 'underground'],
      food: ['coffee', 'lunch', 'meal', 'breakfast', 'dinner', 'snack'],
      supplies: ['bag', 'packaging', 'material', 'supply', 'raw material', 'boxes'],
      fixed: ['rent', 'electricity', 'water', 'internet', 'phone', 'gas', 'council tax'],
      marketing: ['advertising', 'facebook', 'instagram', 'google', 'ad', 'promotion']
    }
  };
  
  // Obtener diccionario por país (con fallback a CO)
  const dict = categoriasPorPais[paisCode] || categoriasPorPais.CO;
  
  // Buscar coincidencia en todas las categorías
  for (const [categoria, palabras] of Object.entries(dict)) {
    for (const palabra of palabras) {
      if (textoLower.includes(palabra)) {
        return categoria;
      }
    }
  }
  
  return 'otros';
};

/**
 * Extraer cantidad de unidades de un texto
 * @param {string} texto - Texto que contiene la cantidad
 * @returns {number} - Cantidad extraída (default: 1)
 */
const extraerCantidad = (texto) => {
  const patronCantidad = /(\d+)\s*(?:unidades?|productos?|items?|uds?)/i;
  const match = texto.match(patronCantidad);
  if (match) return parseInt(match[1]);
  
  // Buscar cualquier número al inicio
  const patronNumero = /^(\d+)/;
  const matchNumero = texto.match(patronNumero);
  if (matchNumero) return parseInt(matchNumero[1]);
  
  return 1;
};

/**
 * Extraer nombre de producto de un texto de venta
 * @param {string} texto - Texto completo de la venta
 * @returns {string} - Nombre del producto
 */
const extraerProducto = (texto) => {
  // Remover patrones comunes y números
  let limpio = texto
    .replace(/vend(?:í|i|er|ido)/i, '')
    .replace(/\d+/g, '')
    .replace(/a\s+\$?[\d.,]+/g, '')
    .replace(/por\s+\$?[\d.,]+/g, '')
    .trim();
  
  // Limpiar artículos
  const articulos = ['el ', 'la ', 'los ', 'las ', 'un ', 'una ', 'unos ', 'unas '];
  articulos.forEach(art => {
    if (limpio.startsWith(art)) limpio = limpio.substring(art.length);
  });
  
  return limpio || 'producto';
};

/**
 * Procesar comando natural de voz
 * @param {string} texto - Texto reconocido por voz
 * @param {string} paisCode - Código del país
 * @param {string} idioma - Idioma (es/en)
 * @returns {Object} - Comando estructurado
 */
export const procesarComandoNatural = (texto, paisCode = 'CO', idioma = 'es') => {
  const textoOriginal = texto;
  let textoLower = texto.toLowerCase();
  
  // Pre-procesamiento: limpiar monedas y normalizar números
  textoLower = textoLower.replace(/[$€£]/g, '');
  textoLower = normalizarNumerosTexto(textoLower, paisCode);
  
  // Español
  if (idioma === 'es') {
    // GASTO: "gasté 5 mil en el bus" o "gaste 5000 en taxi"
    const patronGasto = /gast(?:é|e|ar|ado)\s+([\d.,\s]+)(?:\s+en\s+)?([a-záéíóúñ\s]+)$/i;
    const matchGasto = textoLower.match(patronGasto);
    if (matchGasto) {
      const valor = extraerValorNumerico(matchGasto[1], paisCode);
      const descripcion = matchGasto[2].trim();
      return {
        tipo: 'egreso',
        valor: roundMoney(valor, 0),
        categoria: categorizarGasto(descripcion, paisCode),
        descripcion: descripcion,
        textoOriginal,
        exito: true,
        mensaje: `✅ Gasto registrado: ${descripcion} por ${valor}`
      };
    }
    
    // VENTA: "vendí 3 sillas a 20 mil" o "vendí 5 empanadas por 2 lucas"
    const patronVenta = /vend(?:í|i|er|ido)\s+(\d+)\s+([a-záéíóúñ\s]+?)\s+(?:a|por)\s+([\d.,\s]+)/i;
    const matchVenta = textoLower.match(patronVenta);
    if (matchVenta) {
      const cantidad = parseInt(matchVenta[1]);
      const producto = extraerProducto(matchVenta[2]);
      const valor = extraerValorNumerico(matchVenta[3], paisCode);
      const valorTotal = roundMoney(valor * cantidad, 0);
      
      return {
        tipo: 'ingreso',
        cantidad,
        producto,
        valorUnitario: roundMoney(valor, 0),
        valorTotal,
        textoOriginal,
        exito: true,
        mensaje: `✅ Venta registrada: ${cantidad} ${producto} a ${valor} c/u (Total: ${valorTotal})`
      };
    }
  }
  
  // Inglés
  if (idioma === 'en') {
    // EXPENSE: "spent 50 on bus" or "spent 5000 on taxi"
    const patronExpense = /spent\s+([\d.,\s]+)(?:\s+on\s+)?([a-z\s]+)$/i;
    const matchExpense = textoLower.match(patronExpense);
    if (matchExpense) {
      const valor = extraerValorNumerico(matchExpense[1], paisCode);
      const descripcion = matchExpense[2].trim();
      return {
        tipo: 'egreso',
        valor: roundMoney(valor, 2),
        categoria: categorizarGasto(descripcion, paisCode),
        descripcion: descripcion,
        textoOriginal,
        exito: true,
        mensaje: `✅ Expense recorded: ${descripcion} for ${valor}`
      };
    }
    
    // SALE: "sold 3 chairs for 5000" or "sold 5 empanadas at 2000"
    const patronSale = /sold\s+(\d+)\s+([a-z\s]+?)\s+(?:at|for)\s+([\d.,\s]+)/i;
    const matchSale = textoLower.match(patronSale);
    if (matchSale) {
      const quantity = parseInt(matchSale[1]);
      const product = extraerProducto(matchSale[2]);
      const value = extraerValorNumerico(matchSale[3], paisCode);
      const totalValue = roundMoney(value * quantity, 2);
      
      return {
        tipo: 'ingreso',
        cantidad: quantity,
        producto: product,
        valorUnitario: roundMoney(value, 2),
        valorTotal: totalValue,
        textoOriginal,
        exito: true,
        mensaje: `✅ Sale recorded: ${quantity} ${product} at ${value} each (Total: ${totalValue})`
      };
    }
  }
  
  // Fallback: no se entendió el comando
  return {
    tipo: 'manual',
    textoOriginal,
    exito: false,
    mensaje: '❌ No entendí el comando. Puedes editarlo manualmente o intentar de nuevo.',
    sugerencias: [
      'Ejemplo: "gasté 5 mil en el bus"',
      'Ejemplo: "vendí 3 sillas a 20 mil"',
      idioma === 'en' ? 'Example: "spent 50 on bus"' : null,
      idioma === 'en' ? 'Example: "sold 3 chairs for 20 dollars"' : null
    ].filter(Boolean)
  };
};

/**
 * Iniciar escucha de voz con manejo de estado y permisos
 * @param {Function} onResult - Callback para resultados
 * @param {Function} onInterim - Callback para resultados interinos (feedback)
 * @param {Function} onError - Callback para errores
 * @param {string} paisCode - Código del país
 * @param {string} idioma - Idioma (es/en)
 * @returns {Object} - Controlador con stop() y estado
 */
export const iniciarEscuchaVoz = (onResult, onInterim, onError, paisCode = 'CO', idioma = 'es') => {
  // Verificar soporte del navegador
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError?.('❌ Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.');
    return { stop: () => {}, isListening: false };
  }
  
  let isRecognizing = false;
  let recognition = null;
  
  const start = () => {
    if (isRecognizing) {
      console.log('⚠️ Ya hay una sesión de voz activa');
      return;
    }
    
    recognition = new SpeechRecognition();
    
    // Configurar según idioma y país
    const langMap = {
      'es': 'es-CO',  // Default español
      'en': 'en-US'    // Default inglés
    };
    recognition.lang = langMap[idioma] || 'es-CO';
    recognition.interimResults = true;  // Mostrar feedback en tiempo real
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    
    recognition.onstart = () => {
      isRecognizing = true;
      console.log('🎤 Escuchando...');
    };
    
    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const texto = lastResult[0].transcript;
      
      if (lastResult.isFinal) {
        console.log('🗣️ Texto final:', texto);
        const comando = procesarComandoNatural(texto, paisCode, idioma);
        onResult?.(comando);
      } else {
        // Resultados interinos (feedback en tiempo real)
        onInterim?.(texto);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('❌ Error de voz:', event.error);
      isRecognizing = false;
      
      const mensajesError = {
        'not-allowed': '❌ Permiso de micrófono denegado. Habilítalo en la configuración del navegador.',
        'no-speech': '⏰ No detecté voz. ¿Puedes intentarlo de nuevo?',
        'audio-capture': '🎙️ No se encontró micrófono. Conecta uno e intenta de nuevo.',
        'network': '🌐 Error de red. Verifica tu conexión a internet.'
      };
      
      onError?.(mensajesError[event.error] || `❌ Error de voz: ${event.error}`);
    };
    
    recognition.onend = () => {
      isRecognizing = false;
      console.log('🎤 Escucha finalizada');
    };
    
    try {
      recognition.start();
    } catch (e) {
      console.error('Error al iniciar reconocimiento:', e);
      isRecognizing = false;
      onError?.('❌ No se pudo iniciar el reconocimiento de voz');
    }
  };
  
  const stop = () => {
    if (recognition && isRecognizing) {
      recognition.stop();
      isRecognizing = false;
    }
  };
  
  start();
  
  return { stop, isListening: () => isRecognizing };
};

export default { iniciarEscuchaVoz, procesarComandoNatural };

