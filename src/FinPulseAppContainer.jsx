import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { importExcelToCloud } from './excelService';
import TopBar from './TopBar';
import HeroBanner from './HeroBanner';
import OverviewSection from './OverviewSection';
import CardsSection from './CardsSection';
import DetailsSection from './DetailsSection';
import AiSection from './AiSection';

const CATEGORY_OPTIONS = ['1) 餐飲', '2) 交通', '3) 八達通增值', '4) 購物', '5) 網購', '6) 管理費', '7) 稅', '8) 貸款', '9) 其他'];
const BANK_OPTIONS = ['花旗銀行', '渣打銀行', '恆生銀行', '滙豐銀行', '中國銀行', '中國建設銀行亞洲', '其他銀行'];
const CATEGORY_COLORS = { '1) 餐飲': '#fbbf24', '2) 交通': '#38bdf8', '3) 八達通增值': '#2dd4bf', '4) 購物': '#f472b6', '5) 網購': '#c084fc', '6) 管理費': '#34d399', '7) 稅': '#f87171', '8) 貸款': '#a78bfa', '9) 其他': '#94a3b8' };

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState([]);
  const [txs, setTxs] = useState([]); // 📝 簽賬明細狀態
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);

  // 卡片表單狀態
  const [newBank, setNewBank] = useState('花旗銀行');
  const [newCardName, setNewCardName] = useState('');
  const [newRepaymentAmount, setNewRepaymentAmount] = useState('');

  // 簽賬交易表單狀態
  const [transDesc, setTransDesc] = useState('');
  const [transAmt, setTransAmt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('1) 餐飲');
  const [transCardId, setTransCardId] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: '已成功接通您的雲端帳單管理台。' }]);

  useEffect(() => {
    let unsubCards = () => {};
    let unsubTxs = () => {};
    signInAnonymously(auth).then(cred => { setUid(cred.user.uid); setLoading(false); }).catch(err => console.error(err));
    
    onAuthStateChanged(auth, user => {
      if (user) {
        setUid(user.uid);
        // 監聽第二頁：信用卡卡體
        unsubCards = onSnapshot(collection(db, 'users', user.uid, 'cards'), snap => {
          setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // 監聽第三頁：簽賬交易紀錄明細
        unsubTxs = onSnapshot(collection(db, 'users', user.uid, 'transactions'), snap => {
          setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    });
    return () => { unsubCards(); unsubTxs(); };
  }, []);

  // 新增第二頁：信用卡卡體
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardName || !newRepaymentAmount || !uid) return;
    try {
      await setDoc(doc(db, 'users', uid, 'cards', 'card-' + Date.now()), {
        bank: newBank, name: newCardName.trim(), amount: parseFloat(newRepaymentAmount) || 0, isPaid: false
      });
      setNewCardName(''); setNewRepaymentAmount('');
    } catch (err) { alert('儲存失敗！'); }
  };

  // 新增第三頁：手動日常簽賬明細
  const handleAddTx = async (e) => {
    e.preventDefault();
    if (!transDesc || !transAmt || !uid) return;
    try {
      await setDoc(doc(db, 'users', uid, 'transactions', 'tx-' + Date.now()), {
        description: transDesc.trim(), amount: parseFloat(transAmt) || 0, category: selectedCategory, cardId: transCardId
      });
      setTransDesc(''); setTransAmt('');
    } catch (err) { alert('儲存失敗！'); }
  };

  // 第三頁：Excel 智能讀取解析並寫入簽賬明細（第三頁）
  const handleUpload = (e) => {
    importExcelToCloud(e, uid, () => setLoading(true), (count) => { setLoading(false); alert('🎉 成功智慧匯入 ' + count + ' 筆明細紀錄至第三頁！'); }, (err) => alert(err));
  };

  const handleDeleteCard = async (id) => {
    if (uid && window.confirm('確定刪除此信用卡？')) await deleteDoc(doc(db, 'users', uid, 'cards', id));
  };

  const handleDeleteTx = async (id) => {
    if (uid && window.confirm('確定刪除此筆消費紀錄？')) await deleteDoc(doc(db, 'users', uid, 'transactions', id));
  };

  const handleTogglePaid = async (cardItem) => {
    if (uid) await setDoc(doc(db, 'users', uid, 'cards', cardItem.id), { ...cardItem, isPaid: !cardItem.isPaid });
  };

  const totalUnpaid = useMemo(() => cards.reduce((sum, c) => sum + (c.isPaid ? 0 : Number(c.amount || 0)), 0), [cards]);
  
  // 圓餅圖現在改為動態加總第三頁「簽賬明細」的分類佔比
  const pieData = useMemo(() => {
    const map = {};
    txs.forEach(t => { const cat = t.category || '9) 其他'; map[cat] = (map[cat] || 0) + Number(t.amount || 0); });
    return Object.keys(map).map(k => ({ name: k, value: map[k], color: CATEGORY_COLORS[k] || '#94a3b8' }));
  }, [txs]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsgs = [...chatMessages, { role: 'user', text: chatInput.trim() }];
    setChatMessages(newMsgs); setChatInput('');
    setTimeout(() => {
      setChatMessages([...newMsgs, { role: 'ai', text: `📊 目前累計共錄入 ${txs.length} 筆簽賬明細項目。` }]);
    }, 300);
  };

  const tabStyle = (tab) => ({
    backgroundColor: activeTab === tab ? '#1e293b' : 'transparent', color: activeTab === tab ? '#38bdf8' : '#94a3b8',
    border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#f1f5f9', padding: '24px', fontFamily: 'sans-serif' }}>
      <TopBar loading={loading} handleUpload={handleUpload} />
      <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', gap: '6px', background: '#0b0f19', padding: '6px', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <button onClick={() => setActiveTab('overview')} style={tabStyle('overview')}>📊 數據總覽與分析</button>
        <button onClick={() => setActiveTab('cards')} style={tabStyle('cards')}>💳 信用卡管理 ({cards.length})</button>
        <button onClick={() => setActiveTab('details')} style={tabStyle('details')}>📝 簽賬明細 ({txs.length})</button>
        <button onClick={() => setActiveTab('ai')} style={tabStyle('ai')}>🤖 AI 理財小幫手</button>
      </div>
      <HeroBanner txs={cards} onToggle={handleTogglePaid} />
      {activeTab === 'overview' && <OverviewSection totalUnpaid={totalUnpaid} loading={loading} pieData={pieData} txsCount={txs.length} />}
      {activeTab === 'cards' && <CardsSection handleAddCard={handleAddCard} newBank={newBank} setNewBank={setNewBank} BANK_OPTIONS={BANK_OPTIONS} newCardName={newCardName} setNewCardName={setNewCardName} newRepaymentAmount={newRepaymentAmount} setNewRepaymentAmount={setNewRepaymentAmount} cards={cards} handleTogglePaid={handleTogglePaid} handleDeleteCard={handleDeleteCard} />}
      {activeTab === 'details' && <DetailsSection handleAddTx={handleAddTx} transDesc={transDesc} setTransDesc={setTransDesc} transAmt={transAmt} setTransAmt={setTransAmt} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} CATEGORY_OPTIONS={CATEGORY_OPTIONS} cards={cards} transCardId={transCardId} setTransCardId={setTransCardId} handleUpload={handleUpload} txs={txs} handleDeleteTx={handleDeleteTx} />}
      {activeTab === 'ai' && <AiSection chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} onSend={handleSendMessage} />}
    </div>
  );
}
