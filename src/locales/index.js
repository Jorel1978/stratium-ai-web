// src/locales/index.js
// Sistema de textos multilenguaje para Stratium AI
// Soporta plurales inteligentes y contexto cultural por país

// Función auxiliar para manejar plurales
const pluralizar = (cantidad, singular, plural) => {
  return cantidad === 1 ? singular : plural;
};

// ==================== ESPAÑOL (BASE NEUTRA) ====================
const BASE_ES = {
  // Navegación y títulos
  titulo: '🏭 Stratium AI - Orden de Producción',
  subtitulo: 'Auditoría financiera para emprendedores reales',
  tituloInventario: '📦 Inventario',
  tituloDashboard: '📊 Dashboard',
  tituloConfiguracion: '⚙️ Configuración',
  
  // Costos Globales
  costosGlobales: '📊 Costos Globales del Lote',
  horasTotales: 'Horas de Trabajo (totales)',
  horasTotalesPlaceholder: 'Ej: 40',
  valorHora: 'Valor Hora',
  valorHoraPlaceholder: 'Ej: 11500',
  transporte: 'Transporte/Logística',
  transportePlaceholder: 'Ej: 150000',
  gastosAdicionales: 'Gastos Adicionales',
  gastosAdicionalesPlaceholder: 'Ej: 80000',
  gastosFijosMensuales: 'Gastos Fijos Mensuales',
  gastosFijosMensualesPlaceholder: 'Ej: 10000000',
  
  // Productos
  productos: '📦 Productos',
  agregarProducto: '+ Agregar Producto',
  nombreProducto: 'Producto',
  cantidad: 'Cantidad',
  precioVenta: 'Precio Venta',
  materiales: 'Materiales (por unidad)',
  materialesPlaceholder: 'Ej: 120000',
  horasPorUnidad: 'Horas/unidad',
  horasPorUnidadPlaceholder: 'Ej: 1.5',
  nota: 'Nota (opcional)',
  eliminar: 'Eliminar',
  
  // Acciones
  auditar: '🔍 Auditar Lote',
  auditando: 'Analizando con inteligencia...',
  guardar: '💾 Guardar en Inventario',
  guardando: 'Guardando...',
  
  // Métricas financieras
  costoVariableTotal: 'Costo Total Unitario',
  utilidadAuditada: '💰 Ganancia Real (con reserva)',
  margen: 'Margen de Ganancia',
  puntoEquilibrio: '⚖️ Unidades para cubrir gastos fijos',
  costoOperativo: 'Costo Operativo Unitario',
  comision: 'Comisión del canal',
  provisionSupervivencia: 'Reserva para gastos fijos',
  
  // Desglose de costos
  desgloseCostos: '🔍 Ver desglose de costos',
  materialesLabel: 'Materiales',
  manoObraLabel: 'Mano de Obra (con prestaciones)',
  transporteLabel: 'Transporte',
  gastosFijosLabel: 'Gastos fijos aplicados',
  comisionesLabel: 'Comisiones del canal',
  provisionLabel: 'Reserva de supervivencia',
  totalLabel: 'Total',
  
  // Alertas por color
  alertaCritica: '❌ Crítico - Margen muy bajo',
  alertaAceptable: '⚠️ Aceptable - Se puede mejorar',
  alertaExcelente: '✅ Excelente - Buen negocio',
  
  // Tooltips explicativos
  tooltipUtilidad: 'Esta ganancia ya aparta una reserva de {provision} para que pagues tus gastos fijos (arriendo, servicios, nómina). Es lo que realmente puedes gastar.',
  tooltipPuntoEquilibrio: 'Número de unidades que necesitas vender de este producto para cubrir TODOS los gastos fijos del mes.',
  tooltipMargen: 'Porcentaje de ganancia sobre el precio de venta, después de todos los costos y reservas.',
  
  // Sugerencias de precio
  sugerenciasPrecio: '📊 Sugerencias de Precio',
  sugerencia10: '💰 Para 10% de margen',
  sugerencia20: '📈 Para 20% de margen',
  sugerencia30: '🎯 Para 30% de margen (recomendado)',
  sugerencia40: '⭐ Para 40% de margen',
  
  // ==================== INDICADOR DE SUEÑO (CON PLURALES) ====================
  indicadorSueño: '😴 Días de gastos cubiertos',
  mensajeSueñoExcelente: '🏠 ¡Tranquilo! Ya cubriste todos los gastos fijos del mes.',
  mensajeSueñoBueno: (dias) => `😌 Vas bien. Te falta ${dias} ${pluralizar(dias, 'día', 'días')} por cubrir.`,
  mensajeSueñoRegular: (dias) => `⚠️ Atento. Solo tienes ${dias} ${pluralizar(dias, 'día', 'días')} cubiertos.`,
  mensajeSueñoCritico: (dias, gastos) => `🚨 Cuidado. Solo tienes ${dias} ${pluralizar(dias, 'día', 'días')} cubiertos. El arriendo es ${gastos}. ¡Revisa tus precios!`,
  diasCubiertos: (dias) => `${dias} ${pluralizar(dias, 'día', 'días')} cubiertos de 30`,
  metaMensual: 'Meta mensual: {meta}',
  
 // ==================== CLAVES ADICIONALES PARA SleepIndicator ====================
  sinDatos: 'Sin datos',
  mensajeSinDatos: 'Registra tus gastos fijos y ventas para ver cuántos días cubres.',
  ariaIndicadorSueño: 'Indicador de días de gastos cubiertos',
  cubiertoLabel: 'Cubierto:',
  faltanteLabel: 'Faltante:',
  tooltipUtilidadAcumulada: 'Utilidad neta = Ventas - Costos variables (materiales, mano de obra, comisiones). Los gastos fijos se restan aquí para calcular días cubiertos.',
  queEsUtilidad: 'Utilidad neta auditada',

  // ==================== NIVEL DE CONFIANZA ====================
  nivelConfianza: '📊 Nivel de Confianza de la Auditoría',
  confianzaAlta: 'ALTA CONFIABILIDAD',
  confianzaMedia: 'CONFIABILIDAD MEDIA',
  confianzaBaja: 'BAJA CONFIABILIDAD',
  mensajeConfianzaAlta: '🎯 Tus datos son muy confiables. Mis consejos son precisos. ¡Así se hace!',
  mensajeConfianzaMedia: '📊 Voy bien, pero me faltan algunos datos para darte la mejor foto. Revisa gastos pequeños.',
  mensajeConfianzaBaja: '⚠️ Con los datos que me das no puedo darte un diagnóstico real. ¿Podemos revisar los gastos hormiga de la semana?',
  registrarPendientes: '+ Registrar gastos pendientes',
  
  // ==================== CLAVES ADICIONALES PARA TRUSTMETER ====================
  progresoRegistros: '{completos}/{totales}',
  
  sugerenciaMejoraConfianza: (estado) => estado === 'medio'
    ? '📝 Registra más gastos hormiga para mejorar la precisión de la auditoría'
    : '📝 Registra tus ventas y gastos diarios para obtener insights reales de tu negocio',

  // ==================== CONSULTOR TRIBUTARIO ====================
  consultorTitulo: '🤝 ¿Tienes dudas legales o tributarias?',
  consultorDescripcion: 'Sistema de apoyo fiscal con información actualizada por país.',
  consultorPlaceholder: 'Ej: "¿Desde cuánto debo facturar?" o "¿Qué impuestos pago?"',
  consultorBoton: 'Consultar',
  consultorPensando: 'Consultando base legal...',
  consultorRespuesta: '📋 Respuesta:',
  consultorError: '❌ Error en la consulta. Intenta de nuevo.',
  consultorAriaLabel: 'Consultor tributario inteligente',
  consultorIcono: '🤝',
  consultorDisclaimer: '⚠️ ADVERTENCIA: Stratium AI es una herramienta de apoyo y NO sustituye el consejo de un contador o abogado certificado. Las leyes tributarias cambian constantemente. Para casos específicos, consulta con un profesional de confianza.',
  
  // Iconos y emojis
  iconoLoading: '⏳',
  iconoFuente: '📚',
  iconoEjemplo: '💡',
  iconoAdvertencia: '⚠️',
  
    // ==================== BENCHMARK COLMENA ====================
  benchmarkTitulo: '🐝 Inteligencia de Colmena',
  benchmarkRegistros: 'registros',
  benchmarkZonaCiudad: '📍 Basado en tu ciudad',
  benchmarkZonaPais: '🌎 Basado en todo el país',
  benchmarkTuPrecio: '💰 Tu precio',
  benchmarkPromedio: '📊 Promedio zona',
  benchmarkRango: '📉 Rango típico',
  
  benchmarkMensajeCaro: (cantidad, producto, porcentaje) => 
    `⚠️ ¡Atención! ${cantidad} negocios consiguen "${producto}" un ${porcentaje}% más barato que tú.`,
  benchmarkMensajeBarato: (cantidad, producto, porcentaje) => 
    `✅ ¡Buena gestión! Pagas un ${porcentaje}% menos que el promedio de ${cantidad} negocios.`,
  benchmarkMensajeAlineado: (producto) => 
    `✓ El precio de "${producto}" está alineado con el promedio de tu zona.`,
  
  benchmarkAccionCaro: '💡 Ver oportunidad de ahorro',
  benchmarkAccionBarato: '💰 ¿Cómo mantener este margen?',
  benchmarkAccionAlineado: '📊 Ver comparativa detallada',
  benchmarkMantenerVentaja: '🔒 ¿Cómo mantener esta ventaja?',

  // ==================== ALERTAS INMEDIATAS ====================
  alertaCompraCara: (producto, precio, porcentaje) => `⚠️ ¡Cuidado! Acabas de comprar ${producto} por ${precio}. Normalmente se consigue un ${porcentaje}% más barato.`,
  alertaVentaMargenBajo: (producto, margen) => `📉 Ojo con ${producto}. Tiene un margen del ${margen}%. ¿Has considerado revisar el precio o los costos?`,
  alertaGastoHormiga: (concepto, valor) => `🐜 ¿Te acuerdas de este gasto? "${concepto}" por ${valor}. Si no es correcto, ignóralo.`,
  
  // ==================== RECORDATORIOS ====================
  recordatorioDiario: (nombre) => `🤝 Hola ${nombre}, ¿todo bien? Para que mi auditoría sea real, ¿hubo algún gasto hormiga (bus, café, bolsas) que se nos escapó hoy?`,
  recordatorioSinRegistro: (dias) => `Hace ${dias} ${pluralizar(dias, 'día', 'días')} no registras nada. ¿Todo bien? Recuerda que entre más datos, mejor te ayudo.`,
  
  // ==================== COMANDOS DE VOZ ====================
  vozEscuchar: '🎤 Dictar gasto',
  vozEscuchando: '🎤 Escuchando...',
  vozError: 'No entendí. ¿Puedes repetirlo?',
  vozEjemplo: 'Di algo como "Compré 3 sillas por 150 mil pesos"',
  
  // ==================== SALUDOS PERSONALIZADOS ====================
  saludoManana: '¡Buenos días',
  saludoTarde: '¡Buenas tardes',
  saludoNoche: '¡Buenas noches',
  bienvenidoPais: (pais) => `¡Bienvenido a Stratium AI - Tu socio financiero en ${pais}!`,
  
  // ==================== ÉXITO Y ERRORES ====================
  exitoRegistro: '✅ ¡Listo! Lote registrado correctamente.',
  errorRegistro: '❌ Error al guardar. Intenta de nuevo.',
  errorAuditoria: '❌ Error en el cálculo. Verifica los datos ingresados.',
  errorProductoRequerido: '⚠️ Debes agregar al menos un producto con nombre, cantidad y precio válido',
  errorSesion: '⚠️ Debes iniciar sesión para registrar producción',
  errorPersistencia: '❌ Error al guardar. No se modificó ningún dato.',
  
  // ==================== PRODUCTO INDIVIDUAL ====================
  utilidadTotal: 'Utilidad total',
  unidades: (cantidad) => `${cantidad} ${pluralizar(cantidad, 'unidad', 'unidades')}`,
  
  // ==================== RESUMEN DE ABSORCIÓN ====================
  resumenAbsorcion: '📊 Resumen de Absorción de Gastos Fijos',
  acumuladoMes: 'Acumulado del mes',
  esteLote: 'Este lote',
  totalCubierto: 'Total cubierto',
  diasCubiertosLote: (dias) => `${dias} ${pluralizar(dias, 'día', 'días')} cubiertos por este lote`,
  
  // ==================== FOOTER ====================
  footerVersion: 'Stratium AI v2.4 - Auditoría financiera inteligente',
  
  // ==================== SELECTOR DE PAÍS/IDIOMA ====================
  selectorPais: 'Selecciona tu país',
  selectorIdioma: 'Idioma',
  idiomaEspañol: 'Español',
  idiomaIngles: 'English',
  guardarConfiguracion: 'Guardar configuración',
  
  // ==================== NUEVAS CLAVES PARA UserGreeting ====================
  fallbackNombre: 'Emprendedor',
  ariaSaludo: 'Saludo de bienvenida',
  horaLocalInfo: '⏱️ Hora local',
  bienvenidoGenerico: 'Bienvenido a Stratium AI - Tu socio financiero en {pais}',
  
  // Mensajes contextuales por país
  bienvenidoPais_CO: '🇨🇴 ¡Vamos a cuidar tu negocio!',
  bienvenidoPais_MX: '🇲🇽 Vamos a hacer crecer tu negocio',
  bienvenidoPais_AR: '🇦🇷 Che, cuidemos los números',
  bienvenidoPais_CL: '🇨🇱 ¡Vamos a crecer juntos!',
  bienvenidoPais_PE: '🇵🇪 Potencia tu negocio con Stratium',
  bienvenidoPais_UY: '🇺🇾 Tu socio financiero en Uruguay',
  bienvenidoPais_US: '🇺🇸 Let\'s grow your business',
  bienvenidoPais_GB: '🇬🇧 Let\'s grow your business',
  bienvenidoPais_ES: '🇪🇸 Vamos a optimizar tu negocio',
  bienvenidoPais_DE: '🇩🇪 Lassen Sie uns Ihr Geschäft ausbauen',
  bienvenidoPais_FR: '🇫🇷 Développons votre entreprise',
  bienvenidoPais_IT: '🇮🇹 Facciamo crescere la tua attività',
};

