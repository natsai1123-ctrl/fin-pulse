import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsChart({ txs, dark }) {
  // 🧠 智慧將雲端數據包裝成 Recharts 看得懂的格式
  const data = txs.map((t, idx) => ({
    name: t.name ? (t.name.length > 8 ? t.name.slice(0, 6) + '..' : t.name) : '項目' + (idx + 1),
    amount: Number(t.amount) || 0
  })).slice(0, 6); // 預設展示前 6 筆，避免畫面過度擁擠

  if (txs.length === 0) return null;

  const chartBg = dark ? '#1e293b' : '#ffffff';
  const strokeColor = dark ? '#475569' : '#cbd5e1';
  const labelColor = dark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: chartBg, border: '1px solid ' + strokeColor, marginBottom: '32px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: labelColor, fontWeight: '700' }}>📊 資金帳單流向分析 (Recharts)</h3>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: labelColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: labelColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: chartBg, borderRadius: '8px', border: '1px solid ' + strokeColor, color: dark ? '#fff' : '#000', fontSize: '12px' }} />
            <Bar dataKey="amount" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
