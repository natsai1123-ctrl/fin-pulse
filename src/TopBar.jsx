import React from 'react';

export default function TopBar({ loading, handleUpload }) {
  const btn = (bg) => ({
    backgroundColor: bg, color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
  });
  return (
    <header style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>FIN-PULSE</span>
          <span style={{ fontSize: '11px', background: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
            {loading ? '⏳ 同步中' : '🗲 雲端實時同步'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>智能信用卡月結單管理 Dashboard</div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btn('#991b1b')}>清空資料</button>
        <button style={btn('#1e293b')}>💾 手動儲存</button>
        <label htmlFor="xl-file" style={{ backgroundColor: '#0284c7', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>⬆ 匯入 Excel (.xlsx)</label>
        <input type="file" id="xl-file" accept=".xlsx, .xls, .csv" onChange={handleUpload} style={{ display: 'none' }} />
        <button style={btn('#5b21b6')}>📥 備份 JSON</button>
      </div>
    </header>
  );
}
