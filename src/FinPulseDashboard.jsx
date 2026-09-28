import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Archive,
  CalendarDays,
  ChartPie as PieIcon,
  Cloud,
  CloudCheck,
  CreditCard,
  Database,
  FileText,
  Landmark,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Trash2,
  Zap,
  Wallet,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth, googleProvider } from "./firebase";
import {
onAuthStateChanged,
signInWithPopup,
signOut,
} from "firebase/auth";

export const STORAGE_KEY_CARDS = "STORAGE_KEY_CARDS";
export const STORAGE_KEY_TX = "STORAGE_KEY_TX";
export const STORAGE_KEY_INCOME = "STORAGE_KEY_INCOME";
export const STORAGE_KEY_LOANS = "STORAGE_KEY_LOANS";
export const STORAGE_KEY_LOAN_MEMOS = "STORAGE_KEY_LOAN_MEMOS";
export const STORAGE_KEY_HISTORICAL_DATA = "finpulse_historical";

const CATEGORIES = [
"餐飲",
"交通",
"內地消費",
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

const CARD_NAMES = [
"銀聯雙幣卡",
"Mastercard",
"World Mastercard",
"CX 卡",
"A Point卡",
"Enjoy卡",
"AIA 萬事達卡",
"八達通 VISA卡",
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
"#34d399",
"#f59e0b",
"#fb7185",
"#38bdf8",
"#a3e635",
"#f97316",
"#60a5fa",
"#94a3b8",
];

const TITANIUM_THEMES = [
{
name: "森林綠",
cardBg:
"bg-gradient-to-br from-emerald-700 via-green-900 to-green-950 border-lime-200/60 text-white shadow-lg shadow-emerald-950/40 backdrop-blur-xl",
},
{
name: "向日葵金",
cardBg:
"bg-gradient-to-br from-yellow-600 via-amber-800 to-orange-950 border-yellow-100/70 text-white shadow-lg shadow-amber-950/40 backdrop-blur-xl",
},
{
name: "海洋藍",
cardBg:
"bg-gradient-to-br from-sky-700 via-blue-900 to-blue-950 border-cyan-200/60 text-white shadow-lg shadow-blue-950/40 backdrop-blur-xl",
},
{
name: "赤陶橘",
cardBg:
"bg-gradient-to-br from-orange-600 via-red-800 to-red-950 border-orange-100/70 text-white shadow-lg shadow-red-950/40 backdrop-blur-xl",
},
{
name: "珊瑚粉",
cardBg:
"bg-gradient-to-br from-pink-600 via-rose-800 to-rose-950 border-pink-100/70 text-white shadow-lg shadow-rose-950/40 backdrop-blur-xl",
},
{
name: "翡翠青",
cardBg:
"bg-gradient-to-br from-teal-600 via-teal-900 to-cyan-950 border-teal-100/70 text-white shadow-lg shadow-teal-950/40 backdrop-blur-xl",
},
{
name: "紫晶紫",
cardBg:
"bg-gradient-to-br from-violet-700 via-purple-900 to-purple-950 border-violet-100/70 text-white shadow-lg shadow-purple-950/40 backdrop-blur-xl",
},
{
name: "大地棕",
cardBg:
"bg-gradient-to-br from-stone-600 via-amber-950 to-neutral-950 border-amber-100/70 text-white shadow-lg shadow-stone-950/40 backdrop-blur-xl",
},
];

const money = (value) =>
  `HK$${Math.abs(Number(value || 0)).toLocaleString("en-HK", {
    maximumFractionDigits: 2,
  })}`;

const formatAPR = (value) => {
  const apr = Number(value);
  return Number.isFinite(apr) && apr >= 0 ? `${apr.toFixed(2)}%` : "0.00%";
};

const parseLoanInput = (value, integer = false) => {
  const parsed = integer ? Number.parseInt(value, 10) : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/*
 * 核心金融計算：香港金管局 (HKMA) 淨現值 (IRR) 實際年利率 (APR) 計算
 */
const loanMetrics = (
  principal,
  payment,
  termMonths,
  rebate = 0,
  upfrontFee = 0
) => {
  const toFiniteAmount = (value) => {
    const number = Math.abs(Number(value));
    return Number.isFinite(number) ? number : 0;
  };
  const amount = toFiniteAmount(principal);
  const monthlyPayment = toFiniteAmount(payment);
  const months = toFiniteAmount(termMonths);
  const cashback = toFiniteAmount(rebate);
  const fee = toFiniteAmount(upfrontFee);

  // 第 0 期淨現金流入；後續每期支付 monthlyPayment
  const netCashReceived = amount - fee + cashback;
  const totalRepayment = monthlyPayment * months;
  const interest = Math.max(0, totalRepayment + fee - cashback - amount);
  const simpleApr =
    amount > 0 && months > 0
      ? (interest / amount) * (12 / months) * 100
      : 0;
  const fallbackApr = Number.isFinite(simpleApr) && simpleApr >= 0 ? simpleApr : 0;

  if (
    !netCashReceived ||
    !monthlyPayment ||
    !months ||
    !Number.isFinite(netCashReceived) ||
    !Number.isFinite(totalRepayment) ||
    totalRepayment <= netCashReceived
  ) {
    return { interest, apr: 0, netCashReceived, totalRepayment };
  }

  const getNpv = (monthlyRate) => {
    let discountedPayments = 0;
    let discountFactor = 1;
    for (let period = 1; period <= months; period += 1) {
      discountFactor /= 1 + monthlyRate;
      discountedPayments += monthlyPayment * discountFactor;
    }
    return netCashReceived - discountedPayments;
  };

  let low = 0.0;
  let high = 1.0;
  while (getNpv(high) <= 0 && high < 1e24) {
    high *= 2;
  }

  if (getNpv(high) <= 0) {
    return { interest, apr: fallbackApr, netCashReceived, totalRepayment };
  }

  for (let iter = 0; iter < 120; iter++) {
    const monthlyRate = (low + high) / 2;
    if (getNpv(monthlyRate) > 0) {
      high = monthlyRate;
    } else {
      low = monthlyRate;
    }

    if (Math.abs(high - low) < 1e-12) break;
  }

  const finalMonthlyRate = (low + high) / 2;
  const calculatedApr = (Math.pow(1 + finalMonthlyRate, 12) - 1) * 100;
  const apr =
    Number.isFinite(calculatedApr) && calculatedApr >= 0
      ? calculatedApr
      : fallbackApr;

  return {
    interest,
    apr,
    netCashReceived,
    totalRepayment,
  };
};

const normalizeLoan = (loan) => {
  const record = loan && typeof loan === "object" ? loan : {};
  return {
    ...record,
    id:
      record.id === undefined || record.id === null || record.id === ""
        ? createId("loan")
        : record.id,
    apr: loanMetrics(
      record.principal,
      record.monthlyPayment,
      record.months,
      record.rebate,
      record.upfrontFee
    ).apr,
  };
};

const today = () => new Date().toISOString().slice(0, 10);

const formatMonthLabel = (dateValue) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "short",
  });
};

const getCardDaysRemaining = (dateValue) => {
  if (!dateValue) return null;
  const dueDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return null;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));
};

const fromStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

