import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDhSt1hhS9zR7I4mlZhPHhluigzgqJT-tw",
  authDomain: "security-tender-evaluator.firebaseapp.com",
  projectId: "security-tender-evaluator",
  storageBucket: "security-tender-evaluator.firebasestorage.app",
  messagingSenderId: "479619399719",
  appId: "1:479619399719:web:1245dadc5f92ef22b08e02",
  measurementId: "G-9NHB7E8KR5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
export default app;
