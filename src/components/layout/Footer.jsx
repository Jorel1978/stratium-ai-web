import React from 'react';

const Footer = ({ t }) => {
  return (
    <footer className="py-6 px-4 border-t border-blue-900/20 mt-12">
      <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
        <p>STRATIUM AI © {new Date().getFullYear()} • {t.subtitle}</p>
        <p className="mt-1 text-xs text-gray-600">Datos actualizados en tiempo real desde Firebase • Cierre automático mensual el día 1</p>
      </div>
    </footer>
  );
};

export default Footer;
