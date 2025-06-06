const Queue = require('bull');
const Redis = require('redis');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');
const DocumentProcessor = require('./documentProcessor');
const { PrismaClient } = require('@prisma/client');

class DocumentQueueService {
  constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100
    };

    this.queueConfig = {
      prefix: process.env.BULL_QUEUE_PREFIX || 'expenseflow',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS) || 3,
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.QUEUE_BACKOFF_DELAY) || 5000
        }
      }
    };

    this.documentQueue = null;
    this.documentProcessor = null;
    this.prisma = null;
    this.isInitialized = false;

    this.initializeQueue();
  }

  /**
   * Initialize the queue and processors
   */
  async initializeQueue() {
    try {
      // Initialize Prisma client
      this.prisma = new PrismaClient();

      // Initialize document processor
      this.documentProcessor = new DocumentProcessor();

      // Create document processing queue
      this.documentQueue = new Queue('document processing', {
        redis: this.redisConfig,
        ...this.queueConfig
      });

      // Set up job processors
      this.setupProcessors();

      // Set up event listeners
      this.setupEventListeners();

      // Test Redis connection
      await this.testRedisConnection();

      this.isInitialized = true;
      logger.info('Document queue service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize document queue service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Test Redis connection
   */
  async testRedisConnection() {
    try {
      const client = Redis.createClient(this.redisConfig);
      await client.ping();
      await client.quit();
      logger.info('Redis connection test successful');
    } catch (error) {
      logger.error('Redis connection test failed:', error);
      throw error;
    }
  }

  /**
   * Set up job processors
   */
  setupProcessors() {
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY) || 3;

    // Document processing processor
    this.documentQueue.process('process-document', concurrency, async (job) => {
      return this.processDocumentJob(job);
    });

    // Document cleanup processor
    this.documentQueue.process('cleanup-document', 1, async (job) => {
      return this.cleanupDocumentJob(job);
    });

    // Batch processing processor
    this.documentQueue.process('process-batch', 1, async (job) => {
      return this.processBatchJob(job);
    });

    logger.info(`Document queue processors initialized with concurrency: ${concurrency}`);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Job completed
    this.documentQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully:`, {
        jobType: job.name,
        processingTime: result.processingTime,
        confidence: result.confidenceScore
      });
    });

    // Job failed
    this.documentQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, {
        jobType: job.name,
        error: err.message,
        attempts: job.attemptsMade,
        data: job.data
      });
    });

    // Job stalled
    this.documentQueue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled:`, {
        jobType: job.name,
        attempts: job.attemptsMade
      });
    });

    // Queue error
    this.documentQueue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    // Progress updates
    this.documentQueue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Add document processing job to queue
   */
  async addDocumentProcessingJob(documentData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    const jobData = {
      documentId: documentData.id,
      tenantId: documentData.tenantId,
      companyId: documentData.companyId,
      filePath: documentData.filePath,
      fileName: documentData.fileName,
      mimeType: documentData.mimeType,
      fileSize: documentData.fileSize,
      userId: documentData.userId || null,
      locale: options.locale || 'en-US',
      priority: options.priority || 'normal',
      metadata: options.metadata || {},
      createdAt: new Date().toISOString()
    };

    const jobOptions = {
      priority: this.getPriorityValue(options.priority),
      delay: options.delay || 0,
      attempts: options.attempts || this.queueConfig.defaultJobOptions.attempts,
      ...options.jobOptions
    };

    try {
      const job = await this.documentQueue.add('process-document', jobData, jobOptions);
      
      logger.info(`Document processing job added to queue:`, {
        jobId: job.id,
        documentId: documentData.id,
        priority: options.priority
      });

      return {
        jobId: job.id,
        status: 'queued',
        estimatedProcessingTime: this.estimateProcessingTime(documentData)
      };

    } catch (error) {
      logger.error('Failed to add document processing job:', error);
      throw error;
    }
  }

  /**
   * Process document job
   */
  async processDocumentJob(job) {
    const { documentId, tenantId, companyId, filePath, locale, metadata } = job.data;
    
    try {
      logger.info(`Processing document job ${job.id} for document ${documentId}`);
      
      // Update job progress
      await job.progress(10);

      // Update document status to processing
      await this.updateDocumentStatus(documentId, 'PROCESSING', tenantId);
      
      await job.progress(20);

      // Validate file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Document file not found: ${filePath}`);
      }

      await job.progress(30);

      // Process document with AI
      const processingOptions = {
        locale,
        ...metadata
      };

      const result = await this.documentProcessor.processDocument(
        documentId, 
        filePath, 
        processingOptions
      );

      await job.progress(80);

      if (result.success) {
        // Update document with extracted data
        await this.updateDocumentWithResults(documentId, result, tenantId);
        
        await job.progress(95);

        // Schedule cleanup job
        await this.scheduleCleanupJob(documentId, filePath);

        await job.progress(100);

        logger.info(`Document ${documentId} processed successfully`);
        
        return {
          success: true,
          documentId,
          extractedData: result.extractedData,
          confidenceScore: result.confidenceScore,
          processingTime: result.processingTime
        };

      } else {
        throw new Error(result.error || 'Document processing failed');
      }

    } catch (error) {
      logger.error(`Document processing job ${job.id} failed:`, error);
      
      // Update document status to failed
      await this.updateDocumentStatus(documentId, 'FAILED', tenantId, error.message);
      
      throw error;
    }
  }

  /**
   * Process batch job
   */
  async processBatchJob(job) {
    const { documentIds, tenantId, companyId, options } = job.data;
    
    try {
      logger.info(`Processing batch job ${job.id} with ${documentIds.length} documents`);
      
      const results = [];
      let processed = 0;

      for (const documentId of documentIds) {
        try {
          // Get document info
          const document = await this.prisma.document.findUnique({
            where: { id: documentId, tenantId }
          });

          if (!document) {
            results.push({
              documentId,
              success: false,
              error: 'Document not found'
            });
            continue;
          }

          // Add individual processing job
          const jobResult = await this.addDocumentProcessingJob(document, {
            ...options,
            priority: 'batch'
          });

          results.push({
            documentId,
            success: true,
            jobId: jobResult.jobId
          });

          processed++;
          await job.progress((processed / documentIds.length) * 100);

        } catch (error) {
          results.push({
            documentId,
            success: false,
            error: error.message
          });
        }
      }

      logger.info(`Batch job ${job.id} completed: ${processed}/${documentIds.length} documents queued`);
      
      return {
        success: true,
        totalDocuments: documentIds.length,
        processedDocuments: processed,
        results
      };

    } catch (error) {
      logger.error(`Batch processing job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Cleanup document job
   */
  async cleanupDocumentJob(job) {
    const { documentId, filePath, tempFiles } = job.data;
    
    try {
      logger.info(`Cleaning up document ${documentId}`);
      
      // Remove temporary files
      if (tempFiles && Array.isArray(tempFiles)) {
        await this.documentProcessor.cleanup(tempFiles);
      }

      // Additional cleanup logic can be added here
      
      return {
        success: true,
        documentId,
        cleanedFiles: (tempFiles || []).length
      };

    } catch (error) {
      logger.error(`Cleanup job failed for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule cleanup job
   */
  async scheduleCleanupJob(documentId, filePath, tempFiles = [], delay = 3600000) { // 1 hour delay
    try {
      const cleanupJob = await this.documentQueue.add('cleanup-document', {
        documentId,
        filePath,
        tempFiles
      }, {
        delay, // Delay cleanup
        attempts: 2
      });

      logger.debug(`Cleanup job scheduled for document ${documentId}: ${cleanupJob.id}`);
      return cleanupJob.id;

    } catch (error) {
      logger.warn(`Failed to schedule cleanup job for document ${documentId}:`, error);
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId, status, tenantId, errorMessage = null) {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'PROCESSING') {
        updateData.processedAt = new Date();
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await this.prisma.document.update({
        where: { 
          id: documentId,
          tenantId 
        },
        data: updateData
      });

      logger.debug(`Document ${documentId} status updated to ${status}`);

    } catch (error) {
      logger.error(`Failed to update document status for ${documentId}:`, error);
    }
  }

  /**
   * Update document with processing results
   */
  async updateDocumentWithResults(documentId, result, tenantId) {
    try {
      await this.prisma.document.update({
        where: { 
          id: documentId,
          tenantId 
        },
        data: {
          status: 'PROCESSED',
          ocrProcessed: true,
          extractedData: result.extractedData,
          confidenceScore: result.confidenceScore,
          processedAt: new Date(),
          processingTime: result.processingTime,
          errorMessage: null,
          updatedAt: new Date()
        }
      });

      logger.debug(`Document ${documentId} updated with processing results`);

    } catch (error) {
      logger.error(`Failed to update document with results for ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get priority value for Bull queue
   */
  getPriorityValue(priority) {
    const priorities = {
      'critical': 1,
      'high': 2,
      'normal': 3,
      'low': 4,
      'batch': 5
    };
    
    return priorities[priority] || priorities['normal'];
  }

  /**
   * Estimate processing time based on document properties
   */
  estimateProcessingTime(documentData) {
    const baseTime = 30000; // 30 seconds base
    const sizeMultiplier = Math.max(1, documentData.fileSize / (1024 * 1024)); // Size in MB
    const typeMultiplier = documentData.mimeType === 'application/pdf' ? 2 : 1;
    
    return Math.round(baseTime * sizeMultiplier * typeMultiplier);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.isInitialized) {
      return { available: false };
    }

    try {
      const waiting = await this.documentQueue.getWaiting();
      const active = await this.documentQueue.getActive();
      const completed = await this.documentQueue.getCompleted();
      const failed = await this.documentQueue.getFailed();
      const delayed = await this.documentQueue.getDelayed();

      return {
        available: true,
        stats: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: waiting.length + active.length + completed.length + failed.length + delayed.length
        }
      };

    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return { 
        available: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const job = await this.documentQueue.getJob(jobId);
      
      if (!job) {
        return null;
      }

      const state = await job.getState();
      
      return {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
        progress: job._progress,
        attempts: job.attemptsMade,
        createdAt: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason
      };

    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId) {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const job = await this.documentQueue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      await job.remove();
      
      logger.info(`Job ${jobId} cancelled successfully`);
      return true;

    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up completed/failed jobs
   */
  async cleanupJobs(olderThanHours = 24) {
    if (!this.isInitialized) {
      return;
    }

    try {
      const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      await this.documentQueue.clean(cutoff, 'completed');
      await this.documentQueue.clean(cutoff, 'failed');
      
      logger.info(`Cleaned up jobs older than ${olderThanHours} hours`);

    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      if (this.documentQueue) {
        await this.documentQueue.close();
        logger.info('Document queue closed');
      }

      if (this.prisma) {
        await this.prisma.$disconnect();
        logger.info('Prisma client disconnected');
      }

      this.isInitialized = false;
      logger.info('Document queue service shut down gracefully');

    } catch (error) {
      logger.error('Error during queue service shutdown:', error);
    }
  }
}

module.exports = DocumentQueueService; 