// src/services/ublProcessor.js
// UBL 2.1 Auditor Processor - Stratium AI
// ✅ VERSIÓN CORREGIDA - ENFOQUE NETO DE CAJA

import { XMLParser } from 'fast-xml-parser';

// ============================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================
const ANOMALY_THRESHOLD = 0.15;

const UNIT_MAP = {
  'NIU': { es: 'Unidad', en: 'Unit', category: 'count', factor: 1 },
  'EA': { es: 'Unidad', en: 'Each', category: 'count', factor: 1 },
  'H87': { es: 'Unidad', en: 'Unit', category: 'count', factor: 1 },
  'SET': { es: 'Conjunto', en: 'Set', category: 'count', factor: 1 },
  'KGM': { es: 'Kilogramo', en: 'Kilogram', category: 'weight', factor: 1 },
  'GRM': { es: 'Gramo', en: 'Gram', category: 'weight', factor: 0.001 },
  'TNE': { es: 'Tonelada', en: 'Tonne', category: 'weight', factor: 1000 },
  'LTR': { es: 'Litro', en: 'Litre', category: 'volume', factor: 1 },
  'MLT': { es: 'Mililitro', en: 'Millilitre', category: 'volume', factor: 0.001 },
  'BOX': { es: 'Caja', en: 'Box', category: 'pack', factor: 1 },
  'PK': { es: 'Paquete', en: 'Package', category: 'pack', factor: 1 },
  'ZZ': { es: 'Otro', en: 'Other', category: 'other', factor: 1 }
};

const TAX_ID_MAP = {
  '01': 'IVA', 'VAT': 'IVA', 'IVA': 'IVA', '02': 'IVA',
  'IC': 'IC', 'ICA': 'IC', '03': 'IC', 'CONSUMO': 'IC',
  '04': 'Renta', 'RENTA': 'Renta', 'WHT': 'Renta',
  '05': 'IVA_Ret', 'IVA_RET': 'IVA_Ret', 'VAT_WHT': 'IVA_Ret',
  'ICA_TAX': 'ICA', 'INDUSTRY': 'ICA'
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

const parseXML = (xmlContent) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true
  });
  return parser.parse(xmlContent);
};

const safeGet = (obj, path, defaultValue = undefined) => {
  if (!obj) return defaultValue;
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result === undefined || result === null) return defaultValue;
    result = result[key];
  }
  return result !== undefined ? result : defaultValue;
};

const extractTaxId = (partyData) => {
  if (!partyData) return null;
  const taxScheme = safeGet(partyData, 'PartyTaxScheme');
  if (Array.isArray(taxScheme)) {
    const first = taxScheme[0];
    return first?.CompanyID || first?.['#text'] || null;
  }
  return taxScheme?.CompanyID || taxScheme?.['#text'] || null;
};

const normalizeUnit = (unitCode, language = 'es') => {
  if (!unitCode) return { code: 'NIU', name: language === 'es' ? 'Unidad' : 'Unit', category: 'count', factor: 1 };
  const upper = unitCode.toUpperCase();
  const mapping = UNIT_MAP[upper];
  if (!mapping) return { code: unitCode, name: upper, category: 'unknown', factor: 1, isStandard: false };
  return {
    code: upper,
    name: mapping[language] || mapping.es,
    category: mapping.category,
    factor: mapping.factor,
    isStandard: true
  };
};

// ============================================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO
// ============================================================

