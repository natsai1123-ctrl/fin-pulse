import React from 'react';
import CardItem from './CardItem';

export default function CardsSection({ handleAddCard, newBank, setNewBank, BANK_OPTIONS, newCardName, setNewCardName, selectedCategory, setSelectedCategory, CATEGORY_OPTIONS, newDueDate, setNewDueDate, newRepaymentAmount, setNewRepaymentAmount, cards, handleTogglePaid, handleDeleteCard }) {
  const inputStyle = { padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold' };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <form onSubmit={handleAddCard} style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '16px', fontSize: '15px' }}>⊕ 新增信用卡</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div><label style={labelStyle}>登卡銀行</label><select value={newBank} onChange={e => setNewBank(e.target.value)} style={inputStyle}>{BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div><label style={labelStyle}>卡片名稱</label><input type="text" placeholder="例如: Simply Cash" value={newCardName} onChange={e => setNewCardName(e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>消費類別</label><select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={inputStyle}>{CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={labelStyle}>還款日期</label><input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>本期應還金額 (HK$)</label><input type="number" placeholder="2090" value={newRepaymentAmount} onChange={e => setNewRepaymentAmount(e.target.value)} style={inputStyle} required /></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '20px' }}><button type="submit" style={{ background: 'linear-gradient(90deg, #2563eb, #3b82f6)', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>新增卡片</button></div>
      </form>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {cards.map(c => <CardItem key={c.id} c={c} onToggle={handleTogglePaid} onDelete={handleDeleteCard} />)}
      </div>
    </main>
  );
}
