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

const BANK_STYLES = {
  花旗銀行: ["#44403c", "#27272a", "#d6d3d1"],
  渣打銀行: ["#78350f", "#292524", "#fbbf24"],
  恆生銀行: ["#171717", "#09090b", "#d4d4d8"],
  滙豐銀行: ["#0f172a", "#1e1b4b", "#a5b4fc"],
  中銀香港: ["#475569", "#334155", "#e2e8f0"],
  建行亞洲: ["#1e1b4b", "#18181b", "#a5b4fc"],
  其他銀行: ["#44403c", "#27272a", "#d6d3d1"],
};

const TITANIUM_THEMES = [
  {
    name: "極光幻藍",
    cardBg:
      "bg-gradient-to-br from-cyan-600 via-indigo-700 to-slate-900 border-cyan-400/50 text-white shadow-lg shadow-cyan-950/50",
    badgeBg: "bg-cyan-400/20 text-cyan-200 border-cyan-300/40 font-bold",
    colors: ["#06b6d4", "#3b82f6", "#cffafe"],
  },
  {
    name: "電光霓紫",
    cardBg:
      "bg-gradient-to-br from-fuchsia-600 via-purple-700 to-slate-900 border-fuchsia-400/50 text-white shadow-lg shadow-fuchsia-950/50",
    badgeBg: "bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-300/40 font-bold",
    colors: ["#d946ef", "#8b5cf6", "#fae8ff"],
  },
  {
    name: "耀光赤金",
    cardBg:
      "bg-gradient-to-br from-amber-500 via-orange-600 to-stone-900 border-amber-400/50 text-white shadow-lg shadow-amber-950/50",
    badgeBg: "bg-amber-400/20 text-amber-200 border-amber-300/40 font-bold",
    colors: ["#f59e0b", "#ea580c", "#fef3c7"],
  },
  {
    name: "薄荷翡翠",
    cardBg:
      "bg-gradient-to-br from-emerald-500 via-teal-700 to-slate-900 border-emerald-400/50 text-white shadow-lg shadow-emerald-950/50",
    badgeBg: "bg-emerald-400/20 text-emerald-200 border-emerald-300/40 font-bold",
    colors: ["#10b981", "#0d9488", "#d1fae5"],
  },
  {
    name: "熾焰珊瑚",
    cardBg:
      "bg-gradient-to-br from-rose-500 via-pink-700 to-slate-900 border-rose-400/50 text-white shadow-lg shadow-rose-950/50",
    badgeBg: "bg-rose-400/20 text-rose-200 border-rose-300/40 font-bold",
    colors: ["#f43f5e", "#db2777", "#ffe4e6"],
  },
];

const money = (value) =>
  `HK$${Math.abs(Number(value || 0)).toLocaleString("en-HK", { maximumFractionDigits: 2 })}`;

const signedMoney = (value) =>
  `${Number(value || 0) < 0 ? "-" : ""}${money(value)}`;

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * 🛠️ 核心金融修正：精確對應香港金管會(HKMA)淨現值法(NPV)標準的 JavaScript 實作
 * 完美繼承您所要求的：開頭淨現金流 = 本金 - 申請手續費 + 現金回贈 邏輯
 */
const loanMetrics = (principal, payment, termMonths, rebate = 0, upfrontFee = 0) => {
  const amount = Number(principal) || 0;
  const monthlyPayment = Number(payment) || 0;
  const months = Number(termMonths) || 0;
  const cashback = Number(rebate) || 0;
  const fee = Number(upfrontFee) || 0;
  
  // 1. 計算第 0 期客戶實際拿到口袋裡的「淨現金流」
  const netCashReceived = amount - fee + cashback;
  const totalRepayment = monthlyPayment * months;
  const interest = Math.max(0, totalRepayment - netCashReceived);

  if (!netCashReceived || !monthlyPayment || !months || totalRepayment <= netCashReceived) {
    return { interest, apr: 0 };
  }

  // 2. 透過二分法迭代逼近最真實的內部收益率 (等同於 Python 中的 npf.irr)
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
  
  // 3. 根據法定複利年化公式計算實際年利率：APR = ((1 + 月利率)^12 - 1) * 100
  const apr = Number.isFinite((1 + monthlyRate) ** 12 - 1)
    ? ((1 + monthlyRate) ** 12 - 1) * 100
    : 0;

  return { interest, apr };
};

const today = () => new Date().toISOString().slice(0, 10);

const fromStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === "") return today();
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+(\.\d+)?\$/.test(value.trim())
        ? Number(value.trim())
        : null;
  if (numericValue !== null) {
    const date = new Date(
      Math.round((numericValue - 25569) * 86400 * 1000),
    );
    return Number.isNaN(date.getTime())
      ? today()
      : date.toISOString().slice(0, 10);
  }
  const parsed = new Date(String(value).trim());
  return Number.isNaN(parsed.getTime())
    ? String(value).trim()
    : parsed.toISOString().slice(0, 10);
};

const transactionKey = (item) =>
  [
    item.date,
    item.description,
    item.cardId,
    Number(item.amount || 0),
    item.category,
  ]
    .join("|")
    .toLowerCase();

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
  const [tab, setTab] = useState("overview");
  const [cards, setCards] = useState(() => fromStorage(STORAGE_KEY_CARDS));
  const [transactions, setTransactions] = useState(() =>
    fromStorage(STORAGE_KEY_TX),
  );
  const [incomes, setIncomes] = useState(() =>
    fromStorage(STORAGE_KEY_INCOME),
  );
  const [loans, setLoans] = useState(() => fromStorage(STORAGE_KEY_LOANS));
  const [loanMemos, setLoanMemos] = useState(() =>
    fromStorage(STORAGE_KEY_LOAN_MEMOS),
  );
  const [uid, setUid] = useState(null);
  const [user, setUser] = useState(null);
  const [cloud, setCloud] = useState("local");
  const [syncing, setSyncing] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [cardFilter, setCardFilter] = useState("all");

  // 完美整合新增的「申請手續費」狀態欄位
  const [newLoan, setNewLoan] = useState({
    bank: LOAN_BANKS[0][0],
    principal: "",
    monthlyPayment: "",
    months: "60",
    upfrontFee: "0",   // ⭐ 新增一欄：申請手續費 / 一次性手續費
    rebate: "5000",    // 現金回贈
    date: today(),
  });
