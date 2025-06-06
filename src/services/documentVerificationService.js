const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DocumentVerificationService {
  
  /**
   * Get suggestions for a field based on historical data
   */
  async getFieldSuggestions(fieldId, value, documentType, companyId, similarDocumentIds = []) {
    try {
      const suggestions = new Set();
      
      // Get suggestions from similar documents
      if (similarDocumentIds.length > 0) {
        const similarSuggestions = await this.getSuggestionsFromSimilarDocuments(
          fieldId, 
          documentType, 
          similarDocumentIds
        );
        similarSuggestions.forEach(s => suggestions.add(s));
      }
      
      // Get suggestions from historical data
      const historicalSuggestions = await this.getHistoricalSuggestions(
        fieldId, 
        value, 
        documentType, 
        companyId
      );
      historicalSuggestions.forEach(s => suggestions.add(s));
      
      // Get smart suggestions based on field type
      const smartSuggestions = await this.getSmartSuggestions(fieldId, value, documentType);
      smartSuggestions.forEach(s => suggestions.add(s));
      
      return Array.from(suggestions).slice(0, 10); // Return top 10 suggestions
      
    } catch (error) {
      console.error('Error getting field suggestions:', error);
      return [];
    }
  }
  
  /**
   * Get suggestions from similar documents
   */
  async getSuggestionsFromSimilarDocuments(fieldId, documentType, similarDocumentIds) {
    try {
      const documents = await prisma.document.findMany({
        where: {
          id: { in: similarDocumentIds },
          documentType
        },
        include: {
          extractedData: true
        }
      });
      
      const suggestions = [];
      documents.forEach(doc => {
        if (doc.extractedData && doc.extractedData[fieldId]) {
          suggestions.push(doc.extractedData[fieldId]);
        }
      });
      
      return [...new Set(suggestions)]; // Remove duplicates
      
    } catch (error) {
      console.error('Error getting suggestions from similar documents:', error);
      return [];
    }
  }
  
  /**
   * Get historical suggestions based on previous entries
   */
  async getHistoricalSuggestions(fieldId, value, documentType, companyId) {
    try {
      // This would query a suggestions/history table if it exists
      // For now, return common patterns based on field type
      const suggestions = [];
      
      if (fieldId.includes('vendor') || fieldId.includes('merchant')) {
        // Get frequent vendors for this company
        const vendors = await prisma.expense.groupBy({
          by: ['vendor'],
          where: {
            companyId,
            vendor: {
              contains: value,
              mode: 'insensitive'
            }
          },
          _count: {
            vendor: true
          },
          orderBy: {
            _count: {
              vendor: 'desc'
            }
          },
          take: 5
        });
        
        suggestions.push(...vendors.map(v => v.vendor));
      }
      
      if (fieldId.includes('category')) {
        // Get frequent categories
        const categories = await prisma.expense.groupBy({
          by: ['category'],
          where: {
            companyId,
            category: {
              contains: value,
              mode: 'insensitive'
            }
          },
          _count: {
            category: true
          },
          orderBy: {
            _count: {
              category: 'desc'
            }
          },
          take: 5
        });
        
        suggestions.push(...categories.map(c => c.category));
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('Error getting historical suggestions:', error);
      return [];
    }
  }
  
  /**
   * Get smart suggestions based on field type and patterns
   */
  async getSmartSuggestions(fieldId, value, documentType) {
    const suggestions = [];
    
    try {
      // Date field suggestions
      if (fieldId.includes('date')) {
        const today = new Date();
        const formats = [
          today.toISOString().split('T')[0], // YYYY-MM-DD
          today.toLocaleDateString('en-US'), // MM/DD/YYYY
          today.toLocaleDateString('en-GB'), // DD/MM/YYYY
        ];
        suggestions.push(...formats);
      }
      
      // Amount field suggestions
      if (fieldId.includes('amount') || fieldId.includes('total')) {
        if (value && !isNaN(parseFloat(value))) {
          const amount = parseFloat(value);
          // Suggest common tax calculations
          suggestions.push(
            (amount * 1.23).toFixed(2), // +23% VAT
            (amount * 0.81).toFixed(2), // -19% discount
            (amount / 1.23).toFixed(2)  // Net amount
          );
        }
      }
      
      // Category suggestions based on document type
      if (fieldId.includes('category')) {
        const categoryMap = {
          receipt: ['Office Supplies', 'Meals & Entertainment', 'Travel', 'Fuel'],
          invoice: ['Professional Services', 'Software', 'Equipment', 'Utilities'],
          bank_statement: ['Bank Fees', 'Interest', 'Transfer', 'Payment']
        };
        
        const categories = categoryMap[documentType] || [];
        if (value) {
          // Filter categories that match partial input
          const filtered = categories.filter(cat => 
            cat.toLowerCase().includes(value.toLowerCase())
          );
          suggestions.push(...filtered);
        } else {
          suggestions.push(...categories);
        }
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('Error getting smart suggestions:', error);
      return [];
    }
  }
  
  /**
   * Validate extracted field data
   */
  async validateField(field, value, businessRules = {}) {
    const errors = [];
    
    try {
      // Required field validation
      if (field.required && (!value || value.trim() === '')) {
        errors.push(`${field.label} is required`);
      }
      
      // Field type specific validation
      switch (field.fieldType) {
        case 'amount':
          if (value && isNaN(parseFloat(value))) {
            errors.push(`${field.label} must be a valid number`);
          }
          if (businessRules.maxAmount && parseFloat(value) > businessRules.maxAmount) {
            errors.push(`${field.label} exceeds maximum allowed amount`);
          }
          break;
          
        case 'date':
          if (value && !this.isValidDate(value)) {
            errors.push(`${field.label} must be a valid date`);
          }
          if (businessRules.dateRange) {
            const date = new Date(value);
            const { start, end } = businessRules.dateRange;
            if (date < new Date(start) || date > new Date(end)) {
              errors.push(`${field.label} must be within allowed date range`);
            }
          }
          break;
          
        case 'vendor':
          if (businessRules.approvedVendors && 
              !businessRules.approvedVendors.includes(value)) {
            errors.push(`${field.label} is not in approved vendor list`);
          }
          break;
      }
      
      // Custom validation rules
      if (field.validationRules) {
        field.validationRules.forEach(rule => {
          switch (rule.type) {
            case 'pattern':
              if (rule.value && !new RegExp(rule.value).test(value)) {
                errors.push(rule.message);
              }
              break;
              
            case 'range':
              const numValue = parseFloat(value);
              if (!isNaN(numValue) && rule.value) {
                const { min, max } = rule.value;
                if ((min !== undefined && numValue < min) || 
                    (max !== undefined && numValue > max)) {
                  errors.push(rule.message);
                }
              }
              break;
          }
        });
      }
      
      return errors;
      
    } catch (error) {
      console.error('Error validating field:', error);
      return ['Validation error occurred'];
    }
  }
  
  /**
   * Get document templates for a company
   */
  async getDocumentTemplates(companyId, documentType = null) {
    try {
      const where = { companyId };
      if (documentType) {
        where.documentType = documentType;
      }
      
      const templates = await prisma.documentTemplate.findMany({
        where,
        include: {
          fields: true,
          rules: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      return templates;
      
    } catch (error) {
      console.error('Error getting document templates:', error);
      return [];
    }
  }
  
  /**
   * Create or update a document template
   */
  async saveDocumentTemplate(companyId, templateData) {
    try {
      const { id, name, description, documentType, fields, rules } = templateData;
      
      if (id) {
        // Update existing template
        return await prisma.documentTemplate.update({
          where: { id },
          data: {
            name,
            description,
            documentType,
            fields: {
              deleteMany: {},
              create: fields
            },
            rules: {
              deleteMany: {},
              create: rules
            }
          },
          include: {
            fields: true,
            rules: true
          }
        });
      } else {
        // Create new template
        return await prisma.documentTemplate.create({
          data: {
            companyId,
            name,
            description,
            documentType,
            fields: {
              create: fields
            },
            rules: {
              create: rules
            }
          },
          include: {
            fields: true,
            rules: true
          }
        });
      }
      
    } catch (error) {
      console.error('Error saving document template:', error);
      throw error;
    }
  }
  
  /**
   * Find similar documents for suggestions
   */
  async findSimilarDocuments(companyId, documentType, fileName, limit = 5) {
    try {
      // Simple similarity based on document type and file name patterns
      const documents = await prisma.document.findMany({
        where: {
          companyId,
          documentType,
          processingStatus: 'completed',
          fileName: {
            contains: this.extractVendorFromFileName(fileName),
            mode: 'insensitive'
          }
        },
        include: {
          extractedData: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
      
      return documents;
      
    } catch (error) {
      console.error('Error finding similar documents:', error);
      return [];
    }
  }
  
  /**
   * Calculate document quality score
   */
  calculateQualityScore(extractedFields, validationErrors = {}) {
    try {
      const totalFields = extractedFields.length;
      if (totalFields === 0) return 0;
      
      const completedFields = extractedFields.filter(f => f.value && f.value.trim() !== '').length;
      const errorCount = Object.values(validationErrors).flat().length;
      const averageConfidence = extractedFields.reduce((acc, field) => acc + field.confidence, 0) / totalFields;
      
      // Weighted scoring
      const completionScore = (completedFields / totalFields) * 0.4;
      const errorScore = Math.max(0, (totalFields - errorCount) / totalFields) * 0.3;
      const confidenceScore = averageConfidence * 0.3;
      
      return Math.round((completionScore + errorScore + confidenceScore) * 100);
      
    } catch (error) {
      console.error('Error calculating quality score:', error);
      return 0;
    }
  }
  
  /**
   * Save verification corrections for machine learning
   */
  async saveVerificationCorrections(documentId, corrections, userId) {
    try {
      return await prisma.verificationCorrection.create({
        data: {
          documentId,
          userId,
          corrections: JSON.stringify(corrections),
          timestamp: new Date()
        }
      });
      
    } catch (error) {
      console.error('Error saving verification corrections:', error);
      throw error;
    }
  }
  
  /**
   * Get business rules for validation
   */
  async getBusinessRules(companyId) {
    try {
      const rules = await prisma.businessRule.findMany({
        where: {
          companyId,
          isActive: true
        }
      });
      
      return rules.reduce((acc, rule) => {
        acc[rule.ruleType] = rule.ruleValue;
        return acc;
      }, {});
      
    } catch (error) {
      console.error('Error getting business rules:', error);
      return {};
    }
  }
  
  // Helper methods
  
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
  
  extractVendorFromFileName(fileName) {
    // Simple extraction - take the first part before common separators
    return fileName.split(/[-_\s]/)[0] || fileName.substring(0, 10);
  }
}

module.exports = DocumentVerificationService; 