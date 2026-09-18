import React, { useState, useMemo } from 'react';

// SVG Icon helper component to avoid missing icon package dependencies during build
const Icon = ({ name, size = 18, className = "" }) => {
  const icons = {
    trendingUp: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    ),
    trendingDown: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    ),
    wallet: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
    creditCard: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
    arrowUpRight: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M7 7h10v10" />
    ),
    arrowDownLeft: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7L7 17M17 17H7V7" />
    ),
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    filter: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    ),
    bell: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    ),
    sun: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    moon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    )
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

const INITIAL_TRANSACTIONS = [
  { id: 'tx-1', name: 'Stripe Payout', type: 'income', amount: 4250.00, category: 'Sales', date: '2026-09-18', status: 'Completed' },
  { id: 'tx-2', name: 'AWS Cloud Hosting', type: 'expense', amount: 340.50, category: 'Infrastructure', date: '2026-09-17', status: 'Completed' },
  { id: 'tx-3', name: 'Figma Subscription', type: 'expense', amount: 45.00, category: 'Design Tools', date: '2026-09-16', status: 'Completed' },
  { id: 'tx-4', name: 'Client Retainer (Acme Co)', type: 'income', amount: 2800.00, category: 'Consulting', date: '2026-09-15', status: 'Completed' },
  { id: 'tx-5', name: 'Google Ads Campaign', type: 'expense', amount: 620.00, category: 'Marketing', date: '2026-09-14', status: 'Pending' },
  { id: 'tx-6', name: 'GitHub Copilot Enterprise', type: 'expense', amount: 120.00, category: 'Software', date: '2026-09-12', status: 'Completed' },
];

