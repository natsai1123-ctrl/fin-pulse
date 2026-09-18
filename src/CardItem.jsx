import React from 'react';

const CARD_STYLES = {
  '花旗銀行': { bg: 'linear-gradient(135deg, #0b1528, #112543, #07485f)', border: '1px solid #145389', text: '#38bdf8' },
  '中國銀行': { bg: 'linear-gradient(135deg, #200813, #3c0d12, #5c0f16)', border: '1px solid #7f1d1d', text: '#f87171' },
  '渣打銀行': { bg: 'linear-gradient(135deg, #06281e, #0b4632, #075f43)', border: '1px solid #065f46', text: '#34d399' },
  '恆生銀行': { bg: 'linear-gradient(135deg, #1c1917, #451a03, #78350f)', border: '1px solid #78350f', text: '#fbbf24' },
  '滙豐銀行': { bg: 'linear-gradient(135deg, #1c050c, #4c0519, #881337)', border: '1px solid #881337', text: '#f43f5e' },
  '中國建設銀行亞洲': { bg: 'linear-gradient(135deg, #0c1033, #1e1b4b, #2e1065)', border: '1px solid #3730a3', text: '#818cf8' },
  '其他銀行': { bg: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)', border: '1px solid #475569', text: '#94a3b8' }
};

export default function CardItem({ c, onToggle, onDelete }) {
  const s = CARD_STYLES[c.bank] || CARD_STYLES['其他銀行'];
  const amt = Number(c.amount || 0);

  return (
    <div style={{ background: s.bg, border: s.border, borderRadius: '20px', padding: '20px', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '185px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '6px', color: s.text, fontWeight: 'bold' }}>{c.bank}</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{c.name}</div>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '2px', marginTop: '4px' }}>•••• •••• •••• 7592</div>
        </div>
        <div style={{ width: '36px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, #fef08a, #eab308, #ca8a04)' }}></div>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}><span>🗓️ 還款日期</span><span style={{ color: '#fff' }}>{c.dueDate || '22/09/2026'}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>本期應還金額</span>
          <span style={{ fontSize: '18px', fontWeight: '900', color: c.isPaid ? '#34d399' : s.text, textDecoration: c.isPaid ? 'line-through' : 'none' }}>{"HK$ " + amt.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <span style={{ color: '#475569' }}>狀態狀態</span>
        <button onClick={() => onToggle(c)} style={{ backgroundColor: c.isPaid ? 'rgba(52,211,153,0.1)' : 'rgba(234,179,8,0.05)', border: c.isPaid ? '1px solid #34d399' : '1px solid #eab308', color: c.isPaid ? '#34d399' : '#eab308', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {c.isPaid ? '✓ 已還清 (點擊切換)' : '⊙ 待還款 (點擊切換)'}
        </button>
      </div>
    </div>
  );
}
