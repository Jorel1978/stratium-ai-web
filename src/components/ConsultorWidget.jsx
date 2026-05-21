// src/components/ConsultorWidget.jsx
// Widget de consultoría tributaria en lenguaje simple para Stratium AI
// Soporte multi-país con respuestas segmentadas legalmente

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { responderDudaTributaria, getSugerenciasPreguntas } from '../services/consultorTributario';
import { obtenerTexto } from '../locales/index';

const ConsultorWidget = ({ pais = 'CO', idioma = 'es', usuario = null }) => {
  // Normalizar país (UK → GB para consistencia)
  const paisNormalizado = pais === 'UK' ? 'GB' : pais;
  
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Referencia para abortar peticiones pendientes
  const abortControllerRef = useRef(null);
  
  // Limpiar peticiones pendientes al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Función para consultar (con manejo de race conditions)
  const realizarConsulta = useCallback(async (textoPregunta) => {
    if (!textoPregunta?.trim()) return;
    
    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      // Simular delay mínimo para UX (evita parpadeos)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verificar si la petición fue cancelada
      if (abortControllerRef.current.signal.aborted) return;
      
      // Llamar al consultor tributario con país
      const resultado = responderDudaTributaria(textoPregunta, paisNormalizado, idioma, usuario);
      
      if (abortControllerRef.current.signal.aborted) return;
      
      setRespuesta(resultado);
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error en consulta:', err);
        setError(obtenerTexto(paisNormalizado, idioma, 'consultorError', {
          default: '❌ Error en la consulta. Intenta de nuevo.'
        }));
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [paisNormalizado, idioma, usuario]);
  
  const handleConsultar = useCallback(() => {
    if (!pregunta.trim() || loading) return;
    realizarConsulta(pregunta);
  }, [pregunta, loading, realizarConsulta]);
  
  const handleSugerencia = useCallback((sugerencia) => {
    setPregunta(sugerencia);
    realizarConsulta(sugerencia);
  }, [realizarConsulta]);
  
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !loading && pregunta.trim()) {
      handleConsultar();
    }
  }, [loading, pregunta, handleConsultar]);
  
  // Obtener sugerencias específicas por país
  const sugerencias = getSugerenciasPreguntas(paisNormalizado, idioma);
  
  // Obtener iconos desde locales (para consistencia cultural)
  const iconoLoading = obtenerTexto(paisNormalizado, idioma, 'iconoLoading', { default: '⏳' });
  const iconoFuente = obtenerTexto(paisNormalizado, idioma, 'iconoFuente', { default: '📚' });
  const iconoEjemplo = obtenerTexto(paisNormalizado, idioma, 'iconoEjemplo', { default: '💡' });
  const iconoAdvertencia = obtenerTexto(paisNormalizado, idioma, 'iconoAdvertencia', { default: '⚠️' });
  
  // Bloquear interacción durante carga
  const estaDeshabilitado = loading || !pregunta.trim();
  
  return (
    <div 
      className="consultor-widget bg-slate-800/50 rounded-xl p-4 border border-slate-700"
      role="complementary"
      aria-label={obtenerTexto(paisNormalizado, idioma, 'consultorAriaLabel', { default: 'Consultor tributario' })}
    >
      {/* Título */}
      <h4 className="text-cyan-400 font-bold text-sm mb-3 flex items-center gap-2">
        {obtenerTexto(paisNormalizado, idioma, 'consultorIcono', { default: '🤝' })}
        {obtenerTexto(paisNormalizado, idioma, 'consultorTitulo')}
      </h4>
      
      {/* Descripción del servicio */}
      <p className="text-xs text-gray-400 mb-3">
        {obtenerTexto(paisNormalizado, idioma, 'consultorDescripcion', {
          default: 'Pregúntame sobre impuestos, facturación o requisitos legales para tu negocio.'
        })}
      </p>
      
      {/* Campo de pregunta */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={obtenerTexto(paisNormalizado, idioma, 'consultorPlaceholder')}
          disabled={loading}
          className="flex-1 min-w-[200px] bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
        />
        <button
          onClick={handleConsultar}
          disabled={estaDeshabilitado}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:cursor-not-allowed flex items-center gap-1"
          aria-busy={loading}
        >
          {loading ? iconoLoading : obtenerTexto(paisNormalizado, idioma, 'consultorBoton')}
        </button>
      </div>
      
      {/* Sugerencias de preguntas (contextualizadas por país) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sugerencias.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSugerencia(sug)}
            disabled={loading}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-2 py-1 rounded transition disabled:opacity-50"
          >
            {sug}
          </button>
        ))}
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      
      {/* Respuesta del consultor */}
      {respuesta && (
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
          <p className="text-xs text-cyan-400 font-bold mb-1">
            {obtenerTexto(paisNormalizado, idioma, 'consultorRespuesta')}
          </p>
          
          {/* Mensaje bloqueado (evasión fiscal) */}
          {respuesta.bloqueado && (
            <div className="bg-red-900/30 border-l-4 border-red-500 p-2 mb-2">
              <p className="text-sm text-red-300">{respuesta.respuesta}</p>
            </div>
          )}
          
          {/* Respuesta normal */}
          {!respuesta.bloqueado && (
            <>
              <p className="text-sm text-gray-200 mb-2">{respuesta.respuesta}</p>
              
              {/* Información del país y vigencia */}
              {respuesta.pais && (
                <div className="flex flex-wrap gap-2 mb-2 text-xs">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-gray-400">
                    📍 {respuesta.pais} • {respuesta.entidadReguladora}
                  </span>
                  {respuesta.vigencia && (
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-gray-400">
                      📅 {respuesta.vigencia}
                    </span>
                  )}
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-yellow-500">
                    🎯 Confianza: {respuesta.nivelConfianza || 'Consulta profesional'}
                  </span>
                </div>
              )}
              
              {/* Fuente legal */}
              {respuesta.fuente && (
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  {iconoFuente} {respuesta.fuente}
                </p>
              )}
              
              {/* Ejemplo práctico */}
              {respuesta.ejemplo && (
                <div className="text-xs text-gray-400 mb-2 pl-2 border-l-2 border-cyan-500/30">
                  {iconoEjemplo} {respuesta.ejemplo}
                </div>
              )}
            </>
          )}
          
          {/* Disclaimer legal (visible y con buen contraste) */}
          <div className="mt-2 pt-2 border-t border-slate-700">
            <p className="text-xs text-gray-400 flex items-start gap-1">
              {iconoAdvertencia}
              <span>
                {respuesta.disclaimer || obtenerTexto(paisNormalizado, idioma, 'consultorDisclaimer')}
              </span>
            </p>
          </div>
          
          {/* Sugerencia adicional cuando no se encontró respuesta */}
          {!respuesta.encontrado && respuesta.sugerencia && (
            <p className="text-xs text-cyan-400 mt-2 italic">
              {respuesta.sugerencia}
            </p>
          )}
        </div>
      )}
      
      {/* Estado de configuración del usuario (si está disponible) */}
      {usuario?.perfilTributario && (
        <div className="mt-3 text-xs text-gray-500 border-t border-slate-700 pt-2">
          <span className="flex items-center gap-1">
            📋 Tu régimen tributario: {usuario.perfilTributario.regimenIVA || 'No especificado'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ConsultorWidget;

