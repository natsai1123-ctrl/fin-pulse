import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 表單狀態
  const [bank, setBank] = useState('花旗銀行');
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');

  // AI 狀態
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: '你好！我是 FinPulse 本地理財顧問。我已成功接通您的雲端帳單，您可以問我「財務狀況」或「還款策略」！' }
  ]);

  const showToast = (msg) => {
    console.log(msg);
  };

  // 🔐 實時雲端連通核心 (原生保障通道)
  useEffect(() => {
    let unsubscribeCards = () => {};

    signInAnonymously(auth)
      .then((cred) => {
        setUserId(cred.user.uid);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        unsubscribeCards = onSnapshot(collection(db, 'users', user.uid, 'cards'), (snapshot) => {
          const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCards(cloudData);
        }, (err) => {
          console.error(err);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCards();
    };
  }, []);

  // 新增數據到 Firebase
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!name.trim() || !amount) return alert('請填寫完整名稱與金額！');

    const activeUid = userId || (auth.currentUser ? auth.currentUser.uid : null);
    if (!activeUid) return alert('⏳ 正在建立安全的雲端加密隧道，請稍候再試...');

    const cardId = 'card-' + Date.now();
    try {
      await setDoc(doc(db, 'users', activeUid, 'cards', cardId), {
        bank: bank,
        name: name.trim(),
        date: date,
        amount: parseFloat(amount) || 0
      });
      setName('');
      setAmount('');
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請檢查網路或 Firestore 規則！');
    }
  };

  // 從 Firebase 刪除數據
  const handleDeleteCard = async (id) => {
    const activeUid = userId || (auth.currentUser ? auth.currentUser.uid : null);
    if (!activeUid || !window.confirm('確定要刪除這筆雲端帳單紀錄嗎？')) return;
    try {
      await deleteDoc(doc(db, 'users', activeUid, 'cards', id));
    } catch (err) { console.error(err); }
  };

  // 本地 AI 智能大腦
  const handleSendAiMessage = () => {
    var query = chatInput.trim();
    if (!query) return;

    var newMsgs = [...chatMessages, { role: 'user', text: query }];
    setChatMessages(newMsgs);
    setChatInput('');

    setTimeout(function() {
      var reply = "收到您的提問。建議優先繳清高金額或即將到期的帳單，避免產生循環利息。";
      var total = 0;
      var maxAmount = 0;
      var maxCardName = "無";
      
      for (var i = 0; i < cards.length; i++) {
        var amt = Number(cards[i].amount || 0);
        total += amt;
        if (amt > maxAmount) {
          maxAmount = amt;
          maxCardName = cards[i].bank + " " + cards[i].name;
        }
      }

      if (query.includes("狀況") || query.includes("財務") || query.includes("多少")) {
        reply = "📊 【雲端實時診斷】您目前在雲端共有 " + cards.length + " 筆帳單，待繳總金額為 <strong>HK$" + total.toLocaleString() + "</strong>。";
      } else if (query.includes("最多") || query.includes("大額") || query.includes("最高")) {
        reply = "🔥 【高風險提示】目前欠款金額最高的卡片是 <strong>「" + maxCardName + "」</strong>，金額為 <strong>HK$" + maxAmount.toLocaleString() + "</strong>。";
      } else if (query.includes("還款") || query.includes("建議")) {
        reply = "💡 【還款建議】建議全額集中資金，優先進攻目前欠款最多的 「" + maxCardName + "」，能最有效率地避免高昂利息！";
      }

      setChatMessages([...newMsgs, { role: 'ai', text: reply }]);
    }, 300);
  };

  const totalUnpaid = useMemo(() => {
    return cards.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [cards]);

  return (
    <div style={{ maxWidth: '750px', margin: '20px auto', backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'sans-serif', color: '#f1f5f9' }}>
      <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', marginBottom: '20px' }}>🚀 FIN-PULSE 智慧雲端控制台</div>
      
      {/* 📊 指標區 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>💳 雲端待還總額</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8', marginTop: '5px' }}>HK${totalUnpaid.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>📡 連線狀態</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: loading ? '#f59e0b' : '#10b981', marginTop: '9px' }}>
            {loading ? '⏳ 正在連線...' : '🟢 Firebase 已同步'}
          </div>
        </div>
      </div>

      {/* 導覽籤頁 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button type="button" onClick={() => setActiveTab('overview')} style={{ flex: 1, padding: '10px', background: activeTab === 'overview' ? '#0ea5e9' : '#334155', color: activeTab === 'overview' ? '#0f172a' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>帳單管理</button>
        <button type="button" onClick={() => setActiveTab('ai')} style={{ flex: 1, padding: '10px', background: activeTab === 'ai' ? '#c084fc' : '#334155', color: activeTab === 'ai' ? '#0f172a' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🤖 AI 顧問</button>
      </div>

      {activeTab === 'overview' ? (
        <div>
          {/* ➕ 手動新增表單 */}
          <form onSubmit={handleAddCard} style={{ background: '#0f172a', border: '1px solid #334155', padding: '20px', borderRadius: '15px', marginBottom: '25px' }}>
            <strong style={{ color: '#38bdf8', fontSize: '14px' }}>➕ 新增雲端信用卡項目</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginTop: '10px' }}>
              <select value={bank} onChange={e => setBank(e.target.value)} style={{ padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}>
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="text" placeholder="卡片名稱" value={name} onChange={e => setName(e.target.value)} style={{ padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} />
              <input type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: 'white' }} />
            </div>
            <div style={{ textAlign: 'right', marginTop: '12px' }}>
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>確認上傳雲端</button>
            </div>
          </form>

          {/* 清單展示區 */}
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '6px', fontSize: '15px' }}>📋 雲端即時清單 ({cards.length} 張卡)：</h3>
            <div>
              {cards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>雲端目前沒有帳單，請在上方新增！</div>
              ) : (
                cards.map(c => (
                  <div key={c.id} style={{ background: '#0f172a', border: '1px solid #475569', padding: '15px', margin: '12px 0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#38bdf8' }}>[{c.bank}]</strong> {c.name}
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>📅 到期日: {c.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '16px' }}>HK${Number(c.amount || 0).toLocaleString()}</span>
                      <button type="button" onClick={() => handleDeleteCard(c.id)} style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>刪除</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 💬 AI 顧問分頁 */
        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '15px', borderRadius: '15px', textAlign: 'left' }}>
          <div style={{ height: '160px', overflowY: 'auto', background: '#020617', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid #1e293b' }}>
            {chatMessages.map((msg, i) => (
