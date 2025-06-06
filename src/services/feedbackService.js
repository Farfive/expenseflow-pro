const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();

class FeedbackService {

  constructor() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Create and manage customer satisfaction surveys
   */
  async createSurvey(surveyData) {
    try {
      const {
        title,
        description,
        questions,
        targetAudience,
        triggerConditions,
        isActive = true,
        validFrom = new Date(),
        validTo
      } = surveyData;

      const survey = await prisma.survey.create({
        data: {
          title,
          description,
          questions: JSON.stringify(questions),
          targetAudience: JSON.stringify(targetAudience),
          triggerConditions: JSON.stringify(triggerConditions),
          isActive,
          validFrom,
          validTo,
          createdAt: new Date()
        }
      });

      return survey;

    } catch (error) {
      console.error('Error creating survey:', error);
      throw error;
    }
  }

  /**
   * Check if user should see a survey based on conditions
   */
  async shouldShowSurvey(userId, page, sessionData) {
    try {
      const activeSurveys = await prisma.survey.findMany({
        where: {
          isActive: true,
          validFrom: { lte: new Date() },
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        }
      });

      for (const survey of activeSurveys) {
        const conditions = JSON.parse(survey.triggerConditions);
        const targetAudience = JSON.parse(survey.targetAudience);

        // Check if user already responded to this survey
        const existingResponse = await prisma.surveyResponse.findFirst({
          where: {
            userId,
            surveyId: survey.id
          }
        });

        if (existingResponse) continue;

        // Check trigger conditions
        if (this.checkTriggerConditions(conditions, { page, sessionData, userId })) {
          // Check target audience
          if (await this.isUserInTargetAudience(userId, targetAudience)) {
            return survey;
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Error checking survey conditions:', error);
      return null;
    }
  }

  /**
   * Process survey responses and calculate NPS
   */
  async processSurveyResponse(responseId) {
    try {
      const response = await prisma.surveyResponse.findUnique({
        where: { id: responseId },
        include: {
          survey: true,
          user: true
        }
      });

      if (!response) return null;

      const responses = JSON.parse(response.responses);
      let npsScore = response.npsScore;

      // Calculate NPS if not provided
      if (!npsScore && responses.nps_question) {
        npsScore = parseInt(responses.nps_question);
      }

      // Update response with calculated metrics
      await prisma.surveyResponse.update({
        where: { id: responseId },
        data: {
          npsScore,
          processedAt: new Date()
        }
      });

      // Update survey statistics
      await this.updateSurveyStatistics(response.surveyId);

      // Send follow-up actions based on response
      await this.triggerFollowUpActions(response, npsScore);

      return response;

    } catch (error) {
      console.error('Error processing survey response:', error);
      throw error;
    }
  }

  /**
   * Create support tickets from feedback
   */
  async createSupportTicket(ticketData) {
    try {
      const {
        userId,
        subject,
        description,
        priority = 'medium',
        category = 'general',
        source = 'feedback',
        attachments = [],
        metadata = {}
      } = ticketData;

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          ticketNumber: await this.generateTicketNumber(),
          subject,
          description,
          priority,
          category,
          source,
          status: 'open',
          attachments: JSON.stringify(attachments),
          metadata: JSON.stringify(metadata),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Send notification to support team
      await this.notifySupportTeam(ticket);

      // Send confirmation to user
      await this.sendTicketConfirmation(ticket);

      return ticket;

    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  /**
   * Update support ticket status and add responses
   */
  async updateSupportTicket(ticketId, updateData) {
    try {
      const {
        status,
        assignedTo,
        response,
        isInternal = false,
        attachments = []
      } = updateData;

      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          ...(status && { status }),
          ...(assignedTo && { assignedTo }),
          updatedAt: new Date()
        }
      });

      // Add response if provided
      if (response) {
        await prisma.ticketResponse.create({
          data: {
            ticketId,
            responderId: updateData.responderId,
            response,
            isInternal,
            attachments: JSON.stringify(attachments),
            createdAt: new Date()
          }
        });

        // Notify user of response if not internal
        if (!isInternal) {
          await this.notifyUserOfResponse(ticket, response);
        }
      }

      return ticket;

    } catch (error) {
      console.error('Error updating support ticket:', error);
      throw error;
    }
  }

  /**
   * Get feedback analytics and insights
   */
  async getFeedbackAnalytics(companyId, filters = {}) {
    try {
      const {
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo = new Date(),
        type,
        category,
        priority
      } = filters;

      const whereClause = {
        createdAt: {
          gte: dateFrom,
          lte: dateTo
        }
      };

      if (type) whereClause.type = type;
      if (category) whereClause.category = category;
      if (priority) whereClause.priority = priority;

      const [
        totalFeedback,
        feedbackByType,
        feedbackByCategory,
        averageRating,
        recentFeedback,
        supportTickets,
        surveyResponses,
        npsMetrics
      ] = await Promise.all([
        prisma.userFeedback.count({ where: whereClause }),

        prisma.userFeedback.groupBy({
          by: ['type'],
          where: whereClause,
          _count: { type: true }
        }),

        prisma.userFeedback.groupBy({
          by: ['category'],
          where: whereClause,
          _count: { category: true }
        }),

        prisma.userFeedback.aggregate({
          where: {
            ...whereClause,
            rating: { not: null }
          },
          _avg: { rating: true }
        }),

        prisma.userFeedback.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }),

        prisma.supportTicket.groupBy({
          by: ['status'],
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          _count: { status: true }
        }),

        prisma.surveyResponse.count({
          where: {
            submittedAt: {
              gte: dateFrom,
              lte: dateTo
            }
          }
        }),

        this.calculateNPSMetrics(dateFrom, dateTo)
      ]);

      return {
        overview: {
          totalFeedback,
          averageRating: averageRating._avg.rating || 0,
          surveyResponses,
          supportTickets: supportTickets.reduce((sum, ticket) => sum + ticket._count.status, 0)
        },
        feedbackBreakdown: {
          byType: feedbackByType.map(item => ({
            type: item.type,
            count: item._count.type
          })),
          byCategory: feedbackByCategory.map(item => ({
            category: item.category,
            count: item._count.category
          }))
        },
        supportTicketStatus: supportTickets.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        recentFeedback,
        npsMetrics
      };

    } catch (error) {
      console.error('Error getting feedback analytics:', error);
      throw error;
    }
  }

