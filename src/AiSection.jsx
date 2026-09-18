import React from 'react';

export default function AiSection({ chatMessages, chatInput, setChatInput, onSend }) {
  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', background: '#1e293b', border: '1px solid #334155', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <strong style={{ color: '#a855f7', fontSize: '15px' }}>🤖 FinPulse AI 智能理財顧問</strong>
      <div style={{ height: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {chatMessages.map((msg, idx) => (
          <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#0ea5e9' : '#0f172a', color: 'white', padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', fontSize: '13px' }}>
            <div dangerouslySetInnerHTML={{ __html: msg.text }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input type="text" placeholder="問問 AI：財務狀況如何？" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend()} style={{ flex: 1, padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '10px', color: 'white', outline: 'none' }} />
        <button onClick={onSend} style={{ backgroundColor: '#a855f7', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>發送</button>
      </div>
    </main>
  );
}
