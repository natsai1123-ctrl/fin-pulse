import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownToLine, ArrowUpRight, Bot, Check, CheckCircle2, ChevronRight, Cloud, CloudCheck, CreditCard, Database, Download, Edit3, FileSpreadsheet, Filter, Landmark, LayoutDashboard, MessageCircle, Plus, RefreshCcw, Search, Trash2, Upload, Wallet, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db, auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';

export const STORAGE_KEY_CARDS = 'STORAGE_KEY_CARDS';
export const STORAGE_KEY_TX = 'STORAGE_KEY_TX';
const CATEGORIES = ['餐飲', '交通', '八達通增值', '購物', '網購', '管理費', '稅', '貸款', '其他'];
const BANKS = ['花旗銀行', '渣打銀行', '恆生銀行', '滙豐銀行', '中銀香港', '建行亞洲', '其他銀行'];
const COLORS = ['#22d3ee', '#818cf8', '#f59e0b', '#fb7185', '#c084fc', '#34d399', '#f97316', '#a78bfa', '#94a3b8'];
const BANK_STYLES = {
  花旗銀行: ['#44403c', '#27272a', '#d6d3d1'], 渣打銀行: ['#78350f', '#292524', '#fbbf24'],
  恆生銀行: ['#171717', '#09090b', '#d4d4d8'], 滙豐銀行: ['#0f172a', '#1e1b4b', '#a5b4fc'],
  中銀香港: ['#475569', '#334155', '#e2e8f0'], 建行亞洲: ['#1e1b4b', '#18181b', '#a5b4fc'],
  其他銀行: ['#44403c', '#27272a', '#d6d3d1']
};
const TITANIUM_THEMES = [
  { name: '原色鈦', cardBg: 'bg-gradient-to-br from-stone-700 via-zinc-800 to-slate-900 border-stone-500/40 text-stone-100', badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', colors: ['#57534e', '#27272a', '#cffafe'] },
  { name: '沙漠鈦', cardBg: 'bg-gradient-to-br from-amber-950 via-stone-800 to-zinc-900 border-amber-500/40 text-amber-100', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', colors: ['#451a03', '#292524', '#fcd34d'] },
  { name: '深空黑鈦', cardBg: 'bg-gradient-to-br from-neutral-900 via-zinc-900 to-black border-neutral-700/60 text-zinc-100', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', colors: ['#262626', '#09090b', '#d4d4d8'] },
  { name: '藍鈦', cardBg: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-zinc-900 border-indigo-500/40 text-indigo-100', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30', colors: ['#0f172a', '#1e1b4b', '#bae6fd'] },
  { name: '白銀鈦', cardBg: 'bg-gradient-to-br from-slate-600 via-slate-700 to-zinc-800 border-slate-400/50 text-slate-100', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', colors: ['#475569', '#334155', '#a7f3d0'] }
];
const money = (value) => `HK$${Number(value || 0).toLocaleString('en-HK', { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const fromStorage = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };

function Glass({ children, className = '' }) { return <section className={`glass ${className}`}>{children}</section>; }
function Button({ children, variant = 'ghost', className = '', ...props }) { return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Chip() { return <span className="chip"><i /><i /><i /><i /></span>; }
function Empty({ children, icon: Icon = Database }) { return <div className="empty"><Icon size={24} /><span>{children}</span></div>; }

export default function FinPulseDashboard() {
  const [tab, setTab] = useState('overview');
  const [cards, setCards] = useState(() => fromStorage(STORAGE_KEY_CARDS));
  const [transactions, setTransactions] = useState(() => fromStorage(STORAGE_KEY_TX));
  const [uid, setUid] = useState(null);
  const [cloud, setCloud] = useState('local');
  const [syncing, setSyncing] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [cardFilter, setCardFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const uploadRef = useRef(null);

  const writeLocal = (nextCards, nextTransactions) => {
    if (nextCards !== null) { setCards(nextCards); localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(nextCards)); }
    if (nextTransactions !== null) { setTransactions(nextTransactions); localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(nextTransactions)); }
  };
  useEffect(() => {
    let stopCards = () => {}, stopTransactions = () => {};
    signInAnonymously(auth).then(({ user }) => {
      setUid(user.uid); setCloud('connected');
      stopCards = onSnapshot(collection(db, 'users', user.uid, 'cards'), (snapshot) => { if (!snapshot.empty) writeLocal(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), null); }, () => setCloud('local'));
      stopTransactions = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snapshot) => { if (!snapshot.empty) writeLocal(null, snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); }, () => setCloud('local'));
    }).catch(() => setCloud('local'));
    return () => { stopCards(); stopTransactions(); };
  }, []);
  const saveCollection = async (type, next) => {
    writeLocal(type === 'cards' ? next : null, type === 'transactions' ? next : null);
    if (!uid) return;
    setSyncing(true);
    try { await Promise.all(next.map((item) => setDoc(doc(db, 'users', uid, type, item.id), item))); setCloud('connected'); } catch { setCloud('local'); }
    setSyncing(false);
  };
  const removeItem = async (type, id) => {
    const list = type === 'cards' ? cards : transactions;
    writeLocal(type === 'cards' ? list.filter((item) => item.id !== id) : null, type === 'transactions' ? list.filter((item) => item.id !== id) : null);
    if (uid) { try { await deleteDoc(doc(db, 'users', uid, type, id)); } catch { setCloud('local'); } }
  };

  const stats = useMemo(() => {
    const pending = cards.filter((card) => !card.isPaid);
    return { pending, due: pending.reduce((sum, card) => sum + Number(card.amount || 0), 0), paid: cards.filter((card) => card.isPaid).reduce((sum, card) => sum + Number(card.amount || 0), 0), spent: transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0), rate: cards.length ? cards.filter((card) => card.isPaid).length / cards.length * 100 : 0 };
  }, [cards, transactions]);
  const urgent = useMemo(() => [...stats.pending].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))[0], [stats.pending]);
  const pieData = useMemo(() => CATEGORIES.map((name, index) => ({ name, value: transactions.filter((tx) => tx.category === name).reduce((sum, tx) => sum + Number(tx.amount || 0), 0), color: COLORS[index] })).filter((item) => item.value > 0), [transactions]);
  const barData = useMemo(() => cards.map((card) => ({ name: card.name, spent: transactions.filter((tx) => tx.cardId === card.id).reduce((sum, tx) => sum + Number(tx.amount || 0), 0), due: Number(card.amount || 0) })), [cards, transactions]);

  const saveCard = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const card = { id: editingCard?.id || `card-${Date.now()}`, bank: form.get('bank'), name: String(form.get('name')).trim(), dueDate: form.get('dueDate'), amount: Number(form.get('amount')) || 0, isPaid: editingCard?.isPaid || false };
    await saveCollection('cards', editingCard ? cards.map((item) => item.id === card.id ? card : item) : [...cards, card]);
    setModal(false); setEditingCard(null); setToast('信用卡資料已儲存');
  };
  const addTransaction = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const item = { id: `tx-${Date.now()}`, description: String(form.get('description')).trim(), amount: Number(form.get('amount')) || 0, category: form.get('category'), cardId: form.get('cardId') || '', date: form.get('date') || today() };
    await saveCollection('transactions', [item, ...transactions]); event.currentTarget.reset(); setToast('簽賬已加入');
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const XLSX = await import('xlsx'); const book = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]);
      const value = (row, names) => { const key = Object.keys(row).find((item) => names.some((name) => item.toLowerCase().includes(name))); return key ? row[key] : ''; };
      const imported = rows.map((row, index) => ({ id: `excel-${Date.now()}-${index}`, date: String(value(row, ['日期', 'date', 'time']) || today()), description: String(value(row, ['說明', '描述', 'description', 'name', '項目']) || 'Excel 簽賬'), cardId: cards.find((card) => String(value(row, ['卡片', 'card'])).includes(card.name))?.id || '', amount: Number(value(row, ['金額', 'amount', 'value'])) || 0, category: CATEGORIES.find((category) => String(value(row, ['分類', 'category'])).includes(category)) || '其他' }));
      await saveCollection('transactions', [...imported, ...transactions]); setToast(`已匯入 ${imported.length} 筆交易`);
    } catch { setToast('Excel 匯入失敗，請檢查檔案格式'); }
    event.target.value = '';
  };
  const exportJson = () => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify({ cards, transactions }, null, 2)], { type: 'application/json' })); link.download = `finpulse-${today()}.json`; link.click(); URL.revokeObjectURL(link.href); };
  const filtered = transactions.filter((tx) => `${tx.description} ${cards.find((card) => card.id === tx.cardId)?.name || ''}`.toLowerCase().includes(query.toLowerCase()) && (cardFilter === 'all' || tx.cardId === cardFilter) && (categoryFilter === 'all' || tx.category === categoryFilter));

  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Wallet size={18} /></div><div><strong>FINPULSE</strong><small>PERSONAL FINANCE OS</small></div></div><div className="header-actions"><span className={`sync-status ${cloud}`}><span className="status-dot" />{syncing ? '同步中' : cloud === 'connected' ? <><CloudCheck size={14} />雲端同步</> : <><Cloud size={14} />本機模式</>}</span><Button onClick={() => { if (window.confirm('確定清空所有資料嗎？')) { writeLocal([], []); setToast('資料已清空'); } }}><RefreshCcw size={15} />清空資料</Button><Button onClick={() => { writeLocal(cards, transactions); setToast('資料已儲存'); }}><Database size={15} />手動儲存</Button><Button onClick={() => uploadRef.current?.click()}><Upload size={15} />匯入 Excel</Button><input ref={uploadRef} hidden type="file" accept=".xlsx,.xls" onChange={importExcel} /><Button onClick={exportJson}><Download size={15} />備份 JSON</Button></div></header><main className="container"><div className="page-heading"><div><p className="eyebrow">SATURDAY, SEPTEMBER 19, 2026</p><h1>你的財務脈搏<span className="cyan">.</span></h1><p className="subtle">清晰掌握每一筆流動，讓每個決定都更有底氣。</p></div><div className="heading-stat"><ArrowUpRight size={18} /><span>本月支出</span><strong>{money(stats.spent)}</strong></div></div><nav className="tabs">{[["overview", LayoutDashboard, '數據總覽與分析'], ["cards", CreditCard, '信用卡管理'], ["transactions", FileSpreadsheet, '簽賬明細'], ["ai", Bot, 'AI 理財小幫手']].map(([id, Icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17} />{label}{id === 'cards' && <b>{cards.length}</b>}{id === 'transactions' && <b>{transactions.length}</b>}</button>)}</nav>{tab === 'overview' && <Overview stats={stats} urgent={urgent} pieData={pieData} barData={barData} markPaid={() => urgent && saveCollection('cards', cards.map((card) => card.id === urgent.id ? { ...card, isPaid: true } : card))} />}{tab === 'cards' && <CardsView cards={cards} open={() => { setEditingCard(null); setModal(true); }} edit={(card) => { setEditingCard(card); setModal(true); }} toggle={(card) => saveCollection('cards', cards.map((item) => item.id === card.id ? { ...item, isPaid: !item.isPaid } : item))} remove={(id) => removeItem('cards', id)} updateDate={(id, dueDate) => saveCollection('cards', cards.map((item) => item.id === id ? { ...item, dueDate } : item))} />}{tab === 'transactions' && <TransactionsView cards={cards} transactions={filtered} query={query} setQuery={setQuery} cardFilter={cardFilter} setCardFilter={setCardFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} add={addTransaction} remove={(id) => removeItem('transactions', id)} updateCategory={(id, category) => saveCollection('transactions', transactions.map((item) => item.id === id ? { ...item, category } : item))} />}{tab === 'ai' && <AiView cards={cards} transactions={transactions} />}</main>{modal && <CardModal card={editingCard} close={() => { setModal(false); setEditingCard(null); }} save={saveCard} />}{toast && <div className="toast"><CheckCircle2 size={16} />{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}</div>;
}

function Overview({ stats, urgent, pieData, barData, markPaid }) { return <><>{urgent && <Glass className={`alert-banner ${urgent.dueDate < today() ? 'overdue' : ''}`}><AlertCircle size={20} /><div className="alert-copy"><strong>{urgent.dueDate < today() ? '還款已逾期' : '即將到期的還款提醒'}</strong><span>{urgent.name} · 到期日 {urgent.dueDate || '未設定'} · 應還 <b>{money(urgent.amount)}</b></span></div><Button variant="success" onClick={markPaid}><Check size={15} />標記為已還款</Button></Glass>}</><div className="kpi-grid"><Kpi icon={Wallet} label="本期待繳總金額" value={money(stats.due)} meta={`已還款 ${money(stats.paid)}`} tone="cyan" /><Kpi icon={ArrowDownToLine} label="本期總簽賬支出" value={money(stats.spent)} meta="全部交易紀錄" tone="rose" /><Kpi icon={CreditCard} label="待還款卡片" value={`${stats.pending.length} 張`} meta="未結清卡片" tone="amber" /><Kpi icon={CheckCircle2} label="還款完成率" value={`${stats.rate.toFixed(0)}%`} meta="本期整體進度" tone="emerald" progress={stats.rate} /></div><div className="chart-grid"><Glass className="chart-panel"><div className="section-title"><div><p className="eyebrow">SPENDING MIX</p><h2>消費分類</h2></div><span className="chart-note">本期支出佔比</span></div>{pieData.length ? <div className="donut-wrap"><ResponsiveContainer width="55%" height={230}><PieChart><Pie data={pieData} dataKey="value" innerRadius={68} outerRadius={94} paddingAngle={3}>{pieData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<ChartTip />} /></PieChart></ResponsiveContainer><div className="legend-list">{pieData.map((item) => <div key={item.name}><i style={{ background: item.color }} />{item.name}<b>{money(item.value)}</b></div>)}</div></div> : <Empty>新增簽賬後，這裡會顯示消費結構</Empty>}</Glass><Glass className="chart-panel"><div className="section-title"><div><p className="eyebrow">CARD PERFORMANCE</p><h2>信用卡使用概覽</h2></div><span className="chart-note">簽賬額 ／ 應還金額</span></div>{barData.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={barData}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} /><YAxis stroke="#64748b" tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><Legend /><Bar dataKey="spent" name="簽賬額" fill="#22d3ee" radius={[4, 4, 0, 0]} /><Bar dataKey="due" name="應還金額" fill="#818cf8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty>新增信用卡後，這裡會顯示比較</Empty>}</Glass></div></>;
}
function Kpi({ icon: Icon, label, value, meta, tone, progress }) { return <Glass className={`kpi ${tone}`}><div className="kpi-top"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{meta}</small>{progress !== undefined && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}</Glass>; }
function ChartTip({ active, payload }) { return active && payload?.length ? <div className="chart-tooltip"><span>{payload[0].name}</span><b>{money(payload[0].value)}</b></div> : null; }

function CardsView({ cards, open, edit, toggle, remove, updateDate }) { return <div className="view-stack"><div className="view-toolbar"><div><p className="eyebrow">YOUR WALLET</p><h2>信用卡管理 <span className="count">{cards.length}</span></h2></div><Button variant="primary" onClick={open}><Plus size={16} />新增信用卡</Button></div><div className="card-grid">{cards.map((card, index) => <CardTile key={card.id} card={card} theme={TITANIUM_THEMES[index % TITANIUM_THEMES.length]} edit={edit} toggle={toggle} remove={remove} updateDate={updateDate} />)}</div>{!cards.length && <Glass><Empty icon={CreditCard}>還沒有信用卡，新增第一張卡開始追蹤。</Empty></Glass>}</div>; }
function CardTile({ card, theme, edit, toggle, remove, updateDate }) { const style = BANK_STYLES[card.bank] || BANK_STYLES.其他銀行; const dateRef = useRef(null); return <div className="credit-card" data-theme={theme.name} style={{ '--card-a': theme.colors[0], '--card-b': theme.colors[1], '--card-accent': style[2] }}><div className="card-shine" /><div className="card-top"><span>{card.bank}</span><span className={`card-status ${card.isPaid ? 'paid' : ''}`}><span className="theme-name">{theme.name}</span>{card.isPaid ? <><CheckCircle2 size={12} />已結清</> : <><AlertCircle size={12} />待還款</>}</span><Landmark size={20} /></div><Chip /><p className="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;{String(card.id).slice(-4)}</p><div className="card-bottom"><div><small>CARD HOLDER</small><strong>{card.name}</strong></div><div className="card-due"><small>應還金額</small><strong>{money(card.amount)}</strong></div></div><div className="card-actions"><span className={card.isPaid ? 'paid' : ''}>到期日 {card.dueDate || '未設定'}</span><div><button title="修改到期日" onClick={() => dateRef.current?.showPicker?.()}><input ref={dateRef} className="card-date" type="date" value={card.dueDate || ''} onChange={(event) => updateDate(card.id, event.target.value)} /></button><button title="編輯" onClick={() => edit(card)}><Edit3 size={14} /></button><button title="切換還款狀態" onClick={() => toggle(card)}><Check size={14} /></button><button title="刪除" onClick={() => remove(card.id)}><Trash2 size={14} /></button></div></div></div>; }
function CardModal({ card, close, save }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">CARD SETUP</p><h2>{card ? '編輯信用卡' : '新增信用卡'}</h2></div><button onClick={close}><X size={18} /></button></div><form onSubmit={save}><Field label="發卡銀行"><select name="bank" defaultValue={card?.bank || BANKS[0]}>{BANKS.map((bank) => <option key={bank}>{bank}</option>)}</select></Field><Field label="卡片名稱"><input name="name" defaultValue={card?.name || ''} placeholder="例如：日常消費卡" required /></Field><div className="form-row"><Field label="還款日期"><input name="dueDate" type="date" defaultValue={card?.dueDate || today()} required /></Field><Field label="本期應還金額"><input name="amount" type="number" min="0" step="0.01" defaultValue={card?.amount || ''} required /></Field></div><Button variant="primary"><Check size={16} />儲存信用卡</Button></form></div></div>; }

function TransactionsView({ cards, transactions, query, setQuery, cardFilter, setCardFilter, categoryFilter, setCategoryFilter, add, remove, updateCategory }) { return <div className="view-stack"><div className="view-toolbar"><div><p className="eyebrow">CASHFLOW LEDGER</p><h2>簽賬明細 <span className="count">{transactions.length}</span></h2></div><span className="import-hint"><FileSpreadsheet size={16} />支援 .xlsx / .xls</span></div><div className="transaction-layout"><Glass><form className="tx-form" onSubmit={add}><h3><Plus size={16} />新增單筆簽賬</h3><Field label="說明"><input name="description" placeholder="例如：週末晚餐" required /></Field><div className="form-row"><Field label="金額"><input name="amount" type="number" min="0" step="0.01" required /></Field><Field label="日期"><input name="date" type="date" defaultValue={today()} /></Field></div><Field label="信用卡"><select name="cardId"><option value="">未指定卡片</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></Field><Field label="消費分類"><select name="category" defaultValue={CATEGORIES[0]}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field><Button variant="primary"><Plus size={16} />加入簽賬</Button></form></Glass><Glass className="ledger"><div className="filters"><div className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋說明或卡片..." /></div><select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)}><option value="all">所有信用卡</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">所有分類</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><Filter size={16} /></div><div className="table-wrap"><table><thead><tr><th>日期</th><th>說明</th><th>卡片</th><th>分類</th><th className="align-right">金額</th><th /></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id}><td className="muted">{tx.date?.slice(0, 10)}</td><td><strong>{tx.description}</strong></td><td className="muted">{cards.find((card) => card.id === tx.cardId)?.name || '未指定'}</td><td><select className="category-select" value={tx.category} onChange={(event) => updateCategory(tx.id, event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></td><td className="align-right amount">-{money(tx.amount)}</td><td><button className="icon-button" onClick={() => remove(tx.id)}><Trash2 size={14} /></button></td></tr>)}</tbody></table>{!transactions.length && <Empty icon={Search}>沒有符合條件的簽賬紀錄</Empty>}</div></Glass></div></div>; }

function AiView({ cards, transactions }) { const [messages, setMessages] = useState([{ from: 'ai', text: '你好，我是 FinPulse AI。你可以問我本月的消費結構或還款負擔。' }]); const [input, setInput] = useState(''); const total = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0); const pending = cards.filter((card) => !card.isPaid); const ask = (question) => { const totals = CATEGORIES.map((category) => [category, transactions.filter((tx) => tx.category === category).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)]).sort((a, b) => b[1] - a[1]); const reply = question.includes('最多') || question.includes('消費') ? `本月支出最高是「${totals[0]?.[0] || '尚無資料'}」，合計 ${money(totals[0]?.[1])}。全部簽賬共 ${money(total)}。` : question.includes('還款') || question.includes('負擔') ? `目前有 ${pending.length} 張卡片待還款，總額 ${money(pending.reduce((sum, card) => sum + Number(card.amount || 0), 0))}。` : `我已分析 ${transactions.length} 筆簽賬與 ${cards.length} 張信用卡。`; if (!question.trim()) return; setMessages((current) => [...current, { from: 'user', text: question }, { from: 'ai', text: reply }]); setInput(''); }; return <div className="ai-layout"><Glass className="ai-main"><div className="ai-head"><div className="ai-avatar"><Bot size={20} /></div><div><p className="eyebrow">FINPULSE INTELLIGENCE</p><h2>AI 理財小幫手</h2></div><span className="online"><i />ONLINE</span></div><div className="messages">{messages.map((message, index) => <div className={`message ${message.from}`} key={`${message.from}-${index}`}><span>{message.from === 'ai' ? <Bot size={14} /> : '你'}</span><p>{message.text}</p></div>)}</div><div className="quick-asks">{['本月哪項消費支出最多？', '我目前的還款負擔如何？'].map((question) => <button key={question} onClick={() => ask(question)}>{question}<ChevronRight size={14} /></button>)}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(input); }}><MessageCircle size={17} /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="問問你的財務狀況..." /><button><ArrowUpRight size={17} /></button></form></Glass><Glass className="ai-side"><p className="eyebrow">DATA CONTEXT</p><h3>分析中的資料</h3><div className="context-item"><FileSpreadsheet size={16} /><span>簽賬紀錄<strong>{transactions.length} 筆</strong></span></div><div className="context-item"><CreditCard size={16} /><span>信用卡<strong>{cards.length} 張</strong></span></div><div className="context-item"><Wallet size={16} /><span>本月支出<strong>{money(total)}</strong></span></div></Glass></div>; }
