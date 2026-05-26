import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const generarComparativo = async (usuarioActual, tipo, idioma) => {
  const lang = idioma === 'en' ? 'en' : 'es';
  const hoy = new Date();
  
  try {
    let fechaInicio;
    let periodos = [];
    
    if (tipo === 'mes') {
      // Comparativo mensual: últimos 12 meses
      fechaInicio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);
      
      for (let i = 0; i < 12; i++) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        periodos.push({
          key: `${fecha.getFullYear()}-${fecha.getMonth() + 1}`,
          nombre: lang === 'en' 
            ? fecha.toLocaleString('en-US', { month: 'short', year: 'numeric' })
            : fecha.toLocaleString('es-CO', { month: 'short', year: 'numeric' })
        });
      }
      periodos.reverse();
    } else {
      // Comparativo anual: últimos 5 años
      fechaInicio = new Date(hoy.getFullYear() - 5, 0, 1);
      
      for (let i = 0; i < 5; i++) {
        const año = hoy.getFullYear() - i;
        periodos.push({
          key: `${año}`,
          nombre: `${año}`
        });
      }
      periodos.reverse();
    }
    
    const registrosQuery = query(
      collection(db, 'registros'),
      where('userId', '==', usuarioActual.uid),
      where('fecha', '>=', fechaInicio)
    );
    
    const snapshot = await getDocs(registrosQuery);
    
    // Agrupar por período
    const datosPorPeriodo = {};
    
    periodos.forEach(p => {
      datosPorPeriodo[p.key] = {
        periodo: p.nombre,
        ventas: 0,
        gastos: 0,
        utilidad: 0
      };
    });
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha);
      const valor = data.valor || 0;
      const tipoFlujo = data.tipo || (valor >= 0 ? 'ingreso' : 'egreso');
      
      let periodoKey;
      if (tipo === 'mes') {
        periodoKey = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
      } else {
        periodoKey = `${fecha.getFullYear()}`;
      }
      
      if (datosPorPeriodo[periodoKey]) {
        if (tipoFlujo === 'ingreso') {
          datosPorPeriodo[periodoKey].ventas += valor;
        } else {
          datosPorPeriodo[periodoKey].gastos += valor;
        }
      }
    });
    
    // Calcular utilidad y variaciones
    const resultados = Object.values(datosPorPeriodo).map((p, idx, arr) => {
      p.utilidad = p.ventas - p.gastos;
      p.margen = p.ventas > 0 ? (p.utilidad / p.ventas * 100).toFixed(1) : 0;
      
      if (idx > 0) {
        const periodoAnterior = arr[idx - 1];
        p.variacionVentas = periodoAnterior.ventas > 0 
          ? ((p.ventas - periodoAnterior.ventas) / periodoAnterior.ventas * 100).toFixed(1)
          : 0;
        p.variacionUtilidad = periodoAnterior.utilidad > 0
          ? ((p.utilidad - periodoAnterior.utilidad) / periodoAnterior.utilidad * 100).toFixed(1)
          : 0;
      } else {
        p.variacionVentas = 0;
        p.variacionUtilidad = 0;
      }
      
      return p;
    });
    
    return {
      tipo,
      datos: resultados,
      fechaGeneracion: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'es-CO')
    };
    
  } catch (error) {
    console.error('Error generando comparativo:', error);
    return null;
  }
};

