# User Feedback and Analytics System

## Overview

The User Feedback and Analytics System is a comprehensive solution for tracking user behavior, collecting feedback, monitoring performance, and conducting A/B testing within ExpenseFlow Pro. This system provides deep insights into user interactions, product performance, and customer satisfaction to drive data-driven product decisions.

## Features

### 🔍 User Behavior Tracking
- **Page View Analytics**: Automatic tracking of page visits with performance metrics
- **Feature Usage Monitoring**: Track feature adoption and usage patterns
- **User Journey Analysis**: Complete user session tracking and flow analysis
- **Performance Monitoring**: Real-time performance metrics and alerts
- **Custom Event Tracking**: Flexible event tracking for any user interaction

### 📝 Feedback Collection
- **In-App Feedback Widget**: Beautiful, non-intrusive feedback collection
- **Multiple Feedback Types**: General feedback, ratings, bug reports, feature requests
- **Customer Satisfaction Surveys**: NPS surveys with intelligent triggering
- **Support Ticket Integration**: Seamless conversion of feedback to support tickets
- **Sentiment Analysis**: Automatic sentiment analysis of feedback content

### 🧪 A/B Testing Framework
- **Variant Assignment**: Automatic user assignment to test variants
- **Conversion Tracking**: Track success metrics and conversion events
- **Statistical Analysis**: Built-in statistical significance testing
- **Feature Flags**: Easy feature toggle and rollout management
- **Performance Impact**: Monitor A/B test impact on performance

### 🚨 Error Tracking & Monitoring
- **Automatic Error Capture**: JavaScript errors and unhandled promises
- **Performance Alerts**: Automated alerts for performance degradation
- **Error Aggregation**: Group similar errors for better analysis
- **Real-time Monitoring**: Live error tracking and notification system
- **Error Resolution Workflow**: Track error status and resolution

### 👥 User Onboarding Analytics
- **Onboarding Flow Tracking**: Step-by-step progress monitoring
- **Completion Rate Analysis**: Identify onboarding bottlenecks
- **Time-to-Value Metrics**: Track user time to first success
- **Drop-off Analysis**: Understand where users abandon onboarding
- **Personalization Insights**: Data for onboarding optimization

### 📊 Analytics Dashboard
- **Real-time KPI Widgets**: Live metrics and trend indicators
- **Interactive Charts**: Drill-down capabilities with Chart.js integration
- **Cohort Analysis**: User behavior analysis by cohorts
- **Feature Adoption Metrics**: Track feature usage and adoption rates
- **Performance Benchmarking**: Compare metrics across time periods

## Architecture

### Backend Services

#### UserAnalyticsService
Comprehensive service for tracking all user interactions and behaviors.

**Key Methods:**
- `trackEvent(userId, eventData)`: Track any user event
- `trackPageView(userId, pageData)`: Track page visits with performance
- `trackFeatureUsage(userId, featureData)`: Monitor feature usage
- `trackOnboardingStep(userId, stepData)`: Track onboarding progress
- `trackError(userId, errorData)`: Log errors and exceptions
- `getUserAnalyticsDashboard(companyId, filters)`: Get dashboard data
- `getFeatureAdoptionMetrics(companyId, dateRange)`: Feature adoption stats
- `assignABTest(userId, testName)`: A/B test variant assignment
- `trackABTestConversion(userId, testName, data)`: Track conversions

#### FeedbackService
Service for managing user feedback, surveys, and support tickets.

**Key Methods:**
- `collectFeedback(userId, feedbackData)`: Store user feedback
- `createSurvey(surveyData)`: Create customer satisfaction surveys
- `shouldShowSurvey(userId, page, sessionData)`: Smart survey triggering
- `processSurveyResponse(responseId)`: Process and analyze responses
- `createSupportTicket(ticketData)`: Convert feedback to support tickets
- `getFeedbackAnalytics(companyId, filters)`: Feedback analytics
- `generateFeedbackReport(companyId, reportType)`: Automated reports
- `analyzeFeedbackSentiment(text)`: Sentiment analysis

### Frontend Components

#### useAnalytics Hook
React hook providing automatic tracking and utility functions.

**Features:**
- Automatic page view tracking with performance metrics
- Error boundary integration for automatic error tracking
- Feature usage timing utilities
- Session management and user identification
- Performance metrics collection

```typescript
const {
  trackEvent,
  trackFeatureUsage,
  trackError,
  trackOnboardingStep,
  startFeatureTimer,
  endFeatureTimer,
  sessionId
} = useAnalytics();
```

