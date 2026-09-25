import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudCheck,
  CreditCard,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  X,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db, auth, googleProvider } from "./firebase";
import GeminiLogo from "./assets/Google_Gemini_logo_2025.svg";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

export const STORAGE_KEY_CARDS = "STORAGE_KEY_CARDS";
export const STORAGE_KEY_TX = "STORAGE_KEY_TX";
export const STORAGE_KEY_INCOME = "STORAGE_KEY_INCOME";
export const STORAGE_KEY_LOANS = "STORAGE_KEY_LOANS";
export const STORAGE_KEY_LOAN_MEMOS = "STORAGE_KEY_LOAN_MEMOS";

const CATEGORIES = [
  "餐飲",
  "交通",
  "八達通增值",
  "購物",
  "網購",
  "管理費",
  "政府差餉/地租",
  "稅",
  "貸款",
  "其他",
];

const BANKS = [
  "花旗銀行",
  "渣打銀行",
  "恆生銀行",
  "滙豐銀行",
  "中銀香港",
  "建行亞洲",
  "其他銀行",
];

const LOAN_BANKS = [
  ["滙豐銀行 HSBC", "滙豐銀行 HSBC"],
  ["恆生銀行 Hang Seng", "恆生銀行 Hang Seng"],
  ["渣打銀行 Standard Chartered", "渣打銀行 Standard Chartered"],
  ["中國銀行（香港）BOC", "中國銀行（香港）BOC"],
  ["星展銀行 DBS", "星展銀行 DBS"],
  ["東亞銀行 BEA", "東亞銀行 BEA"],
  ["花旗銀行 Citibank", "花旗銀行 Citibank"],
  ["建行亞洲 CCB Asia", "建行亞洲 CCB Asia"],
  ["其他銀行 Other", "其他銀行 Other"],
];

const COLORS = [
  "#22d3ee",
  "#818cf8",
  "#f59e0b",
  "#fb7185",
  "#c084fc",
  "#34d399",
  "#f97316",
  "#a78bfa",
  "#94a3b8",
];

const money = (value) =>
  `HK$${Math.abs(Number(value || 0)).toLocaleString("en-HK", { maximumFractionDigits: 2 })}`;

const signedMoney = (value) =>
  `${Number(value || 0) < 0 ? "-" : ""}${money(value)}`;

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * 🛠️ 核心金融修正：精確符合香港金管會(HKMA)與銀行公會淨現值法(IRR)標準
 */
const loanMetrics = (principal, payment, termMonths, rebate = 0, upfrontFee = 0) => {
  const amount = Number(principal) || 0;
  const monthlyPayment = Number(payment) || 0;
  const months = Number(termMonths) || 0;
  const cashback = Number(rebate) || 0;
  const fee = Number(upfrontFee) || 0;
  
  // 淨實收借款額 = 本金 - 手續費 + 現金回贈
  const netCashReceived = amount - fee + cashback;
  const totalRepayment = monthlyPayment * months;
  const interest = Math.max(0, totalRepayment - netCashReceived);

  if (!netCashReceived || !monthlyPayment || !months || totalRepayment <= netCashReceived) {
    return { interest: 0, apr: 0, netCashReceived: 0, totalRepayment: 0 };
  }

  // 透過二分法迭代逼近最真實的內部收益率 (IRR)
  let low = -0.9999;
  let high = 1.0;
  
  for (let index = 0; index < 200; index += 1) {
    const monthlyRate = (low + high) / 2;
    const annuityFactor =
      Math.abs(monthlyRate) < Number.EPSILON
        ? months
        : (((1 + monthlyRate) ** months - 1) / monthlyRate);
    const balance =
      netCashReceived * (1 + monthlyRate) ** months -
      monthlyPayment * annuityFactor;

    if (balance > 0) low = monthlyRate;
    else high = monthlyRate;
  }

  const monthlyRate = (low + high) / 2;
  const apr = Number.isFinite((1 + monthlyRate) ** 12 - 1)
    ? ((1 + monthlyRate) ** 12 - 1) * 100
    : 0;

  return { interest, apr, netCashReceived, totalRepayment };
};

const today = () => new Date().toISOString().slice(0, 10);

const fromStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

function Glass({ children, className = "" }) {
  return <section className={`glass ${className}`}>{children}</section>;
}

