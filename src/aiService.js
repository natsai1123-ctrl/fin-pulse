// 🤖 智慧型理財問答與雲端財務診斷核心邏輯
export const getAiReply = (query, txs) => {
  let reply = "收到您的提問。建議優先繳清高金額或即將到期的帳單，避免產生循環利息。";
  let total = 0;
  let maxAmt = 0;
  let maxName = "無";
  
  // 🧠 即時輪詢目前雲端 Firestore 中的真實帳單數據
  for (let t of txs) {
    const amt = Number(t.amount || 0);
    total += amt;
    if (amt > maxAmt) {
      maxAmt = amt;
      maxName = t.name || "未命名卡片";
    }
  }

  // 🧠 關鍵字智能路由匹配
  if (query.includes("狀況") || query.includes("財務") || query.includes("多少")) {
    reply = `📊 【雲端實時診斷】您目前在雲端共有 ${txs.length} 筆帳單，待繳總金額為 <strong>HK$${total.toLocaleString()}</strong>。`;
  } else if (query.includes("最多") || query.includes("大額") || query.includes("最高")) {
    reply = `🔥 【高風險提示】目前欠款金額最高的項目是 <strong>「${maxName}」</strong>，金額為 <strong>HK$${maxAmt.toLocaleString()}</strong>。`;
  } else if (query.includes("還款") || query.includes("建議")) {
    reply = `💡 【還款建議】建議全額集中資金，優先進攻目前欠款最多的 「${maxName}」，能最有效率地避免高昂利息！`;
  }

  return reply;
};
