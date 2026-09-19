import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function OverviewSection({ totalUnpaid, totalPaid, totalSpent, txsCount, pieData, pendingCardsCount, repaymentRate }) {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div>本期待繳總金額</div>
          <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '6px' }}>{"HK$" + totalUnpaid.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#34d399', marginTop: '8px' }}>已還金額: HK${totalPaid.toLocaleString()}</div>
        </div>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div>本期總簽賬支出</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>{"HK$" + totalSpent.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '8px' }}>{"累計共 " + txsCount + " 筆簽賬明細"}</div>
        </div>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div>待還款卡片數量</div>
          <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '6px' }}>{pendingCardsCount}</div>
          <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '8px' }}>⚠️ 請留意還款日期避免利息</div>
        </div>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div>還款完成率</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>{repaymentRate.toFixed(1)}%</div>
          <div style={{ width: '100%', height: '4px', background: '#1e293b', marginTop: '12px' }}>
            <div style={{ width: `${Math.min(repaymentRate, 100)}%`, height: '100%', background: '#34d399' }} />
          </div>
        </div>
      </div>
      <div style={{ background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><strong>🕒 9 大分類支出佔比 (Doughnut Chart)</strong><span style={{ fontSize: '12px', color: '#38bdf8' }}>環狀圖分析</span></div>
        <div style={{ width: '100%', height: '160px' }}>
          {pieData.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', paddingTop: '50px' }}>暫無日常明細數據</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  );
}
