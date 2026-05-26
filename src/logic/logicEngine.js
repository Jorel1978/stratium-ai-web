// src/logic/logicEngine.js
// Módulo de lógica financiera migrada desde el bot de Discord

/**
 * Calcula el valor unitario basado en total y cantidad
 * @param {number} total - Monto total
 * @param {number} cantidad - Cantidad de unidades
 * @returns {number} - Valor unitario redondeado a 2 decimales
 */
export const calcularUnitario = (total, cantidad) => {
    if (!cantidad || cantidad === 0) return 0;
    return Math.round((total / cantidad) * 100) / 100;
};

/**
 * Convierte cualquier formato de número a float
 * Maneja: $35,000.00, 35.000,00, 35000, 35,000.00, USD 1,234.56, etc.
 * @param {string|number} valor - Valor a convertir
 * @returns {number} - Número convertido o 0 si falla
 */
export const limpiarNumeroInternacional = (valor) => {
    if (valor === null || valor === undefined) return 0.0;
    
    if (typeof valor === 'number') return valor;
    
    let strValor = String(valor).trim();
    if (!strValor) return 0.0;
    
    strValor = strValor.replace(/[A-Za-z\s\$€£¥]/g, '');
    
    let strLimpio;
    
    if (strValor.includes(',') && strValor.includes('.')) {
        if (strValor.lastIndexOf('.') > strValor.lastIndexOf(',')) {
            strLimpio = strValor.replace(/,/g, '');
        } else {
            strLimpio = strValor.replace(/\./g, '').replace(',', '.');
        }
    }
    else if (strValor.includes(',') && !strValor.includes('.')) {
        const partes = strValor.split(',');
        if (partes.length === 2 && partes[1].length <= 2) {
            strLimpio = strValor.replace(',', '.');
        } else {
            strLimpio = strValor.replace(/,/g, '');
        }
    }
    else if (strValor.includes('.') && !strValor.includes(',')) {
        const partes = strValor.split('.');
        if (partes.length > 2) {
            strLimpio = strValor.replace(/\./g, '');
        } else {
            strLimpio = strValor;
        }
    }
    else {
        strLimpio = strValor;
    }
    
    try {
        const num = parseFloat(strLimpio);
        return isNaN(num) ? 0.0 : num;
    } catch (e) {
        console.warn(`No se pudo convertir '${valor}' a número`);
        return 0.0;
    }
};

/**
 * Versión ultra segura - No destruye decimales
 * @param {string|number} valor - Valor a limpiar
 * @returns {number} - Número limpio
 */
export const limpiarNumero = (valor) => {
    if (valor === null || valor === undefined) return 0.0;
    
    if (typeof valor === 'number') return valor;
    
    let texto = String(valor).trim();
    if (!texto) return 0.0;
    
    texto = texto.replace(/[A-Za-z\s\$€£¥]/g, '');
    
    if (texto.includes(',') && !texto.includes('.')) {
        const partes = texto.split(',');
        if (partes.length === 2 && partes[1].length <= 3) {
            texto = texto.replace(',', '.');
        } else {
            texto = texto.replace(/,/g, '');
        }
    }
    
    texto = texto.replace(/[^\d.-]/g, '');
    
    const partes = texto.split('.');
    if (partes.length > 2) {
        texto = partes.slice(0, -1).join('') + '.' + partes[partes.length - 1];
    }
    
    try {
        const num = parseFloat(texto);
        return (texto && texto !== '-') ? num : 0.0;
    } catch (e) {
        return 0.0;
    }
};

/**
 * Normaliza texto: minúsculas, sin espacios extras
 * @param {string} texto - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
export const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Procesa costeo de producción (Bilingüe)
 * @param {Object} params - Parámetros de costeo
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {Object} - Resultado del costeo
 */
