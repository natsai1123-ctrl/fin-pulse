import * as XLSX from 'xlsx';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export const importExcelToCloud = (e, uid, onStart, onSuccess, onError) => {
  const f = e.target.files;
  if (!f || !uid) return;

  onStart();
  const r = new FileReader();
  r.onload = async (evt) => {
    try {
      const d = evt.target.result;
      const wb = XLSX.read(d, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames];
      const json = XLSX.utils.sheet_to_json(ws);

      if (json.length === 0) {
        e.target.value = '';
        return onError('試算表內無有效資料 rows');
      }

      let count = 0;
      for (let row of json) {
        const keys = Object.keys(row);
        const nK = keys.find(k => 
          k.includes('名稱') || k.includes('項目') || 
          k.toLowerCase().includes('name') || k.toLowerCase().includes('item') ||
          k.includes('描述') || k.toLowerCase().includes('desc')
        ) || '';
        const aK = keys.find(k => 
          k.includes('金額') || k.includes('應還') || 
          k.toLowerCase().includes('amount') || k.toLowerCase().includes('price')
        ) || '';
        const cK = keys.find(k => k.includes('類別') || k.toLowerCase().includes('category')) || '';

        const impName = nK ? String(row[nK]).trim() : 'Excel 匯入交易';
        const impAmt = aK ? parseFloat(row[aK]) || 0 : 0;
        const impCat = cK ? String(row[cK]).trim() : '9) 其他';

        const tid = 'tx-xl-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        // 🟢 修正：精準寫入第三頁的 transactions 資料夾，絕對不污染第二頁的 cards
        await setDoc(doc(db, 'users', uid, 'transactions', tid), {
          description: impName,
          amount: impAmt,
          category: impCat,
          date: '2026-09-18'
        });
        count++;
      }

      e.target.value = '';
      onSuccess(count);
    } catch (err) {
      console.error(err);
      e.target.value = '';
      onError('解析檔案失敗，請檢查格式。');
    }
  };
  r.readAsArrayBuffer(f);
};
