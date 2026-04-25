import { useMemo } from 'react';

export function useKPIs(movimientos) {
  return useMemo(() => {
    const ventasTotales = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (m.valor || 0), 0);
    const gastosTotales = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + (m.valor || 0), 0);
    const utilidadEstimada = ventasTotales - gastosTotales;
    const margen = ventasTotales > 0 ? (utilidadEstimada / ventasTotales) * 100 : 0;
    const saldoCaja = movimientos.reduce((s, m) => m.tipo === 'ingreso' ? s + m.valor : s - m.valor, 0);
    
    // Productos estrella y hueso
    const ventasPorProducto = {};
    movimientos.filter(m => m.tipo === 'ingreso').forEach(v => {
      const nombre = v.concepto || 'Sin nombre';
      if (!ventasPorProducto[nombre]) ventasPorProducto[nombre] = 0;
      ventasPorProducto[nombre] += v.valor;
    });
    
    const productosEstrella = Object.entries(ventasPorProducto)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nombre, ventas]) => ({ nombre, ventas }));
    
    const diasSinVenta = {};
    const hoy = new Date();
    movimientos.filter(m => m.tipo === 'ingreso').forEach(v => {
      const nombre = v.concepto;
      if (nombre && v.fecha) {
        const fechaVenta = new Date(v.fecha);
        const diffDays = Math.floor((hoy - fechaVenta) / (1000 * 60 * 60 * 24));
        if (!diasSinVenta[nombre] || diffDays < diasSinVenta[nombre]) {
          diasSinVenta[nombre] = diffDays;
        }
      }
    });
    
    const productosHueso = Object.entries(diasSinVenta)
      .filter(([, dias]) => dias > 15)
      .map(([nombre]) => nombre);
    
    return { ventasTotales, gastosTotales, utilidadEstimada, margen, saldoCaja, productosEstrella, productosHueso };
  }, [movimientos]);
}

