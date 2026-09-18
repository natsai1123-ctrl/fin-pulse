import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import AnalyticsChart from './AnalyticsChart';
import { initCloudSync, addCloudTx, deleteCloudTx } from './db';
import { importExcelToCloud } from './excelService';
import { getAiReply } from './aiService';

export default function App() {
  const [dark, setDark] = useState(true);
  const [txs, setTxs] = useState([]);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [amt, setAmt] = useState('');

  // AI 智慧聊天狀態
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: '你好！我是 FinPulse 理財顧問。我已接通您的雲端帳單，您可以問我「財務狀況」或「還款建議」！' }
  ]);

  useEffect(() => {
    initCloudSync(
      (list) => { setTxs(list); setLoading(false); },
      (userId) => { setUid(userId); }
    );
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !amt || !uid) return;
    try {
      await addCloudTx(uid, name, amt);
      setName(''); setAmt(''); setShow(false);
    } catch (err) { alert('儲存失敗！'); }
  };

  const handleUpload = (e) => {
    importExcelToCloud(e, uid, 
      () => setLoading(true),
      (count) => { setLoading(false); alert("🎉 成功匯入 " + count + " 筆帳單！"); },
      (errText) => { setLoading(false); alert(errText); }
    );
  };

  const handleDelete = async (id) => {
    if (uid && window.confirm('確定刪除？')) {
      try { await deleteCloudTx(uid, id); } catch (e) { console.error(e); }
    }
  };

  // 🤖 處理發送訊息給 AI
  const handleSendChat = () => {
    const query = chatInput.trim();
    if (!query) return;

    const newMsgs = [...chatMessages, { role: 'user', text: query }];
    setChatMessages(newMsgs);
    setChatInput('');

    setTimeout(() => {
      const aiReply = getAiReply(query, txs);
      setChatMessages([...newMsgs, { role: 'ai', text: aiReply }]);
    }, 300);
  };

  const bg = dark ? '#0f172a' : '#f8fafc';
  const txt = dark ? '#f1f5f9' : '#0f172a';
  const card = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '1px solid #334155' : '1px solid #e2e8f0';
  const sum = useMemo(() => txs.reduce((s, t) => s + (Number(t.amount) || 0), 0), [txs]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, color: txt, padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: border, paddingBottom: '16px', marginBottom: '32px' }}>
        <span style={{ fontSize: '20px', fontWeight: '900' }}>FinPulse PRO</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: loading ? '#fbbf24' : '#34d399' }}>{loading ? '⏳ 同步中...' : '🟢 雲端同步'}</span>
          <button onClick={() => setShow(true)} style={{ backgroundColor: '#10b981', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Add</button>
          <button onClick={() => setDark(!dark)} style={{ padding: '8px', borderRadius: '8px', border: border, backgroundColor: card, color: txt, cursor: 'pointer' }}><Icon name={dark ? 'sun' : 'moon'} /></button>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: card, border: border }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Total Balance</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{"HK$ " + sum.toLocaleString()}</div>
        </div>

        <AnalyticsChart txs={txs} dark={dark} />

        <div style={{ background: dark ? '#0f172a' : '#f1f5f9', border: '2px dashed #a855f7', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <strong style={{ color: '#a855f7', fontSize: '14px', display: 'block' }}>智能 Excel 帳單匯入</strong>
            <span style={{ fontSize: '11px', color: '#64748b' }}>支援自動模糊對齊項目與金額欄位</span>
          </div>
          <div>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleUpload} style={{ color: txt, fontSize: '13px', cursor: 'pointer' }} />
          </div>
        </div>

        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: card, border: border }}>
          <h3 style={{ margin: '0 0 16px 0' }}>{"Transactions (" + txs.length + ")"}</h3>
          {txs.length === 0 ? <div style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>目前無資料，請上傳或 Add 錄入。</div> : (
            txs.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{t.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: '700' }}>{"$ " + Number(t.amount || 0).toLocaleString()}</span>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🤖 AI 智能理財顧問對話框 UI 專區 */}
        <div style={{ background: dark ? '#0f172a' : '#f1f5f9', border: border, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <strong style={{ color: '#a855f7', fontSize: '14px' }}>🤖 FinPulse AI 智慧理財顧問</strong>
          <div style={{ height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#0ea5e9' : card, border: msg.role === 'user' ? 'none' : border, color: msg.role === 'user' ? '#fff' : txt, padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', fontSize: '13px', lineHeight: '1.5' }}>
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="問問 AI：財務狀況如何？" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} style={{ flex: 1, padding: '10px 14px', background: dark ? '#1e293b' : '#fff', border: border, borderRadius: '10px', color: txt, fontSize: '13px', outline: 'none' }} />
            <button type="button" onClick={handleSendChat} style={{ backgroundColor: '#a855f7', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>發送</button>
          </div>
        </div>
      </main>

      {show && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <div style={{ width: '280px', padding: '24px', borderRadius: '16px', backgroundColor: card, border: border }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Add Item</h3>
            <form onSubmit={handleAdd}>
              <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }} required />
              <input type="number" placeholder="Amount" value={amt} onChange={e => setAmt(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px', boxSizing: 'border-box' }} required />
              <div style={{ textAlign: 'right' }}>
                <button type="button" onClick={() => setShow(false)} style={{ marginRight: '8px' }}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
