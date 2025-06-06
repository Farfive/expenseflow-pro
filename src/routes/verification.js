const express = require('express');
const router = express.Router();
const DocumentVerificationService = require('../services/documentVerificationService');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const verificationService = new DocumentVerificationService();

// Rate limiting for verification endpoints
const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

/**
 * POST /api/verification/suggestions
 * Get smart suggestions for a field
 */
router.post('/suggestions', auth, verificationRateLimit, async (req, res) => {
  try {
    const { fieldId, value, documentType, similarDocuments } = req.body;
    const companyId = req.user.companyId;
    
    if (!fieldId || !documentType) {
      return res.status(400).json({
        error: 'fieldId and documentType are required'
      });
    }
    
    const suggestions = await verificationService.getFieldSuggestions(
      fieldId,
      value || '',
      documentType,
      companyId,
      similarDocuments || []
    );
    
    res.json({ suggestions });
    
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * POST /api/verification/validate
 * Validate field data against business rules
 */
router.post('/validate', auth, verificationRateLimit, async (req, res) => {
  try {
    const { field, value } = req.body;
    const companyId = req.user.companyId;
    
    if (!field || value === undefined) {
      return res.status(400).json({
        error: 'field and value are required'
      });
    }
    
    // Get business rules for validation
    const businessRules = await verificationService.getBusinessRules(companyId);
    
    const errors = await verificationService.validateField(field, value, businessRules);
    
    res.json({ 
      isValid: errors.length === 0,
      errors 
    });
    
  } catch (error) {
    console.error('Error validating field:', error);
    res.status(500).json({ error: 'Failed to validate field' });
  }
});

/**
 * GET /api/verification/templates
 * Get document templates for a company
 */
router.get('/templates', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { documentType } = req.query;
    
    const templates = await verificationService.getDocumentTemplates(companyId, documentType);
    
    res.json({ templates });
    
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * POST /api/verification/templates
 * Create or update a document template
 */
router.post('/templates', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const templateData = req.body;
    
    if (!templateData.name || !templateData.documentType) {
      return res.status(400).json({
        error: 'name and documentType are required'
      });
    }
    
    const template = await verificationService.saveDocumentTemplate(companyId, templateData);
    
    res.json({ template });
    
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

/**
 * GET /api/verification/similar-documents
 * Find similar documents for suggestions
 */
router.get('/similar-documents', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { documentType, fileName, limit = 5 } = req.query;
    
    if (!documentType || !fileName) {
      return res.status(400).json({
        error: 'documentType and fileName are required'
      });
    }
    
    const similarDocuments = await verificationService.findSimilarDocuments(
      companyId,
      documentType,
      fileName,
      parseInt(limit)
    );
    
    res.json({ similarDocuments });
    
  } catch (error) {
    console.error('Error finding similar documents:', error);
    res.status(500).json({ error: 'Failed to find similar documents' });
  }
});

/**
 * POST /api/verification/quality-score
 * Calculate document quality score
 */
router.post('/quality-score', auth, verificationRateLimit, async (req, res) => {
  try {
    const { extractedFields, validationErrors } = req.body;
    
    if (!extractedFields || !Array.isArray(extractedFields)) {
      return res.status(400).json({
        error: 'extractedFields array is required'
      });
    }
    
    const qualityScore = verificationService.calculateQualityScore(
      extractedFields,
      validationErrors || {}
    );
    
    res.json({ qualityScore });
    
  } catch (error) {
    console.error('Error calculating quality score:', error);
    res.status(500).json({ error: 'Failed to calculate quality score' });
  }
});

/**
 * POST /api/verification/corrections
 * Save verification corrections for machine learning
 */
router.post('/corrections', auth, async (req, res) => {
  try {
    const { documentId, corrections } = req.body;
    const userId = req.user.id;
    
    if (!documentId || !corrections) {
      return res.status(400).json({
        error: 'documentId and corrections are required'
      });
    }
    
    const correctionRecord = await verificationService.saveVerificationCorrections(
      documentId,
      corrections,
      userId
    );
    
    res.json({ correctionRecord });
    
  } catch (error) {
    console.error('Error saving corrections:', error);
    res.status(500).json({ error: 'Failed to save corrections' });
  }
});

/**
 * GET /api/verification/business-rules
 * Get business rules for validation
 */
router.get('/business-rules', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const businessRules = await verificationService.getBusinessRules(companyId);
    
    res.json({ businessRules });
    
  } catch (error) {
    console.error('Error getting business rules:', error);
    res.status(500).json({ error: 'Failed to get business rules' });
  }
});

/**
 * POST /api/verification/batch-validate
 * Validate multiple fields at once
 */
router.post('/batch-validate', auth, verificationRateLimit, async (req, res) => {
  try {
    const { fields } = req.body;
    const companyId = req.user.companyId;
    
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({
        error: 'fields array is required'
      });
    }
    
    const businessRules = await verificationService.getBusinessRules(companyId);
    const validationResults = {};
    
    for (const field of fields) {
      const errors = await verificationService.validateField(
        field.fieldData,
        field.value,
        businessRules
      );
      
      validationResults[field.id] = {
        isValid: errors.length === 0,
        errors
      };
    }
    
    res.json({ validationResults });
    
  } catch (error) {
    console.error('Error batch validating fields:', error);
    res.status(500).json({ error: 'Failed to validate fields' });
  }
});

