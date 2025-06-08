export default function TestPage() {
  return (
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body style={{margin: 0, padding: '50px', fontFamily: 'Arial'}}>
        <h1 style={{color: 'green'}}>✅ TEST PAGE WORKS!</h1>
        <p>If you can see this, Next.js routing is working!</p>
        <p>Frontend is running on port 4000</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
      </body>
    </html>
  );
} 