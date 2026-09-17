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
    { role: 'ai', text: '你好！我是 FinPulse 本地理財顧問。我已成功接通您的雲端帳單，您可以問我「財務狀況」或「還款策略」！' }
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
        reply = "📊 【雲端實時診斷】您目前在雲端共有 " + cards.length + " 筆帳單，待繳總金額為 <strong>HK\$" + total.toLocaleString() + "</strong>。";
      } else if (query.includes("最多") || query.includes("大額") || query.includes("最高")) {
        reply = "🔥 【高風險提示】目前欠款金額最高的卡片是 <strong>「" + maxCardName + "」</strong>，金額為 <strong>HK\$" + maxAmount.toLocaleString() + "</strong>。";
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
    <div className="max-w-3xl mx-auto my-8 bg-slate-800 p-8 rounded-3xl shadow-2xl text-slate-100">
      <div className="text-2xl font-black text-cyan-400 text-center mb-6 tracking-wide">🚀 FIN-PULSE 智慧雲端控制台</div>
      
      {/* 📊 指標區 */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-700">
        <div>
          <div className="text-xs text-slate-400">💳 雲端待還總額</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">HK\${totalUnpaid.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">📡 連線狀態</div>
          <div className={`text-sm font-bold mt-1.5 ${loading ? 'text-amber-400' : 'text-emerald-400'}`}>
            {loading ? '⏳ 正在連線...' : '🟢 Firebase 已同步'}
          </div>
        </div>
      </div>

      {/* 導覽籤頁 */}
      <div className="flex gap-3 mb-6">
        <button type="button" onClick={() => setActiveTab('overview')} className={`flex-1 p-2.5 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700 text-white'}`}>帳單管理</button>
        <button type="button" onClick={() => setActiveTab('ai')} className={`flex-1 p-2.5 rounded-xl font-bold transition-all ${activeTab === 'ai' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-white'}`}>🤖 AI 顧問</button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* ➕ 手動新增表單 */}
          <form onSubmit={handleAddCard} className="bg-slate-900 border border-slate-700 p-5 rounded-2xl">
            <strong className="text-cyan-400 text-sm block mb-3">➕ 新增雲端信用卡項目</strong>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select value={bank} onChange={e => setBank(e.target.value)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs">
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="text" placeholder="卡片名稱" value={name} onChange={e => setName(e.target.value)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs" />
              <input type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs" />
            </div>
            <div className="text-right mt-4">
              <button type="submit" className="bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg text-xs hover:bg-emerald-600 transition-colors">確認上傳雲端</button>
            </div>
          </form>

          {/* 清單展示區 */}
          <div className="text-left">
            <h3 className="text-cyan-400 border-b border-slate-700 pb-2 text-sm font-bold">📋 雲端即時清單 ({cards.length} 張卡)：</h3>
            <div className="mt-3 space-y-3">
              {cards.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">雲端目前沒有帳單，請在上方新增！</div>
              ) : (
                cards.map(c => (
                  <div key={c.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex justify-between items-center shadow-md">
                    <div>
                      <strong className="text-cyan-400 text-sm">[{c.bank}]</strong> <span className="text-sm">{c.name}</span>
                      <div className="text-xs text-slate-500 mt-1">📅 到期日: {c.date}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-amber-400 text-base">HK\${Number(c.amount || 0).toLocaleString()}</span>
                      <button type="button" onClick={() => handleDeleteCard(c.id)} className="bg-rose-500/20 text-rose-300 border border-rose-500/40 py-1 px-3 rounded-md text-xs hover:bg-rose-600 hover:text-white transition-colors">刪除</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 💬 AI 顧問分頁 */
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-left">
          <div className="h-40 overflow-y-auto bg-slate-950 rounded-xl p-3 mb-3 border border-slate-800">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`mb-3 text-xs flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2.5 rounded-xl max-w-[85%] ${msg.role === 'user' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-100'}`} dangerouslySetInnerHTML={{__html: msg.text}}></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="向 AI 顧問提問..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs flex-1" />
            <button type="button" onClick={handleSendMessage} className="bg-purple-500 text-white font-bold py-2 px-4 rounded-lg text-xs hover:bg-purple-600 transition-all">發送</button>
          </div>
        </div>
      )}
    </div>
  );
}