#### FeedbackWidget Component
In-app feedback collection widget with customizable positioning and styling.

**Props:**
- `position`: Widget position (bottom-right, bottom-left, etc.)
- `color`: Theme color customization
- `size`: Widget size (small, medium, large)

**Features:**
- Multiple feedback types (general, rating, bug report, feature request)
- Star rating system for satisfaction surveys
- Category-based feedback organization
- Rich text feedback collection
- Animated interactions with Framer Motion

#### AnalyticsProvider Context
React context providing A/B testing and analytics functionality.

**Features:**
- A/B test variant assignment and tracking
- Global analytics event tracking
- Feature flag management
- Performance monitoring integration

```typescript
const { getABTestVariant, trackConversion } = useAnalyticsContext();
```

#### Analytics Dashboard
Comprehensive dashboard for product team analytics.

**Features:**
- Real-time KPI widgets with trend indicators
- Interactive charts with drill-down capabilities
- Tabbed interface (Overview, Behavior, Feedback, Performance, Errors)
- Date range filtering and data export
- Error log management and resolution tracking

## Database Schema

### Core Tables

#### UserEvent
Stores all user interaction events with rich metadata.
```sql
CREATE TABLE "UserEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "companyId" TEXT,
  "eventType" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "page" TEXT,
  "feature" TEXT,
  "metadata" TEXT,
  "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "ipAddress" TEXT
);
```

#### UserFeedback
Comprehensive feedback storage with sentiment analysis.
```sql
CREATE TABLE "UserFeedback" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "rating" INTEGER,
  "category" TEXT,
  "sentiment" TEXT,
  "sentimentScore" DECIMAL(3,2),
  "status" TEXT DEFAULT 'open'
);
```

