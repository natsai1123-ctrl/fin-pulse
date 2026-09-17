import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const BANK_OPTIONS = ['花旗銀行', '渣打銀行', '恆生銀行', '滙豐銀行', '中國銀行', '其他銀行'];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 表單狀態
  const [bank, setBank] = useState('花旗銀行');
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T'));
  const [amount, setAmount] = useState('');

  // AI 狀態
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: '你好！我是 FinPulse 智慧理財顧問。我已成功接通您的雲端帳單，您可以問我「財務狀況」或「還款策略」！' }
  ]);

  // 🔐 實時雲端連通核心
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

  // 智慧對話函式
  const handleSendMessage = () => {
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
    <div style={{ maxWidth: '750px', margin: '30px auto', backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f1f5f9', border: '1px solid #334155' }}>
      <div style={{ fontSize: '26px', fontWeight: '900', color: '#38bdf8', textAlign: 'center', marginBottom: '25px', letterSpacing: '1px' }}>🚀 FIN-PULSE 智慧雲端控制台</div>
      
      {/* 📊 指標區 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>💳 雲端待還總額</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#38bdf8', marginTop: '5px' }}>HK${totalUnpaid.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>📡 連線狀態</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: loading ? '#fbbf24' : '#34d399', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {loading ? '⏳ 正在加密安全連線...' : '🟢 雲端安全同步中 (Active)'}
          </div>
        </div>
      </div>

      {/* 導覽籤頁 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
        <button type="button" onClick={() => setActiveTab('overview')} style={{ flex: 1, padding: '12px', background: activeTab === 'overview' ? '#0ea5e9' : '#334155', color: activeTab === 'overview' ? '#0f172a' : 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}>帳單管理中心</button>
        <button type="button" onClick={() => setActiveTab('ai')} style={{ flex: 1, padding: '12px', background: activeTab === '#c084fc' ? '#c084fc' : '#334155', color: activeTab === 'ai' ? 'white' : 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', backgroundColor: activeTab === 'ai' ? '#a855f7' : '#334155' }}>🤖 AI 智能理財顧問</button>
      </div>

      {activeTab === 'overview' ? (
        <div>
          {/* ➕ 手動新增表單 */}
          <form onSubmit={handleAddCard} style={{ background: '#0f172a', border: '1px solid #334155', padding: '20px', borderRadius: '16px', marginBottom: '25px' }}>
            <strong style={{ color: '#38bdf8', fontSize: '14px', display: 'block', marginBottom: '12px' }}>➕ 錄入全新信用卡帳單</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <select value={bank} onChange={e => setBank(e.target.value)} style={{ padding: '10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '10px', color: 'white', fontSize: '13px' }}>
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="text" placeholder="卡片名稱" value={name} onChange={e => setName(e.target.value)} style={{ padding: '10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '10px', color: 'white', fontSize: '13px' }} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '10px', color: 'white', fontSize: '13px' }} />
              <input type="number" placeholder="應還金額" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: '10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '10px', color: 'white', fontSize: '13px' }} />
            </div>
            <div style={{ textAlign: 'right', marginTop: '15px' }}>
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>確認寫入雲端資料庫</button>
            </div>
          </form>

          {/* 清單展示區 */}
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px', fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' }}>📋 雲端實時同步帳單清單 ({cards.length} 張卡)：</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {cards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>雲端目前沒有任何月結單項目，請在上方新增！</div>
              ) : (
                cards.map(c => (
                  <div key={c.id} style={{ background: '#0f172a', border: '1px solid #475569', padding: '18px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                    <div>
                      <strong style={{ color: '#38bdf8', fontSize: '15px' }}>[{c.bank}]</strong> <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>{c.name}</span>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>📅 繳款到期日: {c.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontWeight: '900', color: '#f59e0b', fontSize: '18px' }}>HK${Number(c.amount || 0).toLocaleString()}</span>