// ==================== INGLÉS (BASE NEUTRA) ====================
const BASE_EN = {
  // Navigation
  titulo: '🏭 Stratium AI - Production Order',
  subtitulo: 'Financial audit for real entrepreneurs',
  tituloInventario: '📦 Inventory',
  tituloDashboard: '📊 Dashboard',
  tituloConfiguracion: '⚙️ Settings',
  
  // Global Costs
  costosGlobales: '📊 Batch Global Costs',
  horasTotales: 'Work Hours (total)',
  horasTotalesPlaceholder: 'Ex: 40',
  valorHora: 'Hourly Rate',
  valorHoraPlaceholder: 'Ex: 11500',
  transporte: 'Shipping/Logistics',
  transportePlaceholder: 'Ex: 150000',
  gastosAdicionales: 'Additional Costs',
  gastosAdicionalesPlaceholder: 'Ex: 80000',
  gastosFijosMensuales: 'Monthly Fixed Costs',
  gastosFijosMensualesPlaceholder: 'Ex: 10000000',
  
  // Products
  productos: '📦 Products',
  agregarProducto: '+ Add Product',
  nombreProducto: 'Product',
  cantidad: 'Quantity',
  precioVenta: 'Selling Price',
  materiales: 'Materials (per unit)',
  materialesPlaceholder: 'Ex: 120000',
  horasPorUnidad: 'Hours/unit',
  horasPorUnidadPlaceholder: 'Ex: 1.5',
  nota: 'Note (optional)',
  eliminar: 'Delete',
  
  // Actions
  auditar: '🔍 Audit Batch',
  auditando: 'Analyzing with AI...',
  guardar: '💾 Save to Inventory',
  guardando: 'Saving...',
  
  // Metrics
  costoVariableTotal: 'Total Unit Cost',
  utilidadAuditada: '💰 Real Profit (with reserve)',
  margen: 'Profit Margin',
  puntoEquilibrio: '⚖️ Units to cover fixed costs',
  costoOperativo: 'Unit Operating Cost',
  comision: 'Channel commission',
  provisionSupervivencia: 'Fixed costs reserve',
  
  // Cost breakdown
  desgloseCostos: '🔍 View cost breakdown',
  materialesLabel: 'Materials',
  manoObraLabel: 'Labor (with benefits)',
  transporteLabel: 'Shipping',
  gastosFijosLabel: 'Applied fixed costs',
  comisionesLabel: 'Channel commissions',
  provisionLabel: 'Survival reserve',
  totalLabel: 'Total',
  
  // Alerts by color
  alertaCritica: '❌ Critical - Very low margin',
  alertaAceptable: '⚠️ Acceptable - Can improve',
  alertaExcelente: '✅ Excellent - Good business',
  
  // Tooltips
  tooltipUtilidad: (provision) => `This profit already sets aside a reserve of ${provision} for your fixed costs (rent, utilities, payroll). This is what you can actually spend.`,
  tooltipPuntoEquilibrio: 'Number of units you need to sell of this product to cover ALL monthly fixed costs.',
  tooltipMargen: 'Percentage of profit on the selling price, after all costs and reserves.',
  
  // Price suggestions
  sugerenciasPrecio: '📊 Price Suggestions',
  sugerencia10: '💰 For 10% margin',
  sugerencia20: '📈 For 20% margin',
  sugerencia30: '🎯 For 30% margin (recommended)',
  sugerencia40: '⭐ For 40% margin',
  
  // ==================== SLEEP INDICATOR (WITH PLURALS) ====================
  indicadorSueño: '😴 Days of covered costs',
  mensajeSueñoExcelente: '🏠 Relax! You\'ve covered all monthly fixed costs.',
  mensajeSueñoBueno: (dias) => `😌 You\'re doing well. ${dias} ${pluralizar(dias, 'day', 'days')} left to cover.`,
  mensajeSueñoRegular: (dias) => `⚠️ Heads up. Only ${dias} ${pluralizar(dias, 'day', 'days')} covered.`,
  mensajeSueñoCritico: (dias, gastos) => `🚨 Warning. Only ${dias} ${pluralizar(dias, 'day', 'days')} covered. Rent is ${gastos}. Review your prices!`,
  diasCubiertos: (dias) => `${dias} ${pluralizar(dias, 'day', 'days')} covered out of 30`,
  metaMensual: 'Monthly goal: {meta}',
  
 // ==================== ADDITIONAL KEYS FOR SleepIndicator ====================
  sinDatos: 'No data',
  mensajeSinDatos: 'Register your fixed costs and sales to see how many days you cover.',
  ariaIndicadorSueño: 'Days of covered costs indicator',
  cubiertoLabel: 'Covered:',
  faltanteLabel: 'Remaining:',
  tooltipUtilidadAcumulada: 'Net profit = Sales - Variable costs (materials, labor, commissions). Fixed costs are subtracted here to calculate covered days.',
  queEsUtilidad: 'Audited net profit',

  // ==================== CONFIDENCE METER ====================
  nivelConfianza: '📊 Audit Confidence Level',
  confianzaAlta: 'HIGH RELIABILITY',
  confianzaMedia: 'MEDIUM RELIABILITY',
  confianzaBaja: 'LOW RELIABILITY',
  mensajeConfianzaAlta: '🎯 Your data is very reliable. My advice is accurate. Way to go!',
  mensajeConfianzaMedia: '📊 I\'m doing well, but I\'m missing some data for the best picture. Check small expenses.',
  mensajeConfianzaBaja: '⚠️ With the data you give me, I can\'t give you a real diagnosis. Can we review the week\'s minor expenses?',
  registrarPendientes: '+ Register pending expenses',
  
  // ==================== ADDITIONAL KEYS FOR TRUSTMETER ====================
  progresoRegistros: '{completos}/{totales}',
  
  sugerenciaMejoraConfianza: (estado) => estado === 'medium'
    ? '📝 Log more small expenses to improve audit accuracy'
    : '📝 Log your daily sales and expenses to get real business insights',

   // ==================== TAX CONSULTANT ====================
  consultorTitulo: '🤝 Have legal or tax questions?',
  consultorDescripcion: 'Tax support system with country-specific updated information.',
  consultorPlaceholder: 'Ex: "Do I need a W-9?", "What is 1099?", "How to charge sales tax?"',
  consultorBoton: 'Ask',
  consultorPensando: 'Consulting legal database...',
  consultorRespuesta: '📋 Answer:',
  consultorError: '❌ Consultation error. Please try again.',
  consultorAriaLabel: 'Smart tax consultant',
  consultorIcono: '🤝',
  consultorDisclaimer: '⚠️ WARNING: Stratium AI is a support tool and does NOT replace the advice of a certified accountant or attorney. Tax laws change frequently. For specific matters, consult a trusted professional.',
  
  // Icons and emojis
  iconoLoading: '⏳',
  iconoFuente: '📚',
  iconoEjemplo: '💡',
  iconoAdvertencia: '⚠️',
  
   // ==================== HIVE BENCHMARK ====================
  benchmarkTitulo: '🐝 Hive Intelligence',
  benchmarkRegistros: 'records',
  benchmarkZonaCiudad: '📍 Based on your city',
  benchmarkZonaPais: '🌎 Based on your country',
  benchmarkTuPrecio: '💰 Your price',
  benchmarkPromedio: '📊 Area average',
  benchmarkRango: '📉 Typical range',
  
  benchmarkMensajeCaro: (cantidad, producto, porcentaje) => 
    `⚠️ Attention! ${cantidad} businesses get "${producto}" ${porcentaje}% cheaper than you.`,
  benchmarkMensajeBarato: (cantidad, producto, porcentaje) => 
    `✅ Great deal! You pay ${porcentaje}% less than the average of ${cantidad} businesses.`,
  benchmarkMensajeAlineado: (producto) => 
    `✓ The price of "${producto}" is aligned with your area's average.`,
  
  benchmarkAccionCaro: '💡 View savings opportunity',
  benchmarkAccionBarato: '💰 How to maintain this margin?',
  benchmarkAccionAlineado: '📊 View detailed comparison',
  benchmarkMantenerVentaja: '🔒 How to maintain this advantage?',

  // ==================== IMMEDIATE ALERTS ====================
  alertaCompraCara: (producto, precio, porcentaje) => `⚠️ Careful! You just bought ${producto} for ${precio}. It\'s usually ${porcentaje}% cheaper.`,
  alertaVentaMargenBajo: (producto, margen) => `📉 Watch out for ${producto}. It has a ${margen}% margin. Have you considered reviewing the price or costs?`,
  alertaGastoHormiga: (concepto, valor) => `🐜 Do you remember this expense? "${concepto}" for ${valor}. If not correct, ignore it.`,
  
  // ==================== REMINDERS ====================
  recordatorioDiario: (nombre) => `🤝 Hi ${nombre}, how\'s it going? For my audit to be real, were there any small expenses (coffee, parking) we missed today?`,
  recordatorioSinRegistro: (dias) => `You haven\'t registered anything in ${dias} ${pluralizar(dias, 'day', 'days')}. Everything ok? Remember, more data means better help.`,
  
  // ==================== VOICE COMMANDS ====================
  vozEscuchar: '🎤 Dictate expense',
  vozEscuchando: '🎤 Listening...',
  vozError: 'I didn\'t understand. Can you repeat?',
  vozEjemplo: 'Say something like "I bought 3 chairs for 150 thousand pesos"',
  
  // ==================== PERSONALIZED GREETINGS ====================
  saludoManana: 'Good morning',
  saludoTarde: 'Good afternoon',
  saludoNoche: 'Good evening',
  bienvenidoPais: (pais) => `Welcome to Stratium AI - Your financial partner in ${pais}!`,
  
  // ==================== SUCCESS & ERRORS ====================
  exitoRegistro: '✅ Done! Batch registered successfully.',
  errorRegistro: '❌ Error saving. Please try again.',
  errorAuditoria: '❌ Calculation error. Check the entered data.',
  errorProductoRequerido: '⚠️ Add at least one product with valid name, quantity and price',
  errorSesion: '⚠️ You must be logged in to register production',
  errorPersistencia: '❌ Error saving. No data was modified.',
  
  // ==================== INDIVIDUAL PRODUCT ====================
  utilidadTotal: 'Total profit',
  unidades: (cantidad) => `${cantidad} ${pluralizar(cantidad, 'unit', 'units')}`,
  
  // ==================== ABSORPTION SUMMARY ====================
  resumenAbsorcion: '📊 Fixed Costs Absorption Summary',
  acumuladoMes: 'Month accumulated',
  esteLote: 'This batch',
  totalCubierto: 'Total covered',
  diasCubiertosLote: (dias) => `${dias} ${pluralizar(dias, 'day', 'days')} covered by this batch`,
  
  // ==================== FOOTER ====================
  footerVersion: 'Stratium AI v2.4 - Smart financial audit',
  
  // ==================== COUNTRY/LANGUAGE SELECTOR ====================
  selectorPais: 'Select your country',
  selectorIdioma: 'Language',
  idiomaEspañol: 'Spanish',
  idiomaIngles: 'English',
  guardarConfiguracion: 'Save settings',
  
  // ==================== NEW KEYS FOR UserGreeting ====================
  fallbackNombre: 'Entrepreneur',
  ariaSaludo: 'Welcome greeting',
  horaLocalInfo: '⏱️ Local time',
  bienvenidoGenerico: 'Welcome to Stratium AI - Your financial partner in {pais}',
  
  // Contextual messages by country
  bienvenidoPais_CO: '🇨🇴 Let\'s take care of your business!',
  bienvenidoPais_MX: '🇲🇽 Let\'s grow your business',
  bienvenidoPais_AR: '🇦🇷 Let\'s grow your business',
  bienvenidoPais_CL: '🇨🇱 Let\'s grow your business',
  bienvenidoPais_PE: '🇵🇪 Let\'s grow your business',
  bienvenidoPais_UY: '🇺🇾 Let\'s grow your business',
  bienvenidoPais_US: '🇺🇸 Let\'s grow your business',
  bienvenidoPais_GB: '🇬🇧 Let\'s grow your business',
  bienvenidoPais_ES: '🇪🇸 Let\'s optimize your business',
  bienvenidoPais_DE: '🇩🇪 Lassen Sie uns Ihr Geschäft ausbauen',
  bienvenidoPais_FR: '🇫🇷 Développons votre entreprise',
  bienvenidoPais_IT: '🇮🇹 Facciamo crescere la tua attività',
};

