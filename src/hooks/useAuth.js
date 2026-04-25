import { useState, useEffect } from 'react';
import { auth, db, usuariosCollection } from '../services/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { PLANES_CONFIG } from '../util/constants';

export function useAuth() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [errorAuth, setErrorAuth] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          await signOut(auth);
          setErrorAuth('Verifica tu correo electrónico');
          setUsuarioActual(null);
          setCargandoAuth(false);
          return;
        }

        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUsuarioActual({ uid: user.uid, email: user.email, ...userDoc.data() });
        } else {
          // Usuario nuevo
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
          const nuevoUsuario = {
            uid: user.uid,
            email: user.email,
            plan: 'gratis',
            creditosOCR: PLANES_CONFIG.gratis.creditosOCR,
            creditosUsados: 0,
            fechaVencimiento,
            fechaInicio: new Date(),
            dataVersion: 2,
            suscripcionActiva: false,
            vigencia: 0
          };
          await setDoc(userDocRef, nuevoUsuario);
          setUsuarioActual(nuevoUsuario);
        }
      } else {
        setUsuarioActual(null);
      }
      setCargandoAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRegistro = async (email, password, nombre, planSeleccionado, aceptaTerminos) => {
    if (!aceptaTerminos) throw new Error('Debes aceptar los términos');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await sendEmailVerification(user);
    
    const planData = PLANES_CONFIG[planSeleccionado] || PLANES_CONFIG.gratis;
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + planData.duracionDias);
    
    await setDoc(doc(db, 'usuarios', user.uid), {
      uid: user.uid,
      email: user.email,
      nombre: nombre || email.split('@')[0],
      plan: planSeleccionado,
      creditosOCR: planData.creditosOCR,
      creditosUsados: 0,
      fechaVencimiento,
      fechaInicio: new Date(),
      estado: 'pendiente_verificacion',
      emailVerificado: false,
      terminosAceptados: true,
      suscripcionActiva: false,
      vigencia: 0,
      dataVersion: 2
    });
    return user;
  };

  const handleLogin = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('Verifica tu correo electrónico');
    }
    return userCredential.user;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const reenviarVerificacion = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
  };

  const handleResetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  return {
    usuarioActual,
    cargandoAuth,
    errorAuth,
    setErrorAuth,
    handleRegistro,
    handleLogin,
    handleLogout,
    reenviarVerificacion,
    handleResetPassword
  };
}