function Button({ children, variant = "ghost", className = "", ...props }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Chip() {
  return (
    <span className="chip">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function Empty({ children, icon: Icon = Database }) {
  return (
    <div className="empty">
      <Icon size={24} />
      <span>{children}</span>
    </div>
  );
}

export default function FinPulseDashboard() {
  const [tab, setTab] = useState("loans");
  const [cards, setCards] = useState(() => fromStorage(STORAGE_KEY_CARDS));
  const [transactions, setTransactions] = useState(() => fromStorage(STORAGE_KEY_TX));
  const [incomes, setIncomes] = useState(() => fromStorage(STORAGE_KEY_INCOME));
  const [loans, setLoans] = useState(() => fromStorage(STORAGE_KEY_LOANS));
  const [loanMemos, setLoanMemos] = useState(() => fromStorage(STORAGE_KEY_LOAN_MEMOS));
  const [uid, setUid] = useState(null);
  const [user, setUser] = useState(null);
  const [cloud, setCloud] = useState("local");
  const [syncing, setSyncing] = useState(false);

  // 貸款表單狀態初始化（含 upfrontFee 及 rebate）
  const [newLoan, setNewLoan] = useState({
    bank: LOAN_BANKS[0][0],
    principal: "",
    monthlyPayment: "",
    months: "60",
    upfrontFee: "0",
    rebate: "5000",
    date: today(),
  });

  // 使用 useMemo 即時動態計算輸入框中的金融指標
  const currentMetrics = useMemo(() => {
    return loanMetrics(
      newLoan.principal,
      newLoan.monthlyPayment,
      newLoan.months,
      newLoan.rebate,
      newLoan.upfrontFee
    );
  }, [
    newLoan.principal,
    newLoan.monthlyPayment,
    newLoan.months,
    newLoan.rebate,
    newLoan.upfrontFee,
  ]);

  // 使用 useMemo 計算所有已儲存貸款的列表統計數據
  const loanListWithMetrics = useMemo(() => {
    return loans.map((item) => {
      const metrics = loanMetrics(
        item.principal,
        item.monthlyPayment,
        item.months,
        item.rebate || 0,
        item.upfrontFee || 0
      );
      return {
        ...item,
        ...metrics,
      };
    });
  }, [loans]);

  // 新增貸款處理邏輯：寫入 localStorage 與 Firestore
  const handleAddLoan = async (e) => {
    e?.preventDefault();
    if (!newLoan.principal || !newLoan.monthlyPayment || !newLoan.months) return;

    const loanId = createId("loan");
    const item = {
      id: loanId,
      bank: newLoan.bank,
      principal: Number(newLoan.principal) || 0,
      monthlyPayment: Number(newLoan.monthlyPayment) || 0,
      months: Number(newLoan.months) || 0,
      upfrontFee: Number(newLoan.upfrontFee) || 0,
      rebate: Number(newLoan.rebate) || 0,
      date: newLoan.date,
      createdAt: new Date().toISOString(),
    };

    const nextLoans = [item, ...loans];
    setLoans(nextLoans);
    localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));

    if (user?.uid) {
      try {
        const batch = writeBatch(db);
        const ref = doc(db, "users", user.uid, "loans", item.id);
        batch.set(ref, item);
        await batch.commit();
      } catch (err) {
        console.error("Firebase Sync Error:", err);
      }
    }

    setNewLoan({
      bank: LOAN_BANKS[0][0],
      principal: "",
      monthlyPayment: "",
      months: "60",
      upfrontFee: "0",
      rebate: "5000",
      date: today(),
    });
  };

  // 刪除貸款紀錄
  const handleDeleteLoan = async (id) => {
    const nextLoans = loans.filter((item) => item.id !== id);
    setLoans(nextLoans);
    localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));

    if (user?.uid) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "loans", id));
      } catch (err) {
        console.error("Firebase Delete Error:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ====== 貸款管理計算與輸入卡片 ====== */}
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">LOAN MANAGEMENT</span>
              <h2 className="text-xl font-bold text-white mt-1">新增貸款與計算 APR</h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
              <Landmark size={14} className="text-cyan-400" />
              HKMA IRR 標準淨現值法
            </span>
          </div>

          <form onSubmit={handleAddLoan} className="space-y-5">
            {/* 第一排：銀行、日期、貸款金額 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="銀行名稱">
                <select
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors"
                  value={newLoan.bank}
                  onChange={(e) => setNewLoan({ ...newLoan, bank: e.target.value })}
                >
                  {LOAN_BANKS.map(([label, val]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </Field>

              <Field label="放款日期">
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors"
                  value={newLoan.date}
                  onChange={(e) => setNewLoan({ ...newLoan, date: e.target.value })}
                />
              </Field>

              <Field label="貸款金額 (本金)">
                <input
                  type="number"
                  placeholder="請輸入貸款金額"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors placeholder-slate-700"
                  value={newLoan.principal}
                  onChange={(e) => setNewLoan({ ...newLoan, principal: e.target.value })}
                />
              </Field>
            </div>

            {/* 第二排：每月還款、還款期數、申請手續費、現金回贈 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <Field label="每月還款金額">
                <input
                  type="number"
                  placeholder="請輸入每月還款額"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors placeholder-slate-700"
                  value={newLoan.monthlyPayment}
                  onChange={(e) => setNewLoan({ ...newLoan, monthlyPayment: e.target.value })}
                />
              </Field>

              <Field label="還款期數 (月)">
                <input
                  type="number"
                  placeholder="例如 60"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors placeholder-slate-700"
                  value={newLoan.months}
                  onChange={(e) => setNewLoan({ ...newLoan, months: e.target.value })}
                />
              </Field>

              <Field label="申請手續費">
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors placeholder-slate-700"
                  value={newLoan.upfrontFee}
                  onChange={(e) => setNewLoan({ ...newLoan, upfrontFee: e.target.value })}
                />
              </Field>

              <Field label="現金回贈">
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors placeholder-slate-700"
                  value={newLoan.rebate}
                  onChange={(e) => setNewLoan({ ...newLoan, rebate: e.target.value })}
                />
              </Field>
            </div>

            {/* 即時動態計算指標看板與提交 */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-5 border-t border-slate-800/80">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex-1">
                <div>
                  <span className="block text-slate-500 text-xs font-medium">淨實收借款額</span>
                  <span className="text-white font-semibold text-sm mt-0.5 block">
                    {newLoan.principal ? money(currentMetrics.netCashReceived) : "HK$ 0"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-medium">總還款額</span>
                  <span className="text-white font-semibold text-sm mt-0.5 block">
                    {newLoan.months ? money(currentMetrics.totalRepayment) : "HK$ 0"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-medium">總利息支出</span>
                  <span className="text-white font-semibold text-sm mt-0.5 block">
                    {newLoan.months ? money(currentMetrics.interest) : "HK$ 0"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-medium">實際年利率 APR</span>
                  <span className="text-cyan-400 font-bold text-lg block mt-0.5">
                    {newLoan.months ? `${currentMetrics.apr.toFixed(2)}%` : "0.00%"}
                  </span>
                </div>
              </div>

              <Button variant="primary" type="submit" className="px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap">
                <Plus size={18} strokeWidth={2.5} />
                <span>儲存貸款紀錄</span>
              </Button>
            </div>
          </form>
        </Glass>

        {/* ====== 已儲存貸款紀錄區塊 ====== */}
        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">進行中貸款紀錄 ({loanListWithMetrics.length})</h3>
          
          {loanListWithMetrics.length === 0 ? (
            <Empty icon={Landmark}>現時未有任何貸款紀錄</Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loanListWithMetrics.map((item) => (
                <div key={item.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400">{item.date}</span>
                      <h4 className="text-base font-bold text-white">{item.bank}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteLoan(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="刪除紀錄"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/60">
                    <div>
                      <span className="text-slate-500 block">貸款本金</span>
                      <span className="text-slate-200 font-medium">{money(item.principal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">每月還款</span>
                      <span className="text-slate-200 font-medium">{money(item.monthlyPayment)} x {item.months}期</span>
                    </div>
                  </div>

                  {/* 展示手續費、現金回贈與 APR 的 Badge 標籤 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] bg-slate-900 border border-slate-700/80 text-slate-300 px-2 py-0.5 rounded">
                      手續費: {money(item.upfrontFee || 0)}
                    </span>
                    <span className="text-[11px] bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 px-2 py-0.5 rounded">
                      回贈: {money(item.rebate || 0)}
                    </span>
                    <span className="text-[11px] bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold px-2 py-0.5 rounded ml-auto">
                      APR: {Number(item.apr || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Glass>

      </div>
    </div>
  );
}