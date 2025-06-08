// SIMPLE TEST VERSION - no external dependencies
export default function HomePage() {
  return (
    <html lang="en">
      <head>
        <title>ExpenseFlow Pro</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e40af',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px'
        }}>
          <h1 style={{fontSize: '48px', marginBottom: '20px'}}>
            ⚡ ExpenseFlow Pro
          </h1>
          <p style={{fontSize: '18px', marginBottom: '30px'}}>
            ✅ Frontend is working!
          </p>
          <div style={{fontSize: '14px', opacity: 0.8, marginBottom: '30px'}}>
            <p>Backend: localhost:4001</p>
            <p>Frontend: localhost:4000</p>
            <p>Status: Online and Ready!</p>
          </div>
          <div>
            <button style={{
              background: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              margin: '0 10px',
              cursor: 'pointer'
            }}>
              🔑 Login
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              margin: '0 10px',
              cursor: 'pointer'
            }}>
              📊 Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 