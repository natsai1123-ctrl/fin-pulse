import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import OverviewSection from './OverviewSection';
import DetailsSection from './DetailsSection';
import CardItem from './CardItem';

const CATEGORY_OPTIONS = ['1) 餐飲', '2) 交通', '3) 八達通增值', '4) 購物', '5) 網購', '6) 管理費', '7) 稅', '8) 貸款', '9) 其他'];
const BANK_OPTIONS = ['花旗銀行', '渣打銀行', '恆生銀行', '滙豐銀行', '中國銀行', '中國建設銀行亞洲', '其他銀行'];
const CATEGORY_COLORS = { '1) 餐飲': '#fbbf24', '2) 交通': '#38bdf8', '3) 八達通增值': '#2dd4bf', '4) 購物': '#f472b6', '5) 網購': '#c084fc', '6) 管理費': '#34d399', '7) 稅': '#f87171', '8) 貸款': '#a78bfa', '9) 其他': '#94a3b8' };

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState([]);
  const [txs, setTxs] = useState([]);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);

  const [newBank, setNewBank] = useState('花旗銀行');
  const [newCardName, setNewCardName] = useState('');
  const [newRepaymentAmount, setNewRepaymentAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');
  const [transAmt, setTransAmt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('1) 餐飲');

  useEffect(() => {
    let unsub1 = () => {};
    let unsub2 = () => {};

    signInAnonymously(auth)
      .then((cred) => {
        setUid(cred.user.uid);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setLoading(false);
        unsub1 = onSnapshot(collection(db, 'users', user.uid, 'cards'), (s) =>
          setCards(s.docs.map((d) => ({ id: d.id, ...d.data() })))
        );
        unsub2 = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) =>
          setTxs(s.docs.map((d) => ({ id: d.id, ...d.data() })))
        );
      } else {
        setUid(null);
      }
    });

    return () => {
      unsubAuth();
      unsub1();
      unsub2();
    };
  }, []);

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardName || !newRepaymentAmount || !uid) return;
    await setDoc(doc(db, 'users', uid, 'cards', 'card-' + Date.now()), {
      bank: newBank,
      name: newCardName.trim(),
      amount: parseFloat(newRepaymentAmount) || 0,
      isPaid: false,
    });
    setNewCardName('');
    setNewRepaymentAmount('');
    setShowCardModal(false);
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
    if (!transDesc || !transAmt || !uid) return;
    await setDoc(doc(db, 'users', uid, 'transactions', 'tx-' + Date.now()), {
      description: transDesc.trim(),
      amount: parseFloat(transAmt) || 0,
      category: selectedCategory,
      date: new Date().toISOString(),
    });
    setTransDesc('');
    setTransAmt('');
  };

  const handleDeleteTx = async (id) => {
    if (!uid || !id) return;
    if (window.confirm('確定刪除？')) {
      await deleteDoc(doc(db, 'users', uid, 'transactions', id));
    }
  };

  const handleUpload = async (e) => {
    const f = e.target.files;
    if (!f || f.length === 0 || !uid) return;

    setLoading(true);
    const r = new FileReader();

    try {
      const XLSX = await import('xlsx/dist/xlsx.mini.min');
      r.onload = async (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'array' });
          const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

          for (const row of json) {
            const keys = Object.keys(row);
            const nK = keys.find((k) => k.includes('項目') || k.includes('名稱') || k.toLowerCase().includes('name') || k.includes('描述')) || '';
            const aK = keys.find((k) => k.includes('金額') || k.toLowerCase().includes('amount')) || '';
            const cK = keys.find((k) => k.includes('類別') || k.toLowerCase().includes('category')) || '';

            await setDoc(doc(db, 'users', uid, 'transactions', 'tx-xl-' + Date.now() + '-' + Math.floor(Math.random() * 1000)), {
              description: nK ? String(row[nK]).trim() : 'Excel匯入交易',
              amount: aK ? parseFloat(row[aK]) || 0 : 0,
              category: cK ? String(row[cK]).trim() : '9) 其他',
              date: new Date().toISOString(),
            });
          }

          setLoading(false);
          alert(`🎉 成功將 ${json.length} 筆日常消費紀錄匯入第三頁明細表！`);
        } catch (err) {
          setLoading(false);
          alert('匯入失敗');
        }
      };

      r.readAsArrayBuffer(f);
    } catch (err) {
      setLoading(false);
      alert('匯入失敗');
    }
  };

  const totalUnpaid = useMemo(() => cards.reduce((sum, c) => sum + (c.isPaid ? 0 : Number(c.amount || 0)), 0), [cards]);
  const totalPaid = useMemo(() => cards.reduce((sum, c) => sum + (c.isPaid ? Number(c.amount || 0) : 0), 0), [cards]);
  const totalSpent = useMemo(() => txs.reduce((sum, t) => sum + Number(t.amount || 0), 0), [txs]);
  const paidCardsCount = useMemo(() => cards.filter((c) => c.isPaid).length, [cards]);
  const pendingCardsCount = useMemo(() => cards.filter((c) => !c.isPaid).length, [cards]);
  const repaymentRate = useMemo(() => (cards.length ? (paidCardsCount / cards.length) * 100 : 0), [cards, paidCardsCount]);

  const pieData = useMemo(() => {
    const map = {};
    txs.forEach((t) => {
      const cat = t.category || '9) 其他';
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    return Object.keys(map).map((k) => ({
      name: k,
      value: map[k],
      color: CATEGORY_COLORS[k] || '#94a3b8',
    }));
  }, [txs]);

  const urgentCard = useMemo(() => cards.find((c) => !c.isPaid), [cards]);
  const tabStyle = (tab) => ({
    backgroundColor: activeTab === tab ? '#1e293b' : 'transparent',
    color: activeTab === tab ? '#38bdf8' : '#94a3b8',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
        ⏳ 實時資料庫雲端同步中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#f1f5f9', padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: '900' }}>FIN-PULSE</span>
            <span style={{ fontSize: '11px', background: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>🗲 雲端實時同步</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', gap: '6px', background: '#0b0f19', padding: '6px', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <button onClick={() => setActiveTab('overview')} style={tabStyle('overview')}>📊 數據總覽與分析</button>
        <button onClick={() => setActiveTab('cards')} style={tabStyle('cards')}>💳 信用卡管理 ({cards.length})</button>
        <button onClick={() => setActiveTab('details')} style={tabStyle('details')}>📝 簽賬明細 ({txs.length})</button>
      </div>

      {urgentCard && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', background: 'linear-gradient(90deg,#111827,#172554)', border: '1px solid #1e3a8a', padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>「{urgentCard.name}」應還金額 <span style={{ color: '#ef4444', fontWeight: '900' }}>HK${Number(urgentCard.amount || 0).toLocaleString()}</span></div>
          <button onClick={async () => { await setDoc(doc(db, 'users', uid, 'cards', urgentCard.id), { ...urgentCard, isPaid: true }); }} style={{ backgroundColor: '#22c55e', color: '#0f172a', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>標記為已還清</button>
        </div>
      )}

      {activeTab === 'overview' && (
        <OverviewSection
          totalUnpaid={totalUnpaid}
          totalPaid={totalPaid}
          totalSpent={totalSpent}
          txsCount={txs.length}
          pieData={pieData}
          pendingCardsCount={pendingCardsCount}
          repaymentRate={repaymentRate}
        />
      )}

      {activeTab === 'cards' && (
        <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'right' }}>
            <button onClick={() => setShowCardModal(true)} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>錄入新卡</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '24px' }}>
            {cards.map((c) => (
              <CardItem
                key={c.id}
                c={c}
                onDelete={async (id) => {
                  if (window.confirm('確定刪除？')) await deleteDoc(doc(db, 'users', uid, 'cards', id));
                }}
                onToggle={async (card) => {
                  await setDoc(doc(db, 'users', uid, 'cards', card.id), { ...card, isPaid: !card.isPaid });
                }}
              />
            ))}
          </div>
        </main>
      )}

      {activeTab === 'details' && (
        <DetailsSection
          handleAddTx={handleAddTx}
          transDesc={transDesc}
          setTransDesc={setTransDesc}
          transAmt={transAmt}
          setTransAmt={setTransAmt}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          CATEGORY_OPTIONS={CATEGORY_OPTIONS}
          handleUpload={handleUpload}
          txs={txs}
          onDelete={handleDeleteTx}
        />
      )}

      {showCardModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }} onClick={() => setShowCardModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, calc(100% - 24px))', padding: '24px', borderRadius: '16px', backgroundColor: '#1e293b', border: '1px solid #334155', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.55)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>新增信用卡</h3>
              <button type="button" onClick={() => setShowCardModal(false)} style={{ background: 'transparent', color: '#cbd5e1', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select value={newBank} onChange={(e) => setNewBank(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', width: '100%' }}>
                {BANK_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <input type="text" placeholder="卡片項目名稱" value={newCardName} onChange={(e) => setNewCardName(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', width: '100%', boxSizing: 'border-box' }} required />
              <input type="number" placeholder="還款金額(HK$)" value={newRepaymentAmount} onChange={(e) => setNewRepaymentAmount(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', width: '100%', boxSizing: 'border-box' }} required />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowCardModal(false)} style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' }}>取消</button>
                <button type="submit" style={{ background: '#10b981', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' }}>保存卡片</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