  /**
   * Generate feedback sentiment analysis
   */
  async analyzeFeedbackSentiment(feedbackText) {
    try {
      // Simple sentiment analysis (in production, use external service like Google Cloud Natural Language)
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome', 'fantastic'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'useless', 'broken'];

      const words = feedbackText.toLowerCase().split(/\s+/);
      let positiveScore = 0;
      let negativeScore = 0;

      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });

      const totalScore = positiveScore - negativeScore;
      let sentiment = 'neutral';
      
      if (totalScore > 0) sentiment = 'positive';
      else if (totalScore < 0) sentiment = 'negative';

      return {
        sentiment,
        score: totalScore,
        confidence: Math.min(Math.abs(totalScore) / words.length, 1)
      };

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { sentiment: 'neutral', score: 0, confidence: 0 };
    }
  }

  /**
   * Generate automated feedback reports
   */
  async generateFeedbackReport(companyId, reportType = 'monthly') {
    try {
      const now = new Date();
      let dateFrom, dateTo;

      switch (reportType) {
        case 'weekly':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'quarterly':
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      dateTo = now;

      const analytics = await this.getFeedbackAnalytics(companyId, { dateFrom, dateTo });
      
      // Generate insights and recommendations
      const insights = await this.generateFeedbackInsights(analytics);

      const report = {
        reportType,
        period: { from: dateFrom, to: dateTo },
        generatedAt: new Date(),
        analytics,
        insights,
        recommendations: await this.generateRecommendations(analytics)
      };

      // Save report
      await prisma.feedbackReport.create({
        data: {
          companyId,
          reportType,
          periodStart: dateFrom,
          periodEnd: dateTo,
          reportData: JSON.stringify(report),
          generatedAt: new Date()
        }
      });

      return report;

    } catch (error) {
      console.error('Error generating feedback report:', error);
      throw error;
    }
  }

  // Helper methods

  checkTriggerConditions(conditions, context) {
    try {
      const { page, sessionData, userId } = context;

      for (const condition of conditions) {
        switch (condition.type) {
          case 'page_visit':
            if (condition.value !== page) return false;
            break;
          case 'session_duration':
            if (!sessionData.duration || sessionData.duration < condition.value) return false;
            break;
          case 'feature_usage':
            // Check if user has used specific feature
            break;
          default:
            break;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async isUserInTargetAudience(userId, targetAudience) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true }
      });

      if (!user) return false;

      // Check audience criteria
      for (const criteria of targetAudience) {
        switch (criteria.type) {
          case 'user_role':
            if (criteria.values.includes(user.role)) return true;
            break;
          case 'company_size':
            // Add logic for company size
            break;
          case 'registration_date':
            // Check user registration date
            break;
        }
      }

      return targetAudience.length === 0; // Show to all if no criteria

    } catch (error) {
      return false;
    }
  }

  async updateSurveyStatistics(surveyId) {
    try {
      const responses = await prisma.surveyResponse.findMany({
        where: { surveyId }
      });

      const totalResponses = responses.length;
      const npsScores = responses.filter(r => r.npsScore !== null).map(r => r.npsScore);
      
      let npsScore = 0;
      if (npsScores.length > 0) {
        const promoters = npsScores.filter(score => score >= 9).length;
        const detractors = npsScores.filter(score => score <= 6).length;
        npsScore = Math.round(((promoters - detractors) / npsScores.length) * 100);
      }

      await prisma.survey.update({
        where: { id: surveyId },
        data: {
          totalResponses,
          npsScore,
          updatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error updating survey statistics:', error);
    }
  }

  async triggerFollowUpActions(response, npsScore) {
    try {
      // Create support ticket for detractors
      if (npsScore <= 6) {
        await this.createSupportTicket({
          userId: response.userId,
          subject: 'Follow-up on Survey Feedback',
          description: `User provided low NPS score (${npsScore}). Follow-up required.`,
          priority: 'high',
          category: 'customer_success',
          source: 'survey',
          metadata: { surveyResponseId: response.id }
        });
      }

      // Send thank you email for promoters
      if (npsScore >= 9) {
        await this.sendThankYouEmail(response.user);
      }

    } catch (error) {
      console.error('Error triggering follow-up actions:', error);
    }
  }

  async generateTicketNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TKT-${timestamp}-${random}`;
  }

  async notifySupportTeam(ticket) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.SUPPORT_TEAM_EMAIL,
        subject: `New Support Ticket: ${ticket.ticketNumber}`,
        html: `
          <h2>New Support Ticket Created</h2>
          <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Category:</strong> ${ticket.category}</p>
          <p><strong>Description:</strong></p>
          <p>${ticket.description}</p>
        `
      });
    } catch (error) {
      console.error('Error notifying support team:', error);
    }
  }

  async sendTicketConfirmation(ticket) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: ticket.userId }
      });

      if (user?.email) {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: `Support Ticket Created: ${ticket.ticketNumber}`,
          html: `
            <h2>Support Ticket Confirmation</h2>
            <p>Dear ${user.firstName},</p>
            <p>We've received your support request and created ticket <strong>${ticket.ticketNumber}</strong>.</p>
            <p>Our team will review your request and respond within 24 hours.</p>
            <p>Thank you for your patience.</p>
          `
        });
      }
    } catch (error) {
      console.error('Error sending ticket confirmation:', error);
    }
  }

  async calculateNPSMetrics(dateFrom, dateTo) {
    try {
      const responses = await prisma.surveyResponse.findMany({
        where: {
          submittedAt: {
            gte: dateFrom,
            lte: dateTo
          },
          npsScore: { not: null }
        }
      });

      if (responses.length === 0) {
        return { npsScore: 0, totalResponses: 0, distribution: {} };
      }

      const scores = responses.map(r => r.npsScore);
      const promoters = scores.filter(score => score >= 9).length;
      const passives = scores.filter(score => score >= 7 && score <= 8).length;
      const detractors = scores.filter(score => score <= 6).length;

      const npsScore = Math.round(((promoters - detractors) / scores.length) * 100);

      return {
        npsScore,
        totalResponses: responses.length,
        distribution: {
          promoters,
          passives,
          detractors
        }
      };

    } catch (error) {
      console.error('Error calculating NPS metrics:', error);
      return { npsScore: 0, totalResponses: 0, distribution: {} };
    }
  }

  async generateFeedbackInsights(analytics) {
    const insights = [];

    // NPS insights
    if (analytics.npsMetrics.npsScore > 50) {
      insights.push({
        type: 'positive',
        title: 'Strong Customer Loyalty',
        description: `Your NPS score of ${analytics.npsMetrics.npsScore} indicates strong customer loyalty.`
      });
    } else if (analytics.npsMetrics.npsScore < 0) {
      insights.push({
        type: 'warning',
        title: 'Customer Satisfaction Needs Attention',
        description: `Your NPS score of ${analytics.npsMetrics.npsScore} suggests customers need more support.`
      });
    }

    // Support ticket insights
    const openTickets = analytics.supportTicketStatus.find(s => s.status === 'open')?.count || 0;
    if (openTickets > 10) {
      insights.push({
        type: 'warning',
        title: 'High Open Ticket Volume',
        description: `You have ${openTickets} open support tickets that need attention.`
      });
    }

    return insights;
  }

  async generateRecommendations(analytics) {
    const recommendations = [];

    // Based on feedback trends
    if (analytics.overview.averageRating < 3) {
      recommendations.push({
        priority: 'high',
        title: 'Improve User Experience',
        description: 'Low average rating suggests UX improvements needed.',
        actions: [
          'Conduct user experience research',
          'Implement usability testing',
          'Gather detailed feedback on pain points'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = FeedbackService; 