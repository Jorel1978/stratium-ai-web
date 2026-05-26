// src/config/permisos.js
// Configuración centralizada de permisos por plan (bilingüe)

export const PERMISOS = {
  starter: {
    nombre: { es: "Starter", en: "Starter" },
    eslogan: { es: "Ordena tu negocio", en: "Organize your business" },
    precio: { es: "$0 / 15 días", en: "$0 / 15 days" },
    registroManual: { limite: 100, periodo: 'mes', texto: { es: "100 movimientos/mes", en: "100 transactions/month" } },
    historial: { dias: 30, texto: { es: "30 días de historial", en: "30 days history" } },
    inventario: { maxProductos: 20, texto: { es: "Hasta 20 productos", en: "Up to 20 products" } },
    dashboard: { nivel: 'basico', texto: { es: "Dashboard básico", en: "Basic dashboard" } },
    exportarCSV: false,
    reportesPDF: { disponible: false, watermark: true, texto: { es: "Vista previa en pantalla", en: "Screen preview only" } },
    alertas: false,
    comparacionMensual: false,
    puntoEquilibrio: false,
    rotacionInventario: false,
    produccion: false,
    auditoriaSobrecostos: false,
    deteccionFugas: false,
    flujoCajaProyectado: false,
    radarQuiebra: false,
    modoConsultor: false,
    bot: { nivel: false, texto: { es: "❌ Desactivado", en: "❌ Disabled" } },
    whatsapp: false,
    usuarios: 1,
    mensajesIA: 0
  },
  pro: {
    nombre: { es: "Pro", en: "Pro" },
    eslogan: { es: "Controla tus finanzas", en: "Control your finances" },
    precio: { es: "$79.900/mes", en: "$79,900/month" },
    registroManual: { limite: 'ilimitado', texto: { es: "Registro ilimitado", en: "Unlimited transactions" } },
    historial: { dias: 'completo', texto: { es: "Historial completo", en: "Full history" } },
    inventario: { maxProductos: 'ilimitado', texto: { es: "Inventario ilimitado", en: "Unlimited inventory" } },
    dashboard: { nivel: 'completo', texto: { es: "Dashboard completo", en: "Complete dashboard" } },
    exportarCSV: true,
    reportesPDF: { disponible: true, nivel: 'basicos', texto: { es: "Reportes PDF básicos", en: "Basic PDF reports" } },
    alertas: { nivel: 'basicas', texto: { es: "Alertas básicas", en: "Basic alerts" } },
    comparacionMensual: { meses: 6, texto: { es: "Comparación últimos 6 meses", en: "6-month comparison" } },
    puntoEquilibrio: { maxProductos: 5, texto: { es: "Punto equilibrio (5 productos)", en: "Break-even (5 products)" } },
    rotacionInventario: { nivel: 'vista', texto: { es: "Vista de rotación", en: "Rotation view" } },
    produccion: false,
    auditoriaSobrecostos: false,
    deteccionFugas: false,
    flujoCajaProyectado: false,
    radarQuiebra: false,
    modoConsultor: false,
    bot: { nivel: 'comandos', texto: { es: "Comandos básicos (/saldo, /ventas)", en: "Basic commands (/balance, /sales)" } },
    whatsapp: false,
    usuarios: 1,
    mensajesIA: 50
  },
  business: {
    nombre: { es: "Business", en: "Business" },
    eslogan: { es: "Detecta pérdidas ocultas", en: "Detect hidden losses" },
    precio: { es: "$199.900/mes", en: "$199,900/month" },
    registroManual: { limite: 'ilimitado', texto: { es: "Registro ilimitado", en: "Unlimited transactions" } },
    historial: { dias: 'completo', texto: { es: "Historial completo", en: "Full history" } },
    inventario: { maxProductos: 'ilimitado', texto: { es: "Inventario ilimitado", en: "Unlimited inventory" } },
    dashboard: { nivel: 'completo', texto: { es: "Dashboard + alertas avanzadas", en: "Dashboard + advanced alerts" } },
    exportarCSV: true,
    reportesPDF: { disponible: true, nivel: 'maestros', texto: { es: "Reportes maestros (PyG, Inventario, Cartera)", en: "Master reports (P&L, Inventory, Portfolio)" } },
    alertas: { nivel: 'avanzadas', texto: { es: "Alertas avanzadas", en: "Advanced alerts" } },
    comparacionMensual: { meses: 12, texto: { es: "Comparación últimos 12 meses", en: "12-month comparison" } },
    puntoEquilibrio: { maxProductos: 'todos', texto: { es: "Punto equilibrio (todos los productos)", en: "Break-even (all products)" } },
    rotacionInventario: { nivel: 'exportable', texto: { es: "Rotación exportable + alertas", en: "Exportable rotation + alerts" } },
    produccion: true,
    auditoriaSobrecostos: true,
    deteccionFugas: true,
    flujoCajaProyectado: { dias: 30, texto: { es: "Flujo de caja proyectado (30 días)", en: "Projected cash flow (30 days)" } },
    radarQuiebra: false,
    modoConsultor: false,
    bot: { nivel: 'chat', texto: { es: "Chat completo (análisis y preguntas)", en: "Full chat (analysis & questions)" } },
    whatsapp: false,
    usuarios: 3,
    mensajesIA: 200
  },
  elite: {
    nombre: { es: "Elite", en: "Elite" },
    eslogan: { es: "Anticípate antes de quebrar", en: "Anticipate before breaking" },
    precio: { es: "$499.900/mes", en: "$499,900/month" },
    registroManual: { limite: 'ilimitado', texto: { es: "Registro ilimitado", en: "Unlimited transactions" } },
    historial: { dias: 'completo', texto: { es: "Historial completo", en: "Full history" } },
    inventario: { maxProductos: 'ilimitado', texto: { es: "Inventario ilimitado", en: "Unlimited inventory" } },
    dashboard: { nivel: 'ejecutivo', texto: { es: "Dashboard ejecutivo", en: "Executive dashboard" } },
    exportarCSV: true,
    reportesPDF: { disponible: true, nivel: 'ejecutivos', texto: { es: "Reportes ejecutivos + Certificado QR", en: "Executive reports + QR Certificate" } },
    alertas: { nivel: 'predictivas', texto: { es: "Alertas predictivas (WhatsApp)", en: "Predictive alerts (WhatsApp)" } },
    comparacionMensual: { meses: 'historico', texto: { es: "Comparación histórica completa", en: "Complete historical comparison" } },
    puntoEquilibrio: { maxProductos: 'todos', texto: { es: "Punto equilibrio + simulación", en: "Break-even + simulation" } },
    rotacionInventario: { nivel: 'predictiva', texto: { es: "Rotación predictiva", en: "Predictive rotation" } },
    produccion: true,
    auditoriaSobrecostos: true,
    deteccionFugas: true,
    flujoCajaProyectado: { dias: 90, texto: { es: "Flujo de caja proyectado (90 días)", en: "Projected cash flow (90 days)" } },
    radarQuiebra: { dias: 90, texto: { es: "Radar de quiebra (90 días)", en: "Bankruptcy radar (90 days)" } },
    modoConsultor: { texto: { es: "TOP 5 fugas financieras + recomendaciones", en: "TOP 5 financial leaks + recommendations" } },
    bot: { nivel: 'full', texto: { es: "Bot activo + alertas automáticas", en: "Active bot + automatic alerts" } },
    whatsapp: true,
    usuarios: 10,
    mensajesIA: 500
  }
};

// Función para obtener permisos según el plan del usuario
export const obtenerPermisos = (plan) => {
  switch(plan) {
    case 'starter':
    case 'gratis':
      return PERMISOS.starter;
    case 'pro':
      return PERMISOS.pro;
    case 'business':
      return PERMISOS.business;
    case 'elite':
      return PERMISOS.elite;
    default:
      return PERMISOS.starter;
  }
};

// Función para verificar si una funcionalidad está disponible
export const puedeAcceder = (plan, funcionalidad, idioma = 'es') => {
  const permisos = obtenerPermisos(plan);
  const func = permisos[funcionalidad];
  
  if (typeof func === 'boolean') return func;
  if (typeof func === 'object' && func !== null) {
    // Si es un objeto con nivel, retornar true si existe el nivel
    return !!func.nivel;
  }
  return false;
};

// Función para obtener el texto de una funcionalidad según el idioma
export const getTextoFuncionalidad = (plan, funcionalidad, idioma = 'es') => {
  const permisos = obtenerPermisos(plan);
  const func = permisos[funcionalidad];
  
  if (typeof func === 'object' && func !== null && func.texto) {
    return func.texto[idioma] || func.texto.es;
  }
  return '';
};