export const procesarCosteo = ({ materiales, horas, valorHora, transporte, precioVenta = null, config = {} }, lang = 'es') => {
    const valorHoraEfectivo = valorHora || config.valor_hora || 20000;
    const gastosFijos = config.gastos_fijos || 0;
    
    const costoMateriales = materiales || 0;
    const costoManoObra = horas * valorHoraEfectivo;
    const factorFijos = gastosFijos / 160;
    const costoFijoAsignado = horas * factorFijos;
    
    const costoTotalOperativo = costoMateriales + costoManoObra + costoFijoAsignado + (transporte || 0);
    
    let resultado = {
        costoUnitario: costoTotalOperativo,
        costoMateriales: costoMateriales,
        costoManoObra: costoManoObra,
        costoFijoAsignado: costoFijoAsignado,
        horasTrabajo: horas,
        valorHora: valorHoraEfectivo,
        transporte: transporte || 0
    };
    
    if (precioVenta !== null && precioVenta > 0) {
        const utilidadNeta = precioVenta - costoTotalOperativo;
        const margenNeto = (utilidadNeta / precioVenta) * 100;
        
        const dictamen = lang === 'es' 
            ? (margenNeto < 20 
                ? `⚠️ ALERTA: El margen es de ${margenNeto.toFixed(1)}%. Estás trabajando para cubrir gastos. Sube el precio o reduce el tiempo de producción.`
                : `✅ El margen es de ${margenNeto.toFixed(1)}%. Este servicio/producto es rentable.`)
            : (margenNeto < 20
                ? `⚠️ ALERT: The margin is ${margenNeto.toFixed(1)}%. You are working to cover expenses. Raise the price or reduce production time.`
                : `✅ The margin is ${margenNeto.toFixed(1)}%. This service/product is profitable.`);
        
        resultado = {
            ...resultado,
            precioVenta: precioVenta,
            utilidadNeta: utilidadNeta,
            margenNeto: parseFloat(margenNeto.toFixed(1)),
            dictamen: dictamen
        };
    }
    
    return resultado;
};

/**
 * Valida una operación financiera (Bilingüe)
 * @param {string} tipo - 'INGRESO' o 'EGRESO'
 * @param {number} monto - Monto de la operación
 * @param {string} concepto - Concepto de la operación
 * @param {number} saldoCajaActual - Saldo actual en caja
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {Object} - Resultado de la validación
 */
export const validarOperacion = (tipo, monto, concepto, saldoCajaActual, lang = 'es') => {
    const montoNum = parseFloat(monto);
    const tipoUpper = tipo.toUpperCase();
    const saldo = parseFloat(saldoCajaActual) || 0;
    
    if (tipoUpper === 'EGRESO' && montoNum > saldo) {
        const mensaje = lang === 'es'
            ? `⚠️ ADVERTENCIA: Este gasto de ${formatMoney(montoNum, lang)} supera tu saldo actual (${formatMoney(saldo, lang)}). Asegúrate de tener fondos suficientes.`
            : `⚠️ WARNING: This expense of ${formatMoney(montoNum, lang)} exceeds your current balance (${formatMoney(saldo, lang)}). Make sure you have sufficient funds.`;
        return {
            aprobado: true,
            mensaje: mensaje
        };
    }
    
    const conceptosVagos = ["varios", "cosa", "pago", "gastos", "etc", "x", "varios", "thing", "payment", "stuff", "expense", "gasto", "cosas", "pagoss", "gastoss"];
    const conceptoLower = concepto ? concepto.toLowerCase().trim() : '';
    
    const esVago = conceptosVagos.some(vago => 
        conceptoLower === vago || 
        (conceptoLower.startsWith(vago) && conceptoLower.length < 8)
    );
    
    const esDemasiadoCorto = conceptoLower.length < 4 && conceptoLower.length > 0;
    
    if (!conceptoLower || esVago || esDemasiadoCorto) {
        const mensaje = lang === 'es'
            ? "❌ CONCEPTO MUY VAGO: Necesito saber exactamente qué compraste o vendiste. Ejemplos válidos: 'Compra 10 gorras', 'Venta de camisas', 'Pago de arriendo'."
            : "❌ VERY VAGUE CONCEPT: I need to know exactly what you bought or sold. Valid examples: 'Buy 10 caps', 'Sale of shirts', 'Rent payment'.";
        return {
            aprobado: false,
            mensaje: mensaje
        };
    }
    
    const mensaje = lang === 'es' ? "✅ Movimiento Validado." : "✅ Transaction Validated.";
    return {
        aprobado: true,
        mensaje: mensaje
    };
};

/**
 * Categoriza automáticamente un gasto
 * @param {string} concepto - Concepto del gasto
 * @returns {string} - Categoría del gasto
 */
export const categorizarGasto = (concepto) => {
    if (!concepto) return 'otros_gastos';
    const conceptoLower = concepto.toLowerCase();
    
    const categorias = {
        'operativo': ['arriendo', 'nomina', 'sueldo', 'servicios', 'luz', 'agua', 'internet', 'rent', 'payroll', 'salary', 'utilities', 'electricity', 'water', 'internet'],
        'logistica': ['transporte', 'flete', 'gasolina', 'domicilio', 'transport', 'freight', 'gasoline', 'delivery'],
        'marketing': ['publicidad', 'facebook', 'instagram', 'volantes', 'comision', 'advertising', 'commission'],
        'directo': ['mercancia', 'materia prima', 'insumos', 'compra', 'merchandise', 'raw material', 'supplies', 'purchase']
    };
    
    for (const [categoria, palabras] of Object.entries(categorias)) {
        if (palabras.some(p => conceptoLower.includes(p))) {
            return categoria;
        }
    }
    return 'otros_gastos';
};