#### ABTest & ABTestAssignment
A/B testing framework with variant tracking.
```sql
CREATE TABLE "ABTest" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "variants" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT false,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3)
);

CREATE TABLE "ABTestAssignment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "testName" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

#### ErrorLog
Comprehensive error tracking and monitoring.
```sql
CREATE TABLE "ErrorLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "errorType" TEXT NOT NULL,
  "errorMessage" TEXT NOT NULL,
  "errorStack" TEXT,
  "severity" TEXT DEFAULT 'error',
  "status" TEXT DEFAULT 'open'
);
```

### Performance Optimization

**Indexes for Fast Queries:**
- `UserEvent_userId_idx`: User-specific queries
- `UserEvent_eventType_idx`: Event type filtering
- `UserEvent_timestamp_idx`: Time-based queries
- `UserEvent_page_feature_idx`: Composite index for page/feature analysis
- `UserFeedback_type_status_idx`: Feedback management queries
- `ErrorLog_severity_status_idx`: Error monitoring queries

## API Endpoints

### Analytics Tracking

#### POST /api/user-analytics/track-event
Track any user event with rich metadata.

**Request:**
```json
{
  "eventType": "feature_usage",
  "eventName": "Document Upload",
  "feature": "document_processing",
  "metadata": {
    "fileType": "pdf",
    "fileSize": 1024000,
    "processingTime": 2.5
  }
}
```

#### POST /api/user-analytics/track-page-view
Track page views with performance metrics.

**Request:**
```json
{
  "page": "/dashboard/expenses",
  "referrer": "/dashboard",
  "loadTime": 1250,
  "performanceMetrics": {
    "domContentLoaded": 800,
    "firstContentfulPaint": 1100,
    "timeToInteractive": 1400
  }
}
```

#### POST /api/user-analytics/track-feature-usage
Monitor feature adoption and usage patterns.

**Request:**
```json
{
  "feature": "expense_categorization",
  "action": "auto_categorize",
  "duration": 3200,
  "success": true,
  "metadata": {
    "confidence": 0.95,
    "category": "meals"
  }
}
```

### Feedback & Surveys

#### POST /api/user-analytics/feedback
Submit user feedback with categorization.

**Request:**
```json
{
  "type": "bug_report",
  "content": "The export feature is not working properly",
  "category": "functionality",
  "priority": "high",
  "page": "/dashboard/exports"
}
```

#### GET /api/user-analytics/survey-check
Check if user should see a survey based on conditions.

**Query Parameters:**
- `page`: Current page
- `sessionData`: Session metadata

#### POST /api/user-analytics/survey-response
Submit survey response with NPS scoring.

**Request:**
```json
{
  "surveyId": "nps_q1_2024",
  "responses": {
    "nps_question": 9,
    "feedback": "Great product!"
  },
  "npsScore": 9
}
```

### A/B Testing

#### GET /api/user-analytics/ab-test/:testName
Get A/B test variant assignment for user.

**Response:**
```json
{
  "success": true,
  "data": {
    "testName": "checkout_flow_v2",
    "variant": "treatment",
    "assignedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/user-analytics/ab-test/:testName/conversion
Track A/B test conversion events.

**Request:**
```json
{
  "eventType": "purchase",
  "value": 299.99,
  "metadata": {
    "conversionStep": "payment_complete"
  }
}
```

### Dashboard & Reporting

#### GET /api/user-analytics/dashboard
Get comprehensive analytics dashboard data.

**Query Parameters:**
- `dateFrom`: Start date for analysis
- `dateTo`: End date for analysis
- `userId`: Filter by specific user
- `feature`: Filter by feature

#### GET /api/user-analytics/feature-adoption
Get feature adoption metrics and trends.

#### GET /api/user-analytics/feedback-analytics
Get feedback analytics with sentiment analysis (Admin only).

## Integration Guide

### 1. Basic Setup

**Install Dependencies:**
```bash
npm install framer-motion string-similarity mathjs nodemailer express-rate-limit
```

**Add Routes to Express App:**
```javascript
const userAnalyticsRoutes = require('./routes/userAnalytics');
app.use('/api/user-analytics', userAnalyticsRoutes);
```

**Run Database Migration:**
```bash
npx prisma db push
npx prisma generate
```

### 2. Frontend Integration

**Wrap App with Analytics Provider:**
```typescript
import { AnalyticsProvider } from '../components/analytics/AnalyticsProvider';
import { FeedbackWidget } from '../components/feedback/FeedbackWidget';

function App() {
  const abTestConfig = {
    'checkout_flow_v2': {
      variants: [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 }
      ],
      defaultVariant: 'control'
    }
  };

  return (
    <AnalyticsProvider abTestConfig={abTestConfig}>
      <YourApp />
      <FeedbackWidget position="bottom-right" />
    </AnalyticsProvider>
  );
}
```

**Use Analytics Hook:**
```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function ExpenseForm() {
  const { trackFeatureUsage, startFeatureTimer, endFeatureTimer } = useAnalytics();

  const handleSubmit = async (data) => {
    startFeatureTimer('expense_submission');
    
    try {
      await submitExpense(data);
      endFeatureTimer('expense_submission', 'submit', true);
    } catch (error) {
      endFeatureTimer('expense_submission', 'submit', false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Implement A/B Testing:**
```typescript
import { useABTest } from '../components/analytics/AnalyticsProvider';

function CheckoutButton() {
  const { variant, trackConversion, isLoading } = useABTest('checkout_flow_v2');

  const handleClick = () => {
    trackConversion('button_click');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <button 
      onClick={handleClick}
      className={variant === 'treatment' ? 'bg-green-500' : 'bg-blue-500'}
    >
      {variant === 'treatment' ? 'Complete Purchase' : 'Buy Now'}
    </button>
  );
}
```

### 3. Environment Configuration

**Add to .env:**
```env
# SMTP Configuration for notifications
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM=noreply@expenseflow.com

# Support team email
SUPPORT_TEAM_EMAIL=support@expenseflow.com

# Analytics configuration
ANALYTICS_RETENTION_DAYS=365
FEEDBACK_AUTORESPONDER=true
```

## Analytics Insights & KPIs

### User Engagement Metrics
- **Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)**
- **Session Duration and Frequency**
- **Feature Adoption Rate and Time-to-Adoption**
- **User Retention Rates by Cohort**
- **Page Views and User Flow Analysis**

### Product Performance Metrics
- **Feature Usage Frequency and Success Rates**
- **Error Rates by Feature and Severity**
- **Performance Metrics (Load Time, Response Time)**
- **A/B Test Conversion Rates**
- **Onboarding Completion Rates**

### Customer Satisfaction Metrics
- **Net Promoter Score (NPS) Trends**
- **Customer Satisfaction (CSAT) Scores**
- **Feedback Volume and Sentiment Analysis**
- **Support Ticket Volume and Resolution Time**
- **Feature Request Frequency and Priority**

### Business Impact Metrics
- **Revenue Impact of Feature Usage**
- **Cost Reduction from Automation Features**
- **Time Savings from Streamlined Workflows**
- **User Productivity Improvements**
- **Customer Lifetime Value Correlation**

## Reporting & Exports

### Automated Reports
- **Weekly Product Health Report**: Key metrics and trends
- **Monthly User Engagement Report**: Detailed user behavior analysis
- **Quarterly Feature Adoption Report**: Feature performance and roadmap insights
- **Critical Error Alerts**: Real-time notifications for severe issues

### Export Formats
- **Excel Reports**: Detailed data with multiple sheets and formatting
- **PDF Reports**: Executive summaries with charts and insights
- **CSV Exports**: Raw data for external analysis
- **JSON APIs**: Real-time data access for external tools

### Report Distribution
- **Email Delivery**: Automated report distribution to stakeholders
- **Slack Integration**: Real-time alerts and daily summaries
- **Dashboard Embedding**: White-label analytics for client portals
- **API Access**: Programmatic access to all analytics data

## Performance Considerations

### Data Volume Management
- **Event Sampling**: Sample high-volume events for large user bases
- **Data Retention**: Configurable retention periods for different data types
- **Archive Strategy**: Move old data to cold storage for cost optimization
- **Real-time vs Batch**: Balance real-time insights with system performance

### Privacy & Compliance
- **GDPR Compliance**: User consent management and data deletion
- **Data Anonymization**: Remove PII from analytics while preserving insights
- **Geographic Data Handling**: Comply with regional data regulations
- **Audit Trail**: Complete logging of data access and modifications

### Scalability Architecture
- **Horizontal Scaling**: Support for multiple application instances
- **Database Sharding**: Partition data by company or time period
- **Caching Strategy**: Redis for frequently accessed analytics data
- **CDN Integration**: Global distribution of analytics assets

## Troubleshooting

### Common Issues

#### Low Event Collection Rate
1. Check authentication tokens in frontend requests
2. Verify CORS configuration for cross-origin requests
3. Review rate limiting settings for analytics endpoints
4. Check browser console for JavaScript errors

#### Missing User Sessions
1. Verify session ID generation and persistence
2. Check localStorage availability and permissions
3. Review session timeout and renewal logic
4. Validate session data structure

#### Inaccurate Performance Metrics
1. Check Performance API availability in target browsers
2. Verify timing calculation logic
3. Review sampling rates for performance data
4. Validate metric aggregation calculations

#### A/B Test Assignment Issues
1. Check test configuration and variant weights
2. Verify user eligibility criteria
3. Review assignment persistence across sessions
4. Validate conversion tracking implementation

### Debugging Tools
- **Analytics Event Inspector**: Browser extension for real-time event debugging
- **Performance Monitor**: Built-in dashboard for system health monitoring
- **A/B Test Debugger**: Tool for testing variant assignments and conversions
- **Error Log Analyzer**: Advanced error pattern recognition and alerting

## Future Enhancements

### Advanced Analytics
- **Machine Learning Insights**: Predictive analytics for user behavior
- **Cohort Analysis**: Advanced user segmentation and behavior analysis
- **Funnel Analysis**: Multi-step conversion tracking and optimization
- **Heat Maps**: Visual representation of user interaction patterns

### Enhanced A/B Testing
- **Multivariate Testing**: Test multiple variables simultaneously
- **Statistical Significance**: Automated test result validation
- **Progressive Rollouts**: Gradual feature deployment with monitoring
- **Personalization Engine**: AI-driven user experience customization

### Integration Expansions
- **Third-party Analytics**: Google Analytics, Mixpanel, Amplitude integration
- **Customer Success Platforms**: Salesforce, HubSpot, Intercom integration
- **Business Intelligence**: Power BI, Tableau, Looker connectivity
- **Data Warehousing**: Snowflake, BigQuery, Redshift export capabilities

## Support & Maintenance

### Monitoring & Alerts
- **System Health Monitoring**: Real-time status of analytics services
- **Data Quality Alerts**: Notifications for anomalous data patterns
- **Performance Degradation**: Alerts for response time increases
- **Error Rate Monitoring**: Automated alerts for error spike detection

### Regular Maintenance
- **Data Cleanup**: Automated removal of outdated analytics data
- **Index Optimization**: Regular database performance tuning
- **Security Updates**: Keep all dependencies and frameworks current
- **Backup Verification**: Regular testing of data backup and recovery

### Documentation Maintenance
- **API Documentation**: Keep endpoint documentation current
- **Integration Guides**: Update setup and configuration instructions
- **Best Practices**: Evolve recommendations based on usage patterns
- **Troubleshooting Updates**: Add solutions for newly discovered issues

This comprehensive User Feedback and Analytics System provides ExpenseFlow Pro with enterprise-grade insights into user behavior, product performance, and customer satisfaction, enabling data-driven product decisions and continuous improvement. 