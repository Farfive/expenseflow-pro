/**
 * Fraud Detection Engine
 * AI-powered fraud detection and policy violation flagging
 * Implements multiple detection algorithms and risk scoring
 */

class FraudDetectionEngine {
    constructor() {
        this.riskRules = new Map();
        this.mlModels = {
            anomalyDetection: null,
            duplicateDetection: null,
            policyViolation: null,
            behavioralAnalysis: null
        };
        this.detectionThresholds = {
            low: 0.3,
            medium: 0.6,
            high: 0.8,
            critical: 0.95
        };
        this.initializeRiskRules();
    }

    /**
     * Initialize risk detection rules
     */
    initializeRiskRules() {
        // Amount-based rules
        this.riskRules.set('unusualAmount', {
            type: 'amount',
            severity: 'medium',
            threshold: 0.7,
            description: 'Expense amount significantly higher than historical average'
        });

        // Time-based rules
        this.riskRules.set('offHoursSubmission', {
            type: 'temporal',
            severity: 'low',
            threshold: 0.4,
            description: 'Expense submitted during unusual hours'
        });

        // Duplicate detection rules
        this.riskRules.set('duplicateExpense', {
            type: 'duplicate',
            severity: 'high',
            threshold: 0.9,
            description: 'Potential duplicate expense detected'
        });

        // Policy violation rules
        this.riskRules.set('policyViolation', {
            type: 'policy',
            severity: 'high',
            threshold: 0.8,
            description: 'Expense violates company policy'
        });

        // Behavioral rules
        this.riskRules.set('suspiciousBehavior', {
            type: 'behavioral',
            severity: 'medium',
            threshold: 0.6,
            description: 'Unusual submission pattern detected'
        });
    }

