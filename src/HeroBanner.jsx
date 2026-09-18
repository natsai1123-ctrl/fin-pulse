import React from 'react';

export default function HeroBanner({ txs, onToggle }) {
  const urgent = txs.find(c => !c.isPaid);
  if (!urgent) return null;
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', background: 'linear-gradient(90deg, #111827, #172554)', border: '1px solid #1e3a8a', padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ color: '#ef4444', fontWeight: 'bold' }}>ℹ</div>
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '11px' }}><span style={{ color: '#94a3b8' }}>最近還款日期警示</span><span style={{ color: '#38bdf8' }}>{urgent.bank}</span></div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>「{urgent.name}」應還金額 <span style={{ color: '#ef4444' }}>HK${Number(urgent.amount || 0).toLocaleString()}</span></div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
        <div style={{ color: '#94a3b8', textAlign: 'right' }}><div>還款日期：{urgent.dueDate || '2026-09-22'}</div><div style={{ color: '#fbbf24', fontWeight: 'bold' }}>⏳ 剩餘 4 天到期</div></div>
        <button onClick={() => onToggle(urgent)} style={{ backgroundColor: '#22c55e', color: '#0f172a', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>標記為已還清</button>
      </div>
    </div>
  );
}