/**
 * Formatea un número como moneda (COP o USD)
 * @param {number} valor - Valor a formatear
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {string} - Valor formateado
 */
const formatMoney = (valor, lang = 'es') => {
    if (lang === 'en') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(valor));
    }
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(valor));
};

/**
 * Genera recomendación financiera (Bilingüe)
 * @param {string} tipo - 'INGRESO' o 'EGRESO'
 * @param {number} valor - Valor de la operación
 * @param {string} categoria - Categoría del gasto
 * @param {number} saldoCaja - Saldo actual en caja
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {string} - Recomendación
 */
const generarRecomendacion = (tipo, valor, categoria, saldoCaja, lang = 'es') => {
    if (tipo === 'INGRESO') {
        if (saldoCaja < 0) {
            return lang === 'es'
                ? `💰 Este ingreso de ${formatMoney(valor, lang)} ayuda a reducir el saldo negativo.`
                : `💰 This income of ${formatMoney(valor, lang)} helps reduce the negative balance.`;
        }
        return lang === 'es'
            ? `💰 Ingreso registrado. Considera destinar un 20% a ahorro/inversión.`
            : `💰 Income recorded. Consider allocating 20% to savings/investment.`;
    }
    
    const porcentajeGasto = saldoCaja > 0 ? (valor / saldoCaja) * 100 : 100;
    
    if (porcentajeGasto > 30) {
        return lang === 'es'
            ? `⚠️ Este gasto representa el ${porcentajeGasto.toFixed(1)}% de tu saldo disponible. Evalúa si es urgente.`
            : `⚠️ This expense represents ${porcentajeGasto.toFixed(1)}% of your available balance. Evaluate if it is urgent.`;
    }
    
    if (categoria === 'marketing') {
        return lang === 'es'
            ? `📢 Inversión en marketing. Recomiendo medir el ROI de esta campaña.`
            : `📢 Investment in marketing. I recommend measuring the ROI of this campaign.`;
    }
    
    if (categoria === 'directo') {
        return lang === 'es'
            ? `📦 Compra de inventario. Asegúrate de que estos productos tengan rotación rápida.`
            : `📦 Inventory purchase. Make sure these products have fast turnover.`;
    }
    
    return lang === 'es'
        ? `📝 Gasto registrado. Revisa que esté alineado con tu presupuesto.`
        : `📝 Expense recorded. Check that it is aligned with your budget.`;
};

/**
 * Auditoría completa de una operación (Bilingüe)
 * @param {string} texto - Texto de la operación
 * @param {number} valor - Valor de la operación
 * @param {Object} contexto - Contexto de la operación
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {Object} - Resultado de la auditoría
 */
export const auditarOperacion = (texto, valor, contexto = {}, lang = 'es') => {
    const textoNormalizado = normalizarTexto(texto);
    const valorNum = parseFloat(valor) || 0;
    const saldoCaja = parseFloat(contexto.saldoCaja) || 0;
    
    let tipo = 'INGRESO';
    if (textoNormalizado.includes('compra') || 
        textoNormalizado.includes('gasto') || 
        textoNormalizado.includes('pago') ||
        textoNormalizado.includes('nomina') ||
        textoNormalizado.includes('buy') ||
        textoNormalizado.includes('expense') ||
        textoNormalizado.includes('payment') ||
        textoNormalizado.includes('payroll')) {
        tipo = 'EGRESO';
    }
    
    let concepto = textoNormalizado
        .replace(/\d+(?:[.,]\d+)*/g, '')
        .replace(/^(compra|venta|gasto|ingreso|pago|registra|escanea|analiza|buy|sale|expense|income|payment|register|scan|analyze):?\s*/i, '')
        .replace(/^(por|a|de|para|con|for|to|of|with|by)\s+/i, '')
        .trim();
    
    if (!concepto) concepto = texto.substring(0, 50);
    concepto = concepto.charAt(0).toUpperCase() + concepto.slice(1);
    
    const validacion = validarOperacion(tipo, valorNum, concepto, saldoCaja, lang);
    const categoria = tipo === 'EGRESO' ? categorizarGasto(concepto) : 'ingreso';
    
    const emojis = {
        'Venta': '💰', 'Compra': '📦', 'Gasto': '📉', 'Nómina': '👥',
        'operativo': '🏢', 'logistica': '🚚', 'marketing': '📢', 'directo': '📦',
        'ingreso': '💰', 'otros_gastos': '📝'
    };
    
    const emoji = emojis[categoria] || emojis[tipo.toLowerCase()] || '📝';
    const nombreCategoria = categoria === 'ingreso' ? (lang === 'es' ? 'Venta' : 'Sale') : categoria.charAt(0).toUpperCase() + categoria.slice(1).replace('_', ' ');
    
    return {
        textoOriginal: texto,
        concepto: concepto,
        valor: valorNum,
        tipo: tipo === 'INGRESO' ? 'ingreso' : 'egreso',
        categoria: nombreCategoria,
        emoji: emoji,
        validado: validacion.aprobado,
        mensajeValidacion: validacion.mensaje,
        recomendacion: validacion.aprobado ? generarRecomendacion(tipo, valorNum, categoria, saldoCaja, lang) : '',
        saldoCajaActual: saldoCaja,
        saldoSimulado: tipo === 'EGRESO' ? saldoCaja - valorNum : saldoCaja + valorNum,
        cantidad: 1
    };
};

