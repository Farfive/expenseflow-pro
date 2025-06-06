export default function SimpleHomePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Navigation */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem',
        background: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0ea5e9' }}>
          ExpenseFlow Pro
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/auth/login" style={{ color: '#333', textDecoration: 'none' }}>
            Log in
          </a>
          <a 
            href="/auth/register" 
            style={{ 
              background: '#0ea5e9', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: '0.375rem', 
              textDecoration: 'none' 
            }}
          >
            Get started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold', 
          color: '#333', 
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          Modern Expense Management for Polish Businesses
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#666', 
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Streamline your expense reporting with OCR technology, automated workflows, 
          and comprehensive analytics. Built specifically for Polish accounting standards.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a 
            href="/auth/register"
            style={{ 
              background: '#0ea5e9', 
              color: 'white', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '0.375rem', 
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}
          >
            Get started
          </a>
          <a 
            href="/test-simple"
            style={{ 
              color: '#0ea5e9', 
              padding: '0.75rem 1.5rem', 
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}
          >
            View test page →
          </a>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ 
        padding: '4rem 2rem', 
        background: 'white',
        marginTop: '2rem'
      }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          textAlign: 'center', 
          marginBottom: '3rem',
          color: '#333'
        }}>
          Everything you need to manage expenses
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            {
              title: 'OCR Receipt Scanning',
              description: 'Upload receipts and invoices to automatically extract data with AI-powered OCR technology.',
            },
            {
              title: 'Advanced Analytics',
              description: 'Get insights into spending patterns, category breakdowns, and compliance reports.',
            },
            {
              title: 'Approval Workflows',
              description: 'Set up multi-level approval processes with role-based permissions and notifications.',
            },
            {
              title: 'Team Collaboration',
              description: 'Manage multiple users, departments, and companies with centralized administration.',
            },
            {
              title: 'VAT Compliance',
              description: 'Built-in Polish VAT calculations and NIP validation for complete compliance.',
            },
            {
              title: 'Easy Integration',
              description: 'RESTful API and webhook support for seamless integration with existing systems.',
            },
          ].map((feature, index) => (
            <div 
              key={index}
              style={{ 
                padding: '1.5rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                background: '#f9fafb'
              }}
            >
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                marginBottom: '0.5rem',
                color: '#333'
              }}>
                {feature.title}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.5' }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Section */}
      <div style={{ 
        padding: '2rem', 
        background: '#f9fafb',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>System Status</h3>
        <div id="status-info">
          <p>🔄 Checking backend connection...</p>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          // Test backend connection
          fetch('http://localhost:3002/api/health')
            .then(response => response.json())
            .then(data => {
              document.getElementById('status-info').innerHTML = 
                '<p style="color: green;">✅ Backend connected successfully!</p>' +
                '<p style="font-size: 0.9rem; color: #666;">Backend URL: http://localhost:3002</p>';
            })
            .catch(error => {
              document.getElementById('status-info').innerHTML = 
                '<p style="color: red;">❌ Backend connection failed</p>' +
                '<p style="font-size: 0.9rem; color: #666;">Error: ' + error.message + '</p>' +
                '<p style="font-size: 0.9rem; color: #666;">Make sure the backend server is running on port 3002</p>';
            });
        `
      }} />
    </div>
  );
} 