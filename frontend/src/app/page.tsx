// Ultra-fast loading page - no heavy dependencies
'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Test backend connection
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        setBackendStatus('connected');
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h1 style={{ 
          margin: 0,
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: '#4F46E5',
          letterSpacing: '-0.025em'
        }}>
          ⚡ ExpenseFlow Pro
        </h1>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/auth/login" style={{ 
            color: '#374151', 
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            Sign In
          </a>
          <a href="/auth/register" style={{ 
            background: '#4F46E5', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px', 
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>
            Get Started
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <main style={{ 
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '3rem',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h2 style={{ 
            fontSize: 'clamp(2rem, 5vw, 3.5rem)', 
            fontWeight: '800', 
            color: 'white', 
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Lightning-Fast Expense Management
          </h2>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'rgba(255,255,255,0.9)', 
            marginBottom: '2.5rem',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 2.5rem'
          }}>
            Polish businesses trust ExpenseFlow Pro for OCR document processing, 
            automated workflows, and real-time analytics.
          </p>

          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            marginBottom: '3rem'
          }}>
            <a href="/auth/register" style={{ 
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '12px', 
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
              transition: 'transform 0.2s ease',
              display: 'inline-block'
            }}>
              🚀 Start Free Trial
            </a>
            <a href="/demo" style={{ 
              background: 'rgba(255,255,255,0.1)', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '12px', 
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              border: '2px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              📊 View Demo
            </a>
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginTop: '3rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>95%+</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>OCR Accuracy</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>⚡</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>Instant Processing</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>🔒</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>GDPR Compliant</div>
            </div>
          </div>
        </div>

        {/* Status Dashboard */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '2rem',
          marginTop: '2rem',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h3 style={{ 
            color: 'white', 
            marginBottom: '1rem',
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>
            🔧 System Status
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            textAlign: 'left'
          }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>
                Backend API
              </div>
              <div style={{ 
                color: backendStatus === 'connected' ? '#10B981' : 
                       backendStatus === 'disconnected' ? '#EF4444' : '#F59E0B',
                fontSize: '0.9rem'
              }}>
                {backendStatus === 'connected' ? '✅ Connected' : 
                 backendStatus === 'disconnected' ? '❌ Disconnected' : '🔄 Checking...'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Port 3002 • API v1.0
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>
                Frontend App
              </div>
              <div style={{ color: '#10B981', fontSize: '0.9rem' }}>
                ✅ Ready
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Next.js 14 • React 18
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 