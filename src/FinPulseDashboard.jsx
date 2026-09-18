import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import CardItem from './CardItem';
import AiSection from './AiSection';

const CATEGORY_OPTIONS = ['1) 餐飲', '2) 交通', '3) 八達通增值', '4) 購物', '5) 網購', '6) 管理費', '7) 稅', '8) 貸款', '9) 其他'];
const BANK_OPTIONS = ['花旗銀行', '渣打銀行', '恆生銀行', '滙豐銀行', '中國銀行', '中國建設銀行亞洲', '其他銀行'];
const CATEGORY_COLORS = { '1) 餐飲': '#fbbf24', '2) 交通': '#38bdf8', '3) 八達通增值': '#2dd4bf', '4) 購物': '#f472b6', '5) 網購': '#c084fc', '6) 管理費': '#34d399', '7) 稅': '#f87171', '8) 貸款': '#a78bfa', '9) 其他': '#94a3b8' };

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState([]);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  const [newBank, setNewBank] = useState('花旗銀行');
  const [newCardName, setNewCardName] = useState('');
  const [newRepaymentAmount, setNewRepaymentAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('1) 餐飲');

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: '你好！我是 FinPulse 理財顧問。已成功接通您的雲端卡片紀錄！' }]);

  useEffect(() => {
    let unsubCards = () => {};
    signInAnonymously(auth).then(cred => { setUid(cred.user.uid); setLoading(false); }).catch(err => { console.error(err); setLoading(false); });
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (user) {
        setUid(user.uid);
        unsubCards = onSnapshot(collection(db, 'users', user.uid, 'cards'), snap => {
          setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, err => console.error(err));
      }
    });
    return () => { unsubAuth(); unsubCards(); };
  }, []);

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardName || !newRepaymentAmount || !uid) return;
    try {
      await setDoc(doc(db, 'users', uid, 'cards', 'card-' + Date.now()), {
        bank: newBank, name: newCardName.trim(), category: selectedCategory, amount: parseFloat(newRepaymentAmount) || 0, isPaid: false
      });
      setNewCardName(''); setNewRepaymentAmount(''); setShow(false);
    } catch (err) { alert('儲存失敗！'); }
  };

  const handleDeleteCard = async (id) => {
    if (uid && window.confirm('確定刪除此信用卡？')) await deleteDoc(doc(db, 'users', uid, 'cards', id));
  };

  const handleTogglePaid = async (cardItem) => {
    if (!uid) return;
    try { await setDoc(doc(db, 'users', uid, 'cards', cardItem.id), { ...cardItem, isPaid: !cardItem.isPaid }); } catch (e) { console.error(e); }
  };

  const handleSendMessage = () => {
    const query = chatInput.trim();
    if (!query) return;
    const newMsgs = [...chatMessages, { role: 'user', text: query }];
    setChatMessages(newMsgs); setChatInput('');
    setTimeout(() => {
      let total = cards.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      let reply = `📊 【財務狀況診斷】目前在雲端共有 ${cards.length} 筆卡片紀錄，待繳總金額為：<strong>HK$${total.toLocaleString()}</strong>。`;
      setChatMessages([...newMsgs, { role: 'ai', text: reply }]);
    }, 300);
  };

  const totalUnpaid = useMemo(() => cards.reduce((sum, c) => sum + (c.isPaid ? 0 : Number(c.amount || 0)), 0), [cards]);
  const pieData = useMemo(() => {
    const map = {};
    cards.forEach(c => { const cat = c.category || '9) 其他'; map[cat] = (map[cat] || 0) + Number(c.amount || 0); });
    return Object.keys(map).map(k => ({ name: k, value: map[k], color: CATEGORY_COLORS[k] || '#94a3b8' }));
  }, [cards]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f1f5f9', padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 32px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>FP</div>
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#34d399' }}>FinPulse PRO</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setActiveTab('overview')} style={{ backgroundColor: activeTab === 'overview' ? '#0ea5e9' : '#1e293b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>概覽面板</button>
          <button onClick={() => setActiveTab('ai')} style={{ backgroundColor: activeTab === 'ai' ? '#a855f7' : '#1e293b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>AI 顧問</button>
        </div>
      </header>

      {activeTab === 'overview' ? (
        <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>待繳總額 (Unpaid Total)</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#f43f5e' }}>{"HK\$ " + totalUnpaid.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: loading ? '#fbbf24' : '#34d399', marginTop: '12px' }}>{loading ? '⏳ 連線同步中...' : '🟢 雲端同步中 (Firestore)'}</div>
            </div>

            <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155', height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700' }}>📊 類別比例分佈</span>
                <button onClick={() => setShow(true)} style={{ backgroundColor: '#10b981', color: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>錄入新卡</button>
              </div>
              {pieData.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', paddingBottom: '20px' }}>暫無數據</div> : (
                <div style={{ width: '100%', height: '110px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={pieData} innerRadius={35} outerRadius={48} paddingAngle={3} dataKey="value">{pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {cards.map(c => <CardItem key={c.id} c={c} onToggle={handleTogglePaid} onDelete={handleDeleteCard} />)}
          </div>
        </main>
      ) : (
        <AiSection chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} onSend={handleSendMessage} />
      )}

      {show && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <div style={{ width: '280px', padding: '24px', borderRadius: '16px', backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>錄入新卡</h3>
            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select value={newBank} onChange={e => setNewBank(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}>{BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}</select>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}>{CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input type="text" placeholder="卡片項目名稱" value={newCardName} onChange={e => setNewCardName(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} required />
              <input type="number" placeholder="應還金額" value={newRepaymentAmount} onChange={e => setNewRepaymentAmount(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} required />
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button type="button" onClick={() => setShow(false)} style={{ marginRight: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: 'transparent', color: '#f1f5f9' }}>取消</button>
                <button type="submit" style={{ backgroundColor: '#10b981', color: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold' }}>儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