// ============================================================
// 🚀 FUNCIÓN: ANALIZAR SALUD FINANCIERA (CFO AGGRESSIVE)
// ============================================================

/**
 * Calcula días desde la última venta o desde la fecha de registro
 * @param {string} producto - Nombre del producto
 * @param {Array} movimientos - Lista de transacciones
 * @param {Object} inventarioItem - Datos del producto en inventario
 * @returns {Object} - Días en stock y fecha de referencia
 */
const calcularDiasEnStock = (producto, movimientos, inventarioItem) => {
    const ventasProducto = movimientos.filter(m => 
        m.tipo === 'ingreso' && 
        m.concepto?.toLowerCase() === producto.toLowerCase()
    );
    
    let diasEnStock = null;
    let fechaReferencia = null;
    
    if (ventasProducto.length > 0) {
        const ultimaVenta = new Date(Math.max(...ventasProducto.map(v => new Date(v.fecha))));
        const hoy = new Date();
        diasEnStock = Math.floor((hoy - ultimaVenta) / (1000 * 60 * 60 * 24));
        fechaReferencia = ultimaVenta;
    } 
    else if (inventarioItem?.fechaRegistro || inventarioItem?.fechaActualizacion) {
        const fechaRegistro = inventarioItem.fechaRegistro?.toDate?.() || 
                              inventarioItem.fechaActualizacion?.toDate?.() || 
                              new Date(inventarioItem.fechaRegistro || inventarioItem.fechaActualizacion);
        const hoy = new Date();
        diasEnStock = Math.floor((hoy - fechaRegistro) / (1000 * 60 * 60 * 24));
        fechaReferencia = fechaRegistro;
    }
    
    return { diasEnStock, fechaReferencia, tieneVentas: ventasProducto.length > 0 };
};

/**
 * Calcula precio sugerido según rango de días
 * @param {number} costoUnitario - Costo del producto
 * @param {number} diasEnStock - Días sin rotación
 * @param {string} lang - Idioma
 * @returns {Object} - Rango de precios sugeridos
 */
const calcularPrecioSugerido = (costoUnitario, diasEnStock, lang = 'es') => {
    let rangoMin = 0;
    let rangoMax = 0;
    let porcentajeMin = 0;
    let porcentajeMax = 0;
    let mensaje = '';
    let tipo = '';
    
    if (diasEnStock > 180) {
        porcentajeMin = 10;
        porcentajeMax = 30;
        rangoMin = costoUnitario * 1.10;
        rangoMax = costoUnitario * 1.30;
        tipo = 'RECUPERACION';
        mensaje = lang === 'es' 
            ? `⚠️ Producto con más de 180 días sin rotación. Precio sugerido: ${formatMoney(rangoMin, lang)} - ${formatMoney(rangoMax, lang)} (Recuperación de inversión - margen ${porcentajeMin}%-${porcentajeMax}%)`
            : `⚠️ Product with over 180 days without rotation. Suggested price: ${formatMoney(rangoMin, lang)} - ${formatMoney(rangoMax, lang)} (Investment recovery - ${porcentajeMin}%-${porcentajeMax}% margin)`;
    } else if (diasEnStock > 90) {
        porcentajeMin = 30;
        porcentajeMax = 45;
        rangoMin = costoUnitario * 1.30;
        rangoMax = costoUnitario * 1.45;
        tipo = 'LIQUIDACION';
        mensaje = lang === 'es'
            ? `⚠️ Producto con más de 90 días sin rotación. Precio sugerido: ${formatMoney(rangoMin, lang)} - ${formatMoney(rangoMax, lang)} (Liquidación - margen ${porcentajeMin}%-${porcentajeMax}%)`
            : `⚠️ Product with over 90 days without rotation. Suggested price: ${formatMoney(rangoMin, lang)} - ${formatMoney(rangoMax, lang)} (Liquidation - ${porcentajeMin}%-${porcentajeMax}% margin)`;
    } else if (diasEnStock > 30) {
        porcentajeMin = 45;
        porcentajeMax = 60;
        rangoMin = costoUnitario * 1.45;
        rangoMax = costoUnitario * 1.60;
        tipo = 'IMPULSO';
        mensaje = lang === 'es'
            ? `⚠️ Producto con más de 30 días sin rotación. Precio sugerido: ${formatMoney(rangoMin, lang)} - ${formatMoney(rangoMax, lang)} (Impulso - margen ${porcentajeMin}%-${porcentajeMax}%)`
            : `⚠️ Product with over 30 days without rotation. Suggested price: ${formatMoney(rangoMin, lang)} - ${formatMoney(rangoMax, lang)} (Boost - ${porcentajeMin}%-${porcentajeMax}% margin)`;
    }
    
    return { rangoMin, rangoMax, porcentajeMin, porcentajeMax, mensaje, tipo, tieneAlerta: diasEnStock > 30 };
};