    /**
     * Analyze expense for fraud indicators
     */
    async analyzeExpense(expense, userContext = {}) {
        try {
            const analysis = {
                expenseId: expense.id,
                riskScore: 0,
                riskLevel: 'low',
                detectedIssues: [],
                policyViolations: [],
                suspiciousPatterns: [],
                recommendations: [],
                metadata: {
                    analyzedAt: new Date(),
                    modelVersion: '2.1',
                    analysisType: 'comprehensive'
                }
            };

            // Run multiple detection algorithms
            const detectionResults = await Promise.all([
                this.detectAmountAnomalies(expense, userContext),
                this.detectDuplicates(expense, userContext),
                this.detectPolicyViolations(expense, userContext),
                this.analyzeBehavioralPatterns(expense, userContext),
                this.detectDocumentAnomalies(expense, userContext),
                this.analyzeTemporalPatterns(expense, userContext)
            ]);

            // Aggregate results
            detectionResults.forEach(result => {
                if (result.issues) {
                    analysis.detectedIssues.push(...result.issues);
                }
                if (result.policyViolations) {
                    analysis.policyViolations.push(...result.policyViolations);
                }
                if (result.suspiciousPatterns) {
                    analysis.suspiciousPatterns.push(...result.suspiciousPatterns);
                }
                analysis.riskScore = Math.max(analysis.riskScore, result.riskScore || 0);
            });

            // Calculate final risk level
            analysis.riskLevel = this.calculateRiskLevel(analysis.riskScore);

            // Generate recommendations
            analysis.recommendations = await this.generateRecommendations(analysis);

            // Log high-risk cases
            if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
                await this.logHighRiskCase(expense, analysis);
            }

            return analysis;
        } catch (error) {
            console.error('Error analyzing expense for fraud:', error);
            throw error;
        }
    }

    /**
     * Detect amount-based anomalies
     */
    async detectAmountAnomalies(expense, userContext) {
        try {
            const issues = [];
            let riskScore = 0;

            // Get user's historical spending patterns
            const historicalData = await this.getUserHistoricalData(expense.userId, expense.category);
            
            if (historicalData.length > 0) {
                const avgAmount = historicalData.reduce((sum, exp) => sum + exp.amount, 0) / historicalData.length;
                const stdDev = Math.sqrt(historicalData.reduce((sum, exp) => sum + Math.pow(exp.amount - avgAmount, 2), 0) / historicalData.length);
                
                // Check for unusual amounts
                const deviationScore = Math.abs(expense.amount - avgAmount) / stdDev;
                
                if (deviationScore > 3) {
                    riskScore = Math.min(0.9, deviationScore / 5);
                    issues.push({
                        type: 'amount_anomaly',
                        severity: deviationScore > 5 ? 'critical' : 'high',
                        description: `Amount ${expense.amount} is ${deviationScore.toFixed(1)} standard deviations from user average (${avgAmount.toFixed(2)})`,
                        riskContribution: riskScore,
                        metadata: {
                            userAverage: avgAmount,
                            standardDeviation: stdDev,
                            deviationScore
                        }
                    });
                }

                // Check for round number amounts (potentially fabricated)
                if (expense.amount % 100 === 0 && expense.amount > 500) {
                    riskScore = Math.max(riskScore, 0.4);
                    issues.push({
                        type: 'round_amount',
                        severity: 'medium',
                        description: 'Expense amount is a round number, which may indicate fabrication',
                        riskContribution: 0.4
                    });
                }
            }

            // Check for category-specific amount limits
            const categoryLimits = await this.getCategoryLimits(expense.category, userContext.companyId);
            if (categoryLimits && expense.amount > categoryLimits.maximum) {
                riskScore = Math.max(riskScore, 0.8);
                issues.push({
                    type: 'amount_limit_exceeded',
                    severity: 'high',
                    description: `Amount exceeds category limit of ${categoryLimits.maximum}`,
                    riskContribution: 0.8,
                    metadata: {
                        categoryLimit: categoryLimits.maximum,
                        excessAmount: expense.amount - categoryLimits.maximum
                    }
                });
            }

            return { issues, riskScore };
        } catch (error) {
            console.error('Error detecting amount anomalies:', error);
            return { issues: [], riskScore: 0 };
        }
    }

    /**
     * Detect duplicate expenses
     */
    async detectDuplicates(expense, userContext) {
        try {
            const issues = [];
            let riskScore = 0;

            // Get recent expenses from the same user
            const recentExpenses = await this.getUserRecentExpenses(expense.userId, 90); // Last 90 days
            
            for (const recentExpense of recentExpenses) {
                if (recentExpense.id === expense.id) continue;
                
                const similarity = await this.calculateExpenseSimilarity(expense, recentExpense);
                
                if (similarity.overall > 0.8) {
                    const severityLevel = similarity.overall > 0.95 ? 'critical' : 'high';
                    riskScore = Math.max(riskScore, similarity.overall);
                    
                    issues.push({
                        type: 'duplicate_expense',
                        severity: severityLevel,
                        description: `Potential duplicate of expense ${recentExpense.id} (${(similarity.overall * 100).toFixed(1)}% similarity)`,
                        riskContribution: similarity.overall,
                        metadata: {
                            duplicateExpenseId: recentExpense.id,
                            similarityScore: similarity.overall,
                            similarityBreakdown: similarity.breakdown
                        }
                    });
                }
            }

            return { issues, riskScore };
        } catch (error) {
            console.error('Error detecting duplicates:', error);
            return { issues: [], riskScore: 0 };
        }
    }

    /**
     * Detect policy violations
     */
    async detectPolicyViolations(expense, userContext) {
        try {
            const policyViolations = [];
            const issues = [];
            let riskScore = 0;

            // Get company policies
            const policies = await this.getCompanyPolicies(userContext.companyId);
            
            for (const policy of policies) {
                const violation = await this.checkPolicyCompliance(expense, policy);
                
                if (violation.isViolation) {
                    riskScore = Math.max(riskScore, violation.severity === 'critical' ? 0.9 : violation.severity === 'high' ? 0.7 : 0.5);
                    
                    policyViolations.push({
                        policyId: policy.id,
                        policyName: policy.name,
                        violationType: violation.type,
                        severity: violation.severity,
                        description: violation.description,
                        riskContribution: violation.severity === 'critical' ? 0.9 : violation.severity === 'high' ? 0.7 : 0.5
                    });

                    issues.push({
                        type: 'policy_violation',
                        severity: violation.severity,
                        description: `Policy violation: ${violation.description}`,
                        riskContribution: violation.severity === 'critical' ? 0.9 : violation.severity === 'high' ? 0.7 : 0.5,
                        metadata: {
                            policyId: policy.id,
                            violationType: violation.type
                        }
                    });
                }
            }

            return { issues, policyViolations, riskScore };
        } catch (error) {
            console.error('Error detecting policy violations:', error);
            return { issues: [], policyViolations: [], riskScore: 0 };
        }
    }

    /**
     * Analyze behavioral patterns
     */
    async analyzeBehavioralPatterns(expense, userContext) {
        try {
            const suspiciousPatterns = [];
            const issues = [];
            let riskScore = 0;

            // Get user's behavioral profile
            const behavioralProfile = await this.getUserBehavioralProfile(expense.userId);
            
            // Check submission timing patterns
            const timingAnalysis = await this.analyzeSubmissionTiming(expense, behavioralProfile);
            if (timingAnalysis.suspicious) {
                riskScore = Math.max(riskScore, 0.4);
                suspiciousPatterns.push(timingAnalysis);
                issues.push({
                    type: 'timing_anomaly',
                    severity: 'medium',
                    description: timingAnalysis.description,
                    riskContribution: 0.4
                });
            }

            // Check for bulk submissions
            const bulkSubmissionAnalysis = await this.analyzeBulkSubmissions(expense, userContext);
            if (bulkSubmissionAnalysis.suspicious) {
                riskScore = Math.max(riskScore, 0.6);
                suspiciousPatterns.push(bulkSubmissionAnalysis);
                issues.push({
                    type: 'bulk_submission',
                    severity: 'medium',
                    description: bulkSubmissionAnalysis.description,
                    riskContribution: 0.6
                });
            }

            // Check for unusual merchant patterns
            const merchantAnalysis = await this.analyzeMerchantPatterns(expense, behavioralProfile);
            if (merchantAnalysis.suspicious) {
                riskScore = Math.max(riskScore, 0.5);
                suspiciousPatterns.push(merchantAnalysis);
                issues.push({
                    type: 'merchant_anomaly',
                    severity: 'medium',
                    description: merchantAnalysis.description,
                    riskContribution: 0.5
                });
            }

            return { issues, suspiciousPatterns, riskScore };
        } catch (error) {
            console.error('Error analyzing behavioral patterns:', error);
            return { issues: [], suspiciousPatterns: [], riskScore: 0 };
        }
    }

    /**
     * Detect document anomalies
     */
    async detectDocumentAnomalies(expense, userContext) {
        try {
            const issues = [];
            let riskScore = 0;

            if (expense.documents && expense.documents.length > 0) {
                for (const document of expense.documents) {
                    // Check for image manipulation
                    const manipulationCheck = await this.checkImageManipulation(document);
                    if (manipulationCheck.suspicious) {
                        riskScore = Math.max(riskScore, 0.8);
                        issues.push({
                            type: 'document_manipulation',
                            severity: 'high',
                            description: `Potential image manipulation detected in document ${document.id}`,
                            riskContribution: 0.8,
                            metadata: manipulationCheck.metadata
                        });
                    }

                    // Check for inconsistent metadata
                    const metadataCheck = await this.checkDocumentMetadata(document, expense);
                    if (metadataCheck.inconsistent) {
                        riskScore = Math.max(riskScore, 0.6);
                        issues.push({
                            type: 'metadata_inconsistency',
                            severity: 'medium',
                            description: metadataCheck.description,
                            riskContribution: 0.6
                        });
                    }
                }
            } else {
                // Missing receipt for high-value expense
                if (expense.amount > 100) {
                    riskScore = Math.max(riskScore, 0.5);
                    issues.push({
                        type: 'missing_receipt',
                        severity: 'medium',
                        description: 'High-value expense submitted without receipt',
                        riskContribution: 0.5
                    });
                }
            }

            return { issues, riskScore };
        } catch (error) {
            console.error('Error detecting document anomalies:', error);
            return { issues: [], riskScore: 0 };
        }
    }

    /**
     * Analyze temporal patterns
     */
    async analyzeTemporalPatterns(expense, userContext) {
        try {
            const issues = [];
            let riskScore = 0;

            const expenseDate = new Date(expense.date);
            const submissionDate = new Date(expense.submittedAt || expense.createdAt);
            
            // Check for future-dated expenses
            if (expenseDate > new Date()) {
                riskScore = Math.max(riskScore, 0.7);
                issues.push({
                    type: 'future_date',
                    severity: 'high',
                    description: 'Expense dated in the future',
                    riskContribution: 0.7
                });
            }

            // Check for very old expenses
            const daysDifference = (submissionDate - expenseDate) / (1000 * 60 * 60 * 24);
            if (daysDifference > 90) {
                riskScore = Math.max(riskScore, 0.4);
                issues.push({
                    type: 'old_expense',
                    severity: 'low',
                    description: `Expense submitted ${Math.floor(daysDifference)} days after the expense date`,
                    riskContribution: 0.4
                });
            }

            // Check for weekend/holiday submissions for business expenses
            if (expense.category === 'business' && this.isWeekendOrHoliday(submissionDate)) {
                riskScore = Math.max(riskScore, 0.3);
                issues.push({
                    type: 'unusual_submission_time',
                    severity: 'low',
                    description: 'Business expense submitted during weekend or holiday',
                    riskContribution: 0.3
                });
            }

            return { issues, riskScore };
        } catch (error) {
            console.error('Error analyzing temporal patterns:', error);
            return { issues: [], riskScore: 0 };
        }
    }

    /**
     * Calculate expense similarity for duplicate detection
     */
    async calculateExpenseSimilarity(expense1, expense2) {
        const similarity = {
            overall: 0,
            breakdown: {
                amount: 0,
                date: 0,
                merchant: 0,
                category: 0,
                description: 0
            }
        };

        // Amount similarity (within 5% or exact match)
        const amountDiff = Math.abs(expense1.amount - expense2.amount);
        const amountAvg = (expense1.amount + expense2.amount) / 2;
        similarity.breakdown.amount = amountDiff === 0 ? 1 : Math.max(0, 1 - (amountDiff / amountAvg));

        // Date similarity (same day = 1, within week = 0.5, etc.)
        const dateDiff = Math.abs(new Date(expense1.date) - new Date(expense2.date)) / (1000 * 60 * 60 * 24);
        similarity.breakdown.date = dateDiff === 0 ? 1 : dateDiff <= 1 ? 0.8 : dateDiff <= 7 ? 0.5 : 0;

        // Merchant similarity
        similarity.breakdown.merchant = this.calculateStringSimilarity(
            expense1.merchant || '', 
            expense2.merchant || ''
        );

        // Category similarity
        similarity.breakdown.category = expense1.category === expense2.category ? 1 : 0;

        // Description similarity
        similarity.breakdown.description = this.calculateStringSimilarity(
            expense1.description || '', 
            expense2.description || ''
        );

        // Calculate weighted overall similarity
        const weights = {
            amount: 0.3,
            date: 0.2,
            merchant: 0.25,
            category: 0.15,
            description: 0.1
        };

        similarity.overall = Object.keys(weights).reduce((sum, key) => {
            return sum + (similarity.breakdown[key] * weights[key]);
        }, 0);

        return similarity;
    }

    /**
     * Calculate string similarity using Levenshtein distance
     */
    calculateStringSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 && len2 === 0) return 1;
        if (len1 === 0 || len2 === 0) return 0;
        
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
        
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return 1 - (matrix[len1][len2] / maxLen);
    }

    /**
     * Calculate final risk level based on score
     */
    calculateRiskLevel(riskScore) {
        if (riskScore >= this.detectionThresholds.critical) return 'critical';
        if (riskScore >= this.detectionThresholds.high) return 'high';
        if (riskScore >= this.detectionThresholds.medium) return 'medium';
        return 'low';
    }

    /**
     * Generate recommendations based on analysis
     */
    async generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
            recommendations.push({
                type: 'manual_review',
                priority: 'immediate',
                description: 'Requires immediate manual review before approval'
            });
        }

        if (analysis.policyViolations.length > 0) {
            recommendations.push({
                type: 'policy_clarification',
                priority: 'high',
                description: 'Clarify policy compliance with submitter'
            });
        }

        if (analysis.detectedIssues.some(issue => issue.type === 'duplicate_expense')) {
            recommendations.push({
                type: 'duplicate_investigation',
                priority: 'high',
                description: 'Investigate potential duplicate submissions'
            });
        }

        if (analysis.detectedIssues.some(issue => issue.type === 'missing_receipt')) {
            recommendations.push({
                type: 'documentation_required',
                priority: 'medium',
                description: 'Request additional documentation'
            });
        }

        return recommendations;
    }

    // Mock data methods (in real implementation, these would query the database)

    async getUserHistoricalData(userId, category) {
        // Mock historical data
        return Array.from({ length: 20 }, (_, i) => ({
            id: `hist_${i}`,
            amount: 50 + Math.random() * 200,
            category,
            date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
        }));
    }

    async getUserRecentExpenses(userId, days) {
        // Mock recent expenses
        return Array.from({ length: 10 }, (_, i) => ({
            id: `recent_${i}`,
            userId,
            amount: 75 + Math.random() * 150,
            merchant: `Merchant ${i}`,
            description: `Expense description ${i}`,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        }));
    }

    async getCompanyPolicies(companyId) {
        // Mock company policies
        return [
            {
                id: 'policy_1',
                name: 'Daily Meal Allowance',
                type: 'amount_limit',
                category: 'meals',
                maxAmount: 75,
                description: 'Maximum daily meal allowance'
            },
            {
                id: 'policy_2',
                name: 'Receipt Requirement',
                type: 'documentation',
                minAmount: 25,
                description: 'Receipt required for expenses over $25'
            }
        ];
    }

    async checkPolicyCompliance(expense, policy) {
        // Mock policy compliance check
        let isViolation = false;
        let severity = 'low';
        let description = '';
        let type = policy.type;

        switch (policy.type) {
            case 'amount_limit':
                if (expense.category === policy.category && expense.amount > policy.maxAmount) {
                    isViolation = true;
                    severity = 'high';
                    description = `Amount ${expense.amount} exceeds policy limit of ${policy.maxAmount}`;
                }
                break;
            case 'documentation':
                if (expense.amount > policy.minAmount && (!expense.documents || expense.documents.length === 0)) {
                    isViolation = true;
                    severity = 'medium';
                    description = `Receipt required for expenses over ${policy.minAmount}`;
                }
                break;
        }

        return { isViolation, severity, description, type };
    }

    isWeekendOrHoliday(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    async logHighRiskCase(expense, analysis) {
        console.log('High-risk expense detected:', {
            expenseId: expense.id,
            riskLevel: analysis.riskLevel,
            riskScore: analysis.riskScore,
            issueCount: analysis.detectedIssues.length
        });
    }
}

module.exports = FraudDetectionEngine; 