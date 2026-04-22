import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, getCountFromServer, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const SupportBot = ({ usuarioActual, idioma, plan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajesUsados, setMensajesUsados] = useState(0);
  const messagesEndRef = useRef(null);
  const db = getFirestore();
  const functions = getFunctions();

  const planSeguro = plan?.toLowerCase() || 'starter';
  
  const limites = {
    starter: 20,
    gratis: 20,
    pro: 50,
    business: 200,
    elite: 500
  };
  const limiteMensajes = limites[planSeguro] || 20;

  const cargarContadorMensajes = async () => {
    if (!usuarioActual?.uid) return;
    
    const q = query(
      collection(db, 'soporteConversaciones'),
      where('userId', '==', usuarioActual.uid),
      where('esUsuario', '==', true)
    );
    const snapshot = await getCountFromServer(q);
    setMensajesUsados(snapshot.count);
  };

  const cargarHistorial = async () => {
    if (!usuarioActual?.uid) return;
    
    const q = query(
      collection(db, 'soporteConversaciones'),
      where('userId', '==', usuarioActual.uid),
      orderBy('fecha', 'desc'),
      limit(limiteMensajes)
    );
    const snapshot = await getDocs(q);
    const historial = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      historial.push({ 
        id: doc.id, 
        texto: data.texto, 
        esUsuario: data.esUsuario, 
        fecha: data.fecha,
        fechaLocal: data.fechaLocal || null
      });
    });
    setMessages(historial.reverse());
  };

  const obtenerFechaLocal = () => {
    return new Date().toISOString();
  };

  const formatearFecha = (fechaFirestore, fechaLocal) => {
    if (fechaFirestore?.toDate) {
      return fechaFirestore.toDate().toLocaleTimeString();
    }
    if (fechaLocal) {
      return new Date(fechaLocal).toLocaleTimeString();
    }
    return '';
  };

  const sanitizarTexto = (texto) => {
    if (!texto) return '';
    return texto
      .replace(/<[^>]*>/g, '')
      .replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
  };

  // ============================================================
  // 🆕 FUNCIÓN PARA CALCULAR PRECIO SUGERIDO DE LIQUIDACIÓN
  // ============================================================
  const calcularPrecioLiquidacion = (costoUnitario, diasEnStock, moneda = 'COP') => {
    if (!costoUnitario || costoUnitario <= 0) return null;
    
    let precio = null;
    let estrategia = '';
    let urgencia = '';
    
    if (diasEnStock >= 180) {
      precio = costoUnitario * 0.8; // 20% menos del costo
      estrategia = '💀 PÉRDIDA CONTROLADA';
      urgencia = '⚠️ URGENTE: más de 180 días';
    } else if (diasEnStock >= 90) {
      precio = costoUnitario * 0.9; // 10% menos del costo
      estrategia = '💰 RECUPERAR CAPITAL';
      urgencia = '⚠️ Alerta: más de 90 días';
    } else if (diasEnStock >= 60) {
      precio = costoUnitario * 1.0; // al costo
      estrategia = '📦 AL COSTO';
      urgencia = '⚡ Recupera inversión';
    } else if (diasEnStock >= 30) {
      precio = costoUnitario * 1.1; // costo + 10%
      estrategia = '🔥 PROMOCIÓN LIGERA';
      urgencia = '💡 Libera flujo de caja';
    } else {
      return null;
    }
    
    return {
      precio: Math.round(precio),
      estrategia,
      urgencia,
      moneda
    };
  };

  // ============================================================
  // 🆕 FUNCIÓN PARA OBTENER DIAGNÓSTICO DE PRODUCTO DESDE FIRESTORE
  // ============================================================
  const obtenerDiagnosticoProducto = async (nombreProducto) => {
    if (!usuarioActual?.uid || !nombreProducto) return null;
    
    try {
      // Buscar el producto en inventario
      const inventarioRef = collection(db, 'inventario');
      const q = query(inventarioRef, 
        where('userId', '==', usuarioActual.uid),
        where('producto', '==', nombreProducto)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const producto = snapshot.docs[0].data();
      const clasificacion = producto.clasificacion || 'NEUTRO';
      const diasEnStock = producto.diasEnStock || 0;
      const margenNeto = producto.margenNetoReal || 0;
      const costoUnitario = producto.costoUnitario || 0;
      const moneda = producto.moneda || 'COP';
      
      // Mensajes según clasificación
      if (clasificacion === 'ESTRELLA') {
        return {
          tipo: 'estrella',
          mensaje: `⭐ **${nombreProducto}** es un producto **ESTRELLA**. Tiene alta rentabilidad (${margenNeto}% de margen) y buena rotación. Sigue así.`,
          recomendacion: 'Mantén stock y prioriza su producción.'
        };
      } else if (clasificacion === 'HUESO') {
        let mensaje = `🦴 **${nombreProducto}** es un producto **HUESO**. `;
        if (diasEnStock > 90) {
          mensaje += `Lleva **${diasEnStock} días** sin rotación. `;
        } else if (diasEnStock > 60) {
          mensaje += `Lleva **${diasEnStock} días** sin moverse. `;
        } else if (diasEnStock > 30) {
          mensaje += `Lleva **${diasEnStock} días** sin ventas. `;
        }
        mensaje += `Este producto está atrapando tu capital en inventario.\n\n`;
        
        // ✅ Calcular precio sugerido de liquidación
        const precioLiquidacion = calcularPrecioLiquidacion(costoUnitario, diasEnStock, moneda);
        if (precioLiquidacion) {
          mensaje += `💰 **Precio sugerido para liquidar:** ${precioLiquidacion.precio.toLocaleString()} ${moneda}\n`;
          mensaje += `📊 **Estrategia:** ${precioLiquidacion.estrategia}\n`;
          mensaje += `🔔 **${precioLiquidacion.urgencia}**\n\n`;
          
          if (diasEnStock >= 180) {
            mensaje += `⚠️ Producto con más de 180 días. Acepta pérdida controlada para liberar espacio y capital.\n`;
          } else if (diasEnStock >= 90) {
            mensaje += `⚠️ Producto con más de 90 días. Recupera al menos el costo.\n`;
          } else if (diasEnStock >= 60) {
            mensaje += `📦 Al costo: Recupera tu inversión sin pérdidas.\n`;
          } else if (diasEnStock >= 30) {
            mensaje += `🔥 Promoción ligera: Libera flujo de caja con margen mínimo.\n`;
          }
        }
        
        return {
          tipo: 'hueso',
          mensaje: mensaje,
          recomendacion: `Considera vender a ${precioLiquidacion ? precioLiquidacion.precio.toLocaleString() + ' ' + moneda : 'un precio promocional'} para liberar capital rápidamente.`
        };
      } else {
        return {
          tipo: 'neutro',
          mensaje: `⚪ **${nombreProducto}** tiene rendimiento normal. Margen: ${margenNeto}%.`,
          recomendacion: 'Monitorea su evolución mensualmente.'
        };
      }
    } catch (error) {
      console.error('Error obteniendo diagnóstico:', error);
      return null;
    }
  };

  // ============================================================
  // 🆕 FUNCIÓN PARA LISTAR PRODUCTOS CRÍTICOS (HUESOS)
  // ============================================================
  const listarProductosCriticos = async () => {
    if (!usuarioActual?.uid) return [];
    
    try {
      const inventarioRef = collection(db, 'inventario');
      const q = query(inventarioRef, where('userId', '==', usuarioActual.uid));
      const snapshot = await getDocs(q);
      
      const productosCriticos = [];
      snapshot.forEach(doc => {
        const producto = doc.data();
        if (producto.clasificacion === 'HUESO' && producto.cantidad > 0) {
          productosCriticos.push({
            nombre: producto.producto,
            cantidad: producto.cantidad,
            diasEnStock: producto.diasEnStock || 0,
            costoUnitario: producto.costoUnitario || 0,
            moneda: producto.moneda || 'COP'
          });
        }
      });
      
      // Ordenar por días en stock (los más críticos primero)
      productosCriticos.sort((a, b) => b.diasEnStock - a.diasEnStock);
      
      return productosCriticos;
    } catch (error) {
      console.error('Error listando productos críticos:', error);
      return [];
    }
  };

  // ============================================================
  // 🆕 FUNCIÓN PARA PROCESAR PREGUNTAS DEL USUARIO LOCALMENTE
  // ============================================================
  const procesarPreguntaLocal = async (pregunta) => {
    const preguntaLower = pregunta.toLowerCase();
    
    // Detectar preguntas sobre un producto específico
    const productoMatch = preguntaLower.match(/(?:qué|como|dime|analiza|diagnostica)\s+(?:es|está|sobre)\s+(?:el producto\s+)?([a-záéíóúñ\s]+)/i);
    if (productoMatch) {
      const nombreProducto = productoMatch[1].trim();
      const diagnostico = await obtenerDiagnosticoProducto(nombreProducto);
      if (diagnostico) {
        return `${diagnostico.mensaje}\n\n💡 **Recomendación:** ${diagnostico.recomendacion}`;
      } else {
        return `No encontré el producto "${nombreProducto}" en tu inventario. Verifica el nombre o regístralo primero.`;
      }
    }
    
    // Detectar preguntas sobre productos críticos
    if (preguntaLower.includes('productos críticos') || 
        preguntaLower.includes('productos problema') ||
        preguntaLower.includes('qué productos están mal') ||
        preguntaLower.includes('lista de huesos')) {
      const criticos = await listarProductosCriticos();
      if (criticos.length === 0) {
        return `✅ No tienes productos HUESO en tu inventario. Todos tus productos tienen buena rotación.`;
      }
      let respuesta = `🦴 **Productos HUESO en tu inventario (${criticos.length}):**\n\n`;
      criticos.forEach(p => {
        const precioLiquidacion = calcularPrecioLiquidacion(p.costoUnitario, p.diasEnStock, p.moneda);
        respuesta += `• **${p.nombre}**: ${p.cantidad} unidades, ${p.diasEnStock} días sin rotación\n`;
        if (precioLiquidacion) {
          respuesta += `  💰 Precio sugerido: ${precioLiquidacion.precio.toLocaleString()} ${p.moneda} (${precioLiquidacion.estrategia})\n`;
        }
      });
      respuesta += `\n💡 **Recomendación:** Estos productos están atrapando tu capital. Aplica los precios sugeridos para liberar flujo de caja.`;
      return respuesta;
    }
    
    // Detectar preguntas sobre productos estrella
    if (preguntaLower.includes('productos estrella') || 
        preguntaLower.includes('mejores productos') ||
        preguntaLower.includes('qué productos venden más')) {
      const inventarioRef = collection(db, 'inventario');
      const q = query(inventarioRef, where('userId', '==', usuarioActual.uid));
      const snapshot = await getDocs(q);
      
      const estrellas = [];
      snapshot.forEach(doc => {
        const producto = doc.data();
        if (producto.clasificacion === 'ESTRELLA' && producto.cantidad > 0) {
          estrellas.push({
            nombre: producto.producto,
            margen: producto.margenNetoReal || 0
          });
        }
      });
      
      if (estrellas.length === 0) {
        return `⚠️ No tienes productos ESTRELLA identificados aún. Revisa tus costos y precios para mejorar la rentabilidad.`;
      }
      
      let respuesta = `⭐ **Productos ESTRELLA en tu inventario (${estrellas.length}):**\n\n`;
      estrellas.forEach(p => {
        respuesta += `• **${p.nombre}**: Margen ${p.margen}%\n`;
      });
      respuesta += `\n💡 **Recomendación:** Estos son tus productos más rentables. Prioriza su producción y marketing.`;
      return respuesta;
    }
    
    // Detectar preguntas sobre salud financiera general
    if (preguntaLower.includes('salud financiera') || 
        preguntaLower.includes('cómo estoy') ||
        preguntaLower.includes('resumen')) {
      const criticos = await listarProductosCriticos();
      let resumen = `📊 **Resumen de tu negocio:**\n\n`;
      
      if (criticos.length > 0) {
        resumen += `⚠️ Tienes **${criticos.length} productos HUESO** que están atrapando tu capital.\n`;
        let valorAtrapado = 0;
        criticos.forEach(p => {
          valorAtrapado += p.cantidad * p.costoUnitario;
        });
        resumen += `💰 Capital atrapado: ${valorAtrapado.toLocaleString()} COP\n`;
        resumen += `💡 Revisa la lista de productos críticos para ver precios sugeridos.\n`;
      } else {
        resumen += `✅ No tienes productos HUESO. Tu inventario tiene buena rotación.\n`;
        resumen += `📈 Sigue monitoreando tus márgenes de rentabilidad.\n`;
      }
      return resumen;
    }
    
    return null; // Si no es una pregunta local, pasar a la IA
  };

  const enviarMensaje = async () => {
    if (!input.trim()) return;
    
    if (mensajesUsados >= limiteMensajes) {
      const errorMsg = idioma === 'es'
        ? `⚠️ Has alcanzado el límite de ${limiteMensajes} mensajes de tu plan. Mejora tu plan para más consultas.`
        : `⚠️ You have reached the ${limiteMensajes} message limit of your plan. Upgrade for more queries.`;
      setMessages(prev => [...prev, { 
        texto: errorMsg, 
        esUsuario: false, 
        fecha: null,
        fechaLocal: obtenerFechaLocal()
      }]);
      return;
    }
    
    const fechaLocal = obtenerFechaLocal();
    const userMessage = { 
      texto: input, 
      esUsuario: true, 
      fecha: null,
      fechaLocal: fechaLocal
    };
    setMessages(prev => [...prev, userMessage]);
    const preguntaUsuario = input;
    setInput('');
    setLoading(true);
    
    // Incrementar contador localmente de inmediato
    setMensajesUsados(prev => prev + 1);

    try {
      // 🆕 PRIMERO: Intentar responder localmente
      const respuestaLocal = await procesarPreguntaLocal(preguntaUsuario);
      
      let respuestaIA;
      if (respuestaLocal) {
        // Responder localmente sin llamar a la función de cloud
        respuestaIA = respuestaLocal;
      } else {
        // Si no es pregunta local, llamar a la IA
        const soporteIA = httpsCallable(functions, 'soporteIA');
        const result = await soporteIA({ 
          pregunta: preguntaUsuario, 
          idioma, 
          plan: planSeguro, 
          userId: usuarioActual?.uid,
          fechaLocal: fechaLocal
        });
        respuestaIA = result.data.respuesta;
        
        // Sincronizar con el valor real del servidor
        if (result.data.mensajesUsados) {
          setMensajesUsados(result.data.mensajesUsados);
        }
      }

      const botMessage = { 
        texto: respuestaIA, 
        esUsuario: false, 
        fecha: null,
        fechaLocal: obtenerFechaLocal()
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error en soporte:', error);
      // Revertir contador en caso de error
      setMensajesUsados(prev => prev - 1);
      const errorMessage = idioma === 'es' 
        ? 'Lo siento, hubo un error. Por favor intenta de nuevo más tarde.'
        : 'Sorry, there was an error. Please try again later.';
      setMessages(prev => [...prev, { 
        texto: errorMessage, 
        esUsuario: false, 
        fecha: null,
        fechaLocal: obtenerFechaLocal()
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioActual?.uid) {
      cargarContadorMensajes();
    }
  }, [usuarioActual?.uid]);

  useEffect(() => {
    if (isOpen) {
      cargarHistorial();
    }
  }, [isOpen, usuarioActual?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50 transition-all"
      >
        <span className="text-2xl">💬</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-[#1e293b] rounded-2xl shadow-2xl border border-blue-900/30 z-50 flex flex-col" style={{ height: '500px' }}>
          <div className="p-4 border-b border-blue-900/30 flex justify-between items-center">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span>🤖</span> {idioma === 'es' ? 'Asistente IA 24/7' : 'AI Assistant 24/7'}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p>🤖 {idioma === 'es' ? 'Hola, soy tu asistente IA de STRATIUM AI' : 'Hello, I am your AI assistant from STRATIUM AI'}</p>
                <p className="text-sm mt-2">{idioma === 'es' ? 'Pregúntame sobre finanzas, costos o cómo usar la plataforma' : 'Ask me about finances, costs, or how to use the platform'}</p>
                <p className="text-xs text-cyan-400 mt-4">💡 {idioma === 'es' ? `Plan actual: ${planSeguro.toUpperCase()} - ${limiteMensajes} mensajes/mes` : `Current plan: ${planSeguro.toUpperCase()} - ${limiteMensajes} messages/month`}</p>
                <p className="text-xs text-gray-500 mt-2">📋 {idioma === 'es' ? 'Ejemplos de preguntas:' : 'Example questions:'}</p>
                <p className="text-xs text-gray-400">• {idioma === 'es' ? '¿Cómo está mi producto Camisa?' : 'How is my product Shirt?'}</p>
                <p className="text-xs text-gray-400">• {idioma === 'es' ? '¿Qué productos son críticos?' : 'Which products are critical?'}</p>
                <p className="text-xs text-gray-400">• {idioma === 'es' ? '¿Cuáles son mis productos estrella?' : 'What are my star products?'}</p>
                <p className="text-xs text-gray-400">• {idioma === 'es' ? 'Resumen de salud financiera' : 'Financial health summary'}</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.esUsuario ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl ${msg.esUsuario ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-gray-200'}`}>
                  <p className="text-sm whitespace-pre-wrap">{sanitizarTexto(msg.texto)}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatearFecha(msg.fecha, msg.fechaLocal)}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 p-3 rounded-xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-blue-900/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
                placeholder={idioma === 'es' ? 'Escribe tu pregunta...' : 'Type your question...'}
                className="flex-1 bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={loading}
              />
              <button
                onClick={enviarMensaje}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                {idioma === 'es' ? 'Enviar' : 'Send'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {mensajesUsados}/{limiteMensajes} {idioma === 'es' ? 'mensajes este mes' : 'messages this month'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportBot;

