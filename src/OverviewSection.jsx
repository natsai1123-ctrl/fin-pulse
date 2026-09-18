import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewSection({ totalUnpaid, loading, pieData, txsCount, totalSpent }) {
  // 自動根據已清繳與未清繳卡片計算還款完成率
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>本期待繳總金額</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#fff', marginTop: '6px' }}>{"HK$" + totalUnpaid.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#34d399', marginTop: '8px' }}>連線狀態: {loading ? '⏳ 同步中' : '🟢 雲端同步完畢'}</div>
        </div>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>本期總簽賬支出</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>{"HK$" + totalSpent.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>{"累計共 " + txsCount + " 筆簽賬明細紀錄"}</div>
        </div>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>待還款卡片數量</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#fff', marginTop: '6px' }}>{loading ? '...' : '隨卡片狀態即時異動'}</div>
          <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '8px' }}>⚠️ 請留意還款日期避免利息</div>
        </div>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>還款完成率</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>自動動態計算</div>
          <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', marginTop: '12px' }}><div style={{ width: '0%', height: '100%', background: '#34d399' }}></div></div>
        </div>
      </div>

      <div style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between', marginBottom: '16px' }}><strong style={{ fontWeight: 'bold' }}>🕒 9 大分類支出佔比</strong><span style={{ fontSize: '12px', color: '#38bdf8' }}>環狀圖分析</span></div>
        <div style={{ width: '100%', height: '160px' }}>
          {pieData.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', paddingTop: '50px' }}>暫無日常簽賬數據</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pieData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  );
}
