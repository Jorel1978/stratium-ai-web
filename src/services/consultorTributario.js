// src/services/consultorTributario.js
// Consultor tributario para Stratium AI (RAG ligero con validaciones de cumplimiento)
// ⚠️ ADVERTENCIA: Este sistema NO reemplaza el consejo de un contador certificado

// ============================================================
// 1. BASE DE CONOCIMIENTO SEGMENTADA POR PAÍS
// ============================================================

const CONOCIMIENTO_POR_PAIS = {
  // COLOMBIA
  CO: {
    nombre: 'Colombia',
    ultimaRevision: '2026-01-15',
    vigencia: 'Vigente para el año fiscal 2026',
    entidadReguladora: 'DIAN',
    conocimiento: {
      iva: {
        preguntasClave: ['iva', 'impuesto al valor agregado', 'vat', 'cuándo pago iva', 'cómo funciona el iva'],
        respuestaSimple: (usuario) => {
          const regimen = usuario?.perfilTributario?.regimenIVA || 'responsable';
          if (regimen === 'no responsable') {
            return '✅ Según tu perfil, actualmente NO eres responsable de IVA. No debes cobrarlo ni declararlo, pero tampoco puedes descontar IVA de tus compras.';
          }
          return 'Pagas IVA cuando vendes productos o servicios. Lo que cobras de IVA no es tuyo, es del estado. Debes declararlo y pagarlo periódicamente. ⚠️ OJO: Si tu cliente es Gran Contribuyente, puede practicarte ReteIVA (retención del 15% o 100% del IVA). Eso significa que no recibirás el IVA completo en el momento de la venta.';
        },
        articulo: 'Estatuto Tributario Art. 420-480, 437-1 (ReteIVA)',
        ejemplo: 'Vendes producto a $20,000 + IVA 19% = cobras $23,800. Si aplica ReteIVA del 15%, el cliente solo te paga $20,000 + ($3,800 × 85%) = $23,230.',
        ultimaRevision: '2026-01-15'
      },
      retencion: {
        preguntasClave: ['retención', 'retefuente', 'retención en la fuente', 'reteiva', 'reteica'],
        respuestaSimple: (usuario) => {
          return 'Es un anticipo del impuesto de renta. Te lo descuentan cuando te pagan (según tu tarifa o la del producto/servicio), y luego lo restas de lo que debas pagar al declarar renta. ⚠️ Si te retienen más de lo que debes, te devuelven el saldo a favor.';
        },
        articulo: 'Estatuto Tributario Art. 368-384, Resolución DIAN 000042',
        ejemplo: 'Te pagan $1,000,000 y te retienen 4% ($40,000). Al declarar renta, restas esos $40,000 de lo que debas pagar.',
        ultimaRevision: '2026-01-15'
      },
      factura: {
        preguntasClave: ['factura', 'facturación', 'factura electrónica', 'cuándo facturar', 'obligación de facturar'],
        respuestaSimple: (usuario) => {
          const regimen = usuario?.perfilTributario?.regimenIVA || 'responsable';
          if (regimen === 'no responsable') {
            return '✅ Según tu perfil, actualmente NO estás obligado a facturar. Pero si tus clientes te piden factura, puedes emitir factura de venta sin IVA.';
          }
          return 'Debes emitir factura electrónica para TODAS tus ventas. La DIAN exige facturación electrónica a todos los responsables de IVA. Tienes 15 días hábiles después de la operación para emitirla.';
        },
        articulo: 'Resolución DIAN 000042 de 2020, Decreto 1625 de 2016',
        ejemplo: 'Vendes un producto hoy 15 de mayo. Tu factura debe emitirse a más tardar el 5 de junio (15 días hábiles después).',
        ultimaRevision: '2026-01-15'
      },
      gastos: {
        preguntasClave: ['gastos', 'deducir', 'gastos deducibles', 'qué gastos puedo deducir'],
        respuestaSimple: () => {
          return 'Puedes deducir gastos necesarios para tu actividad: materiales, transporte, servicios públicos, arriendo del local, nómina, honorarios profesionales, etc. REQUISITO: Debes tener soporte (factura electrónica o documento equivalente) y el gasto debe estar relacionado directamente con tu actividad económica.';
        },
        articulo: 'Estatuto Tributario Art. 107-118',
        ejemplo: 'Compraste materiales por $500,000 con factura electrónica. Ese monto reduce tu base gravable. Sin factura, la DIAN no acepta la deducción.',
        ultimaRevision: '2026-01-15'
      }
    }
  },

  // MÉXICO
  MX: {
    nombre: 'México',
    ultimaRevision: '2026-01-15',
    vigencia: 'Vigente para el año fiscal 2026',
    entidadReguladora: 'SAT',
    conocimiento: {
      iva: {
        preguntasClave: ['iva', 'impuesto al valor agregado', 'vat', 'cuándo pago iva'],
        respuestaSimple: () => 'Pagas IVA cuando vendes productos o servicios en territorio nacional. Tasa general 16%, frontera 8%. Debes declararlo bimestralmente ante el SAT.',
        articulo: 'Ley del IVA Art. 1-10',
        ejemplo: 'Vendes producto a $100 + IVA 16% = cobras $116. Declaras $16 de IVA.',
        ultimaRevision: '2026-01-15'
      },
      retencion: {
        preguntasClave: ['retención', 'isr', 'impuesto sobre la renta', 'retención isr'],
        respuestaSimple: () => 'El ISR se retiene cuando pagas a personas físicas o morales. Las tasas varían según el régimen fiscal del contribuyente.',
        articulo: 'Ley del ISR Art. 96-113',
        ejemplo: 'Pagas $10,000 a un proveedor. Según su régimen, puedes retener 1.25% a 10% de ISR.',
        ultimaRevision: '2026-01-15'
      },
      factura: {
        preguntasClave: ['factura', 'cfdi', 'factura electrónica', 'qué es cfdi'],
        respuestaSimple: () => 'El CFDI es el comprobante fiscal digital obligatorio para todas las operaciones. Debes emitirlo a través de un PAC autorizado por el SAT.',
        articulo: 'CFF Art. 29, Resolución Miscelánea Fiscal',
        ejemplo: 'Vendes un producto. Emites CFDI y el cliente lo recibe en su buzón tributario.',
        ultimaRevision: '2026-01-15'
      }
    }
  },

  // ESTADOS UNIDOS
  US: {
    nombre: 'United States',
    ultimaRevision: '2026-01-15',
    vigencia: 'Valid for fiscal year 2026',
    entidadReguladora: 'IRS',
    conocimiento: {
      vat: {
        preguntasClave: ['sales tax', 'vat', 'sales tax rate', 'when to charge sales tax'],
        respuestaSimple: () => 'Sales tax depends on your state. There is no federal VAT. You need to collect state sales tax based on economic nexus rules (if you sell above certain thresholds in a state).',
        articulo: 'South Dakota v. Wayfair (2018) - Economic Nexus',
        ejemplo: 'You sell online to California. If you exceed $500,000 in sales, you must collect California state sales tax.',
        ultimaRevision: '2026-01-15'
      },
      withholding: {
        preguntasClave: ['withholding', '1099', 'w-9', 'tax withholding', 'independent contractor'],
        respuestaSimple: () => 'If you hire independent contractors, you need to issue Form 1099-NEC if you pay them $600+ per year. Request Form W-9 from them first.',
        articulo: 'IRS Form 1099-NEC Instructions',
        ejemplo: 'You pay a freelancer $5,000. You need to issue a 1099-NEC and file it with the IRS.',
        ultimaRevision: '2026-01-15'
      },
      invoice: {
        preguntasClave: ['invoice', 'e-invoice', 'when to invoice', 'billing requirements'],
        respuestaSimple: () => 'No federal e-invoicing mandate exists in the US. However, you must keep accurate records and issue invoices with all required elements (business info, date, amount, tax).',
        articulo: 'IRS Publication 583',
        ejemplo: 'Your invoice should include your EIN, customer info, invoice date, due date, line items, sales tax (if any), total amount.',
        ultimaRevision: '2026-01-15'
      },
      expenses: {
        preguntasClave: ['deductible', 'business expenses', 'schedule c', 'what can i deduct'],
        respuestaSimple: () => 'You can deduct ordinary and necessary business expenses: office, supplies, marketing, travel, utilities, rent, insurance, software subscriptions. Must keep receipts and proof of payment.',
        articulo: 'IRS Publication 535 - Business Expenses',
        ejemplo: 'You buy a laptop for $1,200 for your business. You can deduct it as a Section 179 expense or depreciate over time.',
        ultimaRevision: '2026-01-15'
      }
    }
  },

  // REINO UNIDO
  UK: {
    nombre: 'United Kingdom',
    ultimaRevision: '2026-01-15',
    vigencia: 'Valid for tax year 2026',
    entidadReguladora: 'HMRC',
    conocimiento: {
      vat: {
        preguntasClave: ['vat', 'value added tax', 'when to register for vat', 'vat threshold'],
        respuestaSimple: () => 'You must register for VAT if your taxable turnover exceeds £90,000 (2025/26 threshold). There are different schemes: Standard, Flat Rate, Cash Accounting.',
        articulo: 'VAT Act 1994, HMRC Notice 700',
        ejemplo: 'Your turnover is £95,000. You MUST register for VAT. You charge 20% VAT on your sales (except zero-rated/exempt items).',
        ultimaRevision: '2026-01-15'
      },
      selfAssessment: {
        preguntasClave: ['self assessment', 'tax return', 'hmrc deadline', 'when to file tax return'],
        respuestaSimple: () => 'Self Assessment deadline is January 31st for online filing (for previous tax year April 6 to April 5). Request helps you need to report income, claim expenses, pay tax owed.',
        articulo: 'HMRC Self Assessment Manual',
        ejemplo: 'For tax year 2024-25 (April 6, 2024 - April 5, 2025), online filing deadline is January 31, 2026.',
        ultimaRevision: '2026-01-15'
      },
      expenses: {
        preguntasClave: ['allowable expenses', 'business expenses', 'what can i claim'],
        respuestaSimple: () => 'Claim allowable expenses that are wholly and exclusively for business: office costs, travel, stock/materials, equipment, marketing, professional fees. Keep receipts for 6 years.',
        articulo: 'HMRC Business Income Manual',
        ejemplo: 'You buy a £500 printer for your business. Claim as a capital allowance.',
        ultimaRevision: '2026-01-15'
      }
    }
  }
};

// ============================================================
// 2. FILTRO DE INTENCIÓN (PREVENCIÓN DE EVASIÓN)
// ============================================================

const PALABRAS_BLOQUEADAS = {
  es: ['evadir', 'no pagar', 'ocultar', 'declarar menos', 'factura falsa', 'como no pagar', 'saltarme', 'evasión', 'eludir'],
  en: ['evade', 'avoid paying', 'hide income', 'fake invoice', 'how not to pay', 'tax evasion', 'tax avoidance']
};

const detectarIntencionEvasion = (texto, idioma = 'es') => {
  const textoLower = texto.toLowerCase();
  const palabras = PALABRAS_BLOQUEADAS[idioma] || PALABRAS_BLOQUEADAS.es;
  
  for (const palabra of palabras) {
    if (textoLower.includes(palabra)) {
      return true;
    }
  }
  return false;
};

// ============================================================
// 3. FUNCIÓN PRINCIPAL CON CONTEXTO DE USUARIO
// ============================================================

export const responderDudaTributaria = (preguntaUsuario, paisCode = 'CO', idioma = 'es', usuario = null) => {
  // 🔒 PASO 1: FILTRO DE SEGURIDAD - Detectar intención de evasión
  if (detectarIntencionEvasion(preguntaUsuario, idioma)) {
    return {
      encontrado: true,
      bloqueado: true,
      respuesta: idioma === 'en'
        ? '⚠️ I cannot provide advice on tax evasion or avoidance. Stratium AI promotes fiscal responsibility and legal compliance. Please rephrase your question with legal intent.'
        : '⚠️ No puedo proporcionar consejos sobre evasión o elusión fiscal. Stratium AI promueve la responsabilidad fiscal y el cumplimiento legal. Por favor, reformula tu pregunta con una intención legal.',
      disclaimer: idioma === 'en'
        ? 'Stratium AI is a support tool and does NOT replace the advice of a certified tax professional.'
        : 'Stratium AI es una herramienta de apoyo y NO reemplaza el consejo de un profesional tributario certificado.',
      ultimaRevision: new Date().toISOString().split('T')[0]
    };
  }
  
  // 📍 PASO 2: OBTENER CONOCIMIENTO POR PAÍS
  const conocimientoPais = CONOCIMIENTO_POR_PAIS[paisCode] || CONOCIMIENTO_POR_PAIS.CO;
  const textoLower = preguntaUsuario.toLowerCase();
  
  // 🔍 PASO 3: BUSCAR COINCIDENCIA EN PREGUNTAS CLAVE
  let temaEncontrado = null;
  let infoEncontrada = null;
  
  for (const [tema, info] of Object.entries(conocimientoPais.conocimiento)) {
    for (const palabra of info.preguntasClave) {
      if (textoLower.includes(palabra)) {
        temaEncontrado = tema;
        infoEncontrada = info;
        break;
      }
    }
    if (temaEncontrado) break;
  }
  
  // 📝 PASO 4: CONSTRUIR RESPUESTA
  if (infoEncontrada) {
    const respuestaFinal = typeof infoEncontrada.respuestaSimple === 'function'
      ? infoEncontrada.respuestaSimple(usuario)
      : infoEncontrada.respuestaSimple;
    
    // Determinar régimen del usuario (si está disponible)
    const regimenUsuario = usuario?.perfilTributario?.regimenIVA || 
                          usuario?.perfilTributario?.regimenFiscal || 
                          'no especificado';
    
    return {
      encontrado: true,
      bloqueado: false,
      pais: conocimientoPais.nombre,
      entidadReguladora: conocimientoPais.entidadReguladora,
      regimenUsuario,
      pregunta: preguntaUsuario,
      respuesta: respuestaFinal,
      fuente: infoEncontrada.articulo,
      ejemplo: infoEncontrada.ejemplo,
      ultimaRevision: infoEncontrada.ultimaRevision,
      vigencia: conocimientoPais.vigencia,
      disclaimer: `⚠️ ADVERTENCIA LEGAL: Stratium AI es una herramienta de apoyo financiero y NO sustituye el consejo de un contador o abogado certificado. Las leyes tributarias cambian constantemente. La información presentada tiene vigencia hasta ${conocimientoPais.ultimaRevision}. Para casos específicos, consulta con ${conocimientoPais.entidadReguladora} o un profesional de confianza.`,
      nivelConfianza: 'MEDIO - Solo para orientación, no para decisiones críticas'
    };
  }
  
  // ❌ PASO 5: NO SE ENCONTRÓ RESPUESTA
  const preguntasSugeridas = getSugerenciasPreguntas(paisCode, idioma);
  
  return {
    encontrado: false,
    bloqueado: false,
    respuesta: idioma === 'en'
      ? 'I\'m not sure about that specific tax question. Tax regulations vary by country and change frequently.'
      : 'No estoy seguro de esa duda fiscal específica. Las regulaciones tributarias varían por país y cambian frecuentemente.',
    sugerencias: preguntasSugeridas,
    disclaimer: idioma === 'en'
      ? 'Stratium AI is a support tool and does NOT replace the advice of a certified tax professional.'
      : 'Stratium AI es una herramienta de apoyo y NO reemplaza el consejo de un profesional tributario certificado.',
    ultimaRevision: new Date().toISOString().split('T')[0]
  };
};

