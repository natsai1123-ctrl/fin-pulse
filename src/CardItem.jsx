import React from 'react';

const CARD_STYLES = {
  '花旗銀行': { bg: 'linear-gradient(135deg, #0f172a, #1e3a8a, #0891b2)', border: '#22d3ee', text: '#22d3ee' },
  '渣打銀行': { bg: 'linear-gradient(135deg, #0f172a, #064e3b, #0d9488)', border: '#34d399', text: '#34d399' },
  '恆生銀行': { bg: 'linear-gradient(135deg, #0f172a, #064e3b, #78350f)', border: '#fbbf24', text: '#fbbf24' },
  '滙豐銀行': { bg: 'linear-gradient(135deg, #0f172a, #4c0519, #991b1b)', border: '#f43f5e', text: '#f43f5e' },
  '中國銀行': { bg: 'linear-gradient(135deg, #0f172a, #4c0519, #be123c)', border: '#ef4444', text: '#ef4444' },
  '中國建設銀行亞洲': { bg: 'linear-gradient(135deg, #0f172a, #311042, #1e40af)', border: '#818cf8', text: '#818cf8' },
  '其他銀行': { bg: 'linear-gradient(135deg, #0f172a, #3b0764, #1e293b)', border: '#c084fc', text: '#c084fc' }
};

export default function CardItem({ c, onToggle, onDelete }) {
  const style = CARD_STYLES[c.bank] || CARD_STYLES['其他銀行'];
  const amtVal = Number(c.amount || 0);

  return (
    <div style={{ background: style.bg, border: '1px solid ' + style.border, borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '160px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontSize: '12px', color: '#94a3b8' }}>{c.bank}</div><div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>{c.name}</div></div>
        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px', color: style.text }}>{c.category || '其他'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><div style={{ fontSize: '11px', color: '#64748b' }}>Repayment Balance</div><div style={{ fontSize: '22px', fontWeight: '900', color: c.isPaid ? '#34d399' : '#f43f5e', textDecoration: c.isPaid ? 'line-through' : 'none' }}>{"HK$ " + amtVal.toLocaleString()}</div></div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => onToggle(c)} style={{ backgroundColor: c.isPaid ? '#34d399' : 'transparent', border: '1px solid ' + style.border, color: c.isPaid ? '#0f172a' : 'white', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{c.isPaid ? '已清繳' : '清繳'}</button>
          <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
