import React from 'react';

export default function DetailsSection({ handleAddTx, transDesc, setTransDesc, transAmt, setTransAmt, selectedCategory, setSelectedCategory, CATEGORY_OPTIONS, handleUpload, txs, onDelete }) {
  const inputStyle = { padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none' };
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: '#0b0f19', border: '2px dashed #a855f7', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><strong style={{ color: '#a855f7', fontSize: '14px', display: 'block' }}>智能 Excel 帳單匯入中心</strong><span style={{ fontSize: '11px', color: '#64748b' }}>支援批次對齊日常簽賬消費流水帳紀錄</span></div>
        <div><input type="file" accept=".xlsx, .xls, .csv" onChange={handleUpload} style={{ color: '#fff', fontSize: '13px', cursor: 'pointer' }} /></div>
      </div>
      <form onSubmit={handleAddTx} style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <strong style={{ color: '#10b981', display: 'block', marginBottom: '16px', fontSize: '15px' }}>📝 手動日常消費簽賬錄入</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div><label style={{ fontSize: '12px' }}>消費描述</label><input type="text" placeholder="例如: 餐廳晚餐" value={transDesc} onChange={e => setTransDesc(e.target.value)} style={inputStyle} required /></div>
          <div><label style={{ fontSize: '12px' }}>簽賬金額</label><input type="number" placeholder="0.00" value={transAmt} onChange={e => setTransAmt(e.target.value)} style={inputStyle} required /></div>
          <div><label style={{ fontSize: '12px' }}>消費類別</label><select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={inputStyle}>{CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '20px' }}><button type="submit" style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '12px 32px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>新增消費明細</button></div>
      </form>
      <div style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>清單歷史 ({txs.length})</h3>
        <table style={{ width: '100%', textAlign: 'left', fontSize: '14px' }}>
          <thead><tr style={{ color: '#94a3b8' }}><th style={{ paddingBottom: '12px' }}>消費描述</th><th style={{ paddingBottom: '12px' }}>類別</th><th style={{ paddingBottom: '12px', textAlign: 'right' }}>金額</th><th style={{ paddingBottom: '12px', textAlign: 'center' }}>操作</th></tr></thead>
          <tbody>
            {txs.map(t => <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}><td style={{ padding: '12px 0' }}>{t.description}</td><td style={{ padding: '12px 0', color: '#94a3b8' }}>{t.category}</td><td style={{ padding: '12px 0', textAlign: 'right', color: '#f43f5e', fontWeight: 'bold' }}>{"-$" + Number(t.amount || 0).toLocaleString()}</td><td style={{ padding: '12px 0', textAlign: 'center' }}><button onClick={() => onDelete(t.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button></td></tr>)}
            {txs.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>尚無日常簽賬數據。</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