/**
 * Analiza la salud financiera y genera alertas accionables
 * @param {Array} movimientos - Lista de transacciones
 * @param {Array} inventario - Lista de productos en stock (opcional)
 * @param {Object} config - Configuración del negocio
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {Object} - Alertas y recomendaciones
 */
export const analizarSaludFinanciera = (movimientos, inventario = [], config = {}, lang = 'es') => {
    const hoy = new Date();
    const ultimos30Dias = movimientos.filter(m => {
        if (!m.fecha) return false;
        const fechaMov = new Date(m.fecha);
        const diffDays = (hoy - fechaMov) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
    });
    
    const ventas = ultimos30Dias.filter(m => m.tipo === 'ingreso');
    const gastos = ultimos30Dias.filter(m => m.tipo === 'egreso');
    
    const totalVentas = ventas.reduce((s, m) => s + (m.valor || 0), 0);
    const totalGastos = gastos.reduce((s, m) => s + (m.valor || 0), 0);
    const saldoActual = totalVentas - totalGastos;
    
    const gastoDiarioPromedio = totalGastos / 30;
    let diasOxigeno = 0;
    
    if (totalVentas === 0 && saldoActual < 0) {
        diasOxigeno = 0;
    } else if (gastoDiarioPromedio <= 0 || totalVentas === 0) {
        diasOxigeno = null;
    } else {
        diasOxigeno = Math.floor(saldoActual / gastoDiarioPromedio);
        if (diasOxigeno < 0) diasOxigeno = 0;
    }
    
    // ============================================================
    // 2. ALERTAS DE PRODUCTOS CON BAJA ROTACIÓN
    // ============================================================
    const alertasProductos = [];
    const productosConVentas = new Set();
    
    ventas.forEach(v => {
        if (v.concepto) productosConVentas.add(v.concepto.toLowerCase());
    });
    
    const inventarioLocal = inventario.length > 0 ? inventario : [];
    
    for (const item of inventarioLocal) {
        const nombreOriginal = item.producto;
        const cantidad = item.cantidad || 0;
        const costoUnitario = item.costoUnitario || 0;
        
        if (!nombreOriginal || cantidad <= 0) continue;
        
        const { diasEnStock, fechaReferencia, tieneVentas } = calcularDiasEnStock(nombreOriginal, movimientos, item);
        
        if (diasEnStock !== null && diasEnStock > 30 && cantidad > 0) {
            const { mensaje, tieneAlerta, rangoMin, rangoMax, porcentajeMin, porcentajeMax, tipo } = calcularPrecioSugerido(costoUnitario, diasEnStock, lang);
            
            if (tieneAlerta) {
                alertasProductos.push({
                    tipo: 'PRODUCTO_BAJA_ROTACION',
                    producto: nombreOriginal,
                    mensaje: mensaje,
                    diasEnStock: diasEnStock,
                    cantidad: cantidad,
                    costoUnitario: costoUnitario,
                    precioSugeridoMin: rangoMin,
                    precioSugeridoMax: rangoMax,
                    margenSugeridoMin: porcentajeMin,
                    margenSugeridoMax: porcentajeMax,
                    tipoSugerencia: tipo,
                    fechaReferencia: fechaReferencia,
                    tieneVentas: tieneVentas,
                    accion: 'REVISAR_PRECIO'
                });
            }
        }
    }
    
    // 3. ALERTAS DE MARGEN BAJO
    const alertasMargen = [];
    ventas.forEach(venta => {
        const cantidad = venta.cantidad || 1;
        const precio = venta.valor / cantidad;
        const costo = venta.costoUnitario || 0;
        const margen = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
        
        if (costo > 0 && margen < 20 && margen > 0) {
            const mensaje = lang === 'es'
                ? `💰 "${venta.concepto}" tiene margen del ${margen.toFixed(1)}% (mínimo recomendado 20%). Si las devoluciones superan el 5%, estás perdiendo dinero.`
                : `💰 "${venta.concepto}" has a margin of ${margen.toFixed(1)}% (minimum recommended 20%). If returns exceed 5%, you are losing money.`;
            alertasMargen.push({
                tipo: 'MARGEN_BAJO',
                producto: venta.concepto,
                mensaje: mensaje,
                accion: 'REVISAR_PRECIO',
                urgencia: margen < 10 ? 'ALTA' : 'MEDIA',
                margenActual: margen
            });
        }
    });
    
    // 4. ALERTA DE PRODUCTO ESTRELLA
    let productoEstrella = null;
    let maxVentas = 0;
    if (ventas.length > 0) {
        const ventasPorProducto = {};
        ventas.forEach(v => {
            const prod = v.concepto;
            if (prod) {
                if (!ventasPorProducto[prod]) ventasPorProducto[prod] = 0;
                ventasPorProducto[prod] += v.valor;
            }
        });
        
        for (const [prod, total] of Object.entries(ventasPorProducto)) {
            if (total > maxVentas) {
                maxVentas = total;
                productoEstrella = prod;
            }
        }
    }
    
    // 5. ALERTA DE QUIEBRA
    let alertaQuiebra = null;
    if (diasOxigeno !== null && diasOxigeno < 15 && diasOxigeno >= 0) {
        const mensaje = lang === 'es'
            ? `⏳ Tu negocio tiene ${diasOxigeno} días de oxígeno financiero. Ventas: $${totalVentas.toLocaleString()} vs Gastos: $${totalGastos.toLocaleString()}.`
            : `⏳ Your business has ${diasOxigeno} days of financial oxygen. Sales: $${totalVentas.toLocaleString()} vs Expenses: $${totalGastos.toLocaleString()}.`;
        const recomendacion = lang === 'es'
            ? (diasOxigeno < 7 
                ? '🚨 URGENTE: Congela gastos no esenciales HOY. Prioriza cobro de cartera.'
                : '📉 Reduce inventario de productos lentos y negocia plazos con proveedores.')
            : (diasOxigeno < 7
                ? '🚨 URGENT: Freeze non-essential expenses TODAY. Prioritize portfolio collection.'
                : '📉 Reduce inventory of slow products and negotiate terms with suppliers.');
        alertaQuiebra = {
            tipo: 'ALERTA_QUIEBRA',
            mensaje: mensaje,
            recomendacion: recomendacion,
            urgencia: diasOxigeno < 7 ? 'CRITICA' : 'ALTA',
            diasOxigeno
        };
    }
    
    // 6. RECOMENDACIONES ESTRATÉGICAS (CORREGIDO)
    const recomendaciones = [];
    
    // ✅ CORRECCIÓN CRÍTICA: Usar totalVentas correctamente
    const noHayVentas = totalVentas === 0;
    
    if (noHayVentas && saldoActual < 0) {
        recomendaciones.push('🚨 No has registrado ventas y tu saldo es negativo. Enfócate en generar tu primer ingreso. Revisa si este gasto fue una inversión necesaria o un gasto evitable.');
    } else if (noHayVentas && saldoActual >= 0) {
        recomendaciones.push('📢 Aún no has registrado ventas. Activa tu estrategia comercial para empezar a generar ingresos.');
    } else if (saldoActual < 0 && totalVentas > 0) {
        recomendaciones.push('💰 Tus gastos superan tus ventas. Revisa tus costos fijos y busca reducir gastos no esenciales.');
    }
    
    if (productoEstrella) {
        const rec = lang === 'es'
            ? `⭐ Tu producto estrella es "${productoEstrella}". Destina el 30% de tu presupuesto de marketing a este producto.`
            : `⭐ Your star product is "${productoEstrella}". Allocate 30% of your marketing budget to this product.`;
        recomendaciones.push(rec);
    }
    
    // Recomendaciones específicas por producto
    const productosConProblemas = alertasProductos.slice(0, 3);
    for (const producto of productosConProblemas) {
        if (producto.tipoSugerencia === 'RECUPERACION') {
            const rec = lang === 'es'
                ? `💸 "${producto.producto}" lleva ${producto.diasEnStock} días sin vender. Precio sugerido: ${formatMoney(producto.precioSugeridoMin, lang)} - ${formatMoney(producto.precioSugeridoMax, lang)} (margen ${producto.margenSugeridoMin}%-${producto.margenSugeridoMax}%). Prioriza su liquidación.`
                : `💸 "${producto.producto}" has not sold for ${producto.diasEnStock} days. Suggested price: ${formatMoney(producto.precioSugeridoMin, lang)} - ${formatMoney(producto.precioSugeridoMax, lang)} (${producto.margenSugeridoMin}%-${producto.margenSugeridoMax}% margin). Prioritize liquidation.`;
            recomendaciones.push(rec);
        } else if (producto.tipoSugerencia === 'LIQUIDACION') {
            const rec = lang === 'es'
                ? `📉 "${producto.producto}" tiene ${producto.diasEnStock} días sin rotación. Precio sugerido: ${formatMoney(producto.precioSugeridoMin, lang)} - ${formatMoney(producto.precioSugeridoMax, lang)}. Aplica descuento del 30-50%.`
                : `📉 "${producto.producto}" has ${producto.diasEnStock} days without rotation. Suggested price: ${formatMoney(producto.precioSugeridoMin, lang)} - ${formatMoney(producto.precioSugeridoMax, lang)}. Apply 30-50% discount.`;
            recomendaciones.push(rec);
        } else if (producto.tipoSugerencia === 'IMPULSO') {
            const rec = lang === 'es'
                ? `⚡ "${producto.producto}" lleva ${producto.diasEnStock} días sin venta. Precio sugerido: ${formatMoney(producto.precioSugeridoMin, lang)} - ${formatMoney(producto.precioSugeridoMax, lang)} (margen ${producto.margenSugeridoMin}%-${producto.margenSugeridoMax}%). Activa promociones.`
                : `⚡ "${producto.producto}" has not sold for ${producto.diasEnStock} days. Suggested price: ${formatMoney(producto.precioSugeridoMin, lang)} - ${formatMoney(producto.precioSugeridoMax, lang)} (${producto.margenSugeridoMin}%-${producto.margenSugeridoMax}% margin). Activate promotions.`;
            recomendaciones.push(rec);
        }
    }
    
    if (alertasMargen.length > 0) {
        const rec = lang === 'es'
            ? `💰 ${alertasMargen.length} productos tienen margen bajo. Revisa precios o negocia mejores costos con proveedores.`
            : `💰 ${alertasMargen.length} products have low margins. Review prices or negotiate better costs with suppliers.`;
        recomendaciones.push(rec);
        const margenCritico = alertasMargen.filter(a => a.margenActual < 10);
        if (margenCritico.length > 0) {
            const rec2 = lang === 'es'
                ? `⚠️ ${margenCritico.length} productos están cerca de vender a pérdida. Ajusta precios URGENTE.`
                : `⚠️ ${margenCritico.length} products are close to selling at a loss. Adjust prices URGENTLY.`;
            recomendaciones.push(rec2);
        }
    }
    
    if (diasOxigeno !== null && diasOxigeno < 30 && diasOxigeno > 0) {
        const rec = lang === 'es'
            ? `⏳ Tu oxígeno financiero es de ${diasOxigeno} días. Empieza a reducir gastos no esenciales.`
            : `⏳ Your financial oxygen is ${diasOxigeno} days. Start reducing non-essential expenses.`;
        recomendaciones.push(rec);
    }
    
    if (diasOxigeno !== null && diasOxigeno >= 30) {
        const rec = lang === 'es'
            ? `✅ Tienes ${diasOxigeno} días de oxígeno. Buen momento para invertir en crecimiento.`
            : `✅ You have ${diasOxigeno} days of oxygen. Good time to invest in growth.`;
        recomendaciones.push(rec);
    }
    
    // 7. RESUMEN EJECUTIVO
    const margenNeto = totalVentas > 0 ? ((saldoActual / totalVentas) * 100).toFixed(1) : 0;
    const saludPorcentaje = Math.min(100, Math.max(0, (saldoActual / (totalVentas || 1)) * 100));
    const saludColor = saludPorcentaje >= 30 ? '#10b981' : saludPorcentaje >= 15 ? '#f59e0b' : '#ef4444';
    const saludMensaje = lang === 'es'
        ? (saludPorcentaje >= 30 ? 'Excelente' : saludPorcentaje >= 15 ? 'Estable' : 'Crítico')
        : (saludPorcentaje >= 30 ? 'Excellent' : saludPorcentaje >= 15 ? 'Stable' : 'Critical');
    
    return {
        // Métricas clave
        saldoActual,
        ventas30Dias: totalVentas,
        gastos30Dias: totalGastos,
        margenNeto: parseFloat(margenNeto),
        diasOxigeno: diasOxigeno === null ? 0 : diasOxigeno,
        productoEstrella,
        
        // Alertas
        alertas: [...alertasProductos, ...alertasMargen],
        alertaQuiebra,
        recomendaciones,
        
        // Salud visual
        saludPorcentaje,
        saludColor,
        saludMensaje,
        
        // Metadata
        fechaAnalisis: new Date().toISOString(),
        totalTransacciones: movimientos.length,
        periodoAnalizado: '30 días'
    };
};

