const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Simple in-memory storage for demo purposes
const storage = {
  events: [],
  pageViews: [],
  featureUsage: [],
  errors: [],
  feedback: []
};

// Analytics API endpoints
app.post('/api/user-analytics/track-event', (req, res) => {
  const eventData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.events.push(eventData);
  console.log('📊 Event tracked:', eventData.eventName);
  
  res.json({
    success: true,
    message: 'Event tracked successfully',
    data: eventData
  });
});

app.post('/api/user-analytics/track-page-view', (req, res) => {
  const pageViewData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.pageViews.push(pageViewData);
  console.log('📄 Page view tracked:', pageViewData.page);
  
  res.json({
    success: true,
    message: 'Page view tracked successfully',
    data: pageViewData
  });
});

app.post('/api/user-analytics/track-feature-usage', (req, res) => {
  const featureData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.featureUsage.push(featureData);
  console.log('🔧 Feature usage tracked:', featureData.feature, featureData.action);
  
  res.json({
    success: true,
    message: 'Feature usage tracked successfully',
    data: featureData
  });
});

app.post('/api/user-analytics/track-error', (req, res) => {
  const errorData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.errors.push(errorData);
  console.log('❌ Error tracked:', errorData.errorType, errorData.errorMessage);
  
  res.json({
    success: true,
    message: 'Error tracked successfully',
    data: errorData
  });
});

app.post('/api/user-analytics/track-onboarding', (req, res) => {
  const onboardingData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  console.log('🎯 Onboarding step tracked:', onboardingData.stepName, onboardingData.completed ? 'completed' : 'viewed');
  
  res.json({
    success: true,
    message: 'Onboarding step tracked successfully',
    data: onboardingData
  });
});

// Feedback endpoints
app.post('/api/feedback', (req, res) => {
  const feedbackData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.feedback.push(feedbackData);
  console.log('💬 Feedback received:', feedbackData.type, feedbackData.message);
  
  res.json({
    success: true,
    message: 'Feedback submitted successfully',
    data: feedbackData
  });
});

// A/B Testing endpoints
app.get('/api/user-analytics/ab-test/:testName', (req, res) => {
  const { testName } = req.params;
  
  // Simple A/B test variant assignment
  const variants = ['control', 'variant_a', 'variant_b'];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  
  console.log('🧪 A/B Test variant assigned:', testName, '→', variant);
  
  res.json({
    success: true,
    data: {
      testName,
      variant,
      assignedAt: new Date().toISOString()
    }
  });
});

app.post('/api/user-analytics/ab-test/:testName/conversion', (req, res) => {
  const { testName } = req.params;
  const conversionData = req.body;
  
  console.log('✅ A/B Test conversion tracked:', testName, conversionData);
  
  res.json({
    success: true,
    message: 'Conversion tracked successfully'
  });
});

// Dashboard data endpoint
app.get('/api/user-analytics/dashboard', (req, res) => {
  const dashboardData = {
    overview: {
      totalEvents: storage.events.length,
      uniqueUsers: new Set(storage.events.map(e => e.sessionId || 'anonymous')).size,
      avgEventsPerUser: storage.events.length / Math.max(1, new Set(storage.events.map(e => e.sessionId || 'anonymous')).size)
    },
    pageViews: Object.entries(
      storage.pageViews.reduce((acc, pv) => {
        acc[pv.page] = (acc[pv.page] || 0) + 1;
        return acc;
      }, {})
    ).map(([page, views]) => ({ page, views })),
    featureUsage: Object.entries(
      storage.featureUsage.reduce((acc, fu) => {
        acc[fu.feature] = (acc[fu.feature] || 0) + 1;
        return acc;
      }, {})
    ).map(([feature, usage]) => ({ feature, usage })),
    errors: Object.entries(
      storage.errors.reduce((acc, err) => {
        acc[err.errorType] = (acc[err.errorType] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })),
    feedback: Object.entries(
      storage.feedback.reduce((acc, fb) => {
        acc[fb.type || 'general'] = (acc[fb.type || 'general'] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })),
    performance: {
      averageLoadTime: 250,
      averageDomContentLoaded: 180,
      averageFirstContentfulPaint: 220,
      averageTimeToInteractive: 400
    },
    onboarding: {
      totalUsers: 10,
      averageTimeSpent: 120000
    }
  };
  
  res.json({
    success: true,
    data: dashboardData
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ExpenseFlow Pro Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      trackEvent: 'POST /api/user-analytics/track-event',
      trackPageView: 'POST /api/user-analytics/track-page-view',
      trackFeatureUsage: 'POST /api/user-analytics/track-feature-usage',
      trackError: 'POST /api/user-analytics/track-error',
      trackOnboarding: 'POST /api/user-analytics/track-onboarding',
      feedback: 'POST /api/feedback',
      dashboard: 'GET /api/user-analytics/dashboard'
    },
    frontend: 'http://localhost:3000',
    testPage: 'http://localhost:3000/test-analytics'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Stats endpoint for debugging
app.get('/api/stats', (req, res) => {
  res.json({
    events: storage.events.length,
    pageViews: storage.pageViews.length,
    featureUsage: storage.featureUsage.length,
    errors: storage.errors.length,
    feedback: storage.feedback.length,
    lastActivity: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ExpenseFlow Pro - Simple Backend Server');
  console.log('===========================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API Base URL: http://localhost:${PORT}/api`);
  console.log('✅ CORS enabled for frontend on port 3000');
  console.log('\nAvailable endpoints:');
  console.log('📊 POST /api/user-analytics/track-event');
  console.log('📄 POST /api/user-analytics/track-page-view');
  console.log('🔧 POST /api/user-analytics/track-feature-usage');
  console.log('❌ POST /api/user-analytics/track-error');
  console.log('🎯 POST /api/user-analytics/track-onboarding');
  console.log('💬 POST /api/feedback');
  console.log('📈 GET  /api/user-analytics/dashboard');
  console.log('❤️  GET  /api/health');
  console.log('📊 GET  /api/stats');
  console.log('\n🌐 Frontend: http://localhost:3000');
  console.log('🧪 Test Analytics: http://localhost:3000/test-analytics');
  console.log('\nReady for testing! 🎉\n');
}); 