export const processUBLAudit = (xmlContent, userTaxId, options = {}) => {
  const {
    language = 'es',
    historicalCosts = {},
    includeLineItems = true,
    strictValidation = false
  } = options;

  try {
    const data = parseXML(xmlContent);
    const invoice = data.Invoice || data.CreditNote || data.DebitNote;
    
    if (!invoice) {
      throw new Error("Estructura UBL no válida: No se encontró Invoice/CreditNote/DebitNote");
    }

    const docId = safeGet(invoice, 'ID') || 'UNKNOWN';
    const issueDate = safeGet(invoice, 'IssueDate');
    const docType = invoice._root?.split(':')?.pop() || 'Invoice';
    const currency = safeGet(invoice, 'DocumentCurrencyCode') || 'COP';
    const customizationId = safeGet(invoice, 'CustomizationID');
    const profileId = safeGet(invoice, 'ProfileID');

    const supplierParty = safeGet(invoice, 'AccountingSupplierParty.Party');
    const customerParty = safeGet(invoice, 'AccountingCustomerParty.Party');
    
    const supplierTaxId = extractTaxId(supplierParty);
    const customerTaxId = extractTaxId(customerParty);
    const supplierName = safeGet(supplierParty, 'PartyName.Name') || safeGet(supplierParty, 'PartyLegalEntity.RegistrationName') || 'Desconocido';
    const customerName = safeGet(customerParty, 'PartyName.Name') || safeGet(customerParty, 'PartyLegalEntity.RegistrationName') || 'Desconocido';

    const normalizeId = (id) => id ? String(id).replace(/[^0-9A-Z]/gi, '').toUpperCase() : '';
    const userNorm = normalizeId(userTaxId);
    
    let operationType = 'UNKNOWN';
    if (userNorm && normalizeId(supplierTaxId) === userNorm) {
      operationType = 'SALE';
    } else if (userNorm && normalizeId(customerTaxId) === userNorm) {
      operationType = 'PURCHASE';
    }

    const monetaryTotal = invoice.LegalMonetaryTotal || {};
    const payableAmount = parseFloat(safeGet(monetaryTotal, 'PayableAmount')) || 0;

    // Procesamiento de líneas de factura
    const items = [];
    const lineElements = Array.isArray(invoice.InvoiceLine) 
      ? invoice.InvoiceLine 
      : [invoice.InvoiceLine].filter(Boolean);

    lineElements.forEach(line => {
      if (!line) return;

      const itemId = safeGet(line, 'ID') || `ITEM_${items.length + 1}`;
      const description = safeGet(line, 'Item.Name') || safeGet(line, 'Item.Description') || 'Sin descripción';
      
      const qtyRaw = safeGet(line, 'InvoicedQuantity');
      const quantity = parseFloat(qtyRaw) || parseFloat(safeGet(line, 'InvoicedQuantity.#text')) || 1;
      const unitCode = qtyRaw?.unitCode || 'NIU';
      const unitNormalized = normalizeUnit(unitCode, language);
      
      const priceRaw = safeGet(line, 'Price.PriceAmount');
      const unitPrice = parseFloat(priceRaw) || parseFloat(safeGet(line, 'Price.PriceAmount.#text')) || 0;
      const lineTotal = parseFloat(safeGet(line, 'LineExtensionAmount')) || (quantity * unitPrice);

      let auditMetrics = {
        isAnomaly: false,
        deviationPct: null,
        historicalPrice: null,
        cogsSource: 'estimated',
        estimatedCogs: lineTotal * 0.7
      };

      const histKey = historicalCosts[itemId] ? itemId : 
                     Object.keys(historicalCosts).find(k => k.toLowerCase().includes(description.toLowerCase().substring(0, 10)));
      
      if (histKey && historicalCosts[histKey]) {
        const hist = historicalCosts[histKey];
        const avgPrice = hist.avg_unit_price || hist.avgPrice || hist.unitPrice;
        
        if (avgPrice && avgPrice > 0) {
          auditMetrics.historicalPrice = avgPrice;
          auditMetrics.cogsSource = 'historical';
          
          const deviation = Math.abs(unitPrice - avgPrice) / avgPrice;
          auditMetrics.deviationPct = Math.round(deviation * 100 * 100) / 100;
          
          if (deviation > ANOMALY_THRESHOLD) {
            auditMetrics.isAnomaly = true;
          }
          
          if (hist.avg_cogs_per_unit || hist.cogsPerUnit) {
            auditMetrics.estimatedCogs = quantity * (hist.avg_cogs_per_unit || hist.cogsPerUnit);
          }
        }
      }

      items.push({
        id: itemId,
        description,
        quantity: Math.round(quantity * 100) / 100,
        unit: {
          code: unitCode,
          ...unitNormalized
        },
        pricing: {
          unitPrice: Math.round(unitPrice * 100) / 100,
          lineTotal: Math.round(lineTotal * 100) / 100,
          currency
        },
        taxes: {},
        audit: auditMetrics
      });
    });

    const totalEstimatedCogs = items.reduce((sum, item) => sum + item.audit.estimatedCogs, 0);
    const anomalyCount = items.filter(i => i.audit.isAnomaly).length;
    const estimatedItems = items.filter(i => i.audit.cogsSource === 'estimated').length;
    
    const auditSummary = {
      totalValue: payableAmount,
      estimatedCogs: Math.round(totalEstimatedCogs * 100) / 100,
      estimatedMargin: operationType === 'SALE' 
        ? Math.round((payableAmount - totalEstimatedCogs) * 100) / 100 
        : null,
      marginPercentage: operationType === 'SALE' && payableAmount > 0
        ? Math.round(((payableAmount - totalEstimatedCogs) / payableAmount) * 100 * 100) / 100
        : null,
      anomalyCount,
      anomalyPercentage: items.length > 0 
        ? Math.round((anomalyCount / items.length) * 100 * 100) / 100 
        : 0,
      dataQuality: {
        itemsWithHistorical: items.length - estimatedItems,
        itemsEstimated: estimatedItems,
        confidenceLevel: estimatedItems === 0 ? 'high' : estimatedItems < items.length * 0.5 ? 'medium' : 'low'
      },
      alerts: []
    };

    if (anomalyCount > 0) {
      auditSummary.alerts.push(`⚠️ ${anomalyCount} ítems con anomalía de precio (>${ANOMALY_THRESHOLD*100}% desviación)`);
    }
    if (estimatedItems > items.length * 0.5) {
      auditSummary.alerts.push('ℹ️ >50% de márgenes estimados - considere cargar histórico de costos');
    }
    if (auditSummary.marginPercentage !== null && auditSummary.marginPercentage < 20) {
      auditSummary.alerts.push('🔴 Margen por debajo del umbral mínimo recomendado (20%)');
    }

    // ✅ CONSTRUIR RESULTADO FINAL CON TOTALES NETOS
    const result = {
      success: true,
      document: {
        id: docId,
        type: docType,
        issueDate,
        currency,
        operationType,
        customizationId,
        profileId,
        schemaValid: !!(customizationId || profileId)
      },
      parties: {
        supplier: {
          name: supplierName,
          taxId: supplierTaxId,
          isCurrentUser: operationType === 'SALE'
        },
        customer: {
          name: customerName,
          taxId: customerTaxId,
          isCurrentUser: operationType === 'PURCHASE'
        }
      },
      // ✅ TOTALES CORREGIDOS - ENFOQUE NETO DE CAJA
      totals: {
        subtotal: Math.round(payableAmount * 100) / 100,
        taxes: {},
        taxBreakdown: {},
        payableAmount: Math.round(payableAmount * 100) / 100
      },
      audit: auditSummary
    };

    if (includeLineItems) {
      result.items = items;
    }

    // ✅ TRADUCCIÓN A ESPAÑOL CORREGIDA
    if (language === 'es') {
      result.document.operationTypeLabel = operationType === 'SALE' ? 'Venta' : operationType === 'PURCHASE' ? 'Compra' : 'Desconocido';
      result.totales = {
        subtotal: Math.round(payableAmount * 100) / 100,
        impuestos: {},
        total: Math.round(payableAmount * 100) / 100
      };
    }

    return result;

  } catch (error) {
    console.error('❌ Error procesando UBL:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

export const validateUBLStructure = (xmlContent) => {
  try {
    const data = parseXML(xmlContent);
    const invoice = data.Invoice || data.CreditNote || data.DebitNote;
    if (!invoice) return { valid: false, error: 'No se encontró elemento raíz UBL válido' };
    
    const required = ['ID', 'IssueDate', 'AccountingSupplierParty', 'AccountingCustomerParty'];
    const missing = required.filter(field => !safeGet(invoice, field));
    
    if (missing.length > 0) {
      return { valid: false, error: `Campos requeridos faltantes: ${missing.join(', ')}` };
    }
    
    return { valid: true, documentType: invoice._root?.split(':')?.pop() || 'Unknown' };
  } catch (e) {
    return { valid: false, error: `Error de parseo: ${e.message}` };
  }
};

export const getUnitConversion = (fromUnit, toUnit, quantity = 1) => {
  try {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (from.category !== to.category) {
      return { success: false, error: `No se puede convertir ${from.category} a ${to.category}` };
    }
    const baseQty = quantity * from.factor;
    const converted = baseQty / to.factor;
    return {
      success: true,
      original: { quantity, unit: fromUnit },
      converted: {
        quantity: Math.round(converted * 1000) / 1000,
        unit: toUnit
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export default processUBLAudit;

