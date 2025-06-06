const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const UserAnalyticsService = require('../services/userAnalyticsService');
const FeedbackService = require('../services/feedbackService');

const userAnalyticsService = new UserAnalyticsService();
const feedbackService = new FeedbackService();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many analytics requests from this IP'
});

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 feedback requests per windowMs
  message: 'Too many feedback requests from this IP'
});

// Apply rate limiting
router.use(analyticsLimiter);

/**
 * @route POST /api/user-analytics/track-event
 * @desc Track user events (page views, feature usage, interactions)
 * @access Private
 */
router.post('/track-event', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventData = req.body;

    // Add user context
    eventData.userAgent = req.get('User-Agent');
    eventData.ipAddress = req.ip;

    const event = await userAnalyticsService.trackEvent(userId, eventData);

    res.json({
      success: true,
      data: { eventId: event.id }
    });

  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event'
    });
  }
});

/**
 * @route POST /api/user-analytics/track-page-view
 * @desc Track page views with performance metrics
 * @access Private
 */
router.post('/track-page-view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const pageData = req.body;

    await userAnalyticsService.trackPageView(userId, pageData);

    res.json({
      success: true,
      message: 'Page view tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track page view'
    });
  }
});

/**
 * @route POST /api/user-analytics/track-feature-usage
 * @desc Track feature usage and adoption
 * @access Private
 */
router.post('/track-feature-usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const featureData = req.body;

    await userAnalyticsService.trackFeatureUsage(userId, featureData);

    res.json({
      success: true,
      message: 'Feature usage tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking feature usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track feature usage'
    });
  }
});

/**
 * @route POST /api/user-analytics/track-onboarding
 * @desc Track user onboarding progress
 * @access Private
 */
router.post('/track-onboarding', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stepData = req.body;

    await userAnalyticsService.trackOnboardingStep(userId, stepData);

    res.json({
      success: true,
      message: 'Onboarding step tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking onboarding step:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track onboarding step'
    });
  }
});

/**
 * @route POST /api/user-analytics/track-error
 * @desc Track errors and exceptions
 * @access Private
 */
router.post('/track-error', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const errorData = req.body;

    // Add user context
    errorData.userAgent = req.get('User-Agent');

    const error = await userAnalyticsService.trackError(userId, errorData);

    res.json({
      success: true,
      data: { errorId: error.id }
    });

  } catch (error) {
    console.error('Error tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track error'
    });
  }
});

/**
 * @route GET /api/user-analytics/dashboard
 * @desc Get user analytics dashboard data
 * @access Private
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const filters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
      userId: req.query.userId,
      feature: req.query.feature,
      page: req.query.page
    };

    const dashboard = await userAnalyticsService.getUserAnalyticsDashboard(companyId, filters);

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Error getting analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics dashboard'
    });
  }
});

/**
 * @route GET /api/user-analytics/feature-adoption
 * @desc Get feature adoption metrics
 * @access Private
 */
router.get('/feature-adoption', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : new Date();

    const metrics = await userAnalyticsService.getFeatureAdoptionMetrics(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error getting feature adoption metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feature adoption metrics'
    });
  }
});

/**
 * @route GET /api/user-analytics/ab-test/:testName
 * @desc Get A/B test assignment for user
 * @access Private
 */
router.get('/ab-test/:testName', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const testName = req.params.testName;

    const assignment = await userAnalyticsService.assignABTest(userId, testName);

    res.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('Error getting A/B test assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get A/B test assignment'
    });
  }
});

/**
 * @route POST /api/user-analytics/ab-test/:testName/conversion
 * @desc Track A/B test conversion
 * @access Private
 */
router.post('/ab-test/:testName/conversion', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const testName = req.params.testName;
    const conversionData = req.body;

    const conversion = await userAnalyticsService.trackABTestConversion(userId, testName, conversionData);

    res.json({
      success: true,
      data: conversion
    });

  } catch (error) {
    console.error('Error tracking A/B test conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track A/B test conversion'
    });
  }
});

// Feedback and Survey Routes

/**
 * @route POST /api/user-analytics/feedback
 * @desc Submit user feedback
 * @access Private
 */
