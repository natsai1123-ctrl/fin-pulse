import React from 'react';

export default function TopBar({ loading, handleUpload }) {
  const btnStyle = (bg) => ({
    backgroundColor: bg, color: '#fff', border: 'none', padding: '8px 14px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
    display: 'flex', alignItems: 'center', gap: '6px'
  });

  return (
    <header style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>⚙️</div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>FIN-PULSE</span>
          <span style={{ fontSize: '11px', background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
            {loading ? '⏳ 同步中' : '🗲 雲端實時同步'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>智能信用卡月結單管理 Dashboard</div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btnStyle('#991b1b')}>清空資料</button>
        <button style={btnStyle('#1e293b')}>💾 手動儲存</button>
        <label htmlFor="xl-file" style={{ backgroundColor: '#0284c7', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⬆ 匯入 Excel (.xlsx)
        </label>
        <input type="file" id="xl-file" accept=".xlsx, .xls, .csv" onChange={handleUpload} style={{ display: 'none' }} />
        <button style={btnStyle('#5b21b6')}>📥 備份 JSON</button>
      </div>
    </header>
  );
}
