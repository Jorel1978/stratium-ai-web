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
 * Maneja: $35,000.00, 35.000,00, 35000, 35,000.00, etc.
 * @param {string|number} valor - Valor a convertir
 * @returns {number} - Número convertido o 0 si falla
 */
export const limpiarNumeroInternacional = (valor) => {
    if (valor === null || valor === undefined) return 0.0;
    
    if (typeof valor === 'number') return valor;
    
    let strValor = String(valor).trim();
    if (!strValor) return 0.0;
    
    strValor = strValor.replace('$', '').replace(' ', '');
    
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
    
    if (texto.includes(',') && !texto.includes('.')) {
        const partes = texto.split(',');
        if (partes.length === 2 && partes[1].length <= 3) {
            texto = texto.replace(',', '.');
        } else {
            texto = texto.replace(/,/g, '');
        }
    }
    
    texto = texto.replace('$', '').replace('€', '').replace('USD', '').replace(/\s/g, '');
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
 * Procesa costeo de producción
 * @param {Object} params - Parámetros de costeo
 * @returns {Object} - Resultado del costeo
 */
export const procesarCosteo = ({ materiales, horas, valorHora, transporte, precioVenta = null, config = {} }) => {
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
        
        resultado = {
            ...resultado,
            precioVenta: precioVenta,
            utilidadNeta: utilidadNeta,
            margenNeto: parseFloat(margenNeto.toFixed(1)),
            dictamen: margenNeto < 20 
                ? `ALERTA: El margen es de ${margenNeto.toFixed(1)}%. Estás trabajando para cubrir gastos. Sube el precio o reduce el tiempo de producción.`
                : `El margen es de ${margenNeto.toFixed(1)}%. Este servicio/producto es rentable.`
        };
    }
    
    return resultado;
};

/**
 * Valida una operación financiera
 */
export const validarOperacion = (tipo, monto, concepto, saldoCajaActual) => {
    const montoNum = parseFloat(monto);
    const tipoUpper = tipo.toUpperCase();
    const saldo = parseFloat(saldoCajaActual) || 0;
    
    if (tipoUpper === 'EGRESO' && montoNum > saldo) {
        return {
            aprobado: false,
            mensaje: `ALERTA DE CAJA: No puedes registrar un gasto de ${formatMoney(montoNum)} porque solo tienes ${formatMoney(saldo)} en caja.`
        };
    }
    
    const conceptosVagos = ["varios", "cosa", "pago", ".", "gastos", "etc", "x"];
    const conceptoLower = concepto ? concepto.toLowerCase() : '';
    
    if (!conceptoLower || conceptosVagos.includes(conceptoLower) || conceptoLower.length < 4) {
        return {
            aprobado: false,
            mensaje: "CONCEPTO MUY VAGO: Necesito saber exactamente en qué se fue la plata."
        };
    }
    
    return {
        aprobado: true,
        mensaje: "Movimiento Validado."
    };
};

/**
 * Categoriza automáticamente un gasto
 */
export const categorizarGasto = (concepto) => {
    if (!concepto) return 'otros_gastos';
    const conceptoLower = concepto.toLowerCase();
    
    const categorias = {
        'operativo': ['arriendo', 'nomina', 'sueldo', 'servicios', 'luz', 'agua', 'internet'],
        'logistica': ['transporte', 'flete', 'gasolina', 'domicilio'],
        'marketing': ['publicidad', 'facebook', 'instagram', 'volantes', 'comision'],
        'directo': ['mercancia', 'materia prima', 'insumos', 'compra']
    };
    
    for (const [categoria, palabras] of Object.entries(categorias)) {
        if (palabras.some(p => conceptoLower.includes(p))) {
            return categoria;
        }
    }
    return 'otros_gastos';
};

/**
 * Formatea un número como moneda COP
 */
const formatMoney = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(valor));
};

/**
 * Genera recomendación financiera
 */
const generarRecomendacion = (tipo, valor, categoria, saldoCaja) => {
    if (tipo === 'INGRESO') {
        if (saldoCaja < 0) {
            return `Este ingreso de ${formatMoney(valor)} ayuda a reducir el saldo negativo.`;
        }
        return `Ingreso registrado. Considera destinar un 20% a ahorro/inversión.`;
    }
    
    const porcentajeGasto = saldoCaja > 0 ? (valor / saldoCaja) * 100 : 100;
    
    if (porcentajeGasto > 30) {
        return `Este gasto representa el ${porcentajeGasto.toFixed(1)}% de tu saldo disponible. Evalúa si es urgente.`;
    }
    
    if (categoria === 'marketing') {
        return `Inversión en marketing. Recomiendo medir el ROI de esta campaña.`;
    }
    
    if (categoria === 'directo') {
        return `Compra de inventario. Asegúrate de que estos productos tengan rotación rápida.`;
    }
    
    return `Gasto registrado. Revisa que esté alineado con tu presupuesto.`;
};

/**
 * Auditoría completa de una operación
 */
