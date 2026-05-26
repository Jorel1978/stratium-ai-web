// components/Inventario.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from '../hooks/useTranslation';
import { formatMoneyUniversal } from '../util/formatMoneyUniversal';

const Inventario = ({ usuarioActual }) => {
  const { t, idioma } = useTranslation();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [mostrarAgotados, setMostrarAgotados] = useState(false);
  const productosPorPagina = 10;
  const db = getFirestore();

  useEffect(() => {
    const cargarInventario = async () => {
      if (!usuarioActual?.uid) {
        setCargando(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'inventario'),
          where('userId', '==', usuarioActual.uid)
        );
        const snapshot = await getDocs(q);
        let productosInventario = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrar productos con stock 0 si no se muestra agotados
        if (!mostrarAgotados) {
          productosInventario = productosInventario.filter(p => (p.cantidad || 0) > 0);
        }
        
        // Ordenar por nombre
        productosInventario.sort((a, b) => (a.producto || '').localeCompare(b.producto || ''));
        
        setProductos(productosInventario);
      } catch (error) {
        console.error('Error cargando inventario:', error);
      } finally {
        setCargando(false);
      }
    };
    cargarInventario();
  }, [usuarioActual?.uid, db, mostrarAgotados]);

  // Paginación
  const totalPaginas = Math.ceil(productos.length / productosPorPagina);
  const inicio = (pagina - 1) * productosPorPagina;
  const productosPagina = productos.slice(inicio, inicio + productosPorPagina);

  if (cargando) {
    return (
      <div className="bg-[#1e293b] rounded-2xl p-6 border border-blue-900/30">
        <div className="text-center text-gray-400 py-8">
          {idioma === 'en' ? 'Loading inventory...' : 'Cargando inventario...'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-blue-900/30">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          📦 {idioma === 'en' ? 'Current Inventory' : 'Inventario Actual'}
        </h2>
        
        {/* Switch para mostrar/ocultar agotados */}
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarAgotados}
            onChange={(e) => setMostrarAgotados(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
          />
          {idioma === 'en' ? 'Show out of stock' : 'Mostrar productos agotados'}
        </label>
      </div>
      
      {productos.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          {idioma === 'en' 
            ? 'No products in inventory. Register a Production Order to create stock.' 
            : 'No hay productos en inventario. Registra una Orden de Producción para crear stock.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400 border-b border-slate-700">
                <tr>
                  <th className="text-left py-3">{idioma === 'en' ? 'Product' : 'Producto'}</th>
                  <th className="text-right py-3">{idioma === 'en' ? 'Quantity' : 'Cantidad'}</th>
                  <th className="text-right py-3">{idioma === 'en' ? 'Unit Cost' : 'Costo Unitario'}</th>
                  <th className="text-right py-3">{idioma === 'en' ? 'Total Cost' : 'Costo Total'}</th>
                  <th className="text-right py-3">{idioma === 'en' ? 'Margin Ref.' : 'Margen Ref.'}</th>
                </tr>
              </thead>
              <tbody>
                {productosPagina.map(prod => (
                  <tr key={prod.id} className="border-b border-slate-800">
                    <td className="py-3 text-white font-medium">{prod.producto}</td>
                    <td className="py-3 text-right text-white">{prod.cantidad} und</td>
                    <td className="py-3 text-right text-cyan-400">{formatMoneyUniversal(prod.costoUnitario, 'CO')}</td>
                    <td className="py-3 text-right text-white">{formatMoneyUniversal((prod.costoUnitario || 0) * (prod.cantidad || 0), 'CO')}</td>
                    <td className="py-3 text-right">{prod.margenReferencia || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pagina === 1
                    ? 'bg-slate-800 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                ← {idioma === 'en' ? 'Previous' : 'Anterior'}
              </button>
              <span className="text-gray-400 text-sm">
                {idioma === 'en' ? 'Page' : 'Página'} {pagina} {idioma === 'en' ? 'of' : 'de'} {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pagina === totalPaginas
                    ? 'bg-slate-800 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {idioma === 'en' ? 'Next' : 'Siguiente'} →
              </button>
            </div>
          )}
        </>
      )}
      
      <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-gray-500">
        <p>{idioma === 'en' 
          ? '📌 Products are automatically updated when registering a Production Order' 
          : '📌 Los productos se actualizan automáticamente al registrar una Orden de Producción'}</p>
        <p className="mt-1">{idioma === 'en'
          ? '💰 Weighted average cost: total inventory value divided by total quantity'
          : '💰 Costo promedio ponderado: se calcula sumando el valor total del inventario dividido por la cantidad total'}</p>
      </div>
    </div>
  );
};

export default Inventario;

