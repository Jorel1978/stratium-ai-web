import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const generarROIporArticulo = async (usuarioActual, idioma) => {
  const lang = idioma === 'en' ? 'en' : 'es';
  
  try {
    // Obtener todas las ventas
    const ventasQuery = query(
      collection(db, 'registros'),
      where('userId', '==', usuarioActual.uid),
      where('tipo', '==', 'ingreso')
    );
    
    const ventasSnapshot = await getDocs(ventasQuery);
    
    // Obtener todas las compras de inventario
    const comprasQuery = query(
      collection(db, 'registros'),
      where('userId', '==', usuarioActual.uid),
      where('categoria', '==', 'INVENTARIO'),
      where('tipo', '==', 'egreso')
    );
    
    const comprasSnapshot = await getDocs(comprasQuery);
    
    // Agrupar por producto
    const productos = {};
    
    ventasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const producto = data.concepto;
      if (!productos[producto]) {
        productos[producto] = { ventas: 0, costo: 0, cantidadVendida: 0 };
      }
      productos[producto].ventas += data.valor || 0;
      productos[producto].cantidadVendida += data.cantidad || 1;
    });
    
    comprasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const producto = data.concepto;
      if (productos[producto]) {
        productos[producto].costo += data.valor || 0;
      }
    });
    
    // Calcular ROI por producto
    const resultados = Object.entries(productos).map(([producto, data]) => {
      const inversion = data.costo;
      const retorno = data.ventas;
      const ganancia = retorno - inversion;
      const roi = inversion > 0 ? (ganancia / inversion) * 100 : 0;
      
      let clasificacion = 'regular';
      let color = '#f59e0b';
      
      if (roi >= 50) {
        clasificacion = lang === 'en' ? 'Excellent' : 'Excelente';
        color = '#10b981';
      } else if (roi >= 25) {
        clasificacion = lang === 'en' ? 'Good' : 'Bueno';
        color = '#06b6d4';
      } else if (roi >= 10) {
        clasificacion = lang === 'en' ? 'Regular' : 'Regular';
        color = '#f59e0b';
      } else {
        clasificacion = lang === 'en' ? 'Critical' : 'Crítico';
        color = '#ef4444';
      }
      
      return {
        producto,
        inversion,
        retorno,
        ganancia,
        roi: roi.toFixed(1),
        clasificacion,
        color,
        cantidadVendida: data.cantidadVendida,
        precioPromedio: data.cantidadVendida > 0 ? retorno / data.cantidadVendida : 0
      };
    });
    
    // Ordenar por ROI (mejores primero)
    resultados.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
    
    return {
      productos: resultados,
      resumen: {
        totalInversion: resultados.reduce((sum, p) => sum + p.inversion, 0),
        totalRetorno: resultados.reduce((sum, p) => sum + p.retorno, 0),
        totalGanancia: resultados.reduce((sum, p) => sum + p.ganancia, 0),
        roiPromedio: resultados.length > 0 
          ? (resultados.reduce((sum, p) => sum + parseFloat(p.roi), 0) / resultados.length).toFixed(1)
          : 0
      },
      fechaGeneracion: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'es-CO')
    };
    
  } catch (error) {
    console.error('Error generando ROI:', error);
    return null;
  }
};

