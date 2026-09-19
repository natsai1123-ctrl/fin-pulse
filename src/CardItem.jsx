import React from 'react';

const BANK_CARD_STYLES = {
  '花旗銀行': { bg: 'linear-gradient(135deg, #0b1528, #112543, #07485f)', border: '1px solid #145389', text: '#38bdf8' },
  '中國銀行': { bg: 'linear-gradient(135deg, #200813, #3c0d12, #5c0f16)', border: '1px solid #7f1d1d', text: '#f87171' },
  '渣打銀行': { bg: 'linear-gradient(135deg, #06281e, #0b4632, #075f43)', border: '1px solid #065f46', text: '#34d399' },
  '恆生銀行': { bg: 'linear-gradient(135deg, #1c1917, #451a03, #78350f)', border: '1px solid #78350f', text: '#fbbf24' },
  '滙豐銀行': { bg: 'linear-gradient(135deg, #1c050c, #4c0519, #881337)', border: '1px solid #881337', text: '#f43f5e' },
  '中國建設銀行亞洲': { bg: 'linear-gradient(135deg, #0c1033, #1e1b4b, #2e1065)', border: '1px solid #3730a3', text: '#818cf8' },
  '其他銀行': { bg: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)', border: '1px solid #475569', text: '#94a3b8' }
};

export default function CardItem({ c, onDelete, onToggle }) {
  const s = BANK_CARD_STYLES[c.bank] || BANK_CARD_STYLES['其他銀行'];
  return (
    <div style={{ background: s.bg, border: s.border, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '185px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: s.text, fontWeight: 'bold' }}>{c.bank}</span>
        <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{c.name}</div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>本期應還金額</span>
          <span style={{ fontSize: '18px', fontWeight: '900', color: c.isPaid ? '#34d399' : s.text, textDecoration: c.isPaid ? 'line-through' : 'none' }}>{"HK$ " + Number(c.amount || 0).toLocaleString()}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <button onClick={() => onToggle(c)} style={{ backgroundColor: c.isPaid ? '#34d399' : 'transparent', border: '1px solid ' + s.border, color: c.isPaid ? '#0f172a' : '#fff', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px' }}>
          {c.isPaid ? '✓ 已還清' : '⊙ 待還款'}
        </button>
      </div>
    </div>
  );
}
