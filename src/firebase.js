import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 引入 Firestore 資料庫功能

// ⚠️ 已根據你最新的截圖完全修正數值
const firebaseConfig = {
  apiKey: "AIzaSyDrGC_b-M7-VeqDhzsBY7JvP8mznMxBIII",
  authDomain: "fin-pulse-adf61.firebaseapp.com",
  projectId: "fin-pulse-adf61",
  storageBucket: "fin-pulse-adf61.firebasestorage.app",
  messagingSenderId: "960592027576",
  appId: "1:960592027576:web:b3a048b8b110054d1cb94d",
  measurementId: "G-7T2VZHHMGF"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 匯出資料庫，讓其他記帳或財務組件可以使用
export const db = getFirestore(app);

export default app;
