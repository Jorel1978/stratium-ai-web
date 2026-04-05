// scripts/migrarUsuarios.js
// Ejecutar con: node scripts/migrarUsuarios.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

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

const migrarUsuarios = async () => {
  console.log('🚀 Iniciando migración de usuarios...');
  
  const usuariosRef = collection(db, 'usuarios');
  const snapshot = await getDocs(usuariosRef);
  
  let migrados = 0;
  let errores = 0;
  
  for (const userDoc of snapshot.docs) {
    try {
      const userData = userDoc.data();
      const updates = {};
      
      // 1. Agregar fecha de vencimiento si no existe
      if (!userData.fechaVencimiento && userData.plan === 'gratis') {
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
        updates.fechaVencimiento = fechaVencimiento;
        console.log(`📅 Agregando fecha vencimiento a ${userData.email}: ${fechaVencimiento.toLocaleDateString()}`);
      }
      
      // 2. Agregar créditos OCR si no existen
      if (userData.creditosOCR === undefined) {
        const planCreditos = {
          gratis: 3,
          pro: 30,
          business: 100,
          elite: 500
        };
        updates.creditosOCR = planCreditos[userData.plan] || 3;
        updates.creditosUsados = userData.creditosUsados || 0;
        console.log(`💰 Agregando créditos a ${userData.email}: ${updates.creditosOCR}`);
      }
      
      // 3. Agregar campo de versión de datos
      if (!userData.dataVersion) {
        updates.dataVersion = 2;
      }
      
      // Aplicar actualizaciones
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'usuarios', userDoc.id), updates);
        migrados++;
        console.log(`✅ Usuario ${userData.email} migrado correctamente`);
      } else {
        console.log(`⏭️ Usuario ${userData.email} ya está actualizado`);
      }
      
    } catch (error) {
      console.error(`❌ Error migrando usuario ${userDoc.id}:`, error);
      errores++;
    }
  }
  
  console.log(`\n📊 RESUMEN DE MIGRACIÓN:`);
  console.log(`   ✅ Migrados: ${migrados}`);
  console.log(`   ❌ Errores: ${errores}`);
  console.log(`   📁 Total: ${snapshot.size}`);
};

migrarUsuarios().then(() => process.exit(0));

