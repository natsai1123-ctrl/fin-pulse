import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowDownToLine, ArrowUpRight, Bot, Check, CheckCircle2, ChevronRight, Cloud, CloudCheck, CreditCard,
  Database, Download, Edit3, FileSpreadsheet, Filter, Landmark,
  LayoutDashboard, MessageCircle, Plus, RefreshCcw, Search, Trash2, Upload,
  Wallet, X
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db, auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';

const STORAGE_KEY_CARDS = 'finpulse_cards_v2';
const STORAGE_KEY_TX = 'finpulse_transactions_v2';
const CATEGORIES = ['Dining', 'Transport', 'Octopus', 'Shopping', 'Online', 'Management', 'Tax', 'Loan', 'Other'];
const BANKS = ['Citibank', 'Standard Chartered', 'Hang Seng', 'HSBC', 'BOC Hong Kong', 'CITIC', 'Other Bank'];
const CATEGORY_COLORS = ['#22d3ee', '#818cf8', '#f59e0b', '#fb7185', '#c084fc', '#34d399', '#f97316', '#a78bfa', '#94a3b8'];
const BANK_STYLES = {
  Citibank: ['#082f49', '#164e63', '#22d3ee'], 'Standard Chartered': ['#052e16', '#166534', '#4ade80'],
  'Hang Seng': ['#451a03', '#92400e', '#fbbf24'], HSBC: ['#4c0519', '#9f1239', '#fb7185'],
  'BOC Hong Kong': ['#450a0a', '#991b1b', '#f87171'], CITIC: ['#1e1b4b', '#4338ca', '#a5b4fc'],
  'Other Bank': ['#172033', '#334155', '#cbd5e1']
};
const money = (value) => `HK$${Number(value || 0).toLocaleString('en-HK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };

function MetallicChip() { return <span className="chip"><span /><span /><span /><span /></span>; }
function Glass({ className = '', children }) { return <section className={`glass ${className}`}>{children}</section>; }
function Button({ children, variant = 'ghost', className = '', ...props }) { return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Empty({ icon: Icon = Database, children }) { return <div className="empty"><Icon size={24} /><span>{children}</span></div>; }

export default function FinPulseDashboard() {
  const [tab, setTab] = useState('overview');
  const [cards, setCards] = useState(() => readLocal(STORAGE_KEY_CARDS, []));
  const [transactions, setTransactions] = useState(() => readLocal(STORAGE_KEY_TX, []));
  const [uid, setUid] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('local');
  const [syncing, setSyncing] = useState(false);
  const [cardModal, setCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [query, setQuery] = useState('');
  const [cardFilter, setCardFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);

  const updateLocal = (nextCards, nextTx) => {
    if (nextCards) { setCards(nextCards); localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(nextCards)); }
    if (nextTx) { setTransactions(nextTx); localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(nextTx)); }
  };

  useEffect(() => {
    let stopCards = () => {}, stopTx = () => {};
    signInAnonymously(auth).then(({ user }) => {
      setUid(user.uid); setCloudStatus('connected');
      stopCards = onSnapshot(collection(db, 'users', user.uid, 'cards'), (snap) => {
        const next = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        if (next.length) updateLocal(next, null);
      }, () => setCloudStatus('local'));
      stopTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snap) => {
        const next = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        if (next.length) updateLocal(null, next);
      }, () => setCloudStatus('local'));
    }).catch(() => setCloudStatus('local'));
    return () => { stopCards(); stopTx(); };
  }, []);

  const persist = async (type, next) => {
    updateLocal(type === 'cards' ? next : null, type === 'transactions' ? next : null);
    if (!uid) return;
    setSyncing(true);
    try {
      await Promise.all(next.map((item) => setDoc(doc(db, 'users', uid, type, item.id), item)));
      setCloudStatus('connected');
    } catch { setCloudStatus('local'); }
    setSyncing(false);
  };
  const remove = async (type, id) => {
    const list = type === 'cards' ? cards : transactions;
    const next = list.filter((item) => item.id !== id);
    updateLocal(type === 'cards' ? next : null, type === 'transactions' ? next : null);
    if (uid) { try { await deleteDoc(doc(db, 'users', uid, type, id)); } catch { setCloudStatus('local'); } }
  };

  const stats = useMemo(() => {
    const pending = cards.filter((card) => !card.isPaid);
    const due = pending.reduce((sum, card) => sum + Number(card.amount || 0), 0);
    const paid = cards.reduce((sum, card) => sum + (card.isPaid ? Number(card.amount || 0) : 0), 0);
    const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return { pending, due, paid, spent, rate: cards.length ? (cards.filter((card) => card.isPaid).length / cards.length) * 100 : 0 };
  }, [cards, transactions]);
  const urgent = useMemo(() => [...stats.pending].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))[0], [stats.pending]);
  const pieData = useMemo(() => CATEGORIES.map((name, index) => ({ name, value: transactions.filter((tx) => tx.category === name).reduce((sum, tx) => sum + Number(tx.amount || 0), 0), color: CATEGORY_COLORS[index] })).filter((item) => item.value), [transactions]);
  const barData = useMemo(() => cards.map((card) => ({ name: card.name || card.bank, spent: transactions.filter((tx) => tx.cardId === card.id).reduce((sum, tx) => sum + Number(tx.amount || 0), 0), due: Number(card.amount || 0) })), [cards, transactions]);

  const saveCard = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const card = { id: editingCard?.id || `card-${Date.now()}`, bank: form.get('bank'), name: String(form.get('name')).trim(), dueDate: form.get('dueDate'), amount: Number(form.get('amount')) || 0, isPaid: editingCard?.isPaid || false };
    await persist('cards', editingCard ? cards.map((item) => item.id === card.id ? card : item) : [...cards, card]);
    setCardModal(false); setEditingCard(null); setToast('淇＄敤鍗¤硣鏂欏凡鍎插瓨');
  };
  const addTransaction = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const tx = { id: `tx-${Date.now()}`, description: String(form.get('description')).trim(), amount: Number(form.get('amount')) || 0, category: form.get('category'), cardId: form.get('cardId') || '', date: form.get('date') || today() };
    await persist('transactions', [tx, ...transactions]); event.currentTarget.reset(); setToast('绨借超宸插姞鍏?);
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const XLSX = await import('xlsx'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const find = (row, names) => { const key = Object.keys(row).find((item) => names.some((name) => item.toLowerCase().includes(name))); return key ? row[key] : ''; };
      const imported = rows.map((row, index) => ({ id: `tx-import-${Date.now()}-${index}`, description: String(find(row, ['瑾槑', 'description', 'name', '闋呯洰']) || 'Excel 绨借超'), amount: Number(find(row, ['閲戦', 'amount', 'value'])) || 0, category: CATEGORIES.find((cat) => String(find(row, ['鍒嗛', 'category'])).includes(cat)) || '鍏朵粬', cardId: cards.find((card) => String(find(row, ['鍗＄墖', 'card'])).includes(card.name))?.id || '', date: String(find(row, ['鏃ユ湡', 'date', 'time']) || today()) }));
      await persist('transactions', [...imported, ...transactions]); setToast(`宸插尟鍏?${imported.length} 绛嗕氦鏄揱);
    } catch { setToast('Excel 鍖叆澶辨晽锛岃珛妾㈡煡妾旀鏍煎紡'); }
    event.target.value = '';
  };
  const exportJson = () => { const blob = new Blob([JSON.stringify({ cards, transactions }, null, 2)], { type: 'application/json' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `finpulse-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(anchor.href); };
  const clearData = () => { if (!window.confirm('纰哄畾娓呯┖鎵€鏈夋湰姗熻硣鏂欏棊锛?)) return; updateLocal([], []); setToast('鏈璩囨枡宸叉竻绌?); };
  const filteredTx = transactions.filter((tx) => `${tx.description} ${cards.find((card) => card.id === tx.cardId)?.name || ''}`.toLowerCase().includes(query.toLowerCase()) && (cardFilter === 'all' || tx.cardId === cardFilter) && (categoryFilter === 'all' || tx.category === categoryFilter));

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Wallet size={18} /></div><div><strong>FINPULSE</strong><small>PERSONAL FINANCE OS</small></div></div><div className="header-actions"><span className={`sync-status ${cloudStatus}`}><span className="status-dot" />{syncing ? '鍚屾涓? : cloudStatus === 'connected' ? <><CloudCheck size={14} /> 闆茬鍚屾</> : <><Cloud size={14} /> 鏈妯″紡</>}</span><Button onClick={clearData}><RefreshCcw size={15} />娓呯┖璩囨枡</Button><Button onClick={() => { updateLocal(cards, transactions); setToast('璩囨枡宸插劜瀛?); }}><Database size={15} />鎵嬪嫊鍎插瓨</Button><Button onClick={() => fileRef.current?.click()}><Upload size={15} />鍖叆 Excel</Button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={importExcel} /><Button onClick={exportJson}><Download size={15} />鍌欎唤 JSON</Button></div></header>
    <main className="container"><div className="page-heading"><div><p className="eyebrow">SATURDAY, SEPTEMBER 19, 2026</p><h1>浣犵殑璨″嫏鑴堟悘<span className="cyan">.</span></h1><p className="subtle">娓呮櫚鎺屾彙姣忎竴绛嗘祦鍕曪紝璁撴瘡鍊嬫焙瀹氶兘鏇存湁搴曟埃銆?/p></div><div className="heading-stat"><ArrowUpRight size={18} /><span>鏈湀鏀嚭</span><strong>{money(stats.spent)}</strong></div></div>
      <nav className="tabs">{[['overview', LayoutDashboard, '鏁告摎绺借'], ['cards', CreditCard, '淇＄敤鍗＄鐞?], ['transactions', FileSpreadsheet, '绨借超鏄庣窗'], ['ai', Bot, 'AI 鐞嗚病灏忓公鎵?]].map(([id, Icon, label]) => <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><Icon size={17} />{label}{id === 'cards' && <b>{cards.length}</b>}{id === 'transactions' && <b>{transactions.length}</b>}</button>)}</nav>
      {tab === 'overview' && <Overview stats={stats} urgent={urgent} pieData={pieData} barData={barData} markPaid={async () => urgent && persist('cards', cards.map((card) => card.id === urgent.id ? { ...card, isPaid: true } : card))} />}
      {tab === 'cards' && <CardsView cards={cards} openNew={() => { setEditingCard(null); setCardModal(true); }} edit={(card) => { setEditingCard(card); setCardModal(true); }} toggle={async (card) => persist('cards', cards.map((item) => item.id === card.id ? { ...item, isPaid: !item.isPaid } : item))} remove={(id) => remove('cards', id)} />}
      {tab === 'transactions' && <TransactionsView cards={cards} transactions={filteredTx} query={query} setQuery={setQuery} cardFilter={cardFilter} setCardFilter={setCardFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} add={addTransaction} remove={(id) => remove('transactions', id)} updateCategory={(id, category) => persist('transactions', transactions.map((tx) => tx.id === id ? { ...tx, category } : tx))} />}
      {tab === 'ai' && <AiView cards={cards} transactions={transactions} />}</main>
    {cardModal && <CardModal card={editingCard} onClose={() => { setCardModal(false); setEditingCard(null); }} onSave={saveCard} />}{toast && <div className="toast"><CheckCircle2 size={16} />{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>;
}

function Overview({ stats, urgent, pieData, barData, markPaid }) { return <>{urgent && <Glass className={`alert-banner ${urgent.dueDate && urgent.dueDate < today() ? 'overdue' : ''}`}><div className="alert-icon"><AlertCircle size={20} /></div><div className="alert-copy"><strong>{urgent.dueDate && urgent.dueDate < today() ? '閭勬宸查€炬湡' : '鍗冲皣鍒版湡鐨勯倓娆炬彁閱?}</strong><span>{urgent.name} 路 鍒版湡鏃?{urgent.dueDate || '鏈ō瀹?} 路 鎳夐倓 <b>{money(urgent.amount)}</b></span></div><Button variant="success" onClick={markPaid}><Check size={15} />妯欒鐐哄凡閭勬</Button></Glass>}<div className="kpi-grid"><Kpi icon={Wallet} label="鏈湡寰呯钩绺介噾椤? value={money(stats.due)} meta={`宸查倓娆?${money(stats.paid)}`} tone="cyan" /><Kpi icon={ArrowDownToLine} label="鏈湡绺界敖璩敮鍑? value={money(stats.spent)} meta={`${barData.reduce((sum, item) => sum + (item.spent ? 1 : 0), 0)} 寮靛崱鐗囨湁娑堣不`} tone="rose" /><Kpi icon={CreditCard} label="寰呴倓娆惧崱鐗? value={`${stats.pending.length} 寮礰} meta="鏈祼娓呭崱鐗? tone="amber" /><Kpi icon={CheckCircle2} label="閭勬瀹屾垚鐜? value={`${stats.rate.toFixed(0)}%`} meta="鏈湡鏁撮珨閫插害" tone="emerald" progress={stats.rate} /></div><div className="chart-grid"><Glass className="chart-panel"><div className="section-title"><div><p className="eyebrow">SPENDING MIX</p><h2>娑堣不鍒嗛</h2></div><span className="chart-note">鏈湡鏀嚭浣旀瘮</span></div>{pieData.length ? <div className="donut-wrap"><ResponsiveContainer width="55%" height={230}><PieChart><Pie data={pieData} dataKey="value" innerRadius={68} outerRadius={94} paddingAngle={3}>{pieData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><div className="legend-list">{pieData.slice(0, 6).map((item) => <div key={item.name}><i style={{ background: item.color }} />{item.name}<b>{money(item.value)}</b></div>)}</div></div> : <Empty>鏂板绨借超寰岋紝閫欒！鏈冮’绀烘秷璨荤祼妲?/Empty>}</Glass><Glass className="chart-panel"><div className="section-title"><div><p className="eyebrow">CARD PERFORMANCE</p><h2>淇＄敤鍗′娇鐢ㄦ瑕?/h2></div><span className="chart-note"><i className="legend-dot cyan-dot" />绨借超 <i className="legend-dot indigo-dot" />鎳夐倓</span></div>{barData.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} /><YAxis stroke="#64748b" tick={{ fontSize: 10 }} /><Tooltip content={<ChartTooltip />} /><Legend /><Bar dataKey="spent" name="绨借超椤? fill="#22d3ee" radius={[4, 4, 0, 0]} /><Bar dataKey="due" name="鎳夐倓閲戦" fill="#818cf8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty>鏂板淇＄敤鍗″緦锛岄€欒！鏈冮’绀烘瘮杓?/Empty>}</Glass></div></>; }
function Kpi({ icon: Icon, label, value, meta, tone, progress }) { return <Glass className={`kpi ${tone}`}><div className="kpi-top"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{meta}</small>{progress !== undefined && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}</Glass>; }
function ChartTooltip({ active, payload }) { return active && payload?.length ? <div className="chart-tooltip"><span>{payload[0].name}</span><b>{money(payload[0].value)}</b></div> : null; }

function CardsView({ cards, openNew, edit, toggle, remove }) { return <div className="view-stack"><div className="view-toolbar"><div><p className="eyebrow">YOUR WALLET</p><h2>淇＄敤鍗＄鐞?<span className="count">{cards.length}</span></h2></div><Button variant="primary" onClick={openNew}><Plus size={16} />鏂板淇＄敤鍗?/Button></div><div className="card-grid">{cards.map((card) => <CreditCardTile key={card.id} card={card} edit={edit} toggle={toggle} remove={remove} />)}</div>{!cards.length && <Glass><Empty icon={CreditCard}>閭勬矑鏈変俊鐢ㄥ崱锛屾柊澧炵涓€寮靛崱闁嬪杩借工銆?/Empty></Glass>}</div>; }
function CreditCardTile({ card, edit, toggle, remove }) { const style = BANK_STYLES[card.bank] || BANK_STYLES.鍏朵粬閵€琛? return <div className="credit-card" style={{ '--card-a': style[0], '--card-b': style[1], '--card-accent': style[2] }}><div className="card-shine" /><div className="card-top"><span>{card.bank}</span><Landmark size={20} /></div><MetallicChip /><p className="card-number">鈥⑩€⑩€⑩€?&nbsp;鈥⑩€⑩€⑩€?&nbsp;鈥⑩€⑩€⑩€?&nbsp;{String(card.id).slice(-4)}</p><div className="card-bottom"><div><small>CARD HOLDER</small><strong>{card.name}</strong></div><div className="card-due"><small>鎳夐倓閲戦</small><strong>{money(card.amount)}</strong></div></div><div className="card-actions"><span className={card.isPaid ? 'paid' : ''}>{card.isPaid ? <><CheckCircle2 size={13} />宸茬祼娓?/> : <><AlertCircle size={13} />寰呴倓娆?/>}</span><div><button title="绶ㄨ集" onClick={() => edit(card)}><Edit3 size={14} /></button><button title="鍒囨彌閭勬鐙€鎱? onClick={() => toggle(card)}><Check size={14} /></button><button title="鍒櫎" onClick={() => remove(card.id)}><Trash2 size={14} /></button></div></div></div>; }
function CardModal({ card, onClose, onSave }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">CARD SETUP</p><h2>{card ? '绶ㄨ集淇＄敤鍗? : '鏂板淇＄敤鍗?}</h2></div><button onClick={onClose}><X size={18} /></button></div><form onSubmit={onSave}><Field label="鐧煎崱閵€琛?><select name="bank" defaultValue={card?.bank || BANKS[0]}>{BANKS.map((bank) => <option key={bank}>{bank}</option>)}</select></Field><Field label="鍗＄墖鍚嶇ū"><input name="name" defaultValue={card?.name || ''} placeholder="渚嬪锛氭棩甯告秷璨诲崱" required /></Field><div className="form-row"><Field label="閭勬鏃ユ湡"><input name="dueDate" type="date" defaultValue={card?.dueDate || today()} required /></Field><Field label="鏈湡鎳夐倓閲戦"><input name="amount" type="number" min="0" step="0.01" defaultValue={card?.amount || ''} placeholder="0" required /></Field></div><Button variant="primary" className="submit-button"><Check size={16} />鍎插瓨淇＄敤鍗?/Button></form></div></div>; }

function TransactionsView({ cards, transactions, query, setQuery, cardFilter, setCardFilter, categoryFilter, setCategoryFilter, add, remove, updateCategory }) { return <div className="view-stack"><div className="view-toolbar"><div><p className="eyebrow">CASHFLOW LEDGER</p><h2>绨借超鏄庣窗 <span className="count">{transactions.length}</span></h2></div><div className="import-hint"><FileSpreadsheet size={16} />鏀彺 .xlsx / .xls</div></div><div className="transaction-layout"><Glass><form className="tx-form" onSubmit={add}><h3><Plus size={16} />鏂板鍠瓎绨借超</h3><Field label="瑾槑"><input name="description" placeholder="渚嬪锛氶€辨湯鏅氶" required /></Field><div className="form-row"><Field label="閲戦"><input name="amount" type="number" min="0" step="0.01" placeholder="0" required /></Field><Field label="鏃ユ湡"><input name="date" type="date" defaultValue={today()} /></Field></div><Field label="淇＄敤鍗?><select name="cardId"><option value="">鏈寚瀹氬崱鐗?/option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></Field><Field label="娑堣不鍒嗛"><select name="category" defaultValue="椁愰２">{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></Field><Button variant="primary" className="submit-button"><Plus size={16} />鍔犲叆绨借超</Button></form></Glass><Glass className="ledger"><div className="filters"><div className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="鎼滃皨瑾槑鎴栧崱鐗?.." /></div><select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)}><option value="all">鎵€鏈変俊鐢ㄥ崱</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">鎵€鏈夊垎椤?/option>{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><Filter size={16} className="filter-icon" /></div><div className="table-wrap"><table><thead><tr><th>鏃ユ湡</th><th>瑾槑</th><th>鍗＄墖</th><th>鍒嗛</th><th className="align-right">閲戦</th><th /></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id}><td className="muted">{tx.date?.slice(0, 10)}</td><td><strong>{tx.description}</strong></td><td className="muted">{cards.find((card) => card.id === tx.cardId)?.name || '鏈寚瀹?}</td><td><select className="category-select" value={tx.category} onChange={(event) => updateCategory(tx.id, event.target.value)}>{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></td><td className="align-right amount">-{money(tx.amount)}</td><td><button className="icon-button" onClick={() => remove(tx.id)} title="鍒櫎"><Trash2 size={14} /></button></td></tr>)}</tbody></table>{!transactions.length && <Empty icon={Search}>娌掓湁绗﹀悎姊濅欢鐨勭敖璩磤閷?/Empty>}</div></Glass></div></div>; }

function AiView({ cards, transactions }) { const [messages, setMessages] = useState([{ from: 'ai', text: '浣犲ソ锛屾垜鏄?FinPulse AI銆備綘鍙互鍟忔垜鏈湀鐨勬秷璨荤祼妲嬫垨閭勬璨犳摂銆? }]); const [input, setInput] = useState(''); const total = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0); const pending = cards.filter((card) => !card.isPaid); const answer = (question) => { const categoryTotals = CATEGORIES.map((category) => [category, transactions.filter((tx) => tx.category === category).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)]).sort((a, b) => b[1] - a[1]); if (question.includes('鏈€澶?) || question.includes('娑堣不')) return `鏈湀鏀嚭鏈€楂樼殑鍒嗛鏄€?{categoryTotals[0]?.[0] || '灏氱劇璩囨枡'}銆嶏紝鍚堣▓ ${money(categoryTotals[0]?.[1])}銆傜洰鍓嶆墍鏈夌敖璩叡 ${money(total)}銆俙; if (question.includes('閭勬') || question.includes('璨犳摂')) return `鐩墠鏈?${pending.length} 寮靛崱鐗囧緟閭勬锛岀附椤?${money(pending.reduce((sum, card) => sum + Number(card.amount || 0), 0))}銆傚缓璀板劒鍏堣檿鐞嗘渶杩戝埌鏈熺殑鍗＄墖銆俙; return `鎴戝凡鍒嗘瀽 ${transactions.length} 绛嗙敖璩垏 ${cards.length} 寮典俊鐢ㄥ崱銆備綘鍙互鍟忋€屾湰鏈堝摢闋呮秷璨绘敮鍑烘渶澶氾紵銆嶆垨銆屾垜鐩墠鐨勯倓娆捐矤鎿斿浣曪紵銆峘; }; const ask = (question) => { if (!question.trim()) return; setMessages((current) => [...current, { from: 'user', text: question }, { from: 'ai', text: answer(question) }]); setInput(''); }; return <div className="ai-layout"><Glass className="ai-main"><div className="ai-head"><div className="ai-avatar"><Bot size={20} /></div><div><p className="eyebrow">FINPULSE INTELLIGENCE</p><h2>AI 鐞嗚病灏忓公鎵?/h2></div><span className="online"><i />ONLINE</span></div><div className="messages">{messages.map((message, index) => <div className={`message ${message.from}`} key={`${message.from}-${index}`}><span>{message.from === 'ai' ? <Bot size={14} /> : '浣?}</span><p>{message.text}</p></div>)}</div><div className="quick-asks">{['鏈湀鍝爡娑堣不鏀嚭鏈€澶氾紵', '鎴戠洰鍓嶇殑閭勬璨犳摂濡備綍锛?].map((question) => <button key={question} onClick={() => ask(question)}>{question}<ChevronRight size={14} /></button>)}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(input); }}><MessageCircle size={17} /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="鍟忓晱浣犵殑璨″嫏鐙€娉?.." /><button><ArrowUpRight size={17} /></button></form></Glass><Glass className="ai-side"><p className="eyebrow">DATA CONTEXT</p><h3>鍒嗘瀽涓殑璩囨枡</h3><div className="context-item"><FileSpreadsheet size={16} /><span>绨借超绱€閷?strong>{transactions.length} 绛?/strong></span></div><div className="context-item"><CreditCard size={16} /><span>淇＄敤鍗?strong>{cards.length} 寮?/strong></span></div><div className="context-item"><Wallet size={16} /><span>鏈湀鏀嚭<strong>{money(total)}</strong></span></div><p className="ai-disclaimer">AI 鍥炴噳鏍规摎鐩墠 Dashboard 璩囨枡鍗虫檪鐢㈢敓銆?/p></Glass></div>; }

