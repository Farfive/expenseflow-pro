export default function TestSimplePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#0ea5e9' }}>🧪 ExpenseFlow Pro - Simple Test Page</h1>
      <p>If you can see this page, then:</p>
      <ul>
        <li>✅ Next.js is working</li>
        <li>✅ Basic routing is working</li>
        <li>✅ App directory structure is correct</li>
      </ul>
      
      <h2>System Information</h2>
      <ul>
        <li><strong>Time:</strong> {new Date().toLocaleString()}</li>
        <li><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server Side'}</li>
        <li><strong>Environment:</strong> {process.env.NODE_ENV}</li>
      </ul>

      <h2>Backend Test</h2>
      <p>Testing backend connection...</p>
      <div id="backend-status">Loading...</div>

      <h2>Navigation Test</h2>
      <p>
        <a href="/" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>
          ← Back to Home
        </a>
      </p>

      <script dangerouslySetInnerHTML={{
        __html: `
          // Test backend connection
          fetch('http://localhost:3002/api/health')
            .then(response => response.json())
            .then(data => {
              document.getElementById('backend-status').innerHTML = 
                '<span style="color: green;">✅ Backend connected: ' + JSON.stringify(data) + '</span>';
            })
            .catch(error => {
              document.getElementById('backend-status').innerHTML = 
                '<span style="color: red;">❌ Backend connection failed: ' + error.message + '</span>';
            });
        `
      }} />
    </div>
  );
} 