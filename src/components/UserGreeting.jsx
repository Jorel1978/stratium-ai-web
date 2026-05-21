// src/components/UserGreeting.jsx
// Saludo dinámico con nombre real y país para Stratium AI
// Soporta español e inglés, con preposiciones correctas por idioma

import React, { useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Componente de saludo personalizado para el usuario
 * @param {Object} props
 * @param {Object} props.usuario - Usuario autenticado (contiene displayName, email, etc.)
 * @param {string} props.pais - Código de país (CO, MX, US, GB, ES, etc.)
 * @param {string} props.idioma - Idioma del usuario (es/en)
 * @param {Object} props.configuracion - Configuración adicional (opcional)
 */
const UserGreeting = ({ usuario, pais = 'CO', idioma = 'es', configuracion = {} }) => {
  const { t } = useTranslation();
  
  // Normalizar país (GB para Reino Unido, consistente con REGIONES_SOPORTADAS)
  const paisNormalizado = pais === 'UK' ? 'GB' : pais;
  
  // Obtener saludo según hora local
  const getSaludoKey = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'goodMorning';
    if (hora < 19) return 'goodAfternoon';
    return 'goodEvening';
  };
  
  // Obtener nombre para mostrar (prioridad: displayName > email > fallback)
  const nombreParaMostrar = useMemo(() => {
    if (usuario?.displayName && usuario.displayName.trim()) {
      return usuario.displayName.trim();
    }
    if (usuario?.email) {
      return usuario.email.split('@')[0];
    }
    return 'Emprendedor';
  }, [usuario]);
  
  // Obtener el texto completo del saludo
  const textoSaludo = useMemo(() => {
    const saludoKey = getSaludoKey();
    const saludo = t(saludoKey);
    const paisTexto = pais ? t('from') : '';
    const nombrePais = configuracion?.nombrePais || '';
    
    if (idioma === 'en') {
      return `${saludo}, ${nombreParaMostrar}${pais ? ` ${paisTexto} ${nombrePais}` : ''}!`;
    }
    return `${saludo}, ${nombreParaMostrar}${pais ? ` ${paisTexto} ${nombrePais}` : ''}!`;
  }, [idioma, nombreParaMostrar, pais, configuracion, t]);
  
  // Obtener mensaje contextual
  const mensajeContextual = t('letsTakeCare');
  
  // Si no hay país o idioma válido, NO renderizar
  if (!pais || !idioma) {
    return null;
  }
  
  return (
    <div 
      className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-4 rounded-xl mb-6 border border-cyan-500/20 w-full"
      role="region"
      aria-label="Saludo de bienvenida"
    >
      <p className="text-cyan-400 text-lg font-bold">
        {textoSaludo}
      </p>
      <p className="text-gray-300 text-sm mt-1">
        {mensajeContextual}
      </p>
      
      {/* Indicador de idioma y moneda */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1">
          🌐 {configuracion?.locale?.toUpperCase() || paisNormalizado}
        </span>
        <span className="inline-flex items-center gap-1">
          💱 {configuracion?.moneda || 'COP'} ($)
        </span>
        {configuracion.mostrarInfoTecnica && (
          <span className="inline-flex items-center gap-1 cursor-help text-gray-500">
            ⚙️ {configuracion?.factorPrestacional || 1.52}x
          </span>
        )}
      </div>
      
      {/* Disclaimer de hora local */}
      <div className="text-right text-[10px] text-gray-500 mt-2">
        {t('localTime')}
      </div>
    </div>
  );
};

export default UserGreeting;

