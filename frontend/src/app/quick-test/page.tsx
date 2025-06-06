export default function QuickTest() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>✅ Next.js is Working!</h1>
      <p>If you can see this page, the frontend server is running correctly.</p>
      <p>Current time: {new Date().toISOString()}</p>
      <hr />
      <p><a href="/">← Back to main page</a></p>
      <p><a href="/test-simple">→ Go to diagnostics page</a></p>
    </div>
  );
} 