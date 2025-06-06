const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserAnalyticsService {
  
  /**
   * Track user events (page views, feature usage, interactions)
   */
  async trackEvent(userId, eventData) {
    try {
      const {
        eventType,
        eventName,
        page,
        feature,
        metadata = {},
        sessionId,
        timestamp = new Date(),
        userAgent,
        ipAddress
      } = eventData;

      const event = await prisma.userEvent.create({
        data: {
          userId,
          sessionId,
          eventType, // page_view, feature_usage, click, form_submit, etc.
          eventName,
          page,
          feature,
          metadata: JSON.stringify(metadata),
          timestamp,
          userAgent,
          ipAddress,
          companyId: metadata.companyId
        }
      });

      // Update user session
      await this.updateUserSession(userId, sessionId, {
        lastActivity: timestamp,
        page,
        feature
      });

      return event;

    } catch (error) {
      console.error('Error tracking user event:', error);
      throw error;
    }
  }

  /**
   * Track page views with performance metrics
   */
  async trackPageView(userId, pageData) {
    try {
      const {
        page,
        referrer,
        loadTime,
        sessionId,
        metadata = {},
        performanceMetrics = {}
      } = pageData;

      await this.trackEvent(userId, {
        eventType: 'page_view',
        eventName: `Page View: ${page}`,
        page,
        feature: 'navigation',
        sessionId,
        metadata: {
          ...metadata,
          referrer,
          loadTime,
          performanceMetrics
        }
      });

      // Track page performance separately
      await prisma.pagePerformance.create({
        data: {
          userId,
          sessionId,
          page,
          loadTime: parseFloat(loadTime) || 0,
          domContentLoaded: performanceMetrics.domContentLoaded || 0,
          firstContentfulPaint: performanceMetrics.firstContentfulPaint || 0,
          timeToInteractive: performanceMetrics.timeToInteractive || 0,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Error tracking page view:', error);
      throw error;
    }
  }

  /**
   * Track feature usage and adoption
   */
  async trackFeatureUsage(userId, featureData) {
    try {
      const {
        feature,
        action,
        duration,
        success,
        sessionId,
        metadata = {}
      } = featureData;

      await this.trackEvent(userId, {
        eventType: 'feature_usage',
        eventName: `${feature}: ${action}`,
        feature,
        sessionId,
        metadata: {
          ...metadata,
          action,
          duration,
          success
        }
      });

      // Update feature adoption metrics
      await this.updateFeatureAdoption(userId, feature, action, success);

    } catch (error) {
      console.error('Error tracking feature usage:', error);
      throw error;
    }
  }

  /**
   * Track user onboarding progress
   */
  async trackOnboardingStep(userId, stepData) {
    try {
      const {
        step,
        stepName,
        completed,
        timeSpent,
        sessionId,
        metadata = {}
      } = stepData;

      await this.trackEvent(userId, {
        eventType: 'onboarding',
        eventName: `Onboarding: ${stepName}`,
        feature: 'onboarding',
        sessionId,
        metadata: {
          ...metadata,
          step,
          completed,
          timeSpent
        }
      });

      // Update or create onboarding progress
      const existingProgress = await prisma.onboardingProgress.findFirst({
        where: { userId }
      });

      if (existingProgress) {
        await prisma.onboardingProgress.update({
          where: { id: existingProgress.id },
          data: {
            currentStep: step,
            stepsCompleted: completed ? [...existingProgress.stepsCompleted, step] : existingProgress.stepsCompleted,
            lastActivityAt: new Date(),
            totalTimeSpent: existingProgress.totalTimeSpent + (timeSpent || 0)
          }
        });
      } else {
        await prisma.onboardingProgress.create({
          data: {
            userId,
            currentStep: step,
            stepsCompleted: completed ? [step] : [],
            totalTimeSpent: timeSpent || 0,
            startedAt: new Date(),
            lastActivityAt: new Date()
          }
        });
      }

    } catch (error) {
      console.error('Error tracking onboarding step:', error);
      throw error;
    }
  }

  /**
   * Track errors and exceptions
   */
  async trackError(userId, errorData) {
    try {
      const {
        errorType,
        errorMessage,
        errorStack,
        page,
        feature,
        userAgent,
        sessionId,
        severity = 'error',
        metadata = {}
      } = errorData;

      const error = await prisma.errorLog.create({
        data: {
          userId,
          sessionId,
          errorType,
          errorMessage,
          errorStack,
          page,
          feature,
          userAgent,
          severity,
          metadata: JSON.stringify(metadata),
          timestamp: new Date(),
          status: 'open'
        }
      });

      // If it's a critical error, create an alert
      if (severity === 'critical') {
        await this.createErrorAlert(error);
      }

      return error;

    } catch (error) {
      console.error('Error tracking error:', error);
      throw error;
    }
  }

  /**
   * Collect user feedback
   */
  async collectFeedback(userId, feedbackData) {
    try {
      const {
        type, // feedback, rating, survey, bug_report
        content,
        rating,
        page,
        feature,
        category,
        priority = 'medium',
        sessionId,
        metadata = {}
      } = feedbackData;

      const feedback = await prisma.userFeedback.create({
        data: {
          userId,
          sessionId,
          type,
          content,
          rating,
          page,
          feature,
          category,
          priority,
          metadata: JSON.stringify(metadata),
          status: 'open',
          createdAt: new Date()
        }
      });

      // Track feedback event
      await this.trackEvent(userId, {
        eventType: 'feedback',
        eventName: `Feedback: ${type}`,
        page,
        feature,
        sessionId,
        metadata: {
          ...metadata,
          feedbackId: feedback.id,
          category,
          rating
        }
      });

      return feedback;

    } catch (error) {
      console.error('Error collecting feedback:', error);
      throw error;
    }
  }

  /**
   * Manage A/B tests
   */
  async assignABTest(userId, testName) {
    try {
      // Check if user is already assigned to this test
      const existingAssignment = await prisma.abTestAssignment.findFirst({
        where: {
          userId,
          testName,
          isActive: true
        }
      });

      if (existingAssignment) {
        return existingAssignment;
      }

      // Get test configuration
      const test = await prisma.abTest.findFirst({
        where: {
          name: testName,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });

      if (!test) {
        return null;
      }

      // Assign user to variant based on percentage splits
      const variants = test.variants;
      const random = Math.random() * 100;
      let cumulativePercentage = 0;
      let assignedVariant = 'control';

      for (const variant of variants) {
        cumulativePercentage += variant.percentage;
        if (random <= cumulativePercentage) {
          assignedVariant = variant.name;
          break;
        }
      }

      const assignment = await prisma.abTestAssignment.create({
        data: {
          userId,
          testName,
          variant: assignedVariant,
          assignedAt: new Date(),
          isActive: true
        }
      });

      // Track assignment event
      await this.trackEvent(userId, {
        eventType: 'ab_test',
        eventName: `A/B Test Assignment: ${testName}`,
        feature: 'experimentation',
        metadata: {
          testName,
          variant: assignedVariant
        }
      });

      return assignment;

    } catch (error) {
      console.error('Error assigning A/B test:', error);
      throw error;
    }
  }

  /**
   * Track A/B test conversion events
   */
  async trackABTestConversion(userId, testName, conversionData) {
    try {
      const assignment = await prisma.abTestAssignment.findFirst({
        where: {
          userId,
          testName,
          isActive: true
        }
      });

      if (!assignment) {
        return null;
      }

      const conversion = await prisma.abTestConversion.create({
        data: {
          assignmentId: assignment.id,
          eventType: conversionData.eventType || 'conversion',
          value: conversionData.value || 1,
          metadata: JSON.stringify(conversionData.metadata || {}),
          timestamp: new Date()
        }
      });

      // Track conversion event
      await this.trackEvent(userId, {
        eventType: 'ab_test_conversion',
        eventName: `A/B Test Conversion: ${testName}`,
        feature: 'experimentation',
        metadata: {
          testName,
          variant: assignment.variant,
          conversionType: conversionData.eventType,
          value: conversionData.value
        }
      });

      return conversion;

    } catch (error) {
      console.error('Error tracking A/B test conversion:', error);
      throw error;
    }
  }

  /**
   * Create customer satisfaction survey response
   */
  async submitSurveyResponse(userId, surveyData) {
    try {
      const {
        surveyId,
        responses,
        npsScore,
        sessionId,
        metadata = {}
      } = surveyData;

      const response = await prisma.surveyResponse.create({
        data: {
          userId,
          sessionId,
          surveyId,
          responses: JSON.stringify(responses),
          npsScore,
          metadata: JSON.stringify(metadata),
          submittedAt: new Date()
        }
      });

      // Track survey completion event
      await this.trackEvent(userId, {
        eventType: 'survey',
        eventName: `Survey Completed: ${surveyId}`,
        feature: 'feedback',
        sessionId,
        metadata: {
          ...metadata,
          surveyId,
          npsScore,
          responseId: response.id
        }
      });

      return response;

    } catch (error) {
      console.error('Error submitting survey response:', error);
      throw error;
    }
  }

  /**
   * Get user analytics dashboard data
   */
  async getUserAnalyticsDashboard(companyId, filters = {}) {
    try {
      const {
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo = new Date(),
        userId,
        feature,
        page
      } = filters;

      const whereClause = {
        timestamp: {
          gte: dateFrom,
          lte: dateTo
        }
      };

      if (companyId) whereClause.companyId = companyId;
      if (userId) whereClause.userId = userId;
      if (feature) whereClause.feature = feature;
      if (page) whereClause.page = page;

      // Get user activity metrics
      const [
        totalEvents,
        uniqueUsers,
        pageViews,
        featureUsage,
        errorCounts,
        feedbackCounts,
        performanceMetrics,
        onboardingStats
      ] = await Promise.all([
        prisma.userEvent.count({ where: whereClause }),
        
        prisma.userEvent.groupBy({
          by: ['userId'],
          where: whereClause,
          _count: { userId: true }
        }),

        prisma.userEvent.groupBy({
          by: ['page'],
          where: { ...whereClause, eventType: 'page_view' },
          _count: { page: true }
        }),

        prisma.userEvent.groupBy({
          by: ['feature'],
          where: { ...whereClause, eventType: 'feature_usage' },
          _count: { feature: true }
        }),

        prisma.errorLog.groupBy({
          by: ['errorType'],
          where: {
            timestamp: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          _count: { errorType: true }
        }),

        prisma.userFeedback.groupBy({
          by: ['type'],
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          _count: { type: true }
        }),

        prisma.pagePerformance.aggregate({
          where: {
            timestamp: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          _avg: {
            loadTime: true,
            domContentLoaded: true,
            firstContentfulPaint: true,
            timeToInteractive: true
          }
        }),

        prisma.onboardingProgress.aggregate({
          _avg: {
            totalTimeSpent: true
          },
          _count: {
            id: true
          }
        })
      ]);

      return {
        overview: {
          totalEvents,
          uniqueUsers: uniqueUsers.length,
          avgEventsPerUser: uniqueUsers.length > 0 ? totalEvents / uniqueUsers.length : 0
        },
        pageViews: pageViews.map(pv => ({
          page: pv.page,
          views: pv._count.page
        })),
        featureUsage: featureUsage.map(fu => ({
          feature: fu.feature,
          usage: fu._count.feature
        })),
        errors: errorCounts.map(ec => ({
          type: ec.errorType,
          count: ec._count.errorType
        })),
        feedback: feedbackCounts.map(fc => ({
          type: fc.type,
          count: fc._count.type
        })),
        performance: {
          averageLoadTime: performanceMetrics._avg.loadTime || 0,
          averageDomContentLoaded: performanceMetrics._avg.domContentLoaded || 0,
          averageFirstContentfulPaint: performanceMetrics._avg.firstContentfulPaint || 0,
          averageTimeToInteractive: performanceMetrics._avg.timeToInteractive || 0
        },
        onboarding: {
          totalUsers: onboardingStats._count.id || 0,
          averageTimeSpent: onboardingStats._avg.totalTimeSpent || 0
        }
      };

    } catch (error) {
      console.error('Error getting user analytics dashboard:', error);
      throw error;
    }
  }

  /**
   * Get feature adoption metrics
   */
  async getFeatureAdoptionMetrics(companyId, dateFrom, dateTo) {
    try {
      const features = await prisma.userEvent.groupBy({
        by: ['feature'],
        where: {
          companyId,
          eventType: 'feature_usage',
          timestamp: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        _count: {
          userId: true
        },
        _groupBy: {
          userId: true
        }
      });

      const totalUsers = await prisma.userEvent.groupBy({
        by: ['userId'],
        where: {
          companyId,
          timestamp: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });

      return features.map(feature => ({
        feature: feature.feature,
        users: feature._count.userId,
        adoptionRate: totalUsers.length > 0 ? (feature._count.userId / totalUsers.length) * 100 : 0
      }));

    } catch (error) {
      console.error('Error getting feature adoption metrics:', error);
      throw error;
    }
  }

  // Helper methods

  async updateUserSession(userId, sessionId, data) {
    try {
      const existingSession = await prisma.userSession.findFirst({
        where: { userId, sessionId }
      });

      if (existingSession) {
        await prisma.userSession.update({
          where: { id: existingSession.id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.userSession.create({
          data: {
            userId,
            sessionId,
            ...data,
            startedAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  }

  async updateFeatureAdoption(userId, feature, action, success) {
    try {
      const existingRecord = await prisma.featureAdoption.findFirst({
        where: { userId, feature }
      });

      if (existingRecord) {
        await prisma.featureAdoption.update({
          where: { id: existingRecord.id },
          data: {
            usageCount: existingRecord.usageCount + 1,
            lastUsedAt: new Date(),
            successfulUses: success ? existingRecord.successfulUses + 1 : existingRecord.successfulUses
          }
        });
      } else {
        await prisma.featureAdoption.create({
          data: {
            userId,
            feature,
            firstUsedAt: new Date(),
            lastUsedAt: new Date(),
            usageCount: 1,
            successfulUses: success ? 1 : 0
          }
        });
      }
    } catch (error) {
      console.error('Error updating feature adoption:', error);
    }
  }

  async createErrorAlert(error) {
    try {
      await prisma.errorAlert.create({
        data: {
          errorLogId: error.id,
          alertType: 'critical_error',
          message: `Critical error: ${error.errorMessage}`,
          severity: 'high',
          status: 'open',
          createdAt: new Date()
        }
      });
    } catch (err) {
      console.error('Error creating error alert:', err);
    }
  }
}

module.exports = UserAnalyticsService; 