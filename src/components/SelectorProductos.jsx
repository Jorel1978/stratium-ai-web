import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const SelectorProductos = ({ usuarioActual, onSelect, placeholder, idioma }) => {
  const [productos, setProductos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);
  const db = getFirestore();

  useEffect(() => {
    const cargarProductos = async () => {
      if (!usuarioActual?.uid) return;
      try {
        const q = query(collection(db, 'products'), where('userId', '==', usuarioActual.uid));
        const snapshot = await getDocs(q);
        const lista = [];
        snapshot.forEach(doc => {
          lista.push({ id: doc.id, nombre: doc.data().nombre });
        });
        setProductos(lista);
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    };
    cargarProductos();
  }, [usuarioActual?.uid, db]);

  const handleChange = (e) => {
    const value = e.target.value;
    setBusqueda(value);
    if (value.length > 0) {
      const filtradosLista = productos.filter(p => 
        p.nombre.toLowerCase().includes(value.toLowerCase())
      );
      setFiltrados(filtradosLista.slice(0, 10));
      setMostrarLista(true);
    } else {
      setFiltrados([]);
      setMostrarLista(false);
    }
  };

  const seleccionarProducto = (producto) => {
    setBusqueda(producto.nombre);
    setMostrarLista(false);
    if (onSelect) onSelect(producto);
  };

  const textos = {
    es: { placeholder: placeholder || 'Buscar producto...' },
    en: { placeholder: placeholder || 'Search product...' }
  };
  const t = textos[idioma] || textos.es;

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={busqueda}
        onChange={handleChange}
        onFocus={() => {
          if (busqueda.length > 0 && filtrados.length > 0) {
            setMostrarLista(true);
          }
        }}
        onBlur={() => setTimeout(() => setMostrarLista(false), 200)}
        placeholder={t.placeholder}
        className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        autoComplete="off"
      />
      {mostrarLista && filtrados.length > 0 && (
        <div className="absolute z-10 w-full bg-[#0f172a] border border-blue-900/30 rounded-lg mt-1 max-h-48 overflow-y-auto">
          {filtrados.map(producto => (
            <div
              key={producto.id}
              onClick={() => seleccionarProducto(producto)}
              className="px-4 py-2 hover:bg-cyan-500/20 cursor-pointer text-white text-sm border-b border-blue-900/20 last:border-0"
            >
              {producto.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectorProductos;

