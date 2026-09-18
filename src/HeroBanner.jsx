import React from 'react';

export default function HeroBanner({ txs, onToggle }) {
  const urgentCard = txs.find(c => !c.isPaid);
  if (!urgentCard) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', background: 'linear-gradient(90deg, #111827, #172554)', border: '1px solid #1e3a8a', padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 25px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>ℹ</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>最近還款日期警示</span>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px', color: '#38bdf8' }}>{urgentCard.bank}</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
            「{urgentCard.name}」應還金額 <span style={{ color: '#ef4444', fontWeight: '900' }}>HK${Number(urgentCard.amount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>
          <div>還款日期：{urgentCard.dueDate || '2026-09-22'}</div>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', marginTop: '2px' }}>⏳ 剩餘 4 天到期</div>
        </div>
        <button onClick={() => onToggle(urgentCard)} style={{ backgroundColor: '#22c55e', color: '#0f172a', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.2)' }}>
          標記為已還清
        </button>
      </div>
    </div>
  );
}
