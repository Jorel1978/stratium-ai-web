export const firebaseConfig = {
  apiKey: "AIzaSyAgEy1bbqfV4ugPbEdF8pccihUogwfIVDE",
  authDomain: "agente-financiero-ia-8548f.firebaseapp.com",
  projectId: "agente-financiero-ia-8548f",
  storageBucket: "agente-financiero-ia-8548f.firebasestorage.app",
  messagingSenderId: "924586612103",
  appId: "1:924586612103:web:1df0a21e7982a77a6caf22",
  measurementId: "G-8BEN3YXTDE"
};

export const PLANES_CONFIG = {
  gratis: { creditosOCR: 3, duracionDias: 15, historialDias: 30 },
  pro: { creditosOCR: 30, duracionDias: 30, historialDias: 365, precioCOP: 79900, precioUSD: 29.99 },
  business: { creditosOCR: 120, duracionDias: 30, historialDias: 1825, precioCOP: 199900, precioUSD: 79.99 },
  elite: { creditosOCR: 500, duracionDias: 30, historialDias: 3650, precioCOP: 499900, precioUSD: 199.99 }
};

export const FACTOR_PRESTACIONAL = {
  colombia: 1.52,
  mexico: 1.35,
  default: 1.40
};