router.post('/feedback', feedbackLimiter, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const feedbackData = req.body;

    const feedback = await userAnalyticsService.collectFeedback(userId, feedbackData);

    res.json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

/**
 * @route GET /api/user-analytics/survey-check
 * @desc Check if user should see a survey
 * @access Private
 */
router.get('/survey-check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = req.query.page;
    const sessionData = req.query.sessionData ? JSON.parse(req.query.sessionData) : {};

    const survey = await feedbackService.shouldShowSurvey(userId, page, sessionData);

    res.json({
      success: true,
      data: survey
    });

  } catch (error) {
    console.error('Error checking survey:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check survey'
    });
  }
});

/**
 * @route POST /api/user-analytics/survey-response
 * @desc Submit survey response
 * @access Private
 */
router.post('/survey-response', feedbackLimiter, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const surveyData = req.body;

    const response = await userAnalyticsService.submitSurveyResponse(userId, surveyData);

    res.json({
      success: true,
      data: response,
      message: 'Survey response submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting survey response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit survey response'
    });
  }
});

/**
 * @route POST /api/user-analytics/support-ticket
 * @desc Create support ticket
 * @access Private
 */
router.post('/support-ticket', feedbackLimiter, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketData = { ...req.body, userId };

    const ticket = await feedbackService.createSupportTicket(ticketData);

    res.json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully'
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
});

/**
 * @route GET /api/user-analytics/support-tickets
 * @desc Get user's support tickets
 * @access Private
 */
router.get('/support-tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const whereClause = { userId };
    if (status) whereClause.status = status;

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        responses: {
          include: {
            responder: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const total = await prisma.supportTicket.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get support tickets'
    });
  }
});

/**
 * @route GET /api/user-analytics/feedback-analytics
 * @desc Get feedback analytics (admin only)
 * @access Private
 */
router.get('/feedback-analytics', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const companyId = req.user.companyId;
    const filters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
      type: req.query.type,
      category: req.query.category,
      priority: req.query.priority
    };

    const analytics = await feedbackService.getFeedbackAnalytics(companyId, filters);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback analytics'
    });
  }
});

/**
 * @route POST /api/user-analytics/create-survey
 * @desc Create new survey (admin only)
 * @access Private
 */
router.post('/create-survey', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const surveyData = req.body;
    const survey = await feedbackService.createSurvey(surveyData);

    res.json({
      success: true,
      data: survey,
      message: 'Survey created successfully'
    });

  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create survey'
    });
  }
});

/**
 * @route POST /api/user-analytics/feedback-report
 * @desc Generate feedback report (admin only)
 * @access Private
 */
router.post('/feedback-report', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const companyId = req.user.companyId;
    const reportType = req.body.reportType || 'monthly';

    const report = await feedbackService.generateFeedbackReport(companyId, reportType);

    res.json({
      success: true,
      data: report,
      message: 'Feedback report generated successfully'
    });

  } catch (error) {
    console.error('Error generating feedback report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate feedback report'
    });
  }
});

/**
 * @route POST /api/user-analytics/create-ab-test
 * @desc Create A/B test (admin only)
 * @access Private
 */
router.post('/create-ab-test', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const testData = {
      ...req.body,
      createdBy: req.user.id
    };

    const abTest = await prisma.aBTest.create({
      data: {
        name: testData.name,
        description: testData.description,
        hypothesis: testData.hypothesis,
        variants: JSON.stringify(testData.variants),
        targetAudience: JSON.stringify(testData.targetAudience || {}),
        successMetrics: JSON.stringify(testData.successMetrics || []),
        isActive: testData.isActive || false,
        startDate: new Date(testData.startDate),
        endDate: testData.endDate ? new Date(testData.endDate) : null,
        createdBy: testData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: abTest,
      message: 'A/B test created successfully'
    });

  } catch (error) {
    console.error('Error creating A/B test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create A/B test'
    });
  }
});

/**
 * @route GET /api/user-analytics/error-logs
 * @desc Get error logs (admin only)
 * @access Private
 */
router.get('/error-logs', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const severity = req.query.severity;
    const status = req.query.status;

    const whereClause = {};
    if (severity) whereClause.severity = severity;
    if (status) whereClause.status = status;

    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      }),
      prisma.errorLog.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        errors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting error logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get error logs'
    });
  }
});

module.exports = router; 