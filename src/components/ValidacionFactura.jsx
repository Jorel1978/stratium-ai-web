import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

// Función segura para formatear moneda
const formatearMonto = (valor, moneda = 'COP') => {
  const monto = typeof valor === 'number' && !isNaN(valor) ? valor : 0;
  
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  } catch (error) {
    console.warn('Error formateando moneda:', error);
    return `$${monto.toLocaleString()}`;
  }
};

const ValidacionFactura = ({ 
  isOpen, 
  onClose, 
  itemsOCR = [],
  proveedor = '',
  totalFactura = 0,
  totalImpuestos = 0,
  onConfirm,
  idioma = 'es'
}) => {
  const { t } = useTranslation();
  
  const [items, setItems] = useState(() => {
    if (!itemsOCR || !Array.isArray(itemsOCR) || itemsOCR.length === 0) {
      return [];
    }

    const subtotal = itemsOCR.reduce((sum, item) => {
      const cantidad = item?.cantidad || 1;
      const precio = item?.precioUnitario || 0;
      return sum + (cantidad * precio);
    }, 0);

    return itemsOCR.map(item => {
      const cantidad = item?.cantidad || 1;
      const precioUnitario = item?.precioUnitario || 0;
      const valorItem = cantidad * precioUnitario;
      const ivaItem = totalImpuestos > 0 && subtotal > 0 ? (valorItem / subtotal) * totalImpuestos : (item?.iva || 0);
      
      return {
        nombre: item?.nombre || 'Producto sin nombre',
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        iva: ivaItem,
        ivaEditable: ivaItem,
        clasificacion: 'INVENTARIO'
      };
    });
  });

  const clasificaciones = [
    { id: 'INVENTARIO', label: t('inventario') || '📦 Inventario', color: 'emerald' },
    { id: 'GASTO_ADMIN', label: t('gastoAdmin') || '📋 Gasto Administrativo', color: 'blue' },
    { id: 'RETIRO_SOCIO', label: t('usoPersonal') || '👤 Uso Personal', color: 'red' }
  ];

  const actualizarIVA = (index, nuevoIVA) => {
    const nuevosItems = [...items];
    nuevosItems[index].ivaEditable = nuevoIVA;
    nuevosItems[index].iva = nuevoIVA;
    setItems(nuevosItems);
  };

  const cambiarClasificacion = (index, nuevaClasificacion) => {
    const nuevosItems = [...items];
    nuevosItems[index].clasificacion = nuevaClasificacion;
    setItems(nuevosItems);
  };

  const resumen = {
    inventario: items.reduce((sum, i) => sum + ((i?.cantidad || 0) * (i?.precioUnitario || 0)), 0),
    gastos: items.filter(i => i?.clasificacion === 'GASTO_ADMIN').reduce((sum, i) => sum + ((i?.cantidad || 0) * (i?.precioUnitario || 0)), 0),
    personal: items.filter(i => i?.clasificacion === 'RETIRO_SOCIO').reduce((sum, i) => sum + ((i?.cantidad || 0) * (i?.precioUnitario || 0)), 0),
    ivaTotal: items.reduce((sum, i) => sum + (i?.iva || 0), 0)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-2">{t('validarFactura') || '📄 Validar Factura'}</h3>
        <p className="text-gray-400 text-sm mb-4">
          {t('proveedor') || 'Proveedor'}: {proveedor || 'No identificado'} | 
          {t('total') || 'Total'}: {formatearMonto(totalFactura)} |
          {t('impuestos') || 'Impuestos'}: {formatearMonto(totalImpuestos)}
        </p>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('sinProductos') || 'No se detectaron productos en la factura'}
          </div>
        ) : (
          <>
            <div className="mb-3 p-2 bg-blue-900/30 rounded-lg text-xs text-blue-300">
              {t('ivaEditable') || '💡 El IVA es editable. Si el valor no es correcto, puedes modificarlo.'}
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">{t('producto') || 'Producto'}</th>
                    <th className="p-3 text-center">{t('cantidad') || 'Cant'}</th>
                    <th className="p-3 text-right">{t('precio') || 'Precio'}</th>
                    <th className="p-3 text-right">{t('iva') || 'IVA'}</th>
                    <th className="p-3 text-left">{t('clasificacion') || 'Clasificación'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-700">
                      <td className="p-3">{item.nombre}</td>
                      <td className="p-3 text-center">{item.cantidad}</td>
                      <td className="p-3 text-right">{formatearMonto(item.precioUnitario)}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.ivaEditable}
                          onChange={(e) => actualizarIVA(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1 text-right text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          step="any"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={item.clasificacion}
                          onChange={(e) => cambiarClasificacion(idx, e.target.value)}
                          className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1 text-sm"
                        >
                          {clasificaciones.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-emerald-900/30 p-3 rounded-lg text-center">
                <p className="text-emerald-400 text-sm">{t('inventario') || '📦 Inventario'}</p>
                <p className="text-white text-xl font-bold">{formatearMonto(resumen.inventario)}</p>
              </div>
              <div className="bg-blue-900/30 p-3 rounded-lg text-center">
                <p className="text-blue-400 text-sm">{t('gastos') || '📋 Gastos'}</p>
                <p className="text-white text-xl font-bold">{formatearMonto(resumen.gastos)}</p>
              </div>
              <div className="bg-red-900/30 p-3 rounded-lg text-center">
                <p className="text-red-400 text-sm">{t('personal') || '👤 Personal'}</p>
                <p className="text-white text-xl font-bold">{formatearMonto(resumen.personal)}</p>
              </div>
              <div className="bg-yellow-900/30 p-3 rounded-lg text-center">
                <p className="text-yellow-400 text-sm">{t('ivaTotal') || '💰 IVA Total'}</p>
                <p className="text-white text-xl font-bold">{formatearMonto(resumen.ivaTotal)}</p>
              </div>
            </div>

            {resumen.personal > 0 && (
              <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  {t('alertaPersonal', { monto: formatearMonto(resumen.personal) }) || `⚠️ Se detectaron ${formatearMonto(resumen.personal)} en gastos personales. Esto no afecta tu negocio pero sí tu flujo de caja.`}
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-700 py-2 rounded-lg">
            {t('cancelar') || 'Cancelar'}
          </button>
          <button 
            onClick={() => onConfirm(items)} 
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 py-2 rounded-lg font-bold"
          >
            {t('confirmar') || 'Confirmar y Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidacionFactura;

