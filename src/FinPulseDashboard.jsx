import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChartPie as PieIcon,
  Cloud,
  CloudCheck,
  CreditCard,
  Database,
  FileText,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
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

const TITANIUM_THEMES = [
{
name: "極光幻藍",
cardBg:
"bg-gradient-to-br from-cyan-600 via-indigo-700 to-slate-900 border-cyan-400/50 text-white shadow-lg shadow-cyan-950/50",
},
{
name: "電光霓紫",
cardBg:
"bg-gradient-to-br from-fuchsia-600 via-purple-700 to-slate-900 border-fuchsia-400/50 text-white shadow-lg shadow-fuchsia-950/50",
},
{
name: "耀光赤金",
cardBg:
"bg-gradient-to-br from-amber-500 via-orange-600 to-stone-900 border-amber-400/50 text-white shadow-lg shadow-amber-950/50",
},
{
name: "薄荷翡翠",
cardBg:
"bg-gradient-to-br from-emerald-500 via-teal-700 to-slate-900 border-emerald-400/50 text-white shadow-lg shadow-emerald-950/50",
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
      className={`bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl ${className}`}
    >
      {children}
    </section>
  );
}

function Button({ children, variant = "ghost", className = "", ...props }) {
  const baseStyle =
    "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer";
  const variants = {
    primary:
      "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
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

export default function FinPulseDashboard() {
const [tab, setTab] = useState("overview");
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

const fileInputRef = useRef(null);

const exportWorkbook = () => {
  const workbook = XLSX.utils.book_new();
  const workbookSheets = {
    cards: cards,
    transactions,
    incomes,
    loans,
    memos: loanMemos,
  };

  Object.entries(workbookSheets).forEach(([sheetName, rows]) => {
    const table = rows.map((row) => ({ ...row }));
    const worksheet = XLSX.utils.json_to_sheet(table);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  });

  XLSX.writeFile(workbook, `finpulse-export-${today()}.xlsx`);
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
paymentAmount: Number(newCard.paymentAmount) || 0,
isPaid: false,
};
const next = [item, ...cards];
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),transparent_25%)]" />
      {/* ====== 頂部 Header ====== */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 px-6 py-5 shadow-[0_10px_30px_rgba(2,6,23,0.28)] backdrop-blur-xl md:flex md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              FP
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">FinPulse 金融脈搏</h1>
              <p className="text-xs text-slate-400">
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

          <Button variant="secondary" onClick={exportWorkbook} className="text-xs">
            匯出 XLSX
          </Button>
          <Button
            variant="primary"
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
            variant="secondary"
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

    {/* ====== 導航選單 ====== */}
    <nav className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto border-b border-slate-800/80 px-4 pb-3 pt-4">
      {[
        { id: "overview", label: "財務總覽及報表", icon: LayoutDashboard },
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            tab === id
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </nav>

    {/* ====== Tab 1: 財務總覽 ====== */}
    {tab === "overview" && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">
              淨資產 / 淨結餘
            </span>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {money(totalIncome - totalExpense)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">
              總收入
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {money(totalIncome)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">
              總開支
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {money(totalExpense)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">
              貸款總本金
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {money(totalLoanPrincipal)}
            </div>
          </Glass>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Glass className="p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PieIcon size={18} className="text-cyan-400" />
              開支類別分佈
            </h3>
            {categoryPieData.length === 0 ? (
              <Empty>暫無交易資料以製作圖表</Empty>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Glass>

          <Glass className="p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Receipt size={18} className="text-cyan-400" />
              最新交易預覽
            </h3>
            {transactions.length === 0 ? (
              <Empty>暫無交易紀錄</Empty>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {tx.description}
                      </div>
                      <span className="text-xs text-slate-500">
                        {tx.date} · {tx.category}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-rose-400">
                      -{money(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Glass>
        </div>
      </div>
    )}

    {/* ====== 財務總覽報表 ====== */}
    {tab === "overview" && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">總收入</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {money(totalIncome)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">總開支</span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {money(totalExpense)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">月淨額</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {money(monthlyNetData[monthlyNetData.length - 1]?.net || 0)}
            </div>
          </Glass>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Glass className="p-6">
            <h3 className="text-base font-bold text-white mb-4">月度收支趨勢</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyNetData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#incomeFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="url(#expenseFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Glass>

          <Glass className="p-6">
            <h3 className="text-base font-bold text-white mb-4">支出類別排行</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdownData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#22d3ee" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        </div>

        <Glass className="p-6">
          <h3 className="text-base font-bold text-white mb-4">貸款 APR 比較</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart key={loanPerformanceData.length} data={loanPerformanceData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="bank" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip formatter={formatAPR} />
                <Line type="monotone" dataKey="apr" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Glass>
      </div>
    )}

    {/* ====== Tab 3: 貸款分析 ====== */}
    {tab === "analysis" && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">總月供</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {money(loanForecastSummary.totalMonthlyPayment)}
            </div>
          </Glass>
          <Glass className="p-5">
            <span className="text-xs text-slate-400 font-medium">預估利息</span>
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
          <h3 className="text-lg font-bold text-white mb-4">新增信用卡</h3>
          <form
            onSubmit={handleAddCard}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4"
          >
            <Field label="卡片名稱">
              <input
                type="text"
                placeholder="如：Citi Cash Back"
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none focus:border-cyan-500"
                value={newCard.name}
                onChange={(e) =>
                  setNewCard({ ...newCard, name: e.target.value })
                }
              />
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
            const theme = TITANIUM_THEMES[idx % TITANIUM_THEMES.length];
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
                          -{money(tx.amount)}
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
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
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
  </div>


);
}