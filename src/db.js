import { db, auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// 🔐 啟動匿名安全的雲端加密隧道
export const initCloudSync = (onDataUpdate, onUidReady) => {
  signInAnonymously(auth)
    .then((cred) => {
      onUidReady(cred.user.uid);
      // 實時監聽當前使用者資料夾下的帳單異動
      return onSnapshot(
        collection(db, 'users', cred.user.uid, 'cards'),
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }));
          onDataUpdate(list);
        },
        (err) => console.error(err)
      );
    })
    .catch((err) => console.error(err));
};

// ➕ 寫入新帳單至 Firestore
export const addCloudTx = async (uid, name, amount) => {
  if (!uid) return;
  const cardId = 'card-' + Date.now();
  await setDoc(doc(db, 'users', uid, 'cards', cardId), {
    name: name.trim(),
    amount: parseFloat(amount) || 0
  });
};

// 🗑️ 從 Firestore 實時移除帳單
export const deleteCloudTx = async (uid, id) => {
  if (!uid) return;
  await deleteDoc(doc(db, 'users', uid, 'cards', id));
};
