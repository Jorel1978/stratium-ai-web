// src/firebase.js - Punto de entrada unificado
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAgEy1bbqfV4ugPbEdF8pccihUogwfIVDE",
  authDomain: "agente-financiero-ia-8548f.firebaseapp.com",
  projectId: "agente-financiero-ia-8548f",
  storageBucket: "agente-financiero-ia-8548f.firebasestorage.app",
  messagingSenderId: "924586612103",
  appId: "1:924586612103:web:1df0a21e7982a77a6caf22",
  measurementId: "G-8BEN3YXTDE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, db, auth, storage, functions };