const METRICS_DATA = [
  { label: 'Total Portfolio Balance', value: '$124,850.42', change: '+12.4%', isPositive: true, sparkline: [40, 45, 42, 55, 60, 58, 70] },
  { label: 'Monthly Revenue', value: '$18,420.00', change: '+8.2%', isPositive: true, sparkline: [20, 25, 30, 28, 35, 40, 48] },
  { label: 'Monthly Expenses', value: '$5,125.50', change: '-3.1%', isPositive: true, sparkline: [50, 45, 42, 40, 38, 35, 30] },
  { label: 'Net Savings Margin', value: '72.2%', change: '+4.5%', isPositive: true, sparkline: [60, 62, 65, 68, 70, 71, 72] },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [timeRange, setTimeRange] = useState('1M');
  const [showModal, setShowModal] = useState(false);
  const [newTx, setNewTx] = useState({ name: '', amount: '', category: 'Sales', type: 'income' });

  // Filter transactions based on search and category inputs
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tx.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategory]);

  // Handle transaction submission
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newTx.name || !newTx.amount) return;

    const created = {
      id: `tx-${Date.now()}`,
      name: newTx.name,
      amount: parseFloat(newTx.amount),
      category: newTx.category,
      type: newTx.type,
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
    };

    setTransactions([created, ...transactions]);
    setNewTx({ name: '', amount: '', category: 'Sales', type: 'income' });
    setShowModal(false);
  };

  const themeClasses = darkMode 
    ? 'bg-slate-950 text-slate-100' 
    : 'bg-slate-50 text-slate-900';

  const cardClasses = darkMode
    ? 'bg-slate-900/80 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${themeClasses}`}>
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md ${darkMode ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200/80 bg-white/80'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              FP
            </div>
            <div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
                FinPulse
              </span>
              <span className="text-xs px-2 py-0.5 ml-2 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRO v2.4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-emerald-500/20 text-sm"
            >
              <Icon name="plus" size={16} />
              <span>Add Transaction</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition-colors ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              aria-label="Toggle theme"
            >
              <Icon name={darkMode ? 'sun' : 'moon'} size={18} />
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Financial Overview
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-time portfolio tracking and cashflow analytics.
            </p>
          </div>

          <div className={`inline-flex p-1 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            {['1D', '1W', '1M', '1Y', 'ALL'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {METRICS_DATA.map((metric, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all duration-200 hover:shadow-xl ${cardClasses}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {metric.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  metric.isPositive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <Icon name={metric.isPositive ? 'trendingUp' : 'trendingDown'} size={12} />
                  {metric.change}
                </span>
              </div>
              <div className="text-2xl font-black tracking-tight">
                {metric.value}
              </div>

              <div className="mt-4 flex items-end gap-1 h-8">
                {metric.sparkline.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${(val / 72) * 100}%` }}
                    className="flex-1 rounded-t bg-emerald-500/30 hover:bg-emerald-400 transition-colors"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardClasses}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Cashflow Analytics</h2>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Income vs Expense comparison for {timeRange}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span>
                  <span>Expenses</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full flex items-end justify-between gap-3 pt-6 border-b border-dashed border-slate-700/50 pb-2">
              {[
                { label: 'Mon', income: 65, expense: 30 },
                { label: 'Tue', income: 45, expense: 50 },
                { label: 'Wed', income: 85, expense: 40 },
                { label: 'Thu', income: 70, expense: 25 },
                { label: 'Fri', income: 95, expense: 60 },
                { label: 'Sat', income: 40, expense: 20 },
                { label: 'Sun', income: 75, expense: 35 },
              ].map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    <div
                      style={{ height: `${item.income}%` }}
                      className="w-1/2 max-w-[20px] bg-emerald-500 rounded-t-md hover:opacity-80 transition-all"
                      title={`Income: $${item.income * 100}`}
                    />
                    <div
                      style={{ height: `${item.expense}%` }}
                      className="w-1/2 max-w-[20px] bg-cyan-500 rounded-t-md hover:opacity-80 transition-all"
                      title={`Expense: $${item.expense * 100}`}
                    />
                  </div>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">Primary Platinum</p>
                  <p className="text-xl font-bold mt-1">FinPulse Corporate</p>
                </div>
                <Icon name="creditCard" size={28} className="text-emerald-300" />
              </div>
              
              <div className="mb-6">
                <p className="text-xs text-emerald-200/80 mb-1">Card Number</p>
                <p className="font-mono text-lg tracking-widest font-semibold">
                  8842
                </p>
              </div>

              <div className="flex justify-between items-end text-xs">
                <div>
                  <p className="text-emerald-200/80">Card Holder</p>
                  <p className="font-semibold text-sm">ALEXANDER VANE</p>
                </div>
                <div>
                  <p className="text-emerald-200/80">Expires</p>
                  <p className="font-semibold text-sm">08/29</p>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${cardClasses}`}>
              <h3 className="text-sm font-bold mb-3 flex items-center justify-between">
                <span>Monthly Budget Cap</span>
                <span className="text-xs text-emerald-400 font-normal">68% Used</span>
              </h3>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[68%] rounded-full" />
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                $5,125.50 spent of $7,500.00 limit
              </p>
            </div>
          </div>
        </div>

        {}
        <div className={`p-6 rounded-2xl border ${cardClasses}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold">Recent Transactions</h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Inspect and filter your latest activity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center px-3 py-1.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <Icon name="search" size={16} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs w-36 sm:w-48"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                <option value="All">All Categories</option>
                <option value="Sales">Sales</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Design Tools">Design Tools</option>
                <option value="Consulting">Consulting</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'} text-xs font-semibold`}>
                  <th className="pb-3 px-2">Transaction</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-2 font-medium flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.type === 'income' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          <Icon name={tx.type === 'income' ? 'arrowDownLeft' : 'arrowUpRight'} size={14} />
                        </div>
                        {tx.name}
                      </td>
                      <td className="py-4 px-2 text-xs">
                        <span className={`px-2.5 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className={`py-4 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tx.date}
                      </td>
                      <td className="py-4 px-2 text-xs">
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          tx.status === 'Completed' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-4 px-2 text-right font-bold ${
                        tx.type === 'income' ? 'text-emerald-400' : darkMode ? 'text-slate-200' : 'text-slate-900'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No transactions found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${cardClasses}`}>
            <h3 className="text-lg font-bold mb-4">Add New Transaction</h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Payment"
                  value={newTx.name}
                  onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Type</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Category</label>
                <select
                  value={newTx.category}
                  onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  <option value="Sales">Sales</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Design Tools">Design Tools</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg shadow"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}