// ============================================================
// 🚀 NUEVA FUNCIÓN: AUDITORÍA DE SOBRECOSTOS DE PROVEEDORES
// ============================================================

/**
 * Detecta sobrecostos y aumentos injustificados de proveedores
 * @param {Array} movimientos - Lista de transacciones
 * @param {Array} inventario - Lista de productos en stock
 * @param {string} plan - Plan del usuario ('pro', 'business', 'elite')
 * @param {string} lang - Idioma ('es' o 'en')
 * @returns {Object} - Alertas de sobrecostos y ahorro potencial
 */
export const auditarSobrecostosProveedores = (movimientos, inventario, plan, lang = 'es') => {
  if (plan !== 'business' && plan !== 'elite') {
    const mensaje = lang === 'es'
      ? 'Actualiza a Business o Elite para auditoría de proveedores'
      : 'Upgrade to Business or Elite for supplier audit';
    return { sobrecostos: [], ahorroPotencial: 0, mensajeResumen: mensaje };
  }
  
  const alertas = [];
  const proveedores = {};
  
  movimientos.forEach(m => {
    const categoriaGasto = m.categoria?.toLowerCase() || '';
    if (m.tipo === 'egreso' && (categoriaGasto === 'directo' || categoriaGasto === 'compra' || categoriaGasto === 'inventario') && m.proveedor) {
      const key = `${m.proveedor}|${m.concepto}`;
      if (!proveedores[key]) {
        proveedores[key] = {
          proveedor: m.proveedor,
          producto: m.concepto,
          precios: [],
          fechas: [],
          cantidades: []
        };
      }
      proveedores[key].precios.push(m.costoUnitario || (m.valor / m.cantidad));
      proveedores[key].fechas.push(m.fecha);
      proveedores[key].cantidades.push(m.cantidad);
    }
  });
  
  Object.keys(proveedores).forEach(key => {
    const data = proveedores[key];
    if (data.precios.length >= 2) {
      const precioAnterior = data.precios[data.precios.length - 2];
      const precioActual = data.precios[data.precios.length - 1];
      
      if (precioActual > precioAnterior) {
        const incremento = ((precioActual - precioAnterior) / precioAnterior) * 100;
        if (incremento > 5) {
          const mensaje = lang === 'es'
            ? `⚠️ ${data.proveedor} subió el precio de "${data.producto}" de ${formatMoney(precioAnterior, lang)} a ${formatMoney(precioActual, lang)} (+${incremento.toFixed(1)}%). Revisa la factura.`
            : `⚠️ ${data.proveedor} raised the price of "${data.producto}" from ${formatMoney(precioAnterior, lang)} to ${formatMoney(precioActual, lang)} (+${incremento.toFixed(1)}%). Check the invoice.`;
          alertas.push({
            tipo: 'SOBRECOSTO_PROVEEDOR',
            gravedad: incremento > 15 ? 'ALTA' : incremento > 10 ? 'MEDIA' : 'BAJA',
            proveedor: data.proveedor,
            producto: data.producto,
            precioAnterior: precioAnterior,
            precioActual: precioActual,
            incremento: incremento.toFixed(1),
            mensaje: mensaje,
            ahorroPotencial: (precioActual - precioAnterior) * (data.cantidades[data.cantidades.length - 1] || 1)
          });
        }
      }
    }
  });
  
  const ahorroTotal = alertas.reduce((sum, a) => sum + (a.ahorroPotencial || 0), 0);
  
  const mensajeResumen = lang === 'es'
    ? (alertas.length > 0 
        ? `🔍 Se detectaron ${alertas.length} posibles sobrecostos. Ahorro potencial: ${formatMoney(ahorroTotal, lang)} COP.`
        : '✅ No se detectaron sobrecostos en tus proveedores.')
    : (alertas.length > 0
        ? `🔍 ${alertas.length} possible overcosts detected. Potential savings: ${formatMoney(ahorroTotal, lang)} USD.`
        : '✅ No overcosts detected in your suppliers.');
  
  return {
    sobrecostos: alertas,
    ahorroPotencial: ahorroTotal,
    mensajeResumen: mensajeResumen
  };
};

// ============================================================
// ✅ EXPORTACIÓN NOMBRADA CORRECTA
// ============================================================
const logicEngine = {
    calcularUnitario,
    limpiarNumeroInternacional,
    limpiarNumero,
    normalizarTexto,
    procesarCosteo,
    validarOperacion,
    categorizarGasto,
    auditarOperacion,
    analizarSaludFinanciera,
    auditarSobrecostosProveedores
};

export default logicEngine;

