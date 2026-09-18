import * as XLSX from 'xlsx';
import { addCloudTx } from './db';

// 📥 智能讀取、解析 Excel 檔案並一鍵批次同步至雲端
export const importExcelToCloud = (e, uid, onStart, onSuccess, onError) => {
  const f = e.target.files;
  if (!f || !uid) return;

  onStart();
  const r = new FileReader();
  r.onload = async (evt) => {
    try {
      const d = evt.target.result;
      const wb = XLSX.read(d, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);

      if (json.length === 0) {
        e.target.value = '';
        return onError('試算表內無有效資料 rows');
      }

      let count = 0;
      for (let row of json) {
        const keys = Object.keys(row);
        
        // 🧠 智慧模糊比對名稱欄位
        const nK = keys.find(k => 
          k.includes('名稱') || 
          k.includes('項目') || 
          k.toLowerCase().includes('name') ||
          k.toLowerCase().includes('item')
        ) || '';
        
        // 🧠 智慧模糊比對金額欄位
        const aK = keys.find(k => 
          k.includes('金額') || 
          k.includes('應還') || 
          k.toLowerCase().includes('amount') ||
          k.toLowerCase().includes('price')
        ) || '';

        const impName = nK ? String(row[nK]).trim() : 'Excel 匯入交易';
        const impAmt = aK ? parseFloat(row[aK]) || 0 : 0;

        // 直接調用先前 db.js 的函數寫入雲端 Firestore
        await addCloudTx(uid, impName, impAmt);
        count++;
      }

      e.target.value = ''; // 清空 file input
      onSuccess(count);
    } catch (err) {
      console.error(err);
      e.target.value = '';
      onError('解析檔案失敗，請檢查格式。');
    }
  };
  r.readAsArrayBuffer(f[0]);
};