export const auditarOperacion = (texto, valor, contexto = {}) => {
    const textoNormalizado = normalizarTexto(texto);
    const valorNum = parseFloat(valor) || 0;
    const saldoCaja = parseFloat(contexto.saldoCaja) || 0;
    
    let tipo = 'INGRESO';
    if (textoNormalizado.includes('compra') || 
        textoNormalizado.includes('gasto') || 
        textoNormalizado.includes('pago') ||
        textoNormalizado.includes('nomina')) {
        tipo = 'EGRESO';
    }
    
    let concepto = textoNormalizado
        .replace(/\d+(?:[.,]\d+)*/g, '')
        .replace(/^(compra|venta|gasto|ingreso|pago|registra|escanea|analiza):?\s*/i, '')
        .replace(/^(por|a|de|para|con)\s+/i, '')
        .trim();
    
    if (!concepto) concepto = texto.substring(0, 50);
    concepto = concepto.charAt(0).toUpperCase() + concepto.slice(1);
    
    const validacion = validarOperacion(tipo, valorNum, concepto, saldoCaja);
    const categoria = tipo === 'EGRESO' ? categorizarGasto(concepto) : 'ingreso';
    
    const emojis = {
        'Venta': '💰', 'Compra': '📦', 'Gasto': '📉', 'Nómina': '👥',
        'operativo': '🏢', 'logistica': '🚚', 'marketing': '📢', 'directo': '📦',
        'ingreso': '💰', 'otros_gastos': '📝'
    };
    
    const emoji = emojis[categoria] || emojis[tipo.toLowerCase()] || '📝';
    const nombreCategoria = categoria === 'ingreso' ? 'Venta' : categoria.charAt(0).toUpperCase() + categoria.slice(1).replace('_', ' ');
    
    return {
        textoOriginal: texto,
        concepto: concepto,
        valor: valorNum,
        tipo: tipo === 'INGRESO' ? 'ingreso' : 'egreso',
        categoria: nombreCategoria,
        emoji: emoji,
        validado: validacion.aprobado,
        mensajeValidacion: validacion.mensaje,
        recomendacion: validacion.aprobado ? generarRecomendacion(tipo, valorNum, categoria, saldoCaja) : '',
        saldoCajaActual: saldoCaja,
        saldoSimulado: tipo === 'EGRESO' ? saldoCaja - valorNum : saldoCaja + valorNum,
        cantidad: 1
    };
};

// ============================================================
// 🚀 NUEVA FUNCIÓN: ANALIZAR SALUD FINANCIERA (CFO AGGRESSIVE)
// ============================================================

/**
 * Calcula días desde la última venta de un producto
 * @param {string} producto - Nombre del producto
 * @param {Array} movimientos - Lista de transacciones
 * @returns {number} - Días desde la última venta
 */
const calcularDiasSinVenta = (producto, movimientos) => {
    if (!producto) return 999;
    const ventasProducto = movimientos.filter(m => 
        m.tipo === 'ingreso' && 
        m.concepto?.toLowerCase() === producto.toLowerCase()
    );
    
    if (ventasProducto.length === 0) return 999;
    
    const ultimaVenta = new Date(Math.max(...ventasProducto.map(v => new Date(v.fecha))));
    const hoy = new Date();
    return Math.floor((hoy - ultimaVenta) / (1000 * 60 * 60 * 24));
};

/**
 * Analiza la salud financiera y genera alertas accionables
 * @param {Array} movimientos - Lista de transacciones
 * @param {Array} inventario - Lista de productos en stock (opcional)
 * @param {Object} config - Configuración del negocio
 * @returns {Object} - Alertas y recomendaciones
 */
