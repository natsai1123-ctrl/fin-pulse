import React from 'react';

export default function DetailsSection({ handleAddTx, transDesc, setTransDesc, transAmt, setTransAmt, selectedCategory, setSelectedCategory, CATEGORY_OPTIONS, cards, transCardId, setTransCardId, handleUpload, txs, handleDeleteTx, dark }) {
  const inputStyle = { padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold' };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 📥 1. Excel 智能帳單一鍵匯入專區 */}
      <div style={{ background: '#0b0f19', border: '2px dashed #a855f7', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: '#a855f7', fontSize: '14px', display: 'block' }}>智能 Excel 帳單匯入中心</strong>
          <span style={{ fontSize: '11px', color: '#64748b' }}>匯入的紀錄將會實時出現在下方的簽賬明細流水帳中</span>
        </div>
        <div>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleUpload} style={{ color: '#fff', fontSize: '13px', cursor: 'pointer' }} />
        </div>
      </div>

      {/* 📝 2. 手動輸入消費表單（消費類別在這邊顯示） */}
      <form onSubmit={handleAddTx} style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <strong style={{ color: '#10b981', display: 'block', marginBottom: '16px', fontSize: '15px' }}>📝 手動錄入日常簽賬消費</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div><label style={labelStyle}>消費項目描述</label><input type="text" placeholder="例如: 麥當勞 / MTR" value={transDesc} onChange={e => setTransDesc(e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>消費金額 (HK$)</label><input type="number" step="0.01" placeholder="0.00" value={transAmt} onChange={e => setTransAmt(e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>選用消費類別</label><select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={inputStyle}>{CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div>
            <label style={labelStyle}>關聯扣款信用卡</label>
            <select value={transCardId} onChange={e => setTransCardId(e.target.value)} style={inputStyle}>
              {cards.length === 0 ? <option value="">(請先建立信用卡)</option> : cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '20px' }}><button type="submit" style={{ background: 'linear-gradient(90deg, #10b981, #059669)', color: '#0f172a', border: 'none', padding: '12px 32px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>新增消費明細</button></div>
      </form>

      {/* 📋 3. 歷史交易紀錄流水帳明細表格 */}
      <div style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>📋 本期簽賬消費明細歷史清單 ({txs.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                <th style={{ paddingBottom: '12px' }}>消費項目描述</th>
                <th style={{ paddingBottom: '12px' }}>消費類別</th>
                <th style={{ paddingBottom: '12px', textAlign: 'right' }}>簽賬金額</th>
                <th style={{ paddingBottom: '12px', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>目前尚無簽賬消費紀錄，請由上方手動輸入或匯入 Excel 帳單。</td></tr> : txs.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 0', fontWeight: '500' }}>{t.name || t.description}</td>
                  <td style={{ padding: '12px 0', color: '#94a3b8' }}>{t.category || '9) 其他'}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '700', color: '#f43f5e' }}>{"-$" + Number(t.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 0', textAlign: 'center' }}><button onClick={() => handleDeleteTx(t.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}
