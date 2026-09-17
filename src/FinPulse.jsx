import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Calendar, Wallet, ShieldCheck, BarChart3, TrendingUp, List, Sparkles, Check } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CATEGORY_COLORS = {
  '1) 餐飲': '#fbbf24', '2) 交通': '#38bdf8', '3) 八達通增值': '#2dd4bf',
  '4) 購物': '#f472b6', '5) 網購': '#c084fc', '6) 管理費': '#34d399',
  '7) 稅': '#f87171', '8) 貸款': '#a78bfa', '9) 其他': '#94a3b8'
};

const BANK_CARD_STYLES = {
  '花旗銀行': { bg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950', border: 'border-cyan-500/30 text-cyan-400' },
  '恆生銀行': { bg: 'bg-gradient-to-br from-slate-900 via-emerald-950 to-amber-950', border: 'border-amber-500/30 text-amber-400' },
  '其他銀行': { bg: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950', border: 'border-purple-500/30 text-purple-400' }
};

const DEFAULT_CARDS = [
  { id: 'c1', bank: '花旗銀行', name: 'Citi Cash Back', dueDate: '2026-09-25', repaymentAmount: 2090, isPaid: false },
  { id: 'c2', bank: '恆生銀行', name: 'Enjoy 卡', dueDate: '2026-09-30', repaymentAmount: 3450, isPaid: false }
];

const DEFAULT_TX = [
  { id: 't1', date: '2026-09-02', cardName: 'Citi Cash Back', category: '3) 八達通增值', desc: '八達通自動增值', amount: 500 },
  { id: 't2', date: '2026-09-05', cardName: 'Citi Cash Back', category: '2) 交通', desc: '搭乘港鐵與 Uber', amount: 850 },
  { id: 't3', date: '2026-09-10', cardName: 'Citi Cash Back', category: '1) 餐飲', desc: '週末朋友聚餐', amount: 820 },
  { id: 't4', date: '2026-09-12', cardName: 'Enjoy 卡', category: '5) 網購', desc: '秋季網購服飾', amount: 3450 }
];

export default function App() {
  // 強制將初始值鎖死在 'overview'，防止快取干擾
  const [activeTab, setActiveTab] = useState('overview');
  const [cards, setCards] = useState(() => {
    const s = localStorage.getItem('fp_cards');
    return s ? JSON.parse(s) : DEFAULT_CARDS;
  });

  useEffect(() => {
    localStorage.setItem('fp_cards', JSON.stringify(cards));
  }, [cards]);

  const stats = useMemo(() => {
    const total = cards.reduce((acc, c) => acc + (c.isPaid ? 0 : c.repaymentAmount), 0);
    const paid = cards.reduce((acc, c) => acc + (c.isPaid ? c.repaymentAmount : 0), 0);
    const categoryMap = {};
    DEFAULT_TX.forEach(t => { categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount; });
    const pieData = Object.keys(categoryMap).map(cat => ({ name: cat, value: categoryMap[cat], color: CATEGORY_COLORS[cat] || '#94a3b8' }));
    return { total, paid, pieData };
  }, [cards]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      {/* 系統主標頭 */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-widest text-xs uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{"Finance Pulse System"}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            <span>{"FIN-PULSE 智能信用卡管理"}</span>
          </h1>
        </div>
        
        <nav className="flex gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
            <TrendingUp className="w-4 h-4" /> <span>{"儀表板總覽"}</span>
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
            <List className="w-4 h-4" /> <span>{"帳目明細"}</span>
          </button>
        </nav>
      </header>

      {/* 移除複雜的外部元件，直接在主 return 內進行純 HTML 展現，讓畫面絕對跑出來 */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 上方指標數據卡 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><Wallet className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium"><span>{"本月待還款總額"}</span></p>
                  <p className="text-2xl font-black text-rose-400 mt-1">{"HK$"}{stats.total.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><ShieldCheck className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium"><span>{"已結清款項"}</span></p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{"HK$"}{stats.paid.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><BarChart3 className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium"><span>{"本月消費總筆數"}</span></p>
                  <p className="text-2xl font-black text-cyan-400 mt-1">{DEFAULT_TX.length}<span>{" 筆"}</span></p>
                </div>
              </div>
            </div>

            {/* 下方卡片狀態 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl min-h-[350px]">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" /> <span>{"消費類別分佈"}</span></h3>
                <div className="w-full h-[260px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                        {stats.pieData.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-cyan-400" /> <span>{"信用卡月結單狀態"}</span></h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {cards.map(card => {
                    const style = BANK_CARD_STYLES[card.bank] || BANK_CARD_STYLES['其他銀行'];
                    return (
                      <div key={card.id} className={`p-4 rounded-xl border transition-all ${style.bg} ${style.border}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-slate-800/80 text-slate-300">{card.bank}</span>
                            <h4 className="font-bold text-sm mt-1 text-slate-100">{card.name}</h4>
                          </div>
                          <button 
                            onClick={() => setCards(cards.map(c => c.id === card.id ? { ...c, isPaid: !c.isPaid } : c))}
                            className={`p-1.5 rounded-lg border transition-all ${card.isPaid ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-end mt-4">
                          <div className="text-[11px] text-slate-400"><Calendar className="w-3 h-3 inline mr-1" /> <span>{"到期日: "}</span>{card.dueDate}</div>
                          <div className={`text-base font-black ${card.isPaid ? 'line-through text-slate-500' : 'text-slate-100'}`}>{"HK$"}{card.repaymentAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><List className="w-4 h-4 text-cyan-400" /> <span>{"消費帳目清單"}</span></h3>
            <div className="space-y-3">
              {DEFAULT_TX.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-slate-900/40 border border-slate-800/40 p-4 rounded-xl text-sm">
                  <div>
                    <p className="font-bold text-slate-200">{t.desc}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.date} · <span className="text-slate-500">{t.cardName}</span></p>
                  </div>
                  <div className="text-right">