// ============================================================
// 4. SUGERENCIAS DE PREGUNTAS POR PAÍS
// ============================================================

export const getSugerenciasPreguntas = (paisCode = 'CO', idioma = 'es') => {
  const sugerenciasPorPais = {
    CO: idioma === 'en' 
      ? ['When do I pay VAT?', 'What is withholding tax?', 'When should I issue an e-invoice?', 'What expenses can I deduct?']
      : ['¿Cuándo pago IVA?', '¿Qué es la retención en la fuente?', '¿Cuándo debo emitir factura electrónica?', '¿Qué gastos puedo deducir?'],
    MX: ['¿Cuándo pago IVA?', '¿Qué es el CFDI?', '¿Qué gastos puedo deducir?', '¿Cómo facturar a un cliente en USA?'],
    US: ['When do I charge sales tax?', 'What is Form 1099?', 'Do I need to register for an EIN?', 'What expenses can I deduct on Schedule C?'],
    UK: ['When must I register for VAT?', 'What is Self Assessment?', 'When is the tax return deadline?', 'What expenses are allowable?']
  };
  
  return sugerenciasPorPais[paisCode] || sugerenciasPorPais.CO;
};

// ============================================================
// 5. FUNCIÓN PARA OBTENER VIGENCIA LEGAL
// ============================================================

export const getVigenciaLegal = (paisCode = 'CO') => {
  const conocimiento = CONOCIMIENTO_POR_PAIS[paisCode] || CONOCIMIENTO_POR_PAIS.CO;
  return {
    pais: conocimiento.nombre,
    entidad: conocimiento.entidadReguladora,
    ultimaRevision: conocimiento.ultimaRevision,
    vigencia: conocimiento.vigencia,
    recomendacion: 'Siempre verifica la información actualizada directamente con la entidad reguladora o un contador certificado.'
  };
};

export default { responderDudaTributaria, getSugerenciasPreguntas, getVigenciaLegal };

