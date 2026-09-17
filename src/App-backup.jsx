import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Calendar, Wallet, ShieldCheck, BarChart3, 
  TrendingUp, List, Sparkles, Check, CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// 1. 常量與設定配置
const CATEGORY_COLORS = {
  '1) 餐飲': '#fbbf24',
  '2) 交通': '#38bdf8',
  '3) 八達通增值': '#2dd4bf',
  '4) 購物': '#f472b6',
  '5) 網購': '#c084fc',
  '6) 管理費': '#34d399',
  '7) 稅': '#f87171',
  '8) 貸款': '#a78bfa',
  '9) 其他': '#94a3b8'
};

const BANK_CARD_STYLES = {
  '花旗銀行': {
    bg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950',
    border: 'border-cyan-500/30 hover:border-cyan-400/60',
    textAccent: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  '恆生銀行': {
    bg: 'bg-gradient-to-br from-slate-900 via-emerald-950 to-amber-950',
    border: 'border-amber-500/30 hover:border-amber-400/60',
    textAccent: 'text-amber-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  '其他銀行': {
    bg: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950',
    border: 'border-purple-500/30 hover:border-purple-400/60',
    textAccent: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  }
};

const STORAGE_KEY_CARDS = 'fin_pulse_cards_v6';
const STORAGE_KEY_TX = 'fin_pulse_tx_v6';

const DEFAULT_CARDS = [
  { id: 'card-1', bank: '花旗銀行', name: 'Citi Cash Back', dueDate: '2026-09-25', repaymentAmount: 2090, isPaid: false },
  { id: 'card-2', bank: '恆生銀行', name: 'Enjoy 卡', dueDate: '2026-09-30', repaymentAmount: 3450, isPaid: false }
];

const DEFAULT_TRANSACTIONS = [
  { id: 'tx-1', date: '2026-09-02', description: '八達通自動增值', cardName: 'Citi Cash Back', cardId: 'card-1', category: '3) 八達通增值', amount: 500 },
  { id: 'tx-2', date: '2026-09-05', description: '搭乘港鐵與 Uber', cardName: 'Citi Cash Back', cardId: 'card-1', category: '2) 交通', amount: 850 },
  { id: 'tx-3', date: '2026-09-10', description: '週末朋友聚餐', cardName: 'Citi Cash Back', cardId: 'card-1', category: '1) 餐飲', amount: 820 },
  { id: 'tx-4', date: '2026-09-12', description: '秋季網購服飾', cardName: 'Enjoy 卡', cardId: 'card-2', category: '5) 網購', amount: 3450 }
];

// 2. 自訂圖表 Tooltip 組件
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs backdrop-blur-md text-slate-200">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.color || data.color }}></div>
          <span className="font-bold">類別：{data.name}</span>
        </div>
        <div className="text-cyan-400 font-extrabold pl-5">
          金額：HK${Number(data.value).toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

// 3. 主 App 組件
export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });

  // 從 LocalStorage 載入資料
  const [cards, setCards] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CARDS);
      return saved ? JSON.parse(saved) : DEFAULT_CARDS;
    } catch (e) {
      return DEFAULT_CARDS;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TX);
      return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
    } catch (e) {
      return DEFAULT_TRANSACTIONS;
    }
  });

  // 當資料變動時自動同步到 LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
  }, [transactions]);

  const showToastMessage = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'info' }), 3000);
  };

  // 核心數據計算
  const stats = useMemo(() => {
    const totalRepay = cards.reduce((acc, c) => acc + (c.isPaid ? 0 : c.repaymentAmount), 0);
    const paidAmount = cards.reduce((acc, c) => acc + (c.isPaid ? c.repaymentAmount : 0), 0);
    
    const categoryMap = {};
    transactions.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const pieData = Object.keys(categoryMap).map(cat => ({
      name: cat,
      value: categoryMap[cat],
      color: CATEGORY_COLORS[cat] || '#94a3b8'
    }));

    return { totalRepay, paidAmount, pieData };
  }, [cards, transactions]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      {/* Toast 提示 */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* 頂部導覽列 */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-widest text-xs uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Finance Pulse System
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            FIN-PULSE 智能信用卡管理
          </h1>
        </div>
        
        <nav className="flex gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <TrendingUp className="w-4 h-4" /> 儀表板總覽
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <List className="w-4 h-4" /> 帳目明細
          </button>
        </nav>
      </header>

      {/* 主內容區 */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* 上方數據卡 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><Wallet className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">本月待還款總額</p>
                  <p className="text-2xl font-black text-rose-400 mt-1">HK${stats.totalRepay.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><ShieldCheck className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">已結清款項</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">HK${stats.paidAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><BarChart3 className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">本月消費總筆數</p>
                  <p className="text-2xl font-black text-cyan-400 mt-1">{transactions.length} 筆</p>
                </div>
              </div>
            </div>

            {/* 圖表與月結單區 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左側：消費圖表 */}
              <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl min-h-[350px]">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" /> 消費類別分佈</h3>
                {stats.pieData.length > 0 ? (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" h="100%">
                      <PieChart>
                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                          {stats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm">暫無消費數據</div>
                )}
              </div>

              {/* 右側：信用卡狀態 */}
              <div className="bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl">