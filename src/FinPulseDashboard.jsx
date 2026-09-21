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
HK$${Math.abs(Number(value || 0)).toLocaleString("en-HK", { maximumFractionDigits: 2 })};
const signedMoney = (value) =>
\({Number(value || 0) < 0 ? "-" : ""}\){money(value)};
const createId = (prefix) =>
\({prefix}-\){Date.now()}-${Math.random().toString(36).slice(2, 8)};
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
cashReceived * (1 + monthlyRate)  months -
monthlyPayment * (((1 + monthlyRate)  months - 1) / monthlyRate);
if (balance > 0) low = monthlyRate;
else high = monthlyRate;
}
return { interest, apr: ((1 + (low + high) / 2)  12 - 1) * 100 };
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
: typeof value === "string" && /^\d+(.\d+)?$/.test(value.trim())
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
return

;
}
function Button({ children, variant = "ghost", className = "", ...props }) {
return (

  {children}


);
}
function Field({ label, children }) {
return (

  {label}
  {children}


);
}
function Chip() {
return (

  *
  *
  *
  *


);
}
function Empty({ children, icon: Icon = Database }) {
return (

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
id: editingCard?.id || card-${Date.now()},
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
id: tx-${Date.now()},
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
id: tx_\({Date.now()}_\){index}_${Math.random().toString(36).slice(2, 9)},
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
setToast(已匯入 ${uniqueImported.length} 筆交易);
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
link.download = finpulse-${today()}.json;
link.click();
URL.revokeObjectURL(link.href);
};
const addIncome = async (event) => {
event.preventDefault();
const form = new FormData(event.currentTarget);
const income = {
id: income-${Date.now()},
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
\({tx.description}\){cards.find((card) => card.id === tx.cardId)?.name || ""}
.toLowerCase()
.includes(query.toLowerCase()) &&
(cardFilter === "all" || tx.cardId === cardFilter) &&
(categoryFilter === "all" || tx.category === categoryFilter),
);
const HealthIcon = healthStatus.Icon;
return (