// ==================== OVERRIDES POR PAÍS (CONTEXTO CULTURAL) ====================
const OVERRIDES = {
  // Colombia - usa BASE_ES
  CO: BASE_ES,
  
  // México - ajustes locales
  MX: {
    ...BASE_ES,
    transporte: 'Fletes/Transporte',
    consultorPlaceholder: 'Ej: "¿Necesito facturar a un cliente persona física?"',
    ejemplo1: '"¿Desde cuánto debo facturar?"',
    ejemplo2: '"¿Qué es el RFC y cómo lo obtengo?"',
    ejemplo3: '"¿Cómo calcular el ISR e IVA?"'
  },
  
  // Argentina - ajustes locales
  AR: {
    ...BASE_ES,
    subtitulo: 'Auditoría financiera para emprendedores de verdad',
    consultorPlaceholder: 'Ej: "¿Qué impuestos pago como monotributista?"',
    ejemplo1: '"¿Cómo facturar a un monotributista?"',
    ejemplo2: '"¿Qué es el IVA y cómo se calcula?"',
    ejemplo3: '"¿Cuándo debo pagar Ganancias?"'
  },
  
  // España - ajustes locales (castellano europeo)
  ES: {
    ...BASE_ES,
    costosGlobales: '📊 Costes Globales del Lote',
    transporte: 'Transporte/Logística',
    utilidadAuditada: '💰 Beneficio Real (con reserva)',
    valorHora: 'Tarifa por hora',
    consultorPlaceholder: 'Ej: "¿Tengo que darme de alta como autónomo?"',
    ejemplo1: '"¿Qué es el IVA y cómo se declara?"',
    ejemplo2: '"¿Qué gastos puedo deducir como autónomo?"',
    ejemplo3: '"¿Cómo funciona el modelo 303 y 390?"'
  },
  
  // Estados Unidos - contexto fiscal USA
  US: {
    ...BASE_EN,
    consultorPlaceholder: 'Ex: "Do I need a W-9?", "What is 1099-K?", "How to charge sales tax?"',
    ejemplo1: '"Do I need to issue a W-9 to clients?"',
    ejemplo2: '"What is the difference between 1099-NEC and 1099-K?"',
    ejemplo3: '"Do I need to collect sales tax for out-of-state sales?"',
    bienvenidoPais: (pais) => `Welcome to Stratium AI - Your financial partner in the USA!`
  },
  
  // Reino Unido - contexto fiscal UK (normalizado a GB)
  GB: {
    ...BASE_EN,
    transporte: 'Delivery/Logistics',
    utilidadAuditada: '💰 Real Profit (with provision)',
    consultorPlaceholder: 'Ex: "Do I need to register for VAT?", "What is Self Assessment?"',
    ejemplo1: '"Do I need to register for the VAT scheme?"',
    ejemplo2: '"What is the Making Tax Digital initiative?"',
    ejemplo3: '"How do I file my Self Assessment tax return?"',
    bienvenidoPais: (pais) => `Welcome to Stratium AI - Your financial partner in the UK!`
  },
  
  // Alemania
  DE: {
    ...BASE_EN,
    consultorPlaceholder: 'Ex: "Do I need a VAT ID?", "What is Gewerbesteuer?"',
    ejemplo1: '"How to register for VAT (Umsatzsteuer)?"',
    ejemplo2: '"What is the difference between Umsatzsteuer and Gewerbesteuer?"',
    ejemplo3: '"Do I need a tax advisor (Steuerberater)?"'
  }
};

