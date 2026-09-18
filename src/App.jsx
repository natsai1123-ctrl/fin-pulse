import React, { useState, useMemo } from 'react';
import Icon from './Icon';

const INITIAL_TRANSACTIONS = [
  { id: 'tx-1', name: 'Stripe Payout', type: 'income', amount: 4250.0, category: 'Sales', date: '2026-09-18' },
  { id: 'tx-2', name: 'AWS Hosting', type: 'expense', amount: 340.5, category: 'Infrastructure', date: '2026-09-17' },
  { id: 'tx-3', name: 'Figma Sub', type: 'expense', amount: 45.0, category: 'Design Tools', date: '2026-09-16' },
  { id: 'tx-4', name: 'Client Retainer', type: 'income', amount: 2800.0, category: 'Consulting', date: '2026-09-15' }
];

const METRICS_DATA = [
  { label: 'Total Portfolio Balance', value: '\$124,850.42', change: '+12.4%', isPositive: true },
  { label: 'Monthly Revenue', value: '\$18,420.00', change: '+8.2%', isPositive: true },
  { label: 'Monthly Expenses', value: '\$5,125.50', change: '-3.1%', isPositive: false },
  { label: 'Net Savings Margin', value: '72.2%', change: '+4.5%', isPositive: true }
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newTx, setNewTx] = useState({ name: '', amount: '', category: 'Sales', type: 'income' });

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const s = searchQuery.toLowerCase();
      return (tx.name.toLowerCase().includes(s) || tx.category.toLowerCase().includes(s)) &&
             (selectedCategory === 'All' || tx.category === selectedCategory);
    });
  }, [transactions, searchQuery, selectedCategory]);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newTx.name || !newTx.amount) return;
    setTransactions([{ id: `tx-${Date.now()}`, name: newTx.name, amount: parseFloat(newTx.amount), category: newTx.category, type: newTx.type, date: '2026-09-18' }, ...transactions]);
    setNewTx({ name: '', amount: '', category: 'Sales', type: 'income' });
    setShowModal(false);
  };

  const tBg = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cBg = darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200';
  const iBg = darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';

  return (
    <div className={`min-h-screen font-sans p-6 ${tBg}`}>
      <header className="max-w-7xl mx-auto flex items-center justify-between h-16 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">FP</div>
          <span className="text-xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">FinPulse</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)} className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md">
            <Icon name="plus" size={16} /> Add Transaction
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Icon name={darkMode ? "sun" : "moon"} size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {METRICS_DATA.map((m, i) => (
            <div key={i} className={`p-6 rounded-2xl border transition-all ${cBg}`}>
              <div className="text-sm text-slate-400 mb-2">{m.label}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{m.value}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{m.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`p-6 rounded-2xl border ${cBg}`}>
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold">Recent Transactions</h2>
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`px-4 py-2 rounded-xl text-sm border focus:outline-none ${iBg}`} />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border focus:outline-none ${iBg}`}>
                <option value="All">All</option>
                <option value="Sales">Sales</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Design Tools">Design Tools</option>
                <option value="Consulting">Consulting</option>
              </select>
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3">Name</th>
                <th className="pb-3">Category</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-800/30">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Icon name={tx.type === 'income' ? 'arrowUpRight' : 'arrowDownLeft'} className={tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'} />
                    {tx.name}
                  </td>
                  <td className="py-3 text-slate-400">{tx.category}</td>
                  <td className={`py-3 text-right font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}\${tx.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-bold mb-4">Add Transaction</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <input type="text" value={newTx.name} onChange={(e) => setNewTx({...newTx, name: e.target.value})} className={`w-full p-2.5 rounded-xl border text-sm ${iBg}`} placeholder="Name" required />
              <input type="number" step="0.01" value={newTx.amount} onChange={(e) => setNewTx({...newTx, amount: e.target.value})} className={`w-full p-2.5 rounded-xl border text-sm ${iBg}`} placeholder="Amount" required />
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm border border-slate-800">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-emerald-500 text-slate-950 font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
