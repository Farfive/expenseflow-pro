export default function TestSimplePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>
          🧪 Simple Test Page
        </h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          If you can see this, Next.js is working!
        </p>
        <p style={{ fontSize: '14px', color: '#999' }}>
          Frontend is running on port 4000
        </p>
      </div>
    </div>
  );
} 