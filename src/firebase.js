import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDrGC_b-M7-VeqDhzsBY7JvP8mznMxBIII",
  authDomain: "fin-pulse-adf61.firebaseapp.com",
  projectId: "fin-pulse-adf61",
  storageBucket: "fin-pulse-adf61.firebasestorage.app",
  messagingSenderId: "960592027576",
  appId: "1:960592027576:web:b3a048b8b110054d1cb94d",
  measurementId: "G-7T2VZHHMGF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