// ==================== FUNCIÓN PRINCIPAL DE TRADUCCIÓN ====================
export const obtenerTexto = (usuarioPais, idiomaUsuario, key, params = {}) => {
  // Normalizar país (UK → GB)
  const paisNormalizado = usuarioPais === 'UK' ? 'GB' : usuarioPais;
  
  // Determinar base según idioma
  const base = idiomaUsuario === 'en' ? BASE_EN : BASE_ES;
  
  // Obtener override por país (si existe)
  const override = OVERRIDES[paisNormalizado] || {};
  
  // Buscar texto: override > base > key fallback
  let texto = override[key] || base[key] || key;
  
  // Si el texto es una función (para plurales o lógica compleja)
  if (typeof texto === 'function') {
    // Extraer parámetros posicionales y named
    const valoresPosicionales = Object.values(params);
    texto = texto(...valoresPosicionales);
  }
  
  // Reemplazar parámetros nombrados {param}
  Object.keys(params).forEach(param => {
    if (typeof texto === 'string') {
      texto = texto.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }
  });
  
  return texto;
};

// ==================== HOOK SIMPLIFICADO PARA REACT ====================
export const useTranslation = (usuarioPais, idiomaUsuario) => {
  return (key, params = {}) => obtenerTexto(usuarioPais, idiomaUsuario, key, params);
};

// Funciones específicas para mensajes con plurales
export const formatearDias = (dias, idioma) => {
  if (idioma === 'en') {
    return `${dias} ${dias === 1 ? 'day' : 'days'}`;
  }
  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export default { BASE_ES, BASE_EN, OVERRIDES, obtenerTexto, useTranslation, formatearDias };

