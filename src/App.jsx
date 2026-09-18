import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [dark, setDark] = useState(true);
  const [txs, setTxs] = useState([]);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [amt, setAmt] = useState('');

  useEffect(() => {
    let unsubCards = () => {};
    signInAnonymously(auth).then(c => { setUid(c.user.uid); setLoading(false); }).catch(e => { console.error(e); setLoading(false); });
    const unsubAuth = onAuthStateChanged(auth, u => {
      if (u) {
        setUid(u.uid);
        unsubCards = onSnapshot(collection(db, 'users', u.uid, 'cards'), s => {
          setTxs(s.docs.map(d => ({ id: d.id, ...d.data() })));
        }, e => console.error(e));
      }
    });
    return () => { unsubAuth(); unsubCards(); };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !amt || !uid) return;
    try {
      await setDoc(doc(db, 'users', uid, 'cards', 'c-' + Date.now()), { name: name.trim(), amount: parseFloat(amt) || 0 });
      setName(''); setAmt(''); setShow(false);
    } catch (err) { alert('儲存失敗！'); }
  };

  const handleDelete = async (id) => {
    if (uid && window.confirm('確定刪除？')) await deleteDoc(doc(db, 'users', uid, 'cards', id));
  };

  const sum = useMemo(() => txs.reduce((s, t) => s + (Number(t.amount) || 0), 0), [txs]);
  const bg = dark ? '#0f172a' : '#f8fafc';
  const txt = dark ? '#f1f5f9' : '#0f172a';
  const card = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '1px solid #334155' : '1px solid #e2e8f0';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, color: txt, padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: border, paddingBottom: '16px', marginBottom: '32px' }}>
        <span style={{ fontSize: '20px', fontWeight: '900' }}>FinPulse PRO</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: loading ? '#fbbf24' : '#34d399' }}>{loading ? '⏳ 連線中' : '🟢 雲端同步'}</span>
          <button onClick={() => setShow(true)} style={{ backgroundColor: '#10b981', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Add</button>
          <button onClick={() => setDark(!dark)} style={{ padding: '8px', borderRadius: '8px', border: border, backgroundColor: card, color: txt, cursor: 'pointer' }}>{dark ? '☀️' : '🌙'}</button>
        </div>
      </header>

      <main>
        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: card, border: border, marginBottom: '32px' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Total Balance</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>HK${sum.toLocaleString()}</div>
        </div>

        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: card, border: border }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Transactions ({txs.length})</h3>
          {txs.length === 0 ? <div style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>目前無資料，請點 Add 錄入。</div> : txs.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>{t.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: '700' }}>${Number(t.amount || 0).toLocaleString()}</span>
                <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {show && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <div style={{ width: '280px', padding: '24px', borderRadius: '16px', backgroundColor: card, border: border }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Add Item</h3>
            <form onSubmit={handleAdd}>
              <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }} required />
              <input type="number" placeholder="Amount" value={amt} onChange={e => setAmt(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px', boxSizing: 'border-box' }} required />
              <div style={{ textAlign: 'right' }}>
                <button type="button" onClick={() => setShow(false)} style={{ marginRight: '8px' }}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}