/**
 * POST /api/verification/auto-correct
 * Get auto-correction suggestions for common errors
 */
router.post('/auto-correct', auth, verificationRateLimit, async (req, res) => {
  try {
    const { fieldType, value } = req.body;
    
    if (!fieldType || value === undefined) {
      return res.status(400).json({
        error: 'fieldType and value are required'
      });
    }
    
    const corrections = getAutoCorrections(fieldType, value);
    
    res.json({ corrections });
    
  } catch (error) {
    console.error('Error getting auto-corrections:', error);
    res.status(500).json({ error: 'Failed to get auto-corrections' });
  }
});

/**
 * GET /api/verification/confidence-distribution
 * Get confidence score distribution for a document type
 */
router.get('/confidence-distribution', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { documentType, dateFrom, dateTo } = req.query;
    
    // This would require a more complex query to aggregate confidence scores
    // For now, return mock data structure
    const distribution = {
      high: 0,      // >= 90%
      medium: 0,    // 70-89%
      low: 0,       // < 70%
      total: 0
    };
    
    res.json({ distribution });
    
  } catch (error) {
    console.error('Error getting confidence distribution:', error);
    res.status(500).json({ error: 'Failed to get confidence distribution' });
  }
});

// Helper function for auto-corrections
function getAutoCorrections(fieldType, value) {
  const corrections = [];
  
  switch (fieldType) {
    case 'amount':
      // Fix common amount formatting issues
      if (typeof value === 'string') {
        // Remove currency symbols and extra spaces
        const cleaned = value.replace(/[^0-9.,]/g, '');
        if (cleaned !== value && cleaned) {
          corrections.push({
            type: 'format',
            suggestion: cleaned,
            reason: 'Removed currency symbols and special characters'
          });
        }
        
        // Fix decimal separators
        if (cleaned.includes(',') && !cleaned.includes('.')) {
          corrections.push({
            type: 'format',
            suggestion: cleaned.replace(',', '.'),
            reason: 'Changed comma to decimal point'
          });
        }
      }
      break;
      
    case 'date':
      // Fix common date formatting issues
      if (typeof value === 'string') {
        // Try to parse and reformat
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const isoDate = date.toISOString().split('T')[0];
          if (isoDate !== value) {
            corrections.push({
              type: 'format',
              suggestion: isoDate,
              reason: 'Standardized to ISO date format'
            });
          }
        }
      }
      break;
      
    case 'vendor':
      // Fix common vendor name issues
      if (typeof value === 'string') {
        // Trim whitespace and fix casing
        const trimmed = value.trim();
        const titleCase = trimmed.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        
        if (titleCase !== value) {
          corrections.push({
            type: 'format',
            suggestion: titleCase,
            reason: 'Applied proper title case formatting'
          });
        }
      }
      break;
  }
  
  return corrections;
}

module.exports = router; 