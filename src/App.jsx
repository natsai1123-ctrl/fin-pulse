import React, {
  useState,
  useMemo
} from 'react';

// 🛠️ 將長 SVG 字串拆碎串接
const p1 =
  "M12 3v1m0 16v1m9-9h-1M4" +
  " 12H3m15.364 6.364l-.70" +
  "7-.707M6.343 6.343l-.70" +
  "7-.707m12.728 0l-.707.7" +
  "07M6.343 17.657l-.707.7" +
  "07M16 12a4 4 0 11-8 0 4" +
  " 4 0 018 0z";

const p2 =
  "M21 12.79A9 9 0 1111." +
  "21 3 7 7 0 0021 12.79z";

const Icon = ({
  name,
  size = 18,
  className = ""
}) => {
  const icons = {
    plus: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    ),
    sun: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={p1}
      />
    ),
    moon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={p2}
      />
    )
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

const INIT_TX = [
  {
    id: 't1',
    name: 'Stripe Payout',
    amount: 4250
  },
  {
    id: 't2',
    name: 'AWS Hosting',
    amount: 340
  }
];

export default function App() {
  const [dark, setDark] =
    useState(true);
  const [txs, setTxs] =
    useState(INIT_TX);
  const [show, setShow] =
    useState(false);
  const [name, setName] =
    useState('');
  const [amt, setAmt] =
    useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name || !amt) return;
    setTxs([
      {
        id: String(Date.now()),
        name: name,
        amount: parseFloat(amt)
      },
      ...txs
    ]);
    setName('');
    setAmt('');
    setShow(false);
  };

  const bg = dark
    ? '#0f172a'
    : '#f8fafc';
  const txt = dark
    ? '#f1f5f9'
    : '#0f172a';
  const card = dark
    ? '#1e293b'
    : '#ffffff';
  const border = dark
    ? '1px solid #334155'
    : '1px solid #e2e8f0';

  const sum = useMemo(() => {
    return txs.reduce(
      (s, t) => s + t.amount,
      0
    );
  }, [txs]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: bg,
        color: txt,
        padding: '24px',
        fontFamily: 'sans-serif'
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          borderBottom: border,
          paddingBottom: '16px',
          marginBottom: '32px'
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: '900'
          }}
        >
          FinPulse PRO
        </span>
        <div
          style={{
            display: 'flex',
            gap: '12px'
          }}
        >
          <button
            onClick={() =>
              setShow(true)
            }
            style={{
              backgroundColor:
                '#10b981',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
          <button
            onClick={() =>
              setDark(!dark)
            }
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: border,
              backgroundColor: card,
              color: txt,
              cursor: 'pointer'
            }}
          >
            <Icon
              name={
                dark
                  ? 'sun'
                  : 'moon'
              }
            />
          </button>
        </div>
      </header>

      <main>
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: card,
            border: border,
            marginBottom: '32px'
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: '14px'
            }}
          >
            Total Balance
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: '700'
            }}
          >
            HK$
            {sum.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: card,
            border: border
          }}
        >
          <h3
            style={{
              margin: '0 0 16px 0'
            }}
          >
            Transactions
          </h3>
          {txs.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                padding: '12px 0',
                borderBottom:
                  '1px solid' +
                  ' rgba(0,0,0,0.1)'
              }}
            >
              <span>{t.name}</span>
              <span
                style={{
                  fontWeight: '700'
                }}
              >
                ${t.amount}
              </span>
            </div>
          ))}
        </div>
      </main>

      {show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'center'
          }}
        >
          <div
            style={{
              width: '280px',
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: card,
              border: border
            }}
          >
            <h3
              style={{
                margin:
                  '0 0 16px 0'
              }}
            >
              Add Item
            </h3>
            <form
              onSubmit={handleAdd}
            >
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom:
                    '12px',
                  boxSizing:
                    'border-box'
                }}
                required
              />
              <input
                type="number"
                placeholder="Amount"
                value={amt}
                onChange={(e) =>
                  setAmt(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom:
                    '16px',
                  boxSizing:
                    'border-box'
                }}
                required
              />
              <div
                style={{
                  textAlign: 'right'
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShow(false)
                  }
                  style={{
                    marginRight:
                      '8px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
