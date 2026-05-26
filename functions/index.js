import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parseString } from 'xml2js';

initializeApp();
const db = getFirestore();

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function limpiarXML(xmlRaw) {
    if (!xmlRaw) return '';
    let xml = xmlRaw;
    
    if (xml.charCodeAt(0) === 0xFEFF) {
        xml = xml.slice(1);
    }
    
    xml = xml.replace(/^[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/, '');
    
    if (!xml.startsWith('<?xml') && !xml.startsWith('<Invoice') && !xml.startsWith('<fe:Invoice') && !xml.startsWith('<AttachedDocument')) {
        try {
            const decoded = Buffer.from(xml, 'base64').toString('utf-8');
            if (decoded.startsWith('<?xml') || decoded.startsWith('<Invoice') || decoded.startsWith('<fe:Invoice') || decoded.startsWith('<AttachedDocument')) {
                xml = decoded;
            }
        } catch (e) {}
    }
    
    return xml;
}

function extraerXMLdeCDATA(xmlContent) {
    if (!xmlContent) return xmlContent;
    
    // Buscar CDATA que contenga el Invoice
    const cdataRegex = /<!\[CDATA\[\s*(.*?)\s*\]\]>/gs;
    const matches = [...xmlContent.matchAll(cdataRegex)];
    
    for (const match of matches) {
        const contenido = match[1];
        if (contenido.includes('<Invoice') || contenido.includes('<fe:Invoice')) {
            logger.log('XML extraído de CDATA correctamente');
            return contenido;
        }
    }
    return xmlContent;
}

function encontrarNodo(obj, posiblesNombres) {
    if (!obj || typeof obj !== 'object') return null;
    for (const nombre of posiblesNombres) {
        if (obj[nombre]) return obj[nombre];
        const key = Object.keys(obj).find(k => 
            k.toLowerCase().includes(nombre.toLowerCase()) || 
            nombre.toLowerCase().includes(k.toLowerCase())
        );
        if (key && obj[key]) return obj[key];
    }
    return null;
}

function safeText(obj, posiblesCaminos, defaultValue = '') {
    if (!obj) return defaultValue;
    for (const camino of posiblesCaminos) {
        const partes = Array.isArray(camino) ? camino : camino.split('.');
        let actual = obj;
        for (const parte of partes) {
            if (!actual || typeof actual !== 'object') {
                actual = null;
                break;
            }
            const key = Object.keys(actual).find(k => 
                k.toLowerCase().includes(parte.toLowerCase()) ||
                parte.toLowerCase().includes(k.toLowerCase())
            );
            actual = key ? actual[key] : null;
        }
        if (actual !== null && actual !== undefined && actual !== '') {
            return typeof actual === 'string' ? actual.trim() : String(actual).trim();
        }
    }
    return defaultValue;
}

function safeNumber(obj, posiblesCaminos, defaultValue = 0) {
    const texto = safeText(obj, posiblesCaminos, '');
    if (!texto) return defaultValue;
    const num = parseFloat(texto.replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return isNaN(num) ? defaultValue : num;
}

// ============================================================
// DETECCIÓN AUTOMÁTICA DE TIPO
// ============================================================

async function detectarTipoFacturaAutomatico(xmlContent, nitEmpresa) {
    const parseMinimo = (contenido) => {
        return new Promise((resolve, reject) => {
            parseString(contenido, {
                explicitArray: false,
                mergeAttrs: true,
                explicitRoot: false,
                normalize: true,
                trim: true,
                tagNameProcessors: [function(name) {
                    return name.split(':').pop();
                }]
            }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };
    
    try {
        const result = await parseMinimo(xmlContent);
        
        let nitProveedor = '';
        let nombreProveedor = '';
        
        const supplierParty = encontrarNodo(result, ['AccountingSupplierParty', 'cac:AccountingSupplierParty']);
        const party = supplierParty ? encontrarNodo(supplierParty, ['Party', 'cac:Party']) : null;
        
        if (party) {
            nitProveedor = safeText(party, ['PartyIdentification.ID', 'ID', 'cbc:ID'], '');
            nombreProveedor = safeText(party, [
                'PartyLegalEntity.RegistrationName',
                'RegistrationName',
                'cbc:RegistrationName',
                'PartyName.Name',
                'cbc:Name'
            ], 'Proveedor Desconocido');
        }
        
        let nitCliente = '';
        const customerParty = encontrarNodo(result, ['AccountingCustomerParty', 'cac:AccountingCustomerParty']);
        const customer = customerParty ? encontrarNodo(customerParty, ['Party', 'cac:Party']) : null;
        
        if (customer) {
            nitCliente = safeText(customer, ['PartyIdentification.ID', 'ID', 'cbc:ID'], '');
        }
        
        if (nitProveedor && nitEmpresa && nitProveedor === nitEmpresa) {
            return { tipo: 'VENTA', nitProveedor, nitCliente, nombreProveedor };
        } else {
            return { tipo: 'COMPRA', nitProveedor, nitCliente, nombreProveedor };
        }
        
    } catch (error) {
        logger.error('Error en detección automática:', error);
        return { tipo: 'COMPRA', nitProveedor: '', nitCliente: '', nombreProveedor: 'Proveedor Desconocido' };
    }
}

// ============================================================
// GENERAR CONSECUTIVOS
// ============================================================

async function getNextConsecutivoFirestore(userId, tipoFactura, year, month) {
    if (!userId) {
        throw new Error('Se requiere userId para generar consecutivo');
    }
    
    const docId = `${userId}_${tipoFactura}_${year}${month}`;
    const counterRef = db.collection('consecutivos').doc(docId);
    
    try {
        const result = await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(counterRef);
            
            let nuevoConsecutivo;
            if (!doc.exists) {
                nuevoConsecutivo = 1;
                transaction.set(counterRef, { consecutivo: nuevoConsecutivo });
            } else {
                nuevoConsecutivo = (doc.data().consecutivo || 0) + 1;
                transaction.update(counterRef, { consecutivo: nuevoConsecutivo });
            }
            
            return nuevoConsecutivo;
        });
        
        return result;
        
    } catch (error) {
        logger.error('Error en getNextConsecutivoFirestore:', error);
        const fallback = Date.now() % 1000000;
        return fallback;
    }
}

// ============================================================
// EXTRAER DATOS DEL XML
// ============================================================

async function extraerDatosXML(xmlContent, tipoFactura) {
    const parseXMLAsync = (contenido) => {
        return new Promise((resolve, reject) => {
            parseString(contenido, {
                explicitArray: false,
                mergeAttrs: true,
                explicitRoot: false,
                normalize: true,
                trim: true,
                tagNameProcessors: [function(name) {
                    return name.split(':').pop();
                }]
            }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };

    const buscarInvoiceEnNodo = async (nodo, profundidad = 0) => {
        if (!nodo || typeof nodo !== 'object') return null;
        if (profundidad > 10) return null;

        const invoiceNode = encontrarNodo(nodo, ['Invoice', 'fe:Invoice', 'InvoiceType']);
        if (invoiceNode && (invoiceNode.ID || invoiceNode['cbc:ID'])) {
            return invoiceNode;
        }

        const attachedNode = encontrarNodo(nodo, ['AttachedDocument', 'cac:AttachedDocument']);
        if (attachedNode) {
            const embeddedDoc = encontrarNodo(attachedNode, ['EmbeddedDocument', 'cac:EmbeddedDocument']);
            if (embeddedDoc) {
                const binaryContent = encontrarNodo(embeddedDoc, ['EmbeddedDocumentBinaryObject', 'cbc:EmbeddedDocumentBinaryObject']);
                if (binaryContent) {
                    let contenidoBinario = typeof binaryContent === 'string' ? binaryContent : binaryContent._ || binaryContent;
                    if (contenidoBinario) {
                        try {
                            const decoded = Buffer.from(contenidoBinario, 'base64').toString('utf-8');
                            if (decoded && (decoded.includes('<Invoice') || decoded.includes('<fe:Invoice'))) {
                                const parsedResult = await parseXMLAsync(decoded);
                                const encontrado = await buscarInvoiceEnNodo(parsedResult, profundidad + 1);
                                if (encontrado) return encontrado;
                            }
                        } catch (e) {}
                    }
                }
            }

            const parentDocLine = encontrarNodo(attachedNode, ['ParentDocumentLine', 'cac:ParentDocumentLine']);
            if (parentDocLine) {
                const attachment = encontrarNodo(parentDocLine, ['Attachment', 'cac:Attachment']);
                if (attachment) {
                    const embeddedDocAttachment = encontrarNodo(attachment, ['EmbeddedDocument', 'cac:EmbeddedDocument']);
                    if (embeddedDocAttachment) {
                        const binaryContent = encontrarNodo(embeddedDocAttachment, ['EmbeddedDocumentBinaryObject', 'cbc:EmbeddedDocumentBinaryObject']);
                        if (binaryContent) {
                            let contenidoBinario = typeof binaryContent === 'string' ? binaryContent : binaryContent._ || binaryContent;
                            if (contenidoBinario) {
                                try {
                                    const decoded = Buffer.from(contenidoBinario, 'base64').toString('utf-8');
                                    if (decoded && (decoded.includes('<Invoice') || decoded.includes('<fe:Invoice'))) {
                                        const parsedResult = await parseXMLAsync(decoded);
                                        const encontrado = await buscarInvoiceEnNodo(parsedResult, profundidad + 1);
                                        if (encontrado) return encontrado;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }
            }

            if (attachedNode.ID || attachedNode['cbc:ID']) {
                return attachedNode;
            }
        }

        for (const key of Object.keys(nodo)) {
            if (typeof nodo[key] === 'object') {
                const encontrado = await buscarInvoiceEnNodo(nodo[key], profundidad + 1);
                if (encontrado) return encontrado;
            }
        }
        return null;
    };

    try {
        const result = await parseXMLAsync(xmlContent);
        let invoice = await buscarInvoiceEnNodo(result);
        
        if (!invoice) {
            throw new Error('No se encontró estructura Invoice en el XML');
        }

        let proveedor = "", nitProveedor = "", cliente = "", nitCliente = "";

        const supplierParty = encontrarNodo(invoice, ['AccountingSupplierParty', 'cac:AccountingSupplierParty']);
        const party = supplierParty ? encontrarNodo(supplierParty, ['Party', 'cac:Party']) : null;
        const customerParty = encontrarNodo(invoice, ['AccountingCustomerParty', 'cac:AccountingCustomerParty']);
        const customer = customerParty ? encontrarNodo(customerParty, ['Party', 'cac:Party']) : null;

        if (tipoFactura === "COMPRA") {
            proveedor = safeText(party, [
                'PartyLegalEntity.RegistrationName',
                'RegistrationName',
                'cbc:RegistrationName',
                'PartyName.Name',
                'cbc:Name'
            ], 'Proveedor no identificado');
            nitProveedor = safeText(party, ['PartyIdentification.ID', 'ID', 'cbc:ID'], '');
            cliente = safeText(customer, [
                'PartyLegalEntity.RegistrationName',
                'RegistrationName',
                'cbc:RegistrationName',
                'PartyName.Name',
                'cbc:Name'
            ], '');
            nitCliente = safeText(customer, ['PartyIdentification.ID', 'ID', 'cbc:ID'], '');
        } else {
            cliente = safeText(customer, [
                'PartyLegalEntity.RegistrationName',
                'RegistrationName',
                'cbc:RegistrationName',
                'PartyName.Name',
                'cbc:Name'
            ], 'Cliente no identificado');
            nitCliente = safeText(customer, ['PartyIdentification.ID', 'ID', 'cbc:ID'], '');
            proveedor = safeText(party, [
                'PartyLegalEntity.RegistrationName',
                'RegistrationName',
                'cbc:RegistrationName',
                'PartyName.Name',
                'cbc:Name'
            ], '');
            nitProveedor = safeText(party, ['PartyIdentification.ID', 'ID', 'cbc:ID'], '');
        }

        const numeroFactura = safeText(invoice, ['ID', 'cbc:ID'], 'S/N');
        const fechaFactura = safeText(invoice, ['IssueDate', 'cbc:IssueDate'], new Date().toISOString().split('T')[0]);

        const legalTotal = encontrarNodo(invoice, ['LegalMonetaryTotal', 'cac:LegalMonetaryTotal']);
        
        const subtotalBruto = safeNumber(legalTotal, ['LineExtensionAmount', 'cbc:LineExtensionAmount']);
        const totalFactura = safeNumber(legalTotal, ['TaxInclusiveAmount', 'cbc:TaxInclusiveAmount']);
        const payableAmount = safeNumber(legalTotal, ['PayableAmount', 'cbc:PayableAmount']);
        
        const totalPagarRecibir = payableAmount > 0 ? payableAmount : totalFactura;

        const productos = [];
        const invoiceLines = encontrarNodo(invoice, ['InvoiceLine', 'cac:InvoiceLine']);
        const lineas = Array.isArray(invoiceLines) ? invoiceLines : (invoiceLines ? [invoiceLines] : []);

        for (const line of lineas) {
            const item = encontrarNodo(line, ['Item', 'cac:Item']);
            const nombre = safeText(item, ['Name', 'cbc:Name', 'Description', 'cbc:Description'], 'Producto');
            const quantity = safeNumber(line, ['InvoicedQuantity', 'cbc:InvoicedQuantity'], 1);
            const lineExtension = safeNumber(line, ['LineExtensionAmount', 'cbc:LineExtensionAmount']);
            const precioUnitario = quantity > 0 ? lineExtension / quantity : 0;

            if (lineExtension > 0 || quantity > 0) {
                productos.push({
                    nombre: nombre.substring(0, 80),
                    cantidad: quantity,
                    precioUnitario: parseFloat(precioUnitario.toFixed(2)),
                    totalLinea: parseFloat(lineExtension.toFixed(2))
                });
            }
        }

        const subtotalFinal = parseFloat(((subtotalBruto || 0)).toFixed(2));
        const facturaFinal = parseFloat(((totalFactura || 0)).toFixed(2));
        const pagarRecibirFinal = parseFloat(((totalPagarRecibir || 0)).toFixed(2));

        return {
            success: true,
            tipoFactura,
            proveedor,
            nitProveedor,
            cliente,
            nitCliente,
            fechaFactura,
            numeroFactura,
            subtotalBruto: subtotalFinal,
            totalFactura: facturaFinal,
            totalPagarRecibir: pagarRecibirFinal,
            productos,
            esAttachedDocument: false
        };

    } catch (error) {
        throw new Error('Error procesando datos del XML: ' + error.message);
    }
}

// ============================================================
// REGISTRAR EN FIRESTORE
// ============================================================

async function registrarTransaccionFirestore(datosFactura, userId, nitEmpresa) {
    try {
        const transaccionRef = db.collection('transacciones');
        
        const fechaObj = new Date();
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        
        const consecutivo = String(await getNextConsecutivoFirestore(userId, datosFactura.tipoFactura, year, month)).padStart(6, '0');
        const referencia = `${datosFactura.tipoFactura === "COMPRA" ? "FC" : "FV"}-${year}${month}-${consecutivo}`;
        
        const transaccionData = {
            success: true,
            tipoTransaccion: datosFactura.tipoFactura,
            referencia,
            estado: "ACTIVA",
            userId,
            nitEmpresa: nitEmpresa || '',
            fechaRegistro: new Date().toISOString(),
            numeroFactura: datosFactura.numeroFactura,
            fechaFactura: datosFactura.fechaFactura,
            proveedor: datosFactura.proveedor,
            nitProveedor: datosFactura.nitProveedor,
            cliente: datosFactura.cliente,
            nitCliente: datosFactura.nitCliente,
            subtotalBruto: datosFactura.subtotalBruto,
            totalFactura: datosFactura.totalFactura,
            totalPagarRecibir: datosFactura.totalPagarRecibir,
            productos: datosFactura.productos,
            procesadoEn: new Date().toISOString(),
            esAttachedDocument: false
        };
        
        const docRef = await transaccionRef.add(transaccionData);
        
        return {
            success: true,
            id: docRef.id,
            referencia,
            message: `Transacción de ${datosFactura.tipoFactura} registrada con referencia ${referencia}`
        };
        
    } catch (error) {
        logger.error('Error registrando transacción:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================
// ENDPOINT PRINCIPAL
// ============================================================

export const procesarXML = onRequest({ 
    cors: true, 
    timeoutSeconds: 120, 
    memory: '512MiB' 
}, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Use POST' });
        return;
    }

    try {
        let { xmlContent, tipoFactura, userId, nitEmpresa } = req.body;

        // ✅ CORRECCIÓN: Forzar conversión a string
        if (typeof xmlContent !== 'string') {
            xmlContent = xmlContent ? xmlContent.toString('utf8') : '';
        }

        if (!xmlContent || xmlContent.trim() === '') {
            res.status(400).json({ error: 'XML content es requerido' });
            return;
        }

        // Limpiar y extraer XML del CDATA
        let xmlLimpio = limpiarXML(xmlContent);
        xmlLimpio = extraerXMLdeCDATA(xmlLimpio);
        
        logger.log(`XML limpio (primeros 200 chars): ${xmlLimpio.substring(0, 200)}...`);

        if (!xmlLimpio.startsWith('<?xml') && !xmlLimpio.startsWith('<Invoice') && !xmlLimpio.startsWith('<fe:Invoice')) {
            res.status(400).json({ 
                success: false, 
                error: 'El contenido no parece ser un XML válido',
                preview: xmlLimpio.substring(0, 200)
            });
            return;
        }

        if (!userId || userId === "anonymous") {
            res.status(400).json({ error: 'userId es requerido' });
            return;
        }

        if (!nitEmpresa) {
            res.status(400).json({ error: 'nitEmpresa es requerido' });
            return;
        }

        logger.log(`Procesando XML para usuario ${userId} (NIT: ${nitEmpresa})...`);
        
        let tipo = tipoFactura;
        
        if (!tipo || tipo === "AUTO") {
            const deteccion = await detectarTipoFacturaAutomatico(xmlLimpio, nitEmpresa);
            tipo = deteccion.tipo;
            logger.log(`Tipo detectado automáticamente: ${tipo}`);
        }
        
        const datosFactura = await extraerDatosXML(xmlLimpio, tipo);
        
        if (!datosFactura.success) {
            res.status(400).json({ success: false, error: datosFactura.error });
            return;
        }
        
        const resultado = await registrarTransaccionFirestore(datosFactura, userId, nitEmpresa);
        
        res.status(200).json({
            success: true,
            message: resultado.message,
            referencia: resultado.referencia,
            datosFactura: {
                proveedor: datosFactura.proveedor,
                nitProveedor: datosFactura.nitProveedor,
                cliente: datosFactura.cliente,
                fechaFactura: datosFactura.fechaFactura,
                numeroFactura: datosFactura.numeroFactura,
                subtotalBruto: datosFactura.subtotalBruto,
                totalFactura: datosFactura.totalFactura,
                totalPagarRecibir: datosFactura.totalPagarRecibir,
                productos: datosFactura.productos
            }
        });
        
    } catch (error) {
        logger.error('Error en procesarXML:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================================
// HEALTH CHECK
// ============================================================

export const healthCheck = onRequest({ cors: true }, (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Stratium Global AI - Procesador XML',
        timestamp: new Date().toISOString()
    });
});
