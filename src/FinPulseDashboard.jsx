import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  RefreshCcw,
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
const loanMetrics = (principal, payment, termMonths, rebate = 0) => {
  const amount = Number(principal) || 0;
  const monthlyPayment = Number(payment) || 0;
  const months = Number(termMonths) || 0;
  const cashReceived = amount + (Number(rebate) || 0);
  const totalRepayment = monthlyPayment * months;
  const interest = Math.max(0, totalRepayment - cashReceived);
  if (!cashReceived || !monthlyPayment || !months || totalRepayment <= cashReceived) {
    return { interest, apr: 0 };
  }

  let low = 0;
  let high = 1;
  for (let index = 0; index < 60; index += 1) {
    const monthlyRate = (low + high) / 2;
    const balance =
      cashReceived * (1 + monthlyRate) ** months -
      monthlyPayment * (((1 + monthlyRate) ** months - 1) / monthlyRate);
    if (balance > 0) low = monthlyRate;
    else high = monthlyRate;
  }
  return { interest, apr: ((1 + (low + high) / 2) ** 12 - 1) * 100 };
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
      : typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const uploadRef = useRef(null);

  const writeLocal = (nextCards, nextTransactions, nextIncomes = null) => {
    if (nextCards !== null) {
      setCards(nextCards);
      localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(nextCards));
    }
    if (nextTransactions !== null) {
      setTransactions(nextTransactions);
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(nextTransactions));
    }
    if (nextIncomes !== null) {
      setIncomes(nextIncomes);
      localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(nextIncomes));
    }
  };
  const writeLoanData = (nextLoans, nextMemos) => {
    if (nextLoans !== null) {
      setLoans(nextLoans);
      localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));
    }
    if (nextMemos !== null) {
      setLoanMemos(nextMemos);
      localStorage.setItem(STORAGE_KEY_LOAN_MEMOS, JSON.stringify(nextMemos));
    }
  };
  useEffect(() => {
    let stopCards = () => {},
      stopTransactions = () => {},
      stopIncomes = () => {};
    let authVersion = 0;

    if (!auth || !db) {
      return undefined;
    }

    const stopAuth = onAuthStateChanged(auth, (nextUser) => {
      authVersion += 1;
      const currentAuthVersion = authVersion;
      stopCards();
      stopTransactions();
      stopIncomes();
      stopCards = () => {};
      stopTransactions = () => {};
      stopIncomes = () => {};
      setUser(nextUser);
      setUid(nextUser?.uid || null);

      if (!nextUser) {
        setCloud("local");
        return;
      }

      const bindCloudData = () => {
        if (currentAuthVersion !== authVersion) return;
        setCloud("connected");
        stopCards = onSnapshot(
          collection(db, "users", nextUser.uid, "cards"),
          (snapshot) => {
            writeLocal(
              snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
              null,
            );
          },
          () => setCloud("local"),
        );
        stopTransactions = onSnapshot(
          collection(db, "users", nextUser.uid, "transactions"),
          (snapshot) => {
            writeLocal(
              null,
              snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
            );
          },
          () => setCloud("local"),
        );
        stopIncomes = onSnapshot(
          collection(db, "users", nextUser.uid, "incomes"),
          (snapshot) => {
            writeLocal(
              null,
              null,
              snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
            );
          },
          () => setCloud("local"),
        );
      };

      const syncLocalPreview = async () => {
        const localCards = fromStorage(STORAGE_KEY_CARDS);
        const localTransactions = fromStorage(STORAGE_KEY_TX);
        const localIncomes = fromStorage(STORAGE_KEY_INCOME);
        if (!localCards.length && !localTransactions.length && !localIncomes.length) {
          bindCloudData();
          return;
        }

        try {
          const [cardSnapshot, transactionSnapshot, incomeSnapshot] = await Promise.all([
            getDocs(collection(db, "users", nextUser.uid, "cards")),
            getDocs(collection(db, "users", nextUser.uid, "transactions")),
            getDocs(collection(db, "users", nextUser.uid, "incomes")),
          ]);
          if (currentAuthVersion !== authVersion) return;

          const cloudCards = cardSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          const cloudTransactions = transactionSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          const cloudIncomes = incomeSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          const shouldMerge = window.confirm(
            "是否將本機資料合併並上傳至雲端？",
          );

          if (shouldMerge) {
            const cardsById = new Map(
              cloudCards.map((card) => [card.id, card]),
            );
            localCards.forEach((card) => cardsById.set(card.id, card));
            const mergedCards = [...cardsById.values()];
            const seenTransactions = new Set(
              cloudTransactions.map(transactionKey),
            );
            const mergedTransactions = [...cloudTransactions];
            localTransactions.forEach((transaction) => {
              const key = transactionKey(transaction);
              if (!seenTransactions.has(key)) {
                seenTransactions.add(key);
                mergedTransactions.push(transaction);
              }
            });
            const incomesById = new Map(
              cloudIncomes.map((income) => [income.id, income]),
            );
            localIncomes.forEach((income) => incomesById.set(income.id, income));
            const mergedIncomes = [...incomesById.values()];

            const batch = writeBatch(db);
            mergedCards.forEach((card) =>
              batch.set(doc(db, "users", nextUser.uid, "cards", card.id), card),
            );
            mergedTransactions.forEach((transaction) =>
              batch.set(
                doc(db, "users", nextUser.uid, "transactions", transaction.id),
                transaction,
              ),
            );
            mergedIncomes.forEach((income) =>
              batch.set(
                doc(db, "users", nextUser.uid, "incomes", income.id),
                income,
              ),
            );
            await batch.commit();
            writeLocal(mergedCards, mergedTransactions, mergedIncomes);
            setToast("本機資料已合併並上傳至雲端");
          }
          bindCloudData();
        } catch {
          setCloud("local");
          bindCloudData();
        }
      };

      syncLocalPreview();
    });

    return () => {
      stopAuth();
      stopCards();
      stopTransactions();
      stopIncomes();
    };
  }, []);
  const loginWithGoogle = async () => {
    if (!auth) {
      setToast("Firebase 尚未設定，現時使用本機模式");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      setToast("Google 帳號登入成功");
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") {
        setToast("Google 登入失敗，請稍後再試");
      }
    }
  };
  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setToast("已登出 Google 帳號");
    } catch {
      setToast("登出失敗，請稍後再試");
    }
  };
  const saveCollection = async (type, next) => {
    writeLocal(
      type === "cards" ? next : null,
      type === "transactions" ? next : null,
      type === "incomes" ? next : null,
    );
    if (!uid || !db) return;
    setSyncing(true);
    try {
      const existing = await getDocs(collection(db, "users", uid, type));
      const nextIds = new Set(next.map((item) => item.id));
      const batch = writeBatch(db);
      existing.docs.forEach((item) => {
        if (!nextIds.has(item.id)) batch.delete(item.ref);
      });
      next.forEach((item) =>
        batch.set(doc(db, "users", uid, type, item.id), item),
      );
      await batch.commit();
      setCloud("connected");
    } catch {
      setCloud("local");
    }
    setSyncing(false);
  };
  const removeItem = async (type, id) => {
    const list =
      type === "cards" ? cards : type === "transactions" ? transactions : incomes;
    writeLocal(
      type === "cards" ? list.filter((item) => item.id !== id) : null,
      type === "transactions" ? list.filter((item) => item.id !== id) : null,
      type === "incomes" ? list.filter((item) => item.id !== id) : null,
    );
    if (uid && db) {
      try {
        await deleteDoc(doc(db, "users", uid, type, id));
      } catch {
        setCloud("local");
      }
    }
  };
  const clearAllData = async () => {
    if (!window.confirm("確定清空所有資料嗎？")) return;
    writeLocal([], [], []);
    writeLoanData([], []);
    if (!uid || !db) {
      setToast("資料已清空");
      return;
    }
    setSyncing(true);
    try {
      const batch = writeBatch(db);
      const [cardSnapshot, txSnapshot, incomeSnapshot] = await Promise.all([
        getDocs(collection(db, "users", uid, "cards")),
        getDocs(collection(db, "users", uid, "transactions")),
        getDocs(collection(db, "users", uid, "incomes")),
      ]);
      [...cardSnapshot.docs, ...txSnapshot.docs, ...incomeSnapshot.docs].forEach((item) =>
        batch.delete(item.ref),
      );
      await batch.commit();
      setCloud("connected");
      setToast("資料已清空");
    } catch {
      setCloud("local");
      setToast("本機資料已清空，雲端同步失敗");
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => {
    const pending = cards.filter((card) => !card.isPaid);
    const totalIncome = incomes.reduce(
      (sum, income) => sum + Number(income.amount || 0),
      0,
    );
    const spent = transactions.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0,
    );
    const totalLoanPrincipal = loans.reduce(
      (sum, loan) => sum + Number(loan.principal || 0),
      0,
    );
    const monthlyLoanPayment = loans.reduce(
      (sum, loan) => sum + Number(loan.monthlyPayment || 0),
      0,
    );
    const totalLoanInterest = loans.reduce(
      (sum, loan) => sum + Number(loan.interest || 0),
      0,
    );
    return {
      pending,
      due: pending.reduce((sum, card) => sum + Number(card.amount || 0), 0),
      paid: cards
        .filter((card) => card.isPaid)
        .reduce((sum, card) => sum + Number(card.amount || 0), 0),
      totalIncome,
      spent,
      netCashflow: totalIncome - spent,
      totalLoanPrincipal,
      monthlyLoanPayment,
      totalLoanInterest,
      loanCount: loans.length,
      rate: cards.length
        ? (cards.filter((card) => card.isPaid).length / cards.length) * 100
        : 0,
    };
  }, [cards, incomes, loans, transactions]);
  const healthStatus = useMemo(() => {
    const income = stats.totalIncome;
    const expense = stats.spent;
    const repayment = stats.monthlyLoanPayment;
    const hasData = income > 0 || expense > 0 || loans.length > 0;
    const cashflowRate = income > 0 ? (income - expense) / income : 0;
    const debtRate = income > 0 ? repayment / income : repayment > 0 ? 1 : 0;
    let level = 1;

    if (hasData && (!income || cashflowRate < -0.1 || debtRate > 0.6)) {
      level = 4;
    } else if (hasData && (cashflowRate < 0 || debtRate > 0.4)) {
      level = 3;
    } else if (hasData && (cashflowRate < 0.2 || debtRate > 0.25)) {
      level = 2;
    }

    const levels = {
      1: {
        label: "健康 😊",
        Icon: ShieldCheck,
        description: "現金流穩定，還款負擔處於健康範圍。",
      },
      2: {
        label: "中等 😌",
        Icon: AlertCircle,
        description: "現金流或還款負擔需要持續留意。",
      },
      3: {
        label: "比較危險 ⚠️",
        Icon: AlertTriangle,
        description: "支出或還款負擔偏高，建議盡快調整。",
      },
      4: {
        label: "危險 🚨",
        Icon: XCircle,
        description: "目前財務壓力很高，請優先檢視現金流。",
      },
    };
    return { level, ...levels[level], cashflowRate, debtRate };
  }, [loans.length, stats]);
  const urgent = useMemo(
    () =>
      [...stats.pending].sort((a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
      )[0],
    [stats.pending],
  );
  const pieData = useMemo(
    () =>
      CATEGORIES.map((name, index) => ({
        name,
        value: transactions
          .filter((tx) => tx.category === name)
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
        color: COLORS[index],
      })).filter((item) => item.value > 0),
    [transactions],
  );
  const loanPieData = useMemo(() => {
    const totals = new Map();
    loans.forEach((loan) => {
      const name = loan.bankName || "未指定銀行";
      totals.set(name, (totals.get(name) || 0) + Number(loan.principal || 0));
    });
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return [...totals.entries()]
      .map(([name, value], index) => ({
        name,
        value,
        percent: total ? (value / total) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .filter((item) => item.value > 0);
  }, [loans]);
  const barData = useMemo(
    () =>
      cards.map((card) => ({
        name: card.name,
        spent: transactions
          .filter((tx) => tx.cardId === card.id)
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
        due: Number(card.amount || 0),
      })),
    [cards, transactions],
  );

  const saveCard = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const card = {
      id: editingCard?.id || `card-${Date.now()}`,
      bank: form.get("bank"),
      name: String(form.get("name")).trim(),
      dueDate: form.get("dueDate"),
      amount: Number(form.get("amount")) || 0,
      isPaid: editingCard?.isPaid || false,
    };
    await saveCollection(
      "cards",
      editingCard
        ? cards.map((item) => (item.id === card.id ? card : item))
        : [...cards, card],
    );
    setModal(false);
    setEditingCard(null);
    setToast("信用卡資料已儲存");
  };
  const addTransaction = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = {
      id: `tx-${Date.now()}`,
      description: String(form.get("description")).trim(),
      amount: Number(form.get("amount")) || 0,
      category: form.get("category"),
      cardId: form.get("cardId") || "",
      date: form.get("date") || today(),
    };
    await saveCollection("transactions", [item, ...transactions]);
    event.currentTarget.reset();
    setToast("簽賬已加入");
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
        dateNF: "yyyy-mm-dd",
      });
      const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]);
      const value = (row, names) => {
        const key = Object.keys(row).find((item) =>
          names.some((name) => item.toLowerCase().includes(name)),
        );
        return key ? row[key] : "";
      };
      const imported = rows.map((row, index) => ({
        id: `tx_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`,
        date: parseExcelDate(value(row, ["日期", "date", "time"])),
        description: String(
          value(row, ["說明", "描述", "description", "name", "項目"]) ||
            "Excel 簽賬",
        ).trim(),
        cardId:
          cards.find((card) =>
            String(value(row, ["卡片", "card"])).includes(card.name),
          )?.id || "",
        amount: Number(value(row, ["金額", "amount", "value"])) || 0,
        category:
          CATEGORIES.find((category) =>
            String(value(row, ["分類", "category"])).includes(category),
          ) || "其他",
      }));
      const overwrite = window.confirm(
        "按「確定」覆蓋現有交易，按「取消」追加至現有交易並自動去重。",
      );
      const base = overwrite ? [] : transactions;
      const seen = new Set(base.map(transactionKey));
      const uniqueImported = imported.filter((item) => {
        const key = transactionKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      await saveCollection("transactions", [...uniqueImported, ...base]);
      setToast(`已匯入 ${uniqueImported.length} 筆交易`);
    } catch {
      setToast("Excel 匯入失敗，請檢查檔案格式");
    }
    event.target.value = "";
  };
  const exportJson = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ cards, transactions, incomes, loans, loanMemos }, null, 2)],
        {
        type: "application/json",
        },
      ),
    );
    link.download = `finpulse-${today()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const addIncome = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const income = {
      id: `income-${Date.now()}`,
      date: form.get("incomeDate") || today(),
      description: String(form.get("incomeDescription")).trim(),
      bankAccount: String(form.get("bankAccount")).trim(),
      amount: Number(form.get("incomeAmount")) || 0,
    };
    await saveCollection("incomes", [income, ...incomes]);
    event.currentTarget.reset();
    setToast("收入已加入");
  };
  const addLoan = (loan) => {
    writeLoanData([...loans, loan], null);
    setToast("借貸記錄已加入");
  };
  const removeLoan = (id) => {
    writeLoanData(
      loans.filter((loan) => loan.id !== id),
      loanMemos.filter((memo) => memo.loanId !== id),
    );
    setToast("借貸記錄已刪除");
  };
  const addLoanMemo = (memo) => {
    writeLoanData(null, [...loanMemos, memo]);
    setToast("備忘錄已加入");
  };
  const removeLoanMemo = (id) => {
    writeLoanData(null, loanMemos.filter((memo) => memo.id !== id));
    setToast("備忘錄已刪除");
  };
  const filtered = transactions.filter(
    (tx) =>
      `${tx.description} ${cards.find((card) => card.id === tx.cardId)?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (cardFilter === "all" || tx.cardId === cardFilter) &&
      (categoryFilter === "all" || tx.category === categoryFilter),
  );
  const HealthIcon = healthStatus.Icon;

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/60 to-slate-900 text-slate-100 relative overflow-hidden">
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />
      <div className="glow-orb orb-3" />
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Wallet size={18} />
          </div>
          <div>
            <strong>FINPULSE</strong>
            <small>PERSONAL FINANCE OS</small>
          </div>
        </div>
        <div className="header-actions">
          {user ? (
            <span className="account-status" title={user.email || user.uid}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" />
              ) : (
                <span className="account-avatar">
                  {(user.displayName || user.email || "G").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span>{user.displayName || user.email || "Google 帳號"}</span>
            </span>
          ) : (
            <Button variant="primary" onClick={loginWithGoogle}>
              <LogIn size={15} />
              使用 Google 帳號登入
            </Button>
          )}
          <span className={`sync-status ${cloud}`}>
            <span className="status-dot" />
            {syncing ? (
              "同步中"
            ) : cloud === "connected" ? (
              <>
                <CloudCheck size={14} />
                雲端同步
              </>
            ) : (
              <>
                <Cloud size={14} />
                本機模式
              </>
            )}
          </span>
          <Button onClick={clearAllData}>
            <RefreshCcw size={15} />
            清空資料
          </Button>
          <Button
            onClick={() => {
              writeLocal(cards, transactions, incomes);
              writeLoanData(loans, loanMemos);
              setToast("資料已儲存");
            }}
          >
            <Database size={15} />
            手動儲存
          </Button>
          <Button onClick={() => uploadRef.current?.click()}>
            <Upload size={15} />
            匯入 Excel
          </Button>
          <input
            ref={uploadRef}
            hidden
            type="file"
            accept=".xlsx,.xls"
            onChange={importExcel}
          />
          <Button onClick={exportJson}>
            <Download size={15} />
            備份 JSON
          </Button>
          {user && (
            <Button onClick={logout}>
              <LogOut size={15} />
              登出
            </Button>
          )}
        </div>
      </header>
      <main className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SATURDAY, SEPTEMBER 19, 2026</p>
            <h1>
              你的財務脈搏<span className="cyan">.</span>
            </h1>
            <p className="subtle">清晰掌握每一筆流動，讓每個決定都更有底氣。</p>
          </div>
          <div
            className={`health-status health-level-${healthStatus.level}`}
            role="status"
            aria-live="polite"
            aria-label={`財務健康狀況：${healthStatus.label.replace(/ 😊| 😌| ⚠️| 🚨/u, "")}`}
          >
            <HealthIcon size={21} aria-hidden="true" />
            <span>
              <small>財務健康狀況</small>
              <strong>
                {healthStatus.label.replace(/ (😊|😌|⚠️|🚨)$/u, "")}{" "}
                <span aria-hidden="true">
                  {healthStatus.label.match(/(😊|😌|⚠️|🚨)$/u)?.[0]}
                </span>
              </strong>
              <em>{healthStatus.description}</em>
            </span>
          </div>
          <div className="heading-stat">
            <ArrowUpRight size={18} />
            <span>本月支出</span>
            <strong>{money(stats.spent)}</strong>
          </div>
        </div>
        <nav className="tabs">
          {[
            ["overview", LayoutDashboard, "數據總覽與分析"],
            ["cards", CreditCard, "信用卡管理"],
            ["transactions", FileSpreadsheet, "收入與簽帳明細"],
            ["loans", Landmark, "借貸記錄"],
            ["ai", Bot, "AI 理財小幫手"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={17} />
              {label}
              {id === "cards" && <b>{cards.length}</b>}
              {id === "transactions" && <b>{transactions.length}</b>}
            </button>
          ))}
        </nav>
        {tab === "overview" && (
          <Overview
            stats={stats}
            urgent={urgent}
            pieData={pieData}
            loanPieData={loanPieData}
            barData={barData}
            markPaid={() =>
              urgent &&
              saveCollection(
                "cards",
                cards.map((card) =>
                  card.id === urgent.id ? { ...card, isPaid: true } : card,
                ),
              )
            }
          />
        )}
        {tab === "cards" && (
          <CardsView
            cards={cards}
            open={() => {
              setEditingCard(null);
              setModal(true);
            }}
            edit={(card) => {
              setEditingCard(card);
              setModal(true);
            }}
            toggle={(card) =>
              saveCollection(
                "cards",
                cards.map((item) =>
                  item.id === card.id
                    ? { ...item, isPaid: !item.isPaid }
                    : item,
                ),
              )
            }
            remove={(id) => removeItem("cards", id)}
            updateDate={(id, dueDate) =>
              saveCollection(
                "cards",
                cards.map((item) =>
                  item.id === id ? { ...item, dueDate } : item,
                ),
              )
            }
          />
        )}
        {tab === "transactions" && (
          <TransactionsView
            cards={cards}
            transactions={filtered}
            incomes={incomes}
            incomeTotal={incomes.reduce(
              (sum, income) => sum + Number(income.amount || 0),
              0,
            )}
            query={query}
            setQuery={setQuery}
            cardFilter={cardFilter}
            setCardFilter={setCardFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            add={addTransaction}
            remove={(id) => removeItem("transactions", id)}
            addIncome={addIncome}
            removeIncome={(id) => removeItem("incomes", id)}
            updateCategory={(id, category) =>
              saveCollection(
                "transactions",
                transactions.map((item) =>
                  item.id === id ? { ...item, category } : item,
                ),
              )
            }
            updateCard={(id, cardId) =>
              saveCollection(
                "transactions",
                transactions.map((item) =>
                  item.id === id ? { ...item, cardId } : item,
                ),
              )
            }
          />
        )}
        {tab === "loans" && (
          <LoansView
            loans={loans}
            loanMemos={loanMemos}
            addLoan={addLoan}
            removeLoan={removeLoan}
            addLoanMemo={addLoanMemo}
            removeLoanMemo={removeLoanMemo}
          />
        )}
        {tab === "ai" && <AiView cards={cards} transactions={transactions} />}
      </main>
      {modal && (
        <CardModal
          card={editingCard}
          close={() => {
            setModal(false);
            setEditingCard(null);
          }}
          save={saveCard}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          {toast}
          <button onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Overview({ stats, urgent, pieData, loanPieData, barData, markPaid }) {
  return (
    <>
      <>
        {urgent && (
          <Glass
            className={`alert-banner ${urgent.dueDate < today() ? "overdue" : ""}`}
          >
            <AlertCircle size={20} />
            <div className="alert-copy">
              <strong>
                {urgent.dueDate < today() ? "還款已逾期" : "即將到期的還款提醒"}
              </strong>
              <span>
                {urgent.name} · 到期日 {urgent.dueDate || "未設定"} · 應還{" "}
                <b>{money(urgent.amount)}</b>
              </span>
            </div>
            <Button variant="success" onClick={markPaid}>
              <Check size={15} />
              標記為已還款
            </Button>
          </Glass>
        )}
      </>
      <div className="kpi-grid">
        <Kpi
          icon={ArrowUpRight}
          label="總收入"
          value={money(stats.totalIncome)}
          meta="全部收入記錄"
          tone="emerald"
        />
        <Kpi
          icon={Wallet}
          label="本期待繳總金額"
          value={money(stats.due)}
          meta={`已還款 ${money(stats.paid)}`}
          tone="cyan"
        />
        <Kpi
          icon={ArrowDownToLine}
          label="總支出"
          value={money(stats.spent)}
          meta="全部交易紀錄"
          tone="rose"
        />
        <Kpi
          icon={ArrowUpRight}
          label="淨現金流 / 結餘"
          value={signedMoney(stats.netCashflow)}
          meta={stats.netCashflow >= 0 ? "收入高於支出" : "支出高於收入"}
          tone={stats.netCashflow >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          icon={CreditCard}
          label="待還款卡片"
          value={`${stats.pending.length} 張`}
          meta="未結清卡片"
          tone="amber"
        />
        <Kpi
          icon={CheckCircle2}
          label="還款完成率"
          value={`${stats.rate.toFixed(0)}%`}
          meta="本期整體進度"
          tone="emerald"
          progress={stats.rate}
        />
        <Kpi
          icon={Landmark}
          label="總貸款金額"
          value={money(stats.totalLoanPrincipal)}
          meta={`${stats.loanCount} 筆借貸記錄`}
          tone="cyan"
        />
        <Kpi
          icon={ArrowDownToLine}
          label="每月總還款負擔"
          value={money(stats.monthlyLoanPayment)}
          meta="所有貸款每月還款"
          tone="amber"
        />
        <Kpi
          icon={Wallet}
          label="全期總利息支出"
          value={money(stats.totalLoanInterest)}
          meta="按已記錄貸款估算"
          tone="rose"
        />
      </div>
      <div className="chart-grid">
        <Glass className="chart-panel cashflow-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">CASHFLOW BALANCE</p>
              <h2>收入與支出對比</h2>
            </div>
            <span className="chart-note">收入 ／ 支出</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                {
                  name: "總額",
                  income: stats.totalIncome,
                  expense: stats.spent,
                },
              ]}
              barGap={12}
            >
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTip />} />
              <Legend />
              <Bar
                dataKey="income"
                name="總收入"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="總支出"
                fill="#fb7185"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Glass>
        <Glass className="chart-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">SPENDING MIX</p>
              <h2>消費分類</h2>
            </div>
            <span className="chart-note">本期支出佔比</span>
          </div>
          {pieData.length ? (
            <div className="donut-wrap">
              <ResponsiveContainer width="55%" height={230}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={68}
                    outerRadius={94}
                    paddingAngle={3}
                  >
                    {pieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend-list">
                {pieData.map((item) => (
                  <div key={item.name}>
                    <i style={{ background: item.color }} />
                    {item.name}
                    <b>{money(item.value)}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty>新增簽賬後，這裡會顯示消費結構</Empty>
          )}
        </Glass>
        <Glass className="chart-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">LOAN MIX</p>
              <h2>貸款本金分佈</h2>
            </div>
            <span className="chart-note">按銀行佔總貸款本金</span>
          </div>
          {loanPieData.length ? (
            <div className="donut-wrap">
              <ResponsiveContainer width="55%" height={230}>
                <PieChart>
                  <Pie
                    data={loanPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={94}
                    paddingAngle={3}
                  >
                    {loanPieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend-list">
                {loanPieData.map((item) => (
                  <div key={item.name}>
                    <i style={{ background: item.color }} />
                    {item.name}
                    <b>{item.percent.toFixed(1)}%</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty icon={Landmark}>尚無借貸記錄</Empty>
          )}
        </Glass>
        <Glass className="chart-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">CARD PERFORMANCE</p>
              <h2>信用卡使用概覽</h2>
            </div>
            <span className="chart-note">簽賬額 ／ 應還金額</span>
          </div>
          {barData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTip />} />
                <Legend />
                <Bar
                  dataKey="spent"
                  name="簽賬額"
                  fill="#22d3ee"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="due"
                  name="應還金額"
                  fill="#818cf8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty>新增信用卡後，這裡會顯示比較</Empty>
          )}
        </Glass>
      </div>
    </>
  );
}
function Kpi({ icon: Icon, label, value, meta, tone, progress }) {
  const toneClasses = {
    cyan:
      "bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-transparent border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.15)] text-cyan-300",
    rose:
      "bg-gradient-to-br from-rose-500/15 via-pink-600/10 to-transparent border-rose-400/40 shadow-[0_0_20px_rgba(251,113,133,0.15)] text-rose-300",
    amber:
      "bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)] text-amber-300",
    emerald:
      "bg-gradient-to-br from-emerald-500/15 via-teal-600/10 to-transparent border-emerald-400/40 shadow-[0_0_20px_rgba(52,211,153,0.15)] text-emerald-300",
  };

  return (
    <Glass className={`kpi ${tone} ${toneClasses[tone] || ""}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <small>{meta}</small>
      {progress !== undefined && (
        <div className="progress">
          <i
            className="bg-gradient-to-r from-emerald-400 to-cyan-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Glass>
  );
}
function ChartTip({ active, payload }) {
  return active && payload?.length ? (
    <div className="chart-tooltip">
      <span>{payload[0].name}</span>
      <b>{money(payload[0].value)}</b>
    </div>
  ) : null;
}

function CardsView({ cards, open, edit, toggle, remove, updateDate }) {
  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <div>
          <p className="eyebrow">YOUR WALLET</p>
          <h2>
            信用卡管理 <span className="count">{cards.length}</span>
          </h2>
        </div>
        <Button variant="primary" onClick={open}>
          <Plus size={16} />
          新增信用卡
        </Button>
      </div>
      <div className="card-grid">
        {cards.map((card, index) => (
          <CardTile
            key={card.id}
            card={card}
            theme={TITANIUM_THEMES[index % TITANIUM_THEMES.length]}
            edit={edit}
            toggle={toggle}
            remove={remove}
            updateDate={updateDate}
          />
        ))}
      </div>
      {!cards.length && (
        <Glass>
          <Empty icon={CreditCard}>還沒有信用卡，新增第一張卡開始追蹤。</Empty>
        </Glass>
      )}
    </div>
  );
}

function LoansView({
  loans,
  loanMemos,
  addLoan,
  removeLoan,
  addLoanMemo,
  removeLoanMemo,
}) {
  const [form, setForm] = useState({
    bankName: "",
    startDate: today(),
    principal: "",
    monthlyPayment: "",
    rebate: "",
    termMonths: "",
  });
  const [memoForm, setMemoForm] = useState({
    loanId: loans[0]?.id || "",
    text: "",
  });
  const idSequence = useRef(0);
  const preview = loanMetrics(
    form.principal,
    form.monthlyPayment,
    form.termMonths,
    form.rebate,
  );
  const updateField = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));

  const submitLoan = (event) => {
    event.preventDefault();
    addLoan({
      id: createId(`loan-${idSequence.current++}`),
      bankName: form.bankName.trim(),
      startDate: form.startDate,
      principal: Number(form.principal),
      monthlyPayment: Number(form.monthlyPayment),
      rebate: Number(form.rebate) || 0,
      termMonths: Number(form.termMonths),
      interest: preview.interest,
      apr: preview.apr,
    });
    setForm({
      bankName: "",
      startDate: today(),
      principal: "",
      monthlyPayment: "",
      rebate: "",
      termMonths: "",
    });
  };

  const submitMemo = (event) => {
    event.preventDefault();
    if (!memoForm.loanId || !memoForm.text.trim()) return;
    addLoanMemo({
      id: createId(`loan-memo-${idSequence.current++}`),
      loanId: memoForm.loanId,
      text: memoForm.text.trim(),
    });
    setMemoForm((current) => ({ ...current, text: "" }));
  };

  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <div>
          <p className="eyebrow">LOAN TRACKER</p>
          <h2>
            借貸記錄 <span className="count">{loans.length}</span>
          </h2>
        </div>
        <span className="import-hint">
          <Landmark size={16} />
          利息與 APR 即時計算
        </span>
      </div>
      <Glass className="loan-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">LOAN SETUP</p>
            <h2>新增貸款</h2>
          </div>
          <span className="chart-note">請輸入還款期數以計算 APR</span>
        </div>
        <form className="loan-form" onSubmit={submitLoan}>
          <Field label="銀行名稱">
            <select
              value={form.bankName}
              onChange={(event) => updateField("bankName", event.target.value)}
              required
            >
              <option value="">選擇銀行</option>
              {LOAN_BANKS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="放款日期">
            <input
              type="date"
              className="dark-date"
              value={form.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
              required
            />
          </Field>
          <Field label="貸款金額">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.principal}
              onChange={(event) => updateField("principal", event.target.value)}
              required
            />
          </Field>
          <Field label="每月還款金額">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.monthlyPayment}
              onChange={(event) =>
                updateField("monthlyPayment", event.target.value)
              }
              required
            />
          </Field>
          <Field label="還款期數（月）">
            <input
              type="number"
              min="1"
              step="1"
              value={form.termMonths}
              onChange={(event) => updateField("termMonths", event.target.value)}
              required
            />
          </Field>
          <Field label="回贈金額">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.rebate}
              onChange={(event) => updateField("rebate", event.target.value)}
            />
          </Field>
          <div className="loan-calculation">
            <span>全期利息<strong>{money(preview.interest)}</strong></span>
            <span>實際年利率 APR<strong>{preview.apr.toFixed(2)}%</strong></span>
          </div>
          <Button variant="primary">
            <Plus size={16} />
            新增貸款
          </Button>
        </form>
      </Glass>
      <Glass className="loan-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">LOAN PORTFOLIO</p>
            <h2>貸款列表</h2>
          </div>
        </div>
        {loans.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="table-header">銀行</th>
                  <th className="table-header">放款日期</th>
                  <th className="align-right">貸款金額</th>
                  <th className="align-right">每月還款</th>
                  <th className="align-right">回贈</th>
                  <th className="align-right">全期利息</th>
                  <th className="align-right">APR</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td><strong>{loan.bankName}</strong></td>
                    <td className="muted">{loan.startDate}</td>
                    <td className="align-right">{money(loan.principal)}</td>
                    <td className="align-right">{money(loan.monthlyPayment)}</td>
                    <td className="align-right income-amount">{money(loan.rebate)}</td>
                    <td className="align-right amount">{money(loan.interest)}</td>
                    <td className="align-right loan-apr">{Number(loan.apr || 0).toFixed(2)}%</td>
                    <td>
                      <button
                        className="icon-button"
                        title="刪除貸款"
                        onClick={() => removeLoan(loan.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Landmark}>新增貸款後，這裡會顯示貸款列表</Empty>
        )}
      </Glass>
      <Glass className="loan-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">LOAN NOTES</p>
            <h2>貸款備忘錄</h2>
          </div>
        </div>
        <form className="memo-form" onSubmit={submitMemo}>
          <Field label="對應貸款">
            <select
              value={memoForm.loanId}
              onChange={(event) =>
                setMemoForm((current) => ({ ...current, loanId: event.target.value }))
              }
              required
              disabled={!loans.length}
            >
              <option value="">選擇貸款</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>{loan.bankName}</option>
              ))}
            </select>
          </Field>
          <Field label="備註">
            <textarea
              value={memoForm.text}
              onChange={(event) =>
                setMemoForm((current) => ({ ...current, text: event.target.value }))
              }
              placeholder="輸入還款、文件或聯絡事項備註"
              required
            />
          </Field>
          <Button variant="success" disabled={!loans.length}>
            <Plus size={16} />
            新增備忘錄
          </Button>
        </form>
        {loanMemos.length ? (
          <div className="table-wrap memo-list">
            <table>
              <thead>
                <tr>
                  <th className="table-header">對應貸款</th>
                  <th className="table-header">備註</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loanMemos.map((memo) => (
                  <tr key={memo.id}>
                    <td><strong>{loans.find((loan) => loan.id === memo.loanId)?.bankName || "已刪除貸款"}</strong></td>
                    <td className="memo-text">{memo.text}</td>
                    <td>
                      <button className="icon-button" title="刪除備忘錄" onClick={() => removeLoanMemo(memo.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={FileSpreadsheet}>新增備忘錄後，這裡會顯示詳細事項</Empty>
        )}
      </Glass>
    </div>
  );
}

function CardTile({ card, theme, edit, toggle, remove, updateDate }) {
  const style = BANK_STYLES[card.bank] || BANK_STYLES.其他銀行;
  const dateRef = useRef(null);
  return (
    <div
      className="credit-card"
      data-theme={theme.name}
      style={{
        "--card-a": theme.colors[0],
        "--card-b": theme.colors[1],
        "--card-c": theme.colors[2],
        "--card-accent": style[2],
      }}
    >
      <div className="card-shine" />
      <div className="card-top">
        <span>{card.bank}</span>
        <span className={`card-status ${card.isPaid ? "paid" : ""}`}>
          <span className="theme-name">{theme.name}</span>
          {card.isPaid ? (
            <>
              <CheckCircle2 size={12} />
              已結清
            </>
          ) : (
            <>
              <AlertCircle size={12} />
              待還款
            </>
          )}
        </span>
        <Landmark size={20} />
      </div>
      <Chip />
      <p className="card-number">
        •••• &nbsp;•••• &nbsp;•••• &nbsp;{String(card.id).slice(-4)}
      </p>
      <div className="card-bottom">
        <div>
          <small>CARD HOLDER</small>
          <strong>{card.name}</strong>
        </div>
        <div className="card-due">
          <small>應還金額</small>
          <strong>{money(card.amount)}</strong>
        </div>
      </div>
      <div className="card-actions">
        <span className={card.isPaid ? "paid" : ""}>
          到期日 {card.dueDate || "未設定"}
        </span>
        <div>
          <button
            title="修改到期日"
            onClick={() => dateRef.current?.showPicker?.()}
          >
            <input
              ref={dateRef}
              className="card-date dark-date"
              type="date"
              value={card.dueDate || ""}
              onChange={(event) => updateDate(card.id, event.target.value)}
            />
          </button>
          <button title="編輯" onClick={() => edit(card)}>
            <Edit3 size={14} />
          </button>
          <button title="切換還款狀態" onClick={() => toggle(card)}>
            <Check size={14} />
          </button>
          <button title="刪除" onClick={() => remove(card.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
function CardModal({ card, close, save }) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">CARD SETUP</p>
            <h2>{card ? "編輯信用卡" : "新增信用卡"}</h2>
          </div>
          <button onClick={close}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={save}>
          <Field label="發卡銀行">
            <select name="bank" defaultValue={card?.bank || BANKS[0]}>
              {BANKS.map((bank) => (
                <option key={bank}>{bank}</option>
              ))}
            </select>
          </Field>
          <Field label="卡片名稱">
            <input
              name="name"
              defaultValue={card?.name || ""}
              placeholder="例如：日常消費卡"
              required
            />
          </Field>
          <div className="form-row">
            <Field label="還款日期">
              <input
                name="dueDate"
                type="date"
                defaultValue={card?.dueDate || today()}
                className="dark-date"
                required
              />
            </Field>
            <Field label="本期應還金額">
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={card?.amount || ""}
                required
              />
            </Field>
          </div>
          <Button variant="primary">
            <Check size={16} />
            儲存信用卡
          </Button>
        </form>
      </div>
    </div>
  );
}

function TransactionsView({
  cards,
  transactions,
  incomes,
  incomeTotal,
  query,
  setQuery,
  cardFilter,
  setCardFilter,
  categoryFilter,
  setCategoryFilter,
  add,
  remove,
  addIncome,
  removeIncome,
  updateCategory,
  updateCard,
}) {
  return (
    <div className="view-stack">
      <div className="view-toolbar">
        <div>
          <p className="eyebrow">CASHFLOW LEDGER</p>
          <h2>
            收入與簽帳明細 <span className="count">{transactions.length}</span>
          </h2>
        </div>
        <span className="import-hint">
          <FileSpreadsheet size={16} />
          支援 .xlsx / .xls
        </span>
      </div>
      <Glass className="income-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">INCOME TRACKER</p>
            <h2>手動收入記錄</h2>
          </div>
          <strong className="income-total">收入總額 {money(incomeTotal)}</strong>
        </div>
        <form className="income-form" onSubmit={addIncome}>
          <Field label="日期">
            <input
              name="incomeDate"
              type="date"
              defaultValue={today()}
              className="dark-date"
              required
            />
          </Field>
          <Field label="記明 / 說明">
            <input
              name="incomeDescription"
              placeholder="例如：薪金、 freelance 收入"
              required
            />
          </Field>
          <Field label="銀行帳戶">
            <select name="bankAccount" defaultValue={BANKS[0]}>
              {BANKS.map((bank) => (
                <option key={bank}>{bank}</option>
              ))}
            </select>
          </Field>
          <Field label="金額">
            <input
              name="incomeAmount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </Field>
          <Button variant="success">
            <Plus size={16} />
            新增收入
          </Button>
        </form>
        <div className="income-list">
          {incomes.length ? (
            <table>
              <thead>
                <tr>
                  <th className="table-header">日期</th>
                  <th className="table-header">記明 / 說明</th>
                  <th className="table-header">銀行帳戶</th>
                  <th className="align-right">金額</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income.id}>
                    <td className="muted">{income.date?.slice(0, 10)}</td>
                    <td><strong>{income.description}</strong></td>
                    <td className="muted">{income.bankAccount}</td>
                    <td className="align-right income-amount">{money(income.amount)}</td>
                    <td>
                      <button
                        className="icon-button"
                        title="刪除收入"
                        onClick={() => removeIncome(income.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty icon={Wallet}>新增收入後，這裡會顯示收入記錄</Empty>
          )}
        </div>
      </Glass>
      <div className="transaction-layout">
        <Glass>
          <form className="tx-form" onSubmit={add}>
            <h3>
              <Plus size={16} />
              新增單筆簽賬
            </h3>
            <Field label="說明">
              <input name="description" placeholder="例如：週末晚餐" required />
            </Field>
            <div className="form-row">
              <Field label="金額">
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </Field>
              <Field label="日期">
                <input
                  name="date"
                  type="date"
                  defaultValue={today()}
                  className="dark-date"
                />
              </Field>
            </div>
            <Field label="信用卡">
              <select name="cardId">
                <option value="">未指定卡片</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="消費分類">
              <select name="category" defaultValue={CATEGORIES[0]}>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Button variant="primary">
              <Plus size={16} />
              加入簽賬
            </Button>
          </form>
        </Glass>
        <Glass className="ledger">
          <div className="filters">
            <div className="search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋說明或卡片..."
              />
            </div>
            <select
              value={cardFilter}
              onChange={(event) => setCardFilter(event.target.value)}
            >
              <option value="all">所有信用卡</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">所有分類</option>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <Filter size={16} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="table-header">日期</th>
                  <th className="table-header">說明</th>
                  <th className="table-header">信用卡</th>
                  <th className="table-header">分類</th>
                  <th className="align-right">金額</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="muted">{tx.date?.slice(0, 10)}</td>
                    <td>
                      <strong>{tx.description}</strong>
                    </td>
                    <td>
                      <select
                        className="category-select card-selector"
                        value={tx.cardId || ""}
                        onChange={(event) =>
                          updateCard(tx.id, event.target.value)
                        }
                      >
                        <option value="">未指定</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="category-select"
                        value={tx.category}
                        onChange={(event) =>
                          updateCategory(tx.id, event.target.value)
                        }
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </td>
                    <td className="align-right amount">{money(Math.abs(Number(tx.amount || 0)))}</td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => remove(tx.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!transactions.length && (
              <Empty icon={Search}>沒有符合條件的簽賬紀錄</Empty>
            )}
          </div>
        </Glass>
      </div>
    </div>
  );
}

function AiView({ cards, transactions }) {
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "你好，我是 FinPulse AI。你可以問我本月的消費結構或還款負擔。",
    },
  ]);
  const [input, setInput] = useState("");
  const total = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0,
  );
  const pending = cards.filter((card) => !card.isPaid);
  const ask = (question) => {
    const totals = CATEGORIES.map((category) => [
      category,
      transactions
        .filter((tx) => tx.category === category)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    ]).sort((a, b) => b[1] - a[1]);
    const reply =
      question.includes("最多") || question.includes("消費")
        ? `本月支出最高是「${totals[0]?.[0] || "尚無資料"}」，合計 ${money(totals[0]?.[1])}。全部簽賬共 ${money(total)}。`
        : question.includes("還款") || question.includes("負擔")
          ? `目前有 ${pending.length} 張卡片待還款，總額 ${money(pending.reduce((sum, card) => sum + Number(card.amount || 0), 0))}。`
          : `我已分析 ${transactions.length} 筆簽賬與 ${cards.length} 張信用卡。`;
    if (!question.trim()) return;
    setMessages((current) => [
      ...current,
      { from: "user", text: question },
      { from: "ai", text: reply },
    ]);
    setInput("");
  };
  return (
    <div className="ai-layout">
      <Glass className="ai-main">
        <div className="ai-head">
          <div className="ai-avatar">
            <img src={GeminiLogo} alt="Gemini" />
          </div>
          <div>
            <p className="eyebrow">FINPULSE INTELLIGENCE</p>
            <h2>AI 理財小幫手</h2>
          </div>
          <span className="online">
            <i />
            ONLINE
          </span>
        </div>
        <div className="messages">
          {messages.map((message, index) => (
            <div
              className={`message ${message.from}`}
              key={`${message.from}-${index}`}
            >
              <span>
                {message.from === "ai" ? (
                  <img src={GeminiLogo} alt="Gemini" />
                ) : (
                  "你"
                )}
              </span>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        <div className="quick-asks">
          {["本月哪項消費支出最多？", "我目前的還款負擔如何？"].map(
            (question) => (
              <button key={question} onClick={() => ask(question)}>
                {question}
                <ChevronRight size={14} />
              </button>
            ),
          )}
        </div>
        <form
          className="chat-input"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <MessageCircle size={17} />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="問問你的財務狀況..."
          />
          <button>
            <ArrowUpRight size={17} />
          </button>
        </form>
      </Glass>
      <Glass className="ai-side">
        <p className="eyebrow">DATA CONTEXT</p>
        <h3>分析中的資料</h3>
        <div className="context-item">
          <FileSpreadsheet size={16} />
          <span>
            簽賬紀錄<strong>{transactions.length} 筆</strong>
          </span>
        </div>
        <div className="context-item">
          <CreditCard size={16} />
          <span>
            信用卡<strong>{cards.length} 張</strong>
          </span>
        </div>
        <div className="context-item">
          <Wallet size={16} />
          <span>
            本月支出<strong>{money(total)}</strong>
          </span>
        </div>
      </Glass>
    </div>
  );
}