export const analizarSaludFinanciera = (movimientos, inventario = [], config = {}) => {
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
    
    // 1. GASTOS DIARIOS PROMEDIO Y OXÍGENO FINANCIERO
    const gastoDiarioPromedio = totalGastos / 30;
    const diasOxigeno = gastoDiarioPromedio > 0 ? Math.floor(saldoActual / gastoDiarioPromedio) : 999;
    
    // 2. ALERTAS DE PRODUCTOS HUESO (sin ventas en 15+ días)
    const alertasProductos = [];
    const productosConVentas = new Set();
    
    ventas.forEach(v => {
        if (v.concepto) productosConVentas.add(v.concepto.toLowerCase());
    });
    
    // Si no hay inventario cargado, deducir de ventas pasadas
    const productosParaAnalizar = inventario.length > 0 ? inventario : ventas.map(v => ({ producto: v.concepto }));
    const productosUnicos = new Map();
    
    productosParaAnalizar.forEach(p => {
        const nombre = p.producto || p.concepto;
        if (nombre && !productosUnicos.has(nombre.toLowerCase())) {
            productosUnicos.set(nombre.toLowerCase(), nombre);
        }
    });
    
    for (const [nombreLower, nombreOriginal] of productosUnicos) {
        if (!productosConVentas.has(nombreLower)) {
            const diasSinVenta = calcularDiasSinVenta(nombreOriginal, movimientos);
            if (diasSinVenta > 15) {
                alertasProductos.push({
                    tipo: 'PRODUCTO_HUESO',
                    producto: nombreOriginal,
                    mensaje: `📦 "${nombreOriginal}" no se vende hace ${diasSinVenta} días. Baja el precio un 10% para recuperar capital.`,
                    accion: 'BAJAR_PRECIO',
                    urgencia: diasSinVenta > 30 ? 'ALTA' : 'MEDIA',
                    diasSinVenta
                });
            }
        }
    }
    
    // 3. ALERTAS DE MARGEN BAJO (para dropshipping/comercio)
    const alertasMargen = [];
    ventas.forEach(venta => {
        const cantidad = venta.cantidad || 1;
        const precio = venta.valor / cantidad;
        const costo = venta.costoUnitario || 0;
        const margen = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
        
        if (costo > 0 && margen < 20 && margen > 0) {
            alertasMargen.push({
                tipo: 'MARGEN_BAJO',
                producto: venta.concepto,
                mensaje: `💰 "${venta.concepto}" tiene margen del ${margen.toFixed(1)}% (mínimo recomendado 20%). Si las devoluciones superan el 5%, estás perdiendo dinero.`,
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
    
    // 5. ALERTA DE QUIEBRA (menos de 15 días de oxígeno)
    let alertaQuiebra = null;
    if (diasOxigeno < 15) {
        alertaQuiebra = {
            tipo: 'ALERTA_QUIEBRA',
            mensaje: `⏳ Tu negocio tiene ${diasOxigeno} días de oxígeno financiero. Ventas: $${totalVentas.toLocaleString()} vs Gastos: $${totalGastos.toLocaleString()}.`,
            recomendacion: diasOxigeno < 7 
                ? '🚨 URGENTE: Congela gastos no esenciales HOY. Prioriza cobro de cartera.'
                : '📉 Reduce inventario de productos lentos y negocia plazos con proveedores.',
            urgencia: diasOxigeno < 7 ? 'CRITICA' : 'ALTA',
            diasOxigeno
        };
    }
    
    // 6. RECOMENDACIONES ESTRATÉGICAS
    const recomendaciones = [];
    
    if (productoEstrella) {
        recomendaciones.push(`⭐ Tu producto estrella es "${productoEstrella}". Destina el 30% de tu presupuesto de marketing a este producto.`);
    }
    
    if (alertasProductos.length > 0) {
        recomendaciones.push(`📦 Tienes ${alertasProductos.length} productos con baja rotación. Considera liquidarlos con descuento para liberar capital.`);
        // Productos específicos para liquidar
        const productosLentos = alertasProductos.slice(0, 3).map(a => a.producto).join(', ');
        if (productosLentos) {
            recomendaciones.push(`💸 Prioriza liquidar: ${productosLentos}. Ofrece 2x1 o descuento del 30% para mover stock.`);
        }
    }
    
    if (alertasMargen.length > 0) {
        recomendaciones.push(`💰 ${alertasMargen.length} productos tienen margen bajo. Revisa precios o negocia mejores costos con proveedores.`);
        const margenCritico = alertasMargen.filter(a => a.margenActual < 10);
        if (margenCritico.length > 0) {
            recomendaciones.push(`⚠️ ${margenCritico.length} productos están cerca de vender a pérdida. Ajusta precios URGENTE.`);
        }
    }
    
    if (diasOxigeno < 30 && diasOxigeno >= 15) {
        recomendaciones.push(`⏳ Tu oxígeno financiero es de ${diasOxigeno} días. Empieza a reducir gastos no esenciales.`);
    }
    
    if (diasOxigeno >= 30) {
        recomendaciones.push(`✅ Tienes ${diasOxigeno} días de oxígeno. Buen momento para invertir en crecimiento.`);
    }
    
    // 7. RESUMEN EJECUTIVO
    const margenNeto = totalVentas > 0 ? ((saldoActual / totalVentas) * 100).toFixed(1) : 0;
    const saludPorcentaje = Math.min(100, Math.max(0, (saldoActual / (totalVentas || 1)) * 100));
    const saludColor = saludPorcentaje >= 30 ? '#10b981' : saludPorcentaje >= 15 ? '#f59e0b' : '#ef4444';
    const saludMensaje = saludPorcentaje >= 30 ? 'Excelente' : saludPorcentaje >= 15 ? 'Estable' : 'Crítico';
    
    return {
        // Métricas clave
        saldoActual,
        ventas30Dias: totalVentas,
        gastos30Dias: totalGastos,
        margenNeto: parseFloat(margenNeto),
        diasOxigeno,
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

// ✅ Exportación nombrada correcta (manteniendo la estructura original)
const logicEngine = {
    calcularUnitario,
    limpiarNumeroInternacional,
    limpiarNumero,
    normalizarTexto,
    procesarCosteo,
    validarOperacion,
    categorizarGasto,
    auditarOperacion,
    analizarSaludFinanciera  // ✅ NUEVA FUNCIÓN EXPORTADA
};

export default logicEngine;

