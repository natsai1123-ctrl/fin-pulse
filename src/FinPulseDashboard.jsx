import { useEffect, useMemo, useRef, useState } from "react";
import { Landmark, Plus } from "lucide-react";

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

const money = (value) =>
  `HK$${Math.abs(Number(value || 0)).toLocaleString("en-HK", { maximumFractionDigits: 2 })}`;

/**
 * 🛠️ 核心金融引擎：精確符合香港金管會(HKMA)淨現值法(IRR)標準
 */
const loanMetrics = (principal, payment, termMonths, rebate = 0, upfrontFee = 0) => {
  const amount = Number(principal) || 0;
  const monthlyPayment = Number(payment) || 0;
  const months = Number(termMonths) || 0;
  const cashback = Number(rebate) || 0;
  const fee = Number(upfrontFee) || 0;
  
  // 實際拿到口袋的淨款項 = 本金 - 申請手續費 + 現金回贈
  const netCashReceived = amount - fee + cashback;
  const totalRepayment = monthlyPayment * months;
  const interest = Math.max(0, totalRepayment - netCashReceived);

  if (!netCashReceived || !monthlyPayment || !months || totalRepayment <= netCashReceived) {
    return { interest, apr: 0 };
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

  return { interest, apr };
};

const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, children }) {
  return (
    <label className="block w-full">
      <span className="block text-sm text-slate-400 mb-1.5 font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function FinPulseDashboard() {
  // 貸款狀態初始化容器（已完美綁定 upfrontFee 申請手續費）
  const [newLoan, setNewLoan] = useState({
    bank: LOAN_BANKS[0][0],
    principal: "",
    monthlyPayment: "",
    months: "",
    upfrontFee: "0", 
    rebate: "5000",  
    date: today(),
  });

  // 計算即時利率與全期利息
  const computedMetrics = useMemo(() => {
    return loanMetrics(
      newLoan.principal,
      newLoan.monthlyPayment,
      newLoan.months,
      newLoan.rebate,
      newLoan.upfrontFee
    );
  }, [newLoan]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ====== 借貸設定主要卡片區塊 ====== */}
        <section className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-lg shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">LOAN CALCULATOR</span>
              <h2 className="text-xl font-bold text-white mt-1">新增貸款</h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
              <Landmark size={14} className="text-cyan-400" />
              金管會標準 IRR 淨現值法
            </span>
          </div>
          
          {/* 第一排欄位網格 (銀行、日期、貸款本金) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
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

          {/* 第二排欄位網格：4欄網格完美嵌入申請手續費 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-6">
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

            <Field label="申請手續費 / 一次性費用">
              <input
                type="number"
                placeholder="若無請輸入 0"
                className="w-full bg-slate-950 border border-cyan-800 text-cyan-400 font-semibold rounded-lg p-3 outline-none focus:border-cyan-400 transition-colors placeholder-cyan-900/50"
                value={newLoan.upfrontFee}
                onChange={(e) => setNewLoan({ ...newLoan, upfrontFee: e.target.value })}
              />
            </Field>

            <Field label="回贈金額 (現金回贈)">
              <input
                type="number"
                placeholder="例如 5000"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-cyan-500 transition-colors placeholder-slate-700"
                value={newLoan.rebate}
                onChange={(e) => setNewLoan({ ...newLoan, rebate: e.target.value })}
              />
            </Field>
          </div>

          {/* 底部即時計算看板與按鈕 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-5 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-8 bg-slate-950/60 border border-slate-800 px-5 py-3.5 rounded-xl w-full sm:w-auto">
              <div>
                <span className="block text-slate-500 text-xs font-medium">全期利息</span>
                <span className="text-white font-semibold text-sm mt-0.5 block">
                  {newLoan.months ? money(computedMetrics.interest) : "HK\$ 0"}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs font-medium">實際年利率 APR</span>
                <span className="text-cyan-400 font-bold text-lg block mt-0.5">
                  {newLoan.months ? `${computedMetrics.apr.toFixed(2)}%` : "0.00%"}
                </span>
              </div>
            </div>

            <button className="bg-cyan-500 hover:bg-cyan-600 active:scale-95 transition-all text-slate-950 font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10">
              <Plus size={18} strokeWidth={2.5} />
              <span>新增貸款</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
