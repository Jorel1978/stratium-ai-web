import { query, collection, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export const generarProyecciones = async (usuarioActual, idioma) => {
  const lang = idioma === 'en' ? 'en' : 'es';
  
  try {
    // Obtener últimos 6 meses de movimientos
    const hoy = new Date();
    const hace6Meses = new Date();
    hace6Meses.setMonth(hoy.getMonth() - 6);
    
    const registrosQuery = query(
      collection(db, 'registros'),
      where('userId', '==', usuarioActual.uid),
      where('fecha', '>=', hace6Meses),
      orderBy('fecha', 'asc')
    );
    
    const snapshot = await getDocs(registrosQuery);
    
    // Calcular promedio mensual de ingresos y egresos
    let ingresosPorMes = {};
    let egresosPorMes = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha);
      const mesKey = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
      const valor = data.valor || 0;
      const tipo = data.tipo || (valor >= 0 ? 'ingreso' : 'egreso');
      
      if (tipo === 'ingreso') {
        ingresosPorMes[mesKey] = (ingresosPorMes[mesKey] || 0) + valor;
      } else {
        egresosPorMes[mesKey] = (egresosPorMes[mesKey] || 0) + valor;
      }
    });
    
    const meses = Object.keys(ingresosPorMes);
    const promedioIngresos = meses.length > 0 
      ? Object.values(ingresosPorMes).reduce((a, b) => a + b, 0) / meses.length 
      : 0;
    const promedioEgresos = meses.length > 0 
      ? Object.values(egresosPorMes).reduce((a, b) => a + b, 0) / meses.length 
      : 0;
    
    // Generar proyecciones
    const proyecciones = [];
    let saldoActual = usuarioActual?.saldoCaja || 0;
    
    for (let i = 30; i <= 90; i += 30) {
      const dias = i;
      const mesesProyectados = dias / 30;
      const ingresosProyectados = promedioIngresos * mesesProyectados;
      const egresosProyectados = promedioEgresos * mesesProyectados;
      const flujoNetoProyectado = ingresosProyectados - egresosProyectados;
      const saldoProyectado = saldoActual + flujoNetoProyectado;
      
      let riesgo = 'bajo';
      let color = '#10b981';
      let mensaje = '';
      
      if (saldoProyectado < 0) {
        riesgo = 'critico';
        color = '#ef4444';
        mensaje = lang === 'en'
          ? `⚠️ Critical: Projected negative balance in ${dias} days`
          : `⚠️ Crítico: Saldo proyectado negativo en ${dias} días`;
      } else if (saldoProyectado < saldoActual * 0.3) {
        riesgo = 'alto';
        color = '#f59e0b';
        mensaje = lang === 'en'
          ? `⚠️ High risk: Cash reserve will drop by ${Math.round((1 - saldoProyectado / saldoActual) * 100)}% in ${dias} days`
          : `⚠️ Riesgo alto: La reserva de efectivo caerá un ${Math.round((1 - saldoProyectado / saldoActual) * 100)}% en ${dias} días`;
      } else {
        mensaje = lang === 'en'
          ? `✅ Healthy projection: Positive balance maintained at ${dias} days`
          : `✅ Proyección saludable: Balance positivo mantenido a ${dias} días`;
      }
      
      proyecciones.push({
        dias,
        ingresosProyectados,
        egresosProyectados,
        flujoNetoProyectado,
        saldoProyectado,
        riesgo,
        color,
        mensaje
      });
    }
    
    return {
      promedioIngresosMensual: promedioIngresos,
      promedioEgresosMensual: promedioEgresos,
      margenPromedio: promedioIngresos > 0 ? ((promedioIngresos - promedioEgresos) / promedioIngresos * 100).toFixed(1) : 0,
      saldoActual,
      proyecciones,
      fechaGeneracion: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'es-CO')
    };
    
  } catch (error) {
    console.error('Error generando proyecciones:', error);
    return null;
  }
};