function Glass({ children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-slate-300/25 bg-gradient-to-br from-slate-600/45 via-slate-800/75 to-slate-950/90 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_rgba(0,0,0,0.38)] backdrop-blur-2xl transition-all duration-300 hover:border-cyan-300/50 ${className}`}
    >
      {children}
    </section>
  );
}

function Button({ children, variant = "ghost", className = "", ...props }) {
  const baseStyle =
    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer";
  const variants = {
    primary:
      "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]",
    secondary:
      "bg-gradient-to-b from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-slate-100 border border-slate-400/30 shadow-md shadow-black/20 hover:shadow-[0_0_20px_rgba(148,163,184,0.25)]",
    archive:
      "bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-emerald-950 font-bold border border-emerald-300/70 shadow-lg shadow-emerald-500/30 hover:shadow-[0_0_24px_rgba(52,211,153,0.55)]",
    export:
      "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600 hover:from-violet-400 hover:via-fuchsia-400 hover:to-purple-500 text-white font-bold border border-fuchsia-300/70 shadow-lg shadow-fuchsia-600/30 hover:shadow-[0_0_24px_rgba(217,70,239,0.55)]",
    import:
      "bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:via-sky-400 hover:to-blue-500 text-white font-bold border border-cyan-200/70 shadow-lg shadow-sky-500/30 hover:shadow-[0_0_24px_rgba(56,189,248,0.55)]",
    logout:
      "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold border border-rose-300/70 shadow-lg shadow-rose-600/30 hover:shadow-[0_0_24px_rgba(251,113,133,0.55)]",
    complete:
      "bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 cursor-default",
    danger:
      "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30",
    ghost:
      "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant] || variants.ghost} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-300">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Empty({ children, icon: Icon = Database }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center text-slate-400">
      <Icon size={24} className="text-slate-500" />
      <div>{children}</div>
    </div>
  );
}

export default function FinPulseDashboard({ onArchiveSuccess = () => {} }) {
const [tab, setTab] = useState("overview");
const [archiveComplete, setArchiveComplete] = useState(false);
const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
const [archiveMonth, setArchiveMonth] = useState("");
const [archiveMonthError, setArchiveMonthError] = useState("");
const [historicalData, setHistoricalData] = useState(() => {
  const storedHistory = fromStorage(STORAGE_KEY_HISTORICAL_DATA);
  return Array.isArray(storedHistory) ? storedHistory : [];
});
const [comparisonMode, setComparisonMode] = useState("month");
const [comparisonMonth, setComparisonMonth] = useState(() => {
  const currentDate = new Date();
  return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
});
const [cards, setCards] = useState(() =>
fromStorage(STORAGE_KEY_CARDS).map((card) => ({
  ...card,
  dueDate: card.dueDate || "",
  paymentAmount: Number(card.paymentAmount || 0),
  isPaid: Boolean(card.isPaid),
}))
);
const [transactions, setTransactions] = useState(() =>
fromStorage(STORAGE_KEY_TX)
);
const [incomes, setIncomes] = useState(() =>
fromStorage(STORAGE_KEY_INCOME)
);
const [loans, setLoans] = useState(() => {
  const storedLoans = fromStorage(STORAGE_KEY_LOANS);
  return Array.isArray(storedLoans) ? storedLoans.map(normalizeLoan) : [];
});
const loansRef = useRef(loans);
const commitLoans = (nextLoans) => {
  loansRef.current = nextLoans;
  setLoans(nextLoans);
  try {
    localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));
  } catch (error) {
    console.error("Failed to persist loan records:", error);
  }
};
const [loanMemos, setLoanMemos] = useState(() =>
fromStorage(STORAGE_KEY_LOAN_MEMOS)
);

const [user, setUser] = useState(null);
const [cloudStatus, setCloudStatus] = useState("local");

// 表單 State
const [newCard, setNewCard] = useState({
name: "",
bank: BANKS[0],
dueDate: today(),
paymentAmount: "",
});
const [newTx, setNewTx] = useState({
description: "",
amount: "",
category: CATEGORIES[0],
date: today(),
cardId: "",
});
const [newIncome, setNewIncome] = useState({
source: "",
amount: "",
date: today(),
});
const [newLoan, setNewLoan] = useState({
bank: LOAN_BANKS[0][0],
principal: "",
monthlyPayment: "",
months: "",
upfrontFee: "",
rebate: "",
date: today(),
});
const [newMemo, setNewMemo] = useState("");
const [editingTx, setEditingTx] = useState(null);
const [advisorPrompt, setAdvisorPrompt] = useState("");
const [advisorResponse, setAdvisorResponse] = useState("");
const [advisorStatus, setAdvisorStatus] = useState("idle");

// Firebase Auth 狀態變更監聽
useEffect(() => {
if (!auth) return;
const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
setUser(currentUser);
if (currentUser) {
setCloudStatus("synced");
} else {
setCloudStatus("local");
}
});
return () => unsubscribe();
}, []);

useEffect(() => {
  loansRef.current = loans;
  try {
    localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(loans));
  } catch (error) {
    console.error("Failed to persist loan records:", error);
  }
}, [loans]);

useEffect(() => {
  const syncLoansFromStorage = (event) => {
    if (event.key !== STORAGE_KEY_LOANS && event.key !== null) return;

    try {
      const storedLoans = event.newValue ? JSON.parse(event.newValue) : [];
      const nextLoans = Array.isArray(storedLoans)
        ? storedLoans.map(normalizeLoan)
        : [];
      loansRef.current = nextLoans;
      setLoans(nextLoans);
    } catch (error) {
      console.error("Failed to sync loan records from storage:", error);
      loansRef.current = [];
      setLoans([]);
    }
  };

  window.addEventListener("storage", syncLoansFromStorage);
  return () => window.removeEventListener("storage", syncLoansFromStorage);
}, []);

// 財務數據總結計算
const totalIncome = useMemo(
() => incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0),
[incomes]
);
const totalExpense = useMemo(
() =>
transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
[transactions]
);
const totalLoanPrincipal = useMemo(
() => loans.reduce((sum, item) => sum + Number(item.principal || 0), 0),
[loans]
);
const cardNameById = useMemo(
  () => new Map(cards.map((card) => [card.id, `${card.bank} ${card.name}`])),
  [cards]
);

// 當前貸款輸入項目之即時 APR 指標
const currentMetrics = useMemo(() => {
return loanMetrics(
parseLoanInput(newLoan.principal),
parseLoanInput(newLoan.monthlyPayment),
parseLoanInput(newLoan.months, true),
parseLoanInput(newLoan.rebate),
parseLoanInput(newLoan.upfrontFee)
);
}, [newLoan]);

// 已儲存貸款列表 APR 指標計算
const loanListWithMetrics = useMemo(() => {
return loans.map((item) => ({
...item,
...loanMetrics(
item.principal,
item.monthlyPayment,
item.months,
item.rebate || 0,
item.upfrontFee || 0
),
}));
}, [loans]);

// 圖表類別數據
const categoryPieData = useMemo(() => {
  const map = {};
  transactions.forEach((tx) => {
    map[tx.category] = (map[tx.category] || 0) + Number(tx.amount || 0);
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}, [transactions]);

const monthlyNetData = useMemo(() => {
  const monthMap = new Map();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, {
      month: date.toLocaleDateString("zh-HK", { year: "numeric", month: "short" }),
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  incomes.forEach((item) => {
    const rawDate = item.date || today();
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: date.toLocaleDateString("zh-HK", { year: "numeric", month: "short" }),
        income: 0,
        expense: 0,
        net: 0,
      });
    }
    monthMap.get(key).income += Number(item.amount || 0);
  });

  transactions.forEach((item) => {
    const rawDate = item.date || today();
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: date.toLocaleDateString("zh-HK", { year: "numeric", month: "short" }),
        income: 0,
        expense: 0,
        net: 0,
      });
    }
    monthMap.get(key).expense += Number(item.amount || 0);
  });

  return Array.from(monthMap.values()).map((entry) => ({
    ...entry,
    net: entry.income - entry.expense,
  }));
}, [incomes, transactions]);

const categoryBreakdownData = useMemo(() => {
  const map = {};
  transactions.forEach((tx) => {
    map[tx.category] = (map[tx.category] || 0) + Number(tx.amount || 0);
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}, [transactions]);

const loanPerformanceData = useMemo(
  () =>
    loanListWithMetrics.map((item) => ({
      bank: item.bank,
      principal: Number(item.principal || 0),
      apr: Number.isFinite(item.apr) && item.apr >= 0 ? item.apr : 0,
      month: Number(item.months || 0),
    })),
  [loanListWithMetrics]
);

const averageMonthlyIncome = useMemo(
  () => (incomes.length ? totalIncome / incomes.length : 0),
  [incomes.length, totalIncome]
);

const loanComparisonData = useMemo(() => {
  return loanListWithMetrics
    .map((item) => {
      const income = Number(averageMonthlyIncome) || 0;
      const monthlyPayment = Number(item.monthlyPayment || 0);
      const apr =
        typeof item.apr === "number" && Number.isFinite(item.apr) && item.apr >= 0
          ? item.apr
          : 0;
      const budgetShare = income > 0 ? (monthlyPayment / income) * 100 : 0;

      return {
        bank: item.bank,
        principal: Number(item.principal || 0),
        monthlyPayment,
        apr,
        totalRepayment: Number(item.totalRepayment || 0),
        totalInterest: Number(item.interest || 0),
        months: Number(item.months || 0),
        budgetShare:
          Number.isFinite(budgetShare) && budgetShare >= 0 ? budgetShare : 0,
      };
    })
    .sort((a, b) => (Number(b.apr) || 0) - (Number(a.apr) || 0));
}, [averageMonthlyIncome, loanListWithMetrics]);

const loanForecastSummary = useMemo(() => {
  const totalMonthlyPayment = loanListWithMetrics.reduce(
    (sum, item) => sum + Number(item.monthlyPayment || 0),
    0
  );
  const totalInterest = loanListWithMetrics.reduce(
    (sum, item) => sum + Number(item.interest || 0),
    0
  );
  const validLoans = loanComparisonData.filter(
    (item) => typeof item.apr === "number" && Number.isFinite(item.apr) && item.apr >= 0
  );
  const maxApr = validLoans.length > 0 ? Number(validLoans[0]?.apr || 0) : 0;
  const lowestApr =
    validLoans.length > 0
      ? Number(validLoans[validLoans.length - 1]?.apr || 0)
      : 0;
  const income = Number(averageMonthlyIncome) || 0;
  const debtToIncomeRatio =
    income > 0 ? (totalMonthlyPayment / income) * 100 : 0;

  return {
    totalMonthlyPayment,
    totalInterest,
    maxApr: Number.isFinite(maxApr) && maxApr >= 0 ? maxApr : 0,
    lowestApr: Number.isFinite(lowestApr) && lowestApr >= 0 ? lowestApr : 0,
    debtToIncomeRatio:
      Number.isFinite(debtToIncomeRatio) && debtToIncomeRatio >= 0
        ? debtToIncomeRatio
        : 0,
  };
}, [averageMonthlyIncome, loanComparisonData, loanListWithMetrics]);

const financialRisk = useMemo(() => {
  const hasFinancialData = totalIncome > 0 || totalExpense > 0 || loans.length > 0;
  const clamp = (value) => Math.min(100, Math.max(0, value));
  const cashFlowScore = totalIncome > 0
    ? clamp(50 + ((totalIncome - totalExpense) / totalIncome) * 100)
    : 0;
  const debtScore = averageMonthlyIncome > 0
    ? clamp(100 - loanForecastSummary.debtToIncomeRatio)
    : loanForecastSummary.totalMonthlyPayment > 0
      ? 0
      : 100;
  const score = hasFinancialData
    ? Math.round(cashFlowScore * 0.6 + debtScore * 0.4)
    : 50;
  const level = score >= 75
    ? {
        label: "健康",
        description: "資金充裕、防禦力高，處於安全狀態。",
        icon: ShieldCheck,
        theme: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      }
    : score >= 50
      ? {
          label: "中等",
          description: "需要注意流動性，有潛在風險。",
          icon: TriangleAlert,
          theme: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        }
      : score >= 25
        ? {
            label: "危險",
            description: "財務壓力大，資產開始出現警訊。",
            icon: Zap,
            theme: "text-orange-400 bg-orange-500/10 border-orange-500/30",
          }
        : {
            label: "高危",
            description: "極度危險，財務狀況隨時可能斷裂。",
            icon: Siren,
            theme: "text-rose-500 bg-rose-500/10 border-rose-500/30",
            pulse: true,
          };

  return { score, hasFinancialData, ...level };
}, [
  averageMonthlyIncome,
  loanForecastSummary.debtToIncomeRatio,
  loanForecastSummary.totalMonthlyPayment,
  loans.length,
  totalExpense,
  totalIncome,
]);

const comparisonPeriod = useMemo(() => {
  const [selectedYear, selectedMonthNumber] = comparisonMonth.split("-").map(Number);
  const previousMonthDate = new Date(selectedYear, selectedMonthNumber - 2, 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(
    previousMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;
  const selectedYearLabel = String(selectedYear);
  const previousYearLabel = String(selectedYear - 1);

  const archivesFor = (period) => historicalData.filter((entry) =>
    comparisonMode === "month"
      ? entry.yearMonth === period
      : entry.yearMonth?.startsWith(`${period}-`)
  );
  const summarize = (entries) => entries.reduce((totals, entry) => {
    const income = Number(
      entry.totalIncome ?? entry.summary?.totalIncome ??
      entry.incomes?.reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0
    );
    const expense = Number(
      entry.totalExpense ?? entry.summary?.totalExpense ??
      entry.transactions?.reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0
    );
    const netCashflow = Number(
      entry.netCashflow ?? entry.summary?.netCashflow ?? income - expense
    );
    return {
      income: totals.income + (Number.isFinite(income) ? income : 0),
      expense: totals.expense + (Number.isFinite(expense) ? expense : 0),
      netCashflow: totals.netCashflow + (Number.isFinite(netCashflow) ? netCashflow : 0),
    };
  }, { income: 0, expense: 0, netCashflow: 0 });

  const currentPeriod = comparisonMode === "month" ? comparisonMonth : selectedYearLabel;
  const previousPeriod = comparisonMode === "month" ? previousMonth : previousYearLabel;
  const currentArchives = archivesFor(currentPeriod);
  const previousArchives = archivesFor(previousPeriod);

  return {
    currentPeriod,
    previousPeriod,
    current: summarize(currentArchives),
    previous: summarize(previousArchives),
    hasCurrent: currentArchives.length > 0,
    hasPrevious: previousArchives.length > 0,
    chartData: [
      { metric: "總收入", previous: summarize(previousArchives).income, current: summarize(currentArchives).income },
      { metric: "總支出", previous: summarize(previousArchives).expense, current: summarize(currentArchives).expense },
      { metric: "淨現金流", previous: summarize(previousArchives).netCashflow, current: summarize(currentArchives).netCashflow },
    ],
  };
}, [comparisonMode, comparisonMonth, historicalData]);

const comparisonYears = useMemo(() => {
  const years = new Set(historicalData.map((entry) => entry.yearMonth?.slice(0, 4)).filter(Boolean));
  years.add(String(new Date().getFullYear()));
  years.add(comparisonMonth.slice(0, 4));
  years.add(String(Number(comparisonMonth.slice(0, 4)) - 1));
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}, [comparisonMonth, historicalData]);

const fileInputRef = useRef(null);

const exportCalendar = () => {
  const escapeICSText = (value) =>
    String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  const calendarDate = (date) => date.replaceAll("-", "");
  const events = cards.flatMap((card) => {
    const dueDate = card.dueDate || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return [];

    const start = new Date(`${dueDate}T00:00:00Z`);
    if (
      Number.isNaN(start.getTime()) ||
      start.toISOString().slice(0, 10) !== dueDate
    ) {
      return [];
    }

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const amount = Number(card.paymentAmount || 0).toLocaleString("en-HK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const cardLabel = [card.bank, card.name].filter(Boolean).join(" ");
    const summary = `信用卡還款｜${cardLabel}｜HK$${amount}`;
    const description = [
      `發卡銀行：${card.bank || "未設定"}`,
      `卡片：${card.name || "信用卡"}`,
      `還款金額：HK$${amount}`,
    ].join("\n");
    const uid = `${String(card.id || createId("card")).replace(/[^A-Za-z0-9-]/g, "")}-${calendarDate(dueDate)}@finpulse.local`;

    return [[
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${calendarDate(dueDate)}`,
      `DTEND;VALUE=DATE:${calendarDate(end.toISOString().slice(0, 10))}`,
      `SUMMARY:${escapeICSText(summary)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      "END:VEVENT",
    ].join("\r\n")];
  });

  if (events.length === 0) {
    window.alert("沒有設定有效還款日期的信用卡，請先設定還款日期再匯出日曆。");
    return;
  }

  const calendarContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FinPulse//Credit Card Payments//ZH-HK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
  const fileUrl = URL.createObjectURL(
    new Blob([calendarContent], { type: "text/calendar;charset=utf-8" })
  );
  const downloadLink = document.createElement("a");
  downloadLink.href = fileUrl;
  downloadLink.download = `finpulse-card-due-${today()}.ics`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
};

const archiveCurrentMonth = () => {
  const yearMonth = archiveMonth.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    setArchiveMonthError("請使用 YYYY-MM 格式，例如 2026-09。");
    return;
  }

  const archive = {
    yearMonth,
    archivedAt: new Date().toISOString(),
    totalIncome,
    totalExpense,
    netCashflow: totalIncome - totalExpense,
    cards,
    transactions,
    incomes,
    loans,
    loanMemos,
  };
  const nextHistoricalData = [
    ...historicalData.filter((entry) => entry.yearMonth !== yearMonth),
    archive,
  ].sort((left, right) => left.yearMonth.localeCompare(right.yearMonth));

  try {
    localStorage.setItem(
      STORAGE_KEY_HISTORICAL_DATA,
      JSON.stringify(nextHistoricalData)
    );
  } catch (error) {
    console.error("Failed to persist archive history:", error);
    setArchiveMonthError("無法保存歷史封存資料，請檢查瀏覽器儲存空間後重試。");
    return;
  }

  const downloadUrl = URL.createObjectURL(
    new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" })
  );
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = `finpulse-archive-${yearMonth}.json`;
  downloadLink.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

  try {
    onArchiveSuccess(archive);
  } catch (error) {
    console.error("Archive success callback failed:", error);
  }

  setHistoricalData(nextHistoricalData);
  setComparisonMonth(yearMonth);

  const activeStorageKeys = [
    STORAGE_KEY_CARDS,
    STORAGE_KEY_TX,
    STORAGE_KEY_INCOME,
    STORAGE_KEY_LOAN_MEMOS,
  ];
  const originalValues = new Map(
    activeStorageKeys.map((key) => [key, localStorage.getItem(key)])
  );
  try {
    activeStorageKeys.forEach((key) => localStorage.setItem(key, JSON.stringify([])));
  } catch (error) {
    console.error("Failed to clear archived data from storage:", error);
    originalValues.forEach((value, key) => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (restoreError) {
        console.error("Failed to restore data after archive clear error:", restoreError);
      }
    });
    setArchiveMonthError("封存檔已下載並保存，但無法清空本機資料；請稍後重試。");
    return;
  }

  setCards([]);
  setTransactions([]);
  setIncomes([]);
  setLoanMemos([]);
  setEditingTx(null);
  setArchiveDialogOpen(false);
  setArchiveComplete(true);
};

const openArchiveDialog = () => {
  const currentDate = new Date();
  setArchiveMonth(`${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`);
  setArchiveMonthError("");
  setArchiveDialogOpen(true);
};

const importWorkbook = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheetLookup = new Map(
      workbook.SheetNames.map((sheetName) => [sheetName.trim().toLowerCase(), sheetName])
    );
    const normalizeHeader = (value) => String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-\/()（）:：]/g, "");
    const transactionHeaderNames = new Set([
      "date", "transactiondate", "postingdate", "description", "merchant",
      "amount", "transactionamount", "debit", "debitamount", "expense",
      "交易日期", "日期", "入賬日期", "說明", "交易詳情", "商家", "金額",
      "交易金額", "支出", "支出金額", "扣賬金額",
    ].map(normalizeHeader));
    const isTransactionHeader = (value) => {
      const normalizedValue = normalizeHeader(value);
      return Array.from(transactionHeaderNames).some((header) =>
        normalizedValue.includes(header) || header.includes(normalizedValue)
      );
    };

    const parseRows = (keys, allowSingleSheet = false, findTransactionHeader = false) => {
      const name = keys
        .map((key) => sheetLookup.get(key.trim().toLowerCase()))
        .find(Boolean) || (allowSingleSheet && workbook.SheetNames.length === 1
          ? workbook.SheetNames[0]
          : "");
      if (!name) return [];
      if (findTransactionHeader) {
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          defval: "",
        });
        const headerIndex = rawRows.findIndex((row) =>
          row.filter(isTransactionHeader).length >= 2
        );
        if (headerIndex >= 0) {
          return XLSX.utils.sheet_to_json(workbook.Sheets[name], {
            range: headerIndex,
            defval: "",
          }).map((row) => ({ ...row }));
        }
      }
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "" });
      return rows.map((row) => ({ ...row }));
    };

    const getRowValue = (row, keys) => {
      const normalizedRow = new Map(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
      );
      for (const key of keys) {
        const normalizedKey = normalizeHeader(key);
        const exactValue = normalizedRow.get(normalizedKey);
        if (exactValue !== undefined && exactValue !== "") return exactValue;
        const matchingValue = Array.from(normalizedRow.entries()).find(([header]) =>
          header.includes(normalizedKey) || normalizedKey.includes(header)
        )?.[1];
        if (matchingValue !== undefined && matchingValue !== "") return matchingValue;
      }
      return undefined;
    };

    const parseImportedAmount = (value) => {
      if (typeof value === "number") return value;
      const amount = String(value || "")
        .replace(/HK\$|\$|,/gi, "")
        .replace(/^\((.*)\)$/, "-$1")
        .trim();
      return Number(amount) || 0;
    };

    const resolveCardId = (value) => {
      const cardReference = String(value || "").trim();
      if (!cardReference) return "";
      return cards.find((card) =>
        [card.id, card.name, `${card.bank} ${card.name}`, `${card.bank} - ${card.name}`]
          .includes(cardReference)
      )?.id || "";
    };

    const formatImportedDate = (value) => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
      }
      if (typeof value === "number") {
        const dateCode = XLSX.SSF.parse_date_code(value);
        if (dateCode) {
          return `${dateCode.y}-${String(dateCode.m).padStart(2, "0")}-${String(dateCode.d).padStart(2, "0")}`;
        }
      }
      return value || today();
    };

    const importedCards = parseRows(["cards", "card", "信用卡"]).map((row) => ({
      id: getRowValue(row, ["id"]) || createId("card"),
      name: getRowValue(row, ["name", "卡片名稱", "信用卡名稱"]) || "",
      bank: getRowValue(row, ["bank", "發卡銀行", "銀行"]) || BANKS[0],
      dueDate: formatImportedDate(getRowValue(row, ["dueDate", "還款日期", "到期日"])),
      paymentAmount: Number(getRowValue(row, ["paymentAmount", "還款金額", "本期還款金額"]) || 0),
      isPaid: [true, "true", 1, "1"].includes(getRowValue(row, ["isPaid", "已還款"])),
    }));

    const importedTransactions = parseRows(
      ["transactions", "transaction", "交易紀錄", "交易记录", "交易", "開支", "支出"],
      true,
      true
    ).map((row) => {
      const cardName = getRowValue(row, ["cardId", "信用卡 ID", "信用卡ID", "信用卡"]) || "";
      return {
        id: getRowValue(row, ["id"]) || createId("tx"),
        description: getRowValue(row, ["description", "name", "merchant", "說明", "交易詳情", "商家", "說明 / 商家", "項目"]) || "未命名交易",
        amount: parseImportedAmount(getRowValue(row, ["amount", "transaction amount", "debit", "debit amount", "expense", "金額", "交易金額", "開支", "支出", "支出金額", "扣賬金額"])),
        category: getRowValue(row, ["category", "類別", "分類"]) || CATEGORIES[0],
        date: formatImportedDate(getRowValue(row, ["date", "transaction date", "posting date", "日期", "交易日期", "入賬日期"])),
        cardId: resolveCardId(cardName),
        cardName,
      };
    }).filter((transaction) => transaction.amount > 0);

    const importedIncomes = parseRows(["incomes", "income", "收入"]).map((row) => ({
      id: row.id || createId("inc"),
      source: row.source || row.name || "未命名收入",
      amount: Number(row.amount || 0),
      date: row.date || today(),
    }));

    const importedLoans = parseRows(["loans", "loan", "貸款"]).map((row) => normalizeLoan({
      id: row.id || createId("loan"),
      bank: row.bank || LOAN_BANKS[0][0],
      principal: Number(row.principal || 0),
      monthlyPayment: Number(row.monthlyPayment || 0),
      months: Number(row.months || 0),
      upfrontFee: Number(row.upfrontFee || 0),
      rebate: Number(row.rebate || 0),
      date: row.date || today(),
    }));

    const importedMemos = parseRows(["memos", "memo", "財務備忘錄", "備忘錄"]).map((row) => ({
      id: row.id || createId("memo"),
      text: row.text || row.memo || "",
      date: row.date || today(),
    }));

    const importedCount = importedCards.length + importedTransactions.length + importedIncomes.length + importedLoans.length + importedMemos.length;
    if (!importedCount) {
      window.alert("未找到可匯入資料。交易工作表可命名為「transactions」、「交易紀錄」、「交易」、「開支」或「支出」。");
      return;
    }

    const nextCards = importedCards.length ? importedCards : cards;
    const nextTransactions = importedTransactions.length ? importedTransactions : transactions;
    const nextIncomes = importedIncomes.length ? importedIncomes : incomes;
    const nextLoans = importedLoans.length ? importedLoans : loans;
    const nextMemos = importedMemos.length ? importedMemos : loanMemos;

    setArchiveComplete(false);
    setCards(nextCards);
    setTransactions(nextTransactions);
    setIncomes(nextIncomes);
    commitLoans(nextLoans);
    setLoanMemos(nextMemos);

    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(nextCards));
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(nextTransactions));
    localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(nextIncomes));
    localStorage.setItem(STORAGE_KEY_LOAN_MEMOS, JSON.stringify(nextMemos));
    window.alert("匯入完成，資料已更新。")
  } catch (error) {
    console.error(error);
    window.alert("匯入失敗，請確認檔案格式為 Excel 工作簿。")
  } finally {
    event.target.value = "";
  }
};

// 登入 / 登出事件處理
const handleGoogleLogin = async () => {
if (!auth || !googleProvider) return;
try {
await signInWithPopup(auth, googleProvider);
} catch (err) {
console.error("Login failed:", err);
}
};

const handleLogout = async () => {
if (!auth) return;
await signOut(auth);
};

// CRUD 處理：信用卡
const handleAddCard = (e) => {
e.preventDefault();
if (!newCard.name) return;
const item = {
...newCard,
id: createId("card"),
themeIndex: CARD_NAMES.indexOf(newCard.name),
paymentAmount: Number(newCard.paymentAmount) || 0,
isPaid: false,
};
const next = [item, ...cards];
setArchiveComplete(false);
setCards(next);
localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(next));
setNewCard({ name: "", bank: BANKS[0], dueDate: today(), paymentAmount: "" });
};

const handleDeleteCard = (id) => {
const next = cards.filter((c) => c.id !== id);
setCards(next);
localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(next));
};

const handleUpdateCard = (id, updates) => {
const next = cards.map((card) =>
  card.id === id ? { ...card, ...updates } : card
);
setCards(next);
localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(next));
};

const handleToggleCardPaid = (id) => {
const next = cards.map((card) =>
  card.id === id ? { ...card, isPaid: !card.isPaid } : card
);
setCards(next);
localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(next));
};

const handleAskAdvisor = async (event) => {
event.preventDefault();
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  setAdvisorStatus("error");
  setAdvisorResponse("請在 .env 設定 VITE_GEMINI_API_KEY，然後重新啟動開發伺服器。");
  return;
}

setAdvisorStatus("loading");
setAdvisorResponse("");
try {
  const client = new GoogleGenAI({ apiKey });
  const financialSnapshot = {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    loanPrincipal: totalLoanPrincipal,
    monthlyLoanPayment: loanForecastSummary.totalMonthlyPayment,
    debtToIncomeRatio: loanForecastSummary.debtToIncomeRatio,
    recentTransactions: transactions.slice(0, 10).map(({ description, amount, category, date }) => ({
      description,
      amount,
      category,
      date,
    })),
  };
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `你是香港個人理財顧問。根據以下財務快照，以繁體中文提供清晰、可行且審慎的建議。不要提供投資保證，並在適當情況下提醒用戶諮詢持牌專業人士。\n\n財務快照：${JSON.stringify(financialSnapshot)}\n\n用戶問題：${advisorPrompt || "請分析我的財務狀況並提供三項優先行動。"}`,
  });
  setAdvisorResponse(response.text || "未能產生建議，請稍後再試。");
  setAdvisorStatus("success");
} catch (error) {
  console.error("Gemini advisor failed:", error);
  setAdvisorStatus("error");
  setAdvisorResponse("暫時未能取得 AI 建議，請檢查 API key、網絡連線及 Gemini API 配額。");
}
};

// CRUD 處理：交易開支
const handleAddTx = (e) => {
e.preventDefault();
if (!newTx.description || !newTx.amount) return;
const item = {
...newTx,
id: createId("tx"),
amount: Number(newTx.amount) || 0,
};
const next = [item, ...transactions];
setArchiveComplete(false);
setTransactions(next);
localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(next));
setNewTx({
description: "",
amount: "",
category: CATEGORIES[0],
date: today(),
cardId: "",
});
};

const handleDeleteTx = (id) => {
const next = transactions.filter((t) => t.id !== id);
setTransactions(next);
localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(next));
};

const handleSaveTx = (event) => {
event.preventDefault();
if (!editingTx?.description || !editingTx.amount) return;
const next = transactions.map((transaction) =>
  transaction.id === editingTx.id
    ? { ...editingTx, amount: Number(editingTx.amount) || 0 }
    : transaction
);
setTransactions(next);
localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(next));
setEditingTx(null);
};

// CRUD 處理：收入管理
const handleAddIncome = (e) => {
e.preventDefault();
if (!newIncome.source || !newIncome.amount) return;
const item = {
...newIncome,
id: createId("inc"),
amount: Number(newIncome.amount) || 0,
};
const next = [item, ...incomes];
setArchiveComplete(false);
setIncomes(next);
localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(next));
setNewIncome({ source: "", amount: "", date: today() });
};

const handleDeleteIncome = (id) => {
const next = incomes.filter((i) => i.id !== id);
setIncomes(next);
localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(next));
};

// CRUD 處理：貸款紀錄
const handleAddLoan = (e) => {
e.preventDefault();
if (!newLoan.principal || !newLoan.monthlyPayment) return;
const item = normalizeLoan({
id: createId("loan"),
bank: newLoan.bank,
principal: Number(newLoan.principal) || 0,
monthlyPayment: Number(newLoan.monthlyPayment) || 0,
months: Number(newLoan.months) || 0,
upfrontFee: Number(newLoan.upfrontFee) || 0,
rebate: Number(newLoan.rebate) || 0,
date: newLoan.date,
});
const next = [item, ...loansRef.current];
setArchiveComplete(false);
commitLoans(next);
setNewLoan({
bank: LOAN_BANKS[0][0],
principal: "",
monthlyPayment: "",
months: "",
upfrontFee: "",
rebate: "",
date: today(),
});
};

const handleDeleteLoan = (event, id, loanIndex) => {
event.preventDefault();
event.stopPropagation();
console.log("Deleting loan:", id);
const next = loansRef.current.filter((_, index) => index !== loanIndex);
commitLoans(next);
};

// CRUD 處理：財務備忘錄
const handleAddMemo = (e) => {
e.preventDefault();
if (!newMemo.trim()) return;
const item = { id: createId("memo"), text: newMemo, date: today() };
const next = [item, ...loanMemos];
setArchiveComplete(false);
setLoanMemos(next);
localStorage.setItem(STORAGE_KEY_LOAN_MEMOS, JSON.stringify(next));
setNewMemo("");
};

const handleDeleteMemo = (id) => {
const next = loanMemos.filter((m) => m.id !== id);
setLoanMemos(next);
localStorage.setItem(STORAGE_KEY_LOAN_MEMOS, JSON.stringify(next));
};

  return (
    <div className="relative isolate min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_rgba(148,163,184,0.2),_transparent_65%)] text-slate-100">
      {/* ====== 頂部 Header ====== */}
      <header className="sticky top-0 z-20 border-b border-slate-500/25 bg-slate-900/80 px-5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl md:flex md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-500 to-teal-600 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              FP
            </div>
            <div>
              <h1 className="shimmer-text text-xl font-black tracking-tight">FINPULSE</h1>
              <p className="text-[11px] text-slate-400">
                個人資產、信用卡與貸款 HKMA APR 智能管理系統
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
            {cloudStatus === "synced" ? (
              <>
                <CloudCheck size={14} className="text-emerald-400" />
                <span>雲端已同步 ({user?.displayName || "已登入"})</span>
              </>
            ) : (
              <>
                <Cloud size={14} className="text-slate-500" />
                <span>本機 Local Storage 模式</span>
              </>
            )}
          </div>

          <Button
            variant={archiveComplete ? "complete" : "archive"}
            onClick={openArchiveDialog}
            disabled={archiveComplete}
            className="whitespace-nowrap rounded-xl px-4 py-2 text-xs"
          >
            <Archive size={15} />
            {archiveComplete ? "已成功封存" : "一按封存當月數據"}
          </Button>

          <Button variant="export" onClick={exportCalendar} className="text-xs">
            匯出日曆
          </Button>
          <Button
            variant="import"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs"
          >
            匯入 XLSX
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={importWorkbook}
          />

        {user ? (
          <Button
            variant="logout"
            onClick={handleLogout}
            className="text-xs"
          >
            <LogOut size={14} /> 登出
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleGoogleLogin}
            className="text-xs"
          >
            <LogIn size={14} /> Google 登入同步
          </Button>
        )}
      </div>
    </header>

    {archiveDialogOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setArchiveDialogOpen(false);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-dialog-title"
          className="w-full max-w-md rounded-2xl border border-slate-400/25 bg-gradient-to-br from-slate-700/95 via-slate-900/95 to-slate-950 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <h2 id="archive-dialog-title" className="text-lg font-bold text-white">
            封存當月數據
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            確認封存月份。下載備份後，所有目前記錄將從主介面清空。
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              archiveCurrentMonth();
            }}
          >
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span className="text-xs font-medium text-slate-400">封存月份</span>
              <input
                autoFocus
                type="month"
                required
                className="rounded-xl border border-slate-600 bg-slate-950 p-3 text-white outline-none focus:border-cyan-400 [color-scheme:dark]"
                value={archiveMonth}
                onChange={(event) => {
                  setArchiveMonth(event.target.value);
                  setArchiveMonthError("");
                }}
              />
              {archiveMonthError && (
                <span role="alert" className="text-xs text-rose-300">
                  {archiveMonthError}
                </span>
              )}
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setArchiveDialogOpen(false)}
              >
                取消
              </Button>
              <Button variant="archive" type="submit">
                <Archive size={15} /> 封存並清空
              </Button>
            </div>
          </form>
        </section>
      </div>
    )}

    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    {/* ====== 導航選單 ====== */}
    <nav className="flex w-full items-center gap-2 overflow-x-auto border-b border-slate-500/25 pb-3">
      {[
        { id: "overview", label: "財務總覽及報表", icon: LayoutDashboard },
        { id: "comparison", label: "歷史跨期對決", icon: Layers },
        { id: "analysis", label: "貸款分析", icon: Landmark },
        { id: "cards", label: "信用卡", icon: CreditCard },
        { id: "transactions", label: "交易紀錄", icon: Receipt },
        { id: "income", label: "收入管理", icon: Wallet },
        { id: "loans", label: "貸款管理及備忘錄", icon: Landmark },
        { id: "advisor", label: "AI 理財顧問", icon: Sparkles },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            tab === id
              ? "border-cyan-300/60 bg-gradient-to-b from-cyan-400/20 to-cyan-900/30 text-cyan-300 font-bold shadow-[0_0_18px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]"
              : "border-slate-400/20 bg-gradient-to-b from-slate-600/70 to-slate-800/80 text-slate-300 shadow-md shadow-black/20 hover:border-slate-300/40 hover:from-slate-500/70 hover:text-white"
          }`}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </nav>

    {/* ====== Tab 1: 財務總覽 ====== */}
    {tab === "overview" && (
      <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  <Glass className="min-h-28 p-4">
                    <span className="text-xs font-medium text-slate-300">淨資產 / 淨結餘</span>
                    <div className="mt-2 text-2xl font-black text-cyan-300">{money(totalIncome - totalExpense)}</div>
                  </Glass>
                  <Glass className="min-h-28 p-4">
                    <span className="text-xs font-medium text-slate-300">總收入</span>
                    <div className="mt-2 text-2xl font-black text-emerald-300">{money(totalIncome)}</div>
                  </Glass>
                  <Glass className="min-h-28 p-4">
                    <span className="text-xs font-medium text-slate-300">總開支</span>
                    <div className="mt-2 text-2xl font-black text-rose-300">{money(totalExpense)}</div>
                  </Glass>
                  <Glass className="min-h-28 p-4">
                    <span className="text-xs font-medium text-slate-300">貸款總本金</span>
                    <div className="mt-2 text-2xl font-black text-amber-300">{money(totalLoanPrincipal)}</div>
                  </Glass>
                  <div role="region" aria-label="財務風險評級" className={`min-h-28 rounded-xl border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_rgba(0,0,0,0.38)] backdrop-blur-xl ${financialRisk.theme}`}>
                    <span className="text-xs font-medium text-slate-200">財務風險評級</span>
                    <div className="mt-2 flex items-center gap-3">
                      <financialRisk.icon size={38} strokeWidth={2.2} />
                      <span className={`text-2xl font-bold ${financialRisk.pulse ? "animate-pulse" : ""}`}>【{financialRisk.label}】</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-200">{financialRisk.description}</p>
                    {!financialRisk.hasFinancialData && <p className="mt-1 text-[11px] text-slate-400">尚未有足夠記錄，評級僅供參考。</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[0.92fr_1.5fr]">
                  <div className="space-y-4">
                    <Glass className="p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-white"><PieIcon size={18} className="text-cyan-300" />開支類別分佈</h3>
                      {categoryPieData.length === 0 ? <Empty>暫無交易資料以製作圖表</Empty> : (
                        <div className="h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label>
                                {categoryPieData.map((entry, index) => <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value) => money(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Glass>

                    <Glass className="p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-white"><Receipt size={18} className="text-cyan-300" />最新交易預覽</h3>
                      {transactions.length === 0 ? <Empty>暫無交易紀錄</Empty> : (
                        <div className="space-y-2">
                          {transactions.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-300/20 bg-slate-950/45 px-3 py-2.5">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">{tx.description}</div>
                                <span className="text-xs text-slate-300">{tx.date} · {tx.category}</span>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-rose-300">{money(tx.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Glass>
                  </div>

                  <div className="space-y-4">
                    <Glass className="p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-white">月度收支趨勢</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                          <span>總收入 <strong className="text-emerald-300">{money(totalIncome)}</strong></span>
                          <span>總開支 <strong className="text-rose-300">{money(totalExpense)}</strong></span>
                          <span>月淨額 <strong className="text-cyan-300">{money(monthlyNetData[monthlyNetData.length - 1]?.net || 0)}</strong></span>
                        </div>
                      </div>
                      <div className="h-60 min-w-0 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyNetData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                            <defs>
                              <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.8} /><stop offset="95%" stopColor="#34d399" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} /><stop offset="95%" stopColor="#fb7185" stopOpacity={0.05} /></linearGradient>
                            </defs>
                            <CartesianGrid stroke="#64748b" strokeOpacity={0.35} strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                            <Tooltip formatter={(value) => money(value)} />
                            <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#incomeFill)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="url(#expenseFill)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Glass>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Glass className="p-4">
                        <h3 className="mb-2 text-sm font-bold text-white">支出類別排行</h3>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryBreakdownData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                              <CartesianGrid stroke="#64748b" strokeOpacity={0.35} strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                              <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                              <Tooltip formatter={(value) => money(value)} />
                              <Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#22d3ee" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Glass>

                      <Glass className="p-4">
                        <h3 className="mb-2 text-sm font-bold text-white">貸款 APR 比較</h3>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart key={loanPerformanceData.length} data={loanPerformanceData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                              <CartesianGrid stroke="#64748b" strokeOpacity={0.35} strokeDasharray="3 3" />
                              <XAxis dataKey="bank" tick={{ fill: "#cbd5e1", fontSize: 9 }} />
                              <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                              <Tooltip formatter={formatAPR} />
                              <Line type="monotone" dataKey="apr" stroke="#fbbf24" strokeWidth={3} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Glass>
                    </div>
                  </div>
                </div>
              </div>
    )}

    {tab === "comparison" && (
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
                <Layers size={22} />
              </span>
              <h1 className="text-2xl font-bold text-white">歷史跨期對決</h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              當您在明細頁面完成每月結算與封存後，數據將在此進行對比。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900/80 p-1" role="group" aria-label="比較模式">
              <button
                type="button"
                aria-pressed={comparisonMode === "month"}
                onClick={() => setComparisonMode("month")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${comparisonMode === "month" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                月度對決
              </button>
              <button
                type="button"
                aria-pressed={comparisonMode === "year"}
                onClick={() => setComparisonMode("year")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${comparisonMode === "year" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                年度回顧
              </button>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
              <CalendarDays size={16} className="text-indigo-300" />
              {comparisonMode === "month" ? (
                <input
                  type="month"
                  aria-label="選擇比較月份"
                  value={comparisonMonth}
                  onChange={(event) => setComparisonMonth(event.target.value)}
                  className="min-w-0 bg-transparent text-white outline-none [color-scheme:dark]"
                />
              ) : (
                <select
                  aria-label="選擇比較年份"
                  value={comparisonMonth.slice(0, 4)}
                  onChange={(event) => setComparisonMonth(`${event.target.value}-12`)}
                  className="bg-transparent text-white outline-none [color-scheme:dark]"
                >
                  {comparisonYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              )}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { key: "income", title: "封存收入對比", color: "text-emerald-400" },
            { key: "expense", title: "封存支出對比", color: "text-rose-400" },
            { key: "netCashflow", title: "淨現金流對比", color: "text-cyan-400" },
          ].map(({ key, title, color }) => {
            const currentValue = comparisonPeriod.current[key];
            const previousValue = comparisonPeriod.previous[key];
            const hasPrevious = comparisonPeriod.hasPrevious;
            const percentChange = previousValue === 0
              ? null
              : ((currentValue - previousValue) / previousValue) * 100;
            const movedUp = currentValue > previousValue;
            const isFavorable = !hasPrevious
              ? false
              : key === "expense" ? currentValue <= previousValue : currentValue >= previousValue;
            const TrendIcon = percentChange === null
              ? (movedUp ? ArrowUpRight : ArrowDownRight)
              : movedUp ? ArrowUpRight : ArrowDownRight;
            const badgeClass = !hasPrevious
              ? "border-slate-700 bg-slate-800/80 text-slate-400"
              : isFavorable
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/20 bg-rose-500/10 text-rose-400";

            return (
              <section key={key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:border-indigo-500/40">
                <div className="text-sm font-medium text-slate-400">{title}</div>
                <div className={`mt-3 text-2xl font-bold ${color}`}>{money(currentValue)}</div>
                <div className="mt-2 text-xs text-slate-500">對比前期 ({comparisonPeriod.previousPeriod})</div>
                <div className="mt-4 flex justify-end">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                    {hasPrevious ? (
                      <>
                        <TrendIcon size={14} />
                        {percentChange === null
                          ? currentValue > 0 ? "新紀錄" : "0.0%"
                          : `${percentChange > 0 ? "+" : ""}${percentChange.toFixed(1)}%`}
                      </>
                    ) : "尚無前期資料"}
                  </span>
                </div>
              </section>
            );
          })}
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/20 backdrop-blur-md md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">📊 {comparisonMode === "month" ? "月度數據深度對決" : "年度數據深度對決"}</h2>
            <span className="text-xs text-slate-400">金額：HKD</span>
          </div>
          {!comparisonPeriod.hasCurrent && !comparisonPeriod.hasPrevious ? (
            <Empty icon={Archive}>尚無歷史封存數據。完成封存後，即可比較不同月份或年度。</Empty>
          ) : (
            <>
              <div className="h-80 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonPeriod.chartData} barGap={12} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => money(value)} />
                    <Legend
                      align="center"
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-slate-300">{value}</span>}
                    />
                    <Bar dataKey="previous" name={`前期 (${comparisonPeriod.previousPeriod})`} fill="#475569" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="current" name={`當期 (${comparisonPeriod.currentPeriod})`} fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
                <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-slate-600" />前期 ({comparisonPeriod.previousPeriod})</span>
                <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" />當期 ({comparisonPeriod.currentPeriod})</span>
              </div>
            </>
          )}
        </section>
      </section>
    )}

    {tab === "analysis" && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Glass className="p-5">
            <span className="text-xs font-medium text-slate-300">總月供</span>
            <div className="mt-1 text-2xl font-black text-cyan-300">{money(loanForecastSummary.totalMonthlyPayment)}</div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs font-medium text-slate-300">預估利息</span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {money(loanForecastSummary.totalInterest)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">最高 APR</span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {formatAPR(loanForecastSummary.maxApr)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">負債收入比</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {Number.isFinite(loanForecastSummary.debtToIncomeRatio) &&
              loanForecastSummary.debtToIncomeRatio >= 0
                ? `${loanForecastSummary.debtToIncomeRatio.toFixed(1)}%`
                : "0.0%"}
            </div>
          </Glass>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Glass className="p-6">
            <h3 className="text-base font-bold text-white mb-4">貸款 APR 比較</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={loanComparisonData.length} data={loanComparisonData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="bank" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip formatter={formatAPR} />
                  <Bar dataKey="apr" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>

          <Glass className="p-6">
            <h3 className="text-base font-bold text-white mb-4">月供壓力與預測</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart key={loanComparisonData.length} data={loanComparisonData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="bank" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Line type="monotone" dataKey="monthlyPayment" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="totalRepayment" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        </div>

        <Glass className="p-6">
          <h3 className="text-base font-bold text-white mb-4">貸款策略比較</h3>
          {loanComparisonData.length === 0 ? (
            <Empty>目前未有貸款紀錄，請先新增貸款</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4">銀行</th>
                    <th className="pb-3 pr-4 text-right">本金</th>
                    <th className="pb-3 pr-4 text-right">月供</th>
                    <th className="pb-3 pr-4 text-right">APR</th>
                    <th className="pb-3 pr-4 text-right">總利息</th>
                    <th className="pb-3 pr-4 text-right">月供佔收入</th>
                  </tr>
                </thead>
                <tbody>
                  {loanComparisonData.map((item) => (
                    <tr key={item.bank} className="border-t border-slate-800/80">
                      <td className="py-3 pr-4 text-white">{item.bank}</td>
                      <td className="py-3 pr-4 text-right text-slate-200">{money(item.principal)}</td>
                      <td className="py-3 pr-4 text-right text-slate-200">{money(item.monthlyPayment)}</td>
                      <td className="py-3 pr-4 text-right font-bold text-cyan-400">
                        {formatAPR(item.apr)}
                      </td>
                      <td className="py-3 pr-4 text-right text-amber-300">{money(item.totalInterest)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-400">
                        {Number.isFinite(item.budgetShare) && item.budgetShare >= 0
                          ? `${item.budgetShare.toFixed(1)}%`
                          : "0.0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Glass>
      </div>
    )}

    {/* ====== Tab 4: 信用卡 ====== */}
    {tab === "cards" && (
      <div className="space-y-6">
        <Glass className="p-6">
          <h3 className="mb-4 text-lg font-bold text-white">新增信用卡</h3>
          <form onSubmit={handleAddCard} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            <Field label="卡片名稱">
              <select
                required
                className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none focus:border-cyan-500"
                value={newCard.name}
                onChange={(e) =>
                  setNewCard({ ...newCard, name: e.target.value })
                }
              >
                <option value="" disabled>請選擇信用卡</option>
                {CARD_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="發卡銀行">
              <select
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newCard.bank}
                onChange={(e) =>
                  setNewCard({ ...newCard, bank: e.target.value })
                }
              >
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="還款日期">
              <input
                type="date"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500 [color-scheme:dark]"
                value={newCard.dueDate}
                onChange={(e) =>
                  setNewCard({ ...newCard, dueDate: e.target.value })
                }
              />
            </Field>
            <Field label="還款金額">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="如：3000"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newCard.paymentAmount}
                onChange={(e) =>
                  setNewCard({ ...newCard, paymentAmount: e.target.value })
                }
              />
            </Field>
            <div className="flex items-end">
              <Button variant="primary" type="submit" className="w-full py-2.5">
                新增卡片
              </Button>
            </div>
          </form>
        </Glass>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card, idx) => {
            const theme = TITANIUM_THEMES[
              Number.isInteger(card.themeIndex) && card.themeIndex >= 0
                ? card.themeIndex % TITANIUM_THEMES.length
                : idx % TITANIUM_THEMES.length
            ];
            return (
              <div
                key={card.id}
                className={`p-5 rounded-2xl border ${theme.cardBg} flex flex-col justify-between gap-6 relative overflow-hidden`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase tracking-wider opacity-80">
                      {card.bank}
                    </span>
                    <h4 className="text-lg font-black mt-0.5">
                      {card.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="opacity-60 hover:opacity-100 p-1 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs opacity-70">
                    <span className="mb-1 block">本期還款金額</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`${card.name} 本期還款金額`}
                      className="w-full rounded-lg border border-white/20 bg-slate-950/30 px-2.5 py-2 text-sm font-black text-white outline-none focus:border-cyan-300"
                      value={card.paymentAmount}
                      onChange={(event) =>
                        handleUpdateCard(card.id, {
                          paymentAmount: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs opacity-70">
                    <span className="mb-1 block">還款日期</span>
                    <input
                      type="date"
                      aria-label={`${card.name} 還款日期`}
                      className="w-full rounded-lg border border-white/20 bg-slate-950/30 px-2.5 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300 [color-scheme:dark]"
                      value={card.dueDate}
                      onChange={(event) =>
                        handleUpdateCard(card.id, { dueDate: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="flex items-end justify-between gap-3 text-sm">
                  {(() => {
                    const daysRemaining = getCardDaysRemaining(card.dueDate);
                    const countdownText = card.isPaid
                      ? "本期已還款"
                      : daysRemaining === null
                        ? "未設定日期"
                        : daysRemaining < 0
                          ? `已逾期 ${Math.abs(daysRemaining)} 日`
                          : daysRemaining === 0
                            ? "今日到期"
                            : `尚餘 ${daysRemaining} 日`;
                    return (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        card.isPaid
                          ? "bg-emerald-400/20 text-emerald-100"
                          : daysRemaining !== null && daysRemaining <= 3
                            ? "bg-rose-400/20 text-rose-100"
                            : "bg-cyan-400/20 text-cyan-100"
                      }`}>
                        {countdownText}
                      </span>
                    );
                  })()}
                </div>
                <Button
                  variant={card.isPaid ? "secondary" : "primary"}
                  onClick={() => handleToggleCardPaid(card.id)}
                  className="w-full py-2"
                >
                  {card.isPaid ? "取消已還款" : "標記為已還款"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* ====== Tab 5: 交易紀錄 ====== */}
    {tab === "transactions" && (
      <div className="space-y-6">
        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            記帳 (新增交易)
          </h3>
          <form
            onSubmit={handleAddTx}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4"
          >
            <Field label="日期">
              <input
                type="date"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500 [color-scheme:dark]"
                value={newTx.date}
                onChange={(e) =>
                  setNewTx({ ...newTx, date: e.target.value })
                }
              />
            </Field>
            <Field label="說明 / 商家">
              <input
                type="text"
                placeholder="如：超市購物"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newTx.description}
                onChange={(e) =>
                  setNewTx({ ...newTx, description: e.target.value })
                }
              />
            </Field>
            <Field label="金額">
              <input
                type="number"
                placeholder="0"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newTx.amount}
                onChange={(e) =>
                  setNewTx({ ...newTx, amount: e.target.value })
                }
              />
            </Field>
            <Field label="類別">
              <select
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newTx.category}
                onChange={(e) =>
                  setNewTx({ ...newTx, category: e.target.value })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="信用卡">
              <select
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newTx.cardId}
                onChange={(e) =>
                  setNewTx({ ...newTx, cardId: e.target.value })
                }
              >
                <option value="">現金 / 未指定</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.bank} - {card.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <Button variant="primary" type="submit" className="w-full py-2.5">
                新增開支
              </Button>
            </div>
          </form>
        </Glass>

        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">歷史交易明細</h3>
          {transactions.length === 0 ? (
            <Empty>未有任何交易紀錄</Empty>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {transactions.map((tx) => (
                <div key={tx.id} className="py-3">
                  {editingTx?.id === tx.id ? (
                    <form onSubmit={handleSaveTx} className="grid grid-cols-1 gap-3 rounded-lg border border-cyan-500/30 bg-slate-950/50 p-3 sm:grid-cols-2 lg:grid-cols-6">
                      <Field label="日期">
                        <input
                          type="date"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white outline-none focus:border-cyan-500 [color-scheme:dark]"
                          value={editingTx.date}
                          onChange={(event) => setEditingTx({ ...editingTx, date: event.target.value })}
                        />
                      </Field>
                      <Field label="說明 / 商家">
                        <input
                          type="text"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white outline-none focus:border-cyan-500"
                          value={editingTx.description}
                          onChange={(event) => setEditingTx({ ...editingTx, description: event.target.value })}
                        />
                      </Field>
                      <Field label="金額">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white outline-none focus:border-cyan-500"
                          value={editingTx.amount}
                          onChange={(event) => setEditingTx({ ...editingTx, amount: event.target.value })}
                        />
                      </Field>
                      <Field label="類別">
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white outline-none focus:border-cyan-500"
                          value={editingTx.category}
                          onChange={(event) => setEditingTx({ ...editingTx, category: event.target.value })}
                        >
                          {!CATEGORIES.includes(editingTx.category) && (
                            <option value={editingTx.category}>{editingTx.category}</option>
                          )}
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="信用卡">
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white outline-none focus:border-cyan-500"
                          value={editingTx.cardId || (editingTx.cardName ? `imported:${editingTx.cardName}` : "")}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value.startsWith("imported:")) return;
                            setEditingTx({
                              ...editingTx,
                              cardId: value,
                              cardName: "",
                            });
                          }}
                        >
                          <option value="">現金 / 未指定</option>
                          {!editingTx.cardId && editingTx.cardName && (
                            <option value={`imported:${editingTx.cardName}`}>{editingTx.cardName}</option>
                          )}
                          {cards.map((card) => (
                            <option key={card.id} value={card.id}>{card.bank} - {card.name}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="flex items-end gap-2">
                        <Button variant="primary" type="submit" className="flex-1 px-3">儲存</Button>
                        <Button variant="secondary" type="button" onClick={() => setEditingTx(null)} className="px-3">取消</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">
                          {tx.description}
                        </div>
                        <div className="text-xs text-slate-500">
                          {tx.date} · {tx.category} · {cardNameById.get(tx.cardId) || tx.cardName || "現金 / 未指定"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-rose-400">
                          {money(tx.amount)}
                        </span>
                        <button
                          onClick={() => setEditingTx({ ...tx, amount: String(tx.amount) })}
                          className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                          aria-label={`修改 ${tx.description}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          aria-label={`刪除 ${tx.description}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>
    )}

    {/* ====== Tab 6: 收入管理 ====== */}
    {tab === "income" && (
      <div className="space-y-6">
        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">新增收入紀錄</h3>
          <form
            onSubmit={handleAddIncome}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Field label="收入來源">
              <input
                type="text"
                placeholder="如：月薪 / 投資回報"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newIncome.source}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, source: e.target.value })
                }
              />
            </Field>
            <Field label="收入日期">
              <input
                type="date"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500 [color-scheme:dark]"
                value={newIncome.date}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, date: e.target.value })
                }
              />
            </Field>
            <Field label="金額">
              <input
                type="number"
                placeholder="0"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newIncome.amount}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, amount: e.target.value })
                }
              />
            </Field>
            <div className="flex items-end">
              <Button variant="primary" type="submit" className="w-full py-2.5">
                新增收入
              </Button>
            </div>
          </form>
        </Glass>

        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">收入歷史</h3>
          {incomes.length === 0 ? (
            <Empty>未有收入紀錄</Empty>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400">總收入</div>
                  <div className="mt-2 text-xl font-black text-emerald-400">
                    {money(totalIncome)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400">平均收入</div>
                  <div className="mt-2 text-xl font-black text-cyan-400">
                    {money(totalIncome / Math.max(incomes.length, 1))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400">最多收入來源</div>
                  <div className="mt-2 text-xl font-black text-white">
                    {incomes.reduce((max, item) => Number(item.amount || 0) > Number(max.amount || 0) ? item : max, { source: "-", amount: 0 }).source}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-3 pr-4">日期</th>
                      <th className="pb-3 pr-4">來源</th>
                      <th className="pb-3 pr-4 text-right">金額</th>
                      <th className="pb-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((inc) => (
                      <tr key={inc.id} className="border-t border-slate-800/80">
                        <td className="py-3 pr-4 text-slate-300">{inc.date}</td>
                        <td className="py-3 pr-4 text-white">{inc.source}</td>
                        <td className="py-3 pr-4 text-right font-bold text-emerald-400">
                          +{money(inc.amount)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Glass>
      </div>
    )}

    {/* ====== Tab 7: 貸款管理 (HKMA APR) ====== */}
    {tab === "loans" && (
      <div className="space-y-6">
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                LOAN MANAGEMENT
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                新增貸款與計算 APR
              </h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
              <Landmark size={14} className="text-cyan-400" />
              HKMA IRR 標準淨現值法
            </span>
          </div>

          <form onSubmit={handleAddLoan} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="銀行名稱">
                <select
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500"
                  value={newLoan.bank}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, bank: e.target.value })
                  }
                >
                  {LOAN_BANKS.map(([label, val]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="放款日期">
                <input
                  type="date"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 [color-scheme:dark]"
                  value={newLoan.date}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, date: e.target.value })
                  }
                />
              </Field>

              <Field label="貸款金額 (本金)">
                <input
                  type="number"
                  placeholder="請輸入貸款金額"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 placeholder-slate-700"
                  value={newLoan.principal}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, principal: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <Field label="每月還款金額">
                <input
                  type="number"
                  placeholder="請輸入每月還款額"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 placeholder-slate-700"
                  value={newLoan.monthlyPayment}
                  onChange={(e) =>
                    setNewLoan({
                      ...newLoan,
                      monthlyPayment: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="還款期數 (月)">
                <input
                  type="number"
                  placeholder="例如 60"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 placeholder-slate-700"
                  value={newLoan.months}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, months: e.target.value })
                  }
                />
              </Field>

              <Field label="申請手續費">
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 placeholder-slate-700"
                  value={newLoan.upfrontFee}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, upfrontFee: e.target.value })
                  }
                />
              </Field>

              <Field label="現金回贈">
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 placeholder-slate-700"
                  value={newLoan.rebate}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, rebate: e.target.value })
                  }
                />
              </Field>
            </div>

            {/* 動態 APR 計算結果 */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-5 border-t border-slate-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex-1">
                <div>
                  <span className="block text-slate-500 text-xs font-medium">
                    淨實收借款額
                  </span>
                  <span className="text-white font-semibold text-sm mt-0.5 block">
                    {newLoan.principal
                      ? money(currentMetrics.netCashReceived)
                      : "HK$ 0"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-medium">
                    總還款額
                  </span>
                  <span className="text-white font-semibold text-sm mt-0.5 block">
                    {newLoan.months
                      ? money(currentMetrics.totalRepayment)
                      : "HK$ 0"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-medium">
                    總利息支出
                  </span>
                  <span className="text-white font-semibold text-sm mt-0.5 block">
                    {newLoan.months
                      ? money(currentMetrics.interest)
                      : "HK$ 0"}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs font-medium">
                    實際年利率 APR
                  </span>
                  <span className="text-cyan-400 font-bold text-lg block mt-0.5">
                    {newLoan.months ? formatAPR(currentMetrics.apr) : "0.00%"}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="px-6 py-3.5 rounded-xl whitespace-nowrap"
              >
                <Plus size={18} />
                <span>儲存貸款紀錄</span>
              </Button>
            </div>
          </form>
        </Glass>

        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            進行中貸款紀錄 ({loanListWithMetrics.length})
          </h3>
          {loanListWithMetrics.length === 0 ? (
            <Empty icon={Landmark}>現時未有任何貸款紀錄</Empty>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400">貸款本金</div>
                  <div className="mt-2 text-xl font-black text-amber-400">
                    {money(totalLoanPrincipal)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400">平均 APR</div>
                  <div className="mt-2 text-xl font-black text-cyan-400">
                    {(() => {
                      const averageApr = loanListWithMetrics.length
                        ? loanListWithMetrics.reduce(
                            (sum, item) =>
                              sum +
                              (Number.isFinite(item.apr) && item.apr >= 0
                                ? item.apr
                                : 0),
                            0
                          ) / loanListWithMetrics.length
                        : 0;
                      return formatAPR(averageApr);
                    })()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400">總還款</div>
                  <div className="mt-2 text-xl font-black text-white">
                    {money(
                      loanListWithMetrics.reduce(
                        (sum, item) => sum + Number(item.totalRepayment || 0),
                        0
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-3 pr-4">日期</th>
                      <th className="pb-3 pr-4">銀行</th>
                      <th className="pb-3 pr-4">本金</th>
                      <th className="pb-3 pr-4">還款</th>
                      <th className="pb-3 pr-4">APR</th>
                      <th className="pb-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanListWithMetrics.map((item, index) => (
                      <tr key={item.id} className="border-t border-slate-800/80">
                        <td className="py-3 pr-4 text-slate-300">{item.date}</td>
                        <td className="py-3 pr-4 text-white">{item.bank}</td>
                        <td className="py-3 pr-4 text-slate-200">{money(item.principal)}</td>
                        <td className="py-3 pr-4 text-slate-200">
                          {money(item.monthlyPayment)} x {item.months}期
                        </td>
                        <td className="py-3 pr-4 font-bold text-cyan-400">
                          {formatAPR(item.apr)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) =>
                              handleDeleteLoan(event, item.id, index)
                            }
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {loanListWithMetrics.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-slate-400">{item.date}</span>
                        <h4 className="text-base font-bold text-white">{item.bank}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={(event) =>
                          handleDeleteLoan(event, item.id, index)
                        }
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
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
                        <span className="text-slate-200 font-medium">
                          {money(item.monthlyPayment)} x {item.months}期
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] bg-slate-900 border border-slate-700/80 text-slate-300 px-2 py-0.5 rounded">
                        手續費: {money(item.upfrontFee || 0)}
                      </span>
                      <span className="text-[11px] bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 px-2 py-0.5 rounded">
                        回贈: {money(item.rebate || 0)}
                      </span>
                      <span className="text-[11px] bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold px-2 py-0.5 rounded ml-auto">
                        APR: {formatAPR(item.apr)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Glass>
      </div>
    )}

    {/* ====== 貸款管理備忘錄 ====== */}
    {tab === "loans" && (
      <div className="space-y-6">
        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            新增財務備忘錄
          </h3>
          <form onSubmit={handleAddMemo} className="flex gap-3">
            <input
              type="text"
              placeholder="如：提醒 10 月 15 日前填寫貸款續約表格..."
              className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
            />
            <Button variant="primary" type="submit">
              新增備忘
            </Button>
          </form>
        </Glass>

        <Glass className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            所有備忘條目
          </h3>
          {loanMemos.length === 0 ? (
            <Empty>未有任何備忘紀錄</Empty>
          ) : (
            <div className="space-y-3">
              {loanMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm text-slate-200">{memo.text}</p>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {memo.date}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteMemo(memo.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>
    )}

    {tab === "advisor" && (
      <div className="space-y-6">
        <Glass className="p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gemini AI 理財顧問</h2>
              <p className="mt-1 text-sm text-slate-400">根據目前收支、信用卡與貸款資料提供個人化建議。</p>
            </div>
          </div>
          <form onSubmit={handleAskAdvisor} className="space-y-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block text-xs font-medium text-slate-400">想詢問甚麼？</span>
              <textarea
                rows="4"
                placeholder="例如：我應該優先償還哪筆貸款？如何減少本月開支？"
                className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500"
                value={advisorPrompt}
                onChange={(event) => setAdvisorPrompt(event.target.value)}
              />
            </label>
            <Button variant="primary" type="submit" disabled={advisorStatus === "loading"}>
              <Sparkles size={16} />
              {advisorStatus === "loading" ? "正在分析..." : "取得理財建議"}
            </Button>
          </form>
        </Glass>

        {advisorResponse && (
          <Glass className="p-6">
            <h3 className="mb-3 text-base font-bold text-white">顧問建議</h3>
            <p className={`whitespace-pre-wrap text-sm leading-7 ${advisorStatus === "error" ? "text-rose-300" : "text-slate-200"}`}>
              {advisorResponse}
            </p>
          </Glass>
        )}
      </div>
    )}
    </main>
  </div>


);
}