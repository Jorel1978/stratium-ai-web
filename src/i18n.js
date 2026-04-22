import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      clasificacion: {
        estrella: "ESTRELLA - Motor de crecimiento",
        hueso: "HUESO - Capital atrapado",
        neutro: "NEUTRO - Rendimiento estándar"
      },
      alerts: {
        capitalTrapped: "⚠️ ALERTA DE CAPITAL ATRAPADO: {{producto}} tiene baja rotación (HUESO). Fabricarlo o comprarlo inmovilizará tu flujo de caja por {{dias}} días. Considera priorizar tus productos ESTRELLA."
      },
      audit: {
        title: "Dictamen de Auditoría - Análisis de Ciclo de Efectivo",
        starProducts: "⭐ Productos Estrella (Motor de crecimiento)",
        boneProducts: "🦴 Productos Hueso (Capital Atrapado)",
        capitalTrapped: "⚠️ CAPITAL ATRAPADO DETECTADO",
        starMessage: "{{producto}} tiene alta velocidad de retorno. Este producto libera flujo de caja rápidamente.",
        boneMessage: "{{producto}} tiene baja velocidad de rotación ({{dias}} días en stock). Este producto está atrapando tu capital.",
        neutralMessage: "{{producto}} tiene rendimiento estándar. Monitorear su evolución.",
        recommendation: "Recomendación estratégica",
        sellToFreeCapital: "Rematar al costo + 10% para liberar flujo de caja atrapado"
      },
      products: {
        name: "Producto",
        clasification: "Clasificación",
        stock: "Stock",
        price: "Precio",
        daysInStock: "Días en stock"
      }
    }
  },
  en: {
    translation: {
      clasificacion: {
        estrella: "STAR - Growth engine",
        hueso: "BONE - Trapped capital",
        neutro: "NEUTRAL - Standard performance"
      },
      alerts: {
        capitalTrapped: "⚠️ TRAPPED CAPITAL ALERT: {{producto}} has low turnover (BONE). Manufacturing or buying it will freeze your cash flow for {{dias}} days."
      },
      audit: {
        title: "Audit Report - Cash Cycle Analysis",
        starProducts: "⭐ Star Products (Growth Engine)",
        boneProducts: "🦴 Bone Products (Trapped Capital)",
        capitalTrapped: "⚠️ TRAPPED CAPITAL DETECTED",
        starMessage: "{{producto}} has high return velocity. This product frees cash flow quickly.",
        boneMessage: "{{producto}} has low turnover velocity ({{dias}} days in stock). This product is trapping your capital.",
        neutralMessage: "{{producto}} has standard performance. Monitor its evolution.",
        recommendation: "Strategic recommendation",
        sellToFreeCapital: "Sell at cost + 10% to free trapped cash flow"
      },
      products: {
        name: "Product",
        clasification: "Classification",
        stock: "Stock",
        price: "Price",
        daysInStock: "Days in stock"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "es",
    fallbackLng: "es",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

