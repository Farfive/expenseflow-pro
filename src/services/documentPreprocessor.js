const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('DocumentPreprocessor');

class DocumentPreprocessor {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.processedDir = path.join(this.uploadDir, 'processed');
    this.tempDir = path.join(this.uploadDir, 'temp');
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.processedDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories:', error);
    }
  }

  /**
   * Main preprocessing pipeline
   * @param {string} imagePath - Path to the original image
   * @param {Object} options - Processing options
   * @returns {Object} - Processed image info and paths
   */
  async preprocessDocument(imagePath, options = {}) {
    try {
      logger.info(`Starting document preprocessing for: ${imagePath}`);
      
      const startTime = Date.now();
      const originalStats = await fs.stat(imagePath);
      const filename = path.basename(imagePath, path.extname(imagePath));
      
      // Step 1: Load and analyze image
      const imageInfo = await this.analyzeImage(imagePath);
      logger.debug('Image analysis completed:', imageInfo);
      
      // Step 2: Apply preprocessing pipeline
      const processedPath = await this.applyPreprocessingPipeline(imagePath, imageInfo, options);
      
      // Step 3: Generate multiple variants for OCR
      const variants = await this.generateOCRVariants(processedPath, options);
      
      // Step 4: Quality assessment
      const qualityScore = await this.assessImageQuality(processedPath);
      
      const processingTime = Date.now() - startTime;
      const processedStats = await fs.stat(processedPath);
      
      const result = {
        original: {
          path: imagePath,
          size: originalStats.size,
          info: imageInfo
        },
        processed: {
          path: processedPath,
          size: processedStats.size,
          qualityScore
        },
        variants,
        processing: {
          timeMs: processingTime,
          steps: ['analysis', 'preprocessing', 'variants', 'quality_assessment']
        },
        recommendations: await this.generateRecommendations(imageInfo, qualityScore)
      };
      
      logger.info(`Document preprocessing completed in ${processingTime}ms`);
      return result;
      
    } catch (error) {
      logger.error('Document preprocessing failed:', error);
      throw new Error(`Preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Analyze image properties and detect issues
   */
  async analyzeImage(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      // Detect orientation and skew
      const orientation = await this.detectOrientation(image);
      const skewAngle = await this.detectSkew(image);
      
      // Analyze lighting and contrast
      const lighting = this.analyzeLighting(stats);
      const contrast = this.analyzeContrast(stats);
      
      // Detect document boundaries
      const boundaries = await this.detectDocumentBoundaries(image);
      
      return {
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspect_ratio: metadata.width / metadata.height
        },
        format: metadata.format,
        colorSpace: metadata.space,
        quality: {
          orientation,
          skewAngle,
          lighting,
          contrast,
          boundaries
        },
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density
      };
    } catch (error) {
      logger.error('Image analysis failed:', error);
      throw error;
    }
  }

  /**
   * Apply comprehensive preprocessing pipeline
   */
  async applyPreprocessingPipeline(imagePath, imageInfo, options = {}) {
    try {
      const filename = path.basename(imagePath, path.extname(imagePath));
      const outputPath = path.join(this.processedDir, `${filename}_processed.png`);
      
      let image = sharp(imagePath);
      
      // Step 1: Rotate if needed (auto-orient)
      if (imageInfo.quality.orientation !== 0) {
        image = image.rotate(imageInfo.quality.orientation);
        logger.debug(`Applied rotation: ${imageInfo.quality.orientation}°`);
      }
      
      // Step 2: Crop to document boundaries if detected
      if (imageInfo.quality.boundaries && imageInfo.quality.boundaries.confidence > 0.7) {
        const { left, top, width, height } = imageInfo.quality.boundaries;
        image = image.extract({ left, top, width, height });
        logger.debug('Applied boundary cropping');
      }
      
      // Step 3: Deskew if significant skew detected
      if (Math.abs(imageInfo.quality.skewAngle) > 0.5) {
        image = image.rotate(-imageInfo.quality.skewAngle, { background: { r: 255, g: 255, b: 255 } });
        logger.debug(`Applied deskewing: ${-imageInfo.quality.skewAngle}°`);
      }
      
      // Step 4: Enhance contrast and brightness
      if (imageInfo.quality.lighting.adjustmentNeeded) {
        image = image.modulate({
          brightness: imageInfo.quality.lighting.brightnessMultiplier,
          saturation: 0.8 // Slightly desaturate for better OCR
        });
        logger.debug('Applied lighting adjustments');
      }
      
      // Step 5: Sharpen if image is blurry
      if (imageInfo.quality.contrast.isBlurry) {
        image = image.sharpen(1.0, 1.0, 1.0);
        logger.debug('Applied sharpening');
      }
      
      // Step 6: Noise reduction
      image = image.median(3); // Remove noise while preserving edges
      
      // Step 7: Convert to optimal format for OCR
      image = image
        .png({ quality: 95, compressionLevel: 6 })
        .ensureAlpha(0) // Remove alpha channel
        .toColorspace('srgb');
      
      // Step 8: Resize if too large (OCR optimization)
      const metadata = await image.metadata();
      const maxDimension = options.maxDimension || 3000;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        image = image.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true
        });
        logger.debug(`Resized to max dimension: ${maxDimension}px`);
      }
      
      await image.toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      logger.error('Preprocessing pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple variants for different OCR strategies
   */
  async generateOCRVariants(processedPath, options = {}) {
    try {
      const filename = path.basename(processedPath, path.extname(processedPath));
      const variants = [];
      
      // Variant 1: High contrast B&W
      const bwPath = path.join(this.processedDir, `${filename}_bw.png`);
      await sharp(processedPath)
        .greyscale()
        .normalise()
        .threshold(128)
        .png()
        .toFile(bwPath);
      
      variants.push({ type: 'black_white', path: bwPath, description: 'High contrast black and white' });
      
      // Variant 2: Enhanced contrast grayscale
      const greyPath = path.join(this.processedDir, `${filename}_grey.png`);
      await sharp(processedPath)
        .greyscale()
        .modulate({ brightness: 1.1, saturation: 0 })
        .sharpen(1.5, 1.0, 1.0)
        .png()
        .toFile(greyPath);
      
      variants.push({ type: 'enhanced_grey', path: greyPath, description: 'Enhanced contrast grayscale' });
      
      // Variant 3: Color preserved with enhancement
      const colorPath = path.join(this.processedDir, `${filename}_color.png`);
      await sharp(processedPath)
        .modulate({ brightness: 1.05, saturation: 0.9 })
        .png()
        .toFile(colorPath);
      
      variants.push({ type: 'enhanced_color', path: colorPath, description: 'Color preserved with enhancement' });
      
      // Variant 4: Text-optimized (if text density is high)
      const textPath = path.join(this.processedDir, `${filename}_text.png`);
      await sharp(processedPath)
        .greyscale()
        .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
        .modulate({ brightness: 1.1 })
        .png()
        .toFile(textPath);
      
      variants.push({ type: 'text_optimized', path: textPath, description: 'Optimized for text recognition' });
      
      logger.debug(`Generated ${variants.length} OCR variants`);
      return variants;
    } catch (error) {
      logger.error('Variant generation failed:', error);
      return [];
    }
  }

  /**
   * Detect image orientation
   */
  async detectOrientation(image) {
    // Simplified orientation detection
    // In a full implementation, this would use more sophisticated algorithms
    try {
      const metadata = await image.metadata();
      return metadata.orientation ? (metadata.orientation - 1) * 90 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Detect skew angle using edge detection
   */
  async detectSkew(image) {
    // Simplified skew detection
    // In production, you'd use algorithms like Hough transform
    try {
      // For now, return 0 - this would be enhanced with actual skew detection
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze lighting conditions
   */
  analyzeLighting(stats) {
    const avgBrightness = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
    
    let adjustmentNeeded = false;
    let brightnessMultiplier = 1.0;
    
    if (avgBrightness < 85) {
      // Too dark
      adjustmentNeeded = true;
      brightnessMultiplier = 1.3;
    } else if (avgBrightness > 200) {
      // Too bright
      adjustmentNeeded = true;
      brightnessMultiplier = 0.8;
    }
    
    return {
      avgBrightness,
      adjustmentNeeded,
      brightnessMultiplier,
      quality: avgBrightness >= 85 && avgBrightness <= 200 ? 'good' : 'needs_adjustment'
    };
  }

  /**
   * Analyze contrast and sharpness
   */
  analyzeContrast(stats) {
    const contrast = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
    
    const isBlurry = contrast < 30;
    const isHighContrast = contrast > 80;
    
    return {
      contrast,
      isBlurry,
      isHighContrast,
      quality: !isBlurry && !isHighContrast ? 'good' : 'needs_adjustment'
    };
  }

  /**
   * Detect document boundaries
   */
  async detectDocumentBoundaries(image) {
    // Simplified boundary detection
    // In production, this would use edge detection and contour analysis
    try {
      const metadata = await image.metadata();
      
      // For now, assume the entire image is the document
      return {
        left: 0,
        top: 0,
        width: metadata.width,
        height: metadata.height,
        confidence: 0.5 // Low confidence since this is simplified
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Assess overall image quality
   */
  async assessImageQuality(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      const lighting = this.analyzeLighting(stats);
      const contrast = this.analyzeContrast(stats);
      
      // Calculate composite quality score (0-100)
      let score = 50; // Base score
      
      // Resolution score
      const pixelCount = metadata.width * metadata.height;
      if (pixelCount > 2000000) score += 20; // High resolution
      else if (pixelCount > 500000) score += 10; // Medium resolution
      
      // Lighting score
      if (lighting.quality === 'good') score += 15;
      else score -= 5;
      
      // Contrast score
      if (contrast.quality === 'good') score += 15;
      else score -= 5;
      
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      logger.error('Quality assessment failed:', error);
      return 50; // Default medium quality
    }
  }

  /**
   * Generate processing recommendations
   */
  async generateRecommendations(imageInfo, qualityScore) {
    const recommendations = [];
    
    if (qualityScore < 60) {
      recommendations.push({
        type: 'quality',
        message: 'Image quality is below optimal. Consider retaking the photo.',
        severity: 'warning'
      });
    }
    
    if (Math.abs(imageInfo.quality.skewAngle) > 2) {
      recommendations.push({
        type: 'skew',
        message: 'Document appears skewed. Deskewing has been applied.',
        severity: 'info'
      });
    }
    
    if (imageInfo.quality.lighting.adjustmentNeeded) {
      recommendations.push({
        type: 'lighting',
        message: 'Lighting adjustments were applied to improve readability.',
        severity: 'info'
      });
    }
    
    if (imageInfo.quality.contrast.isBlurry) {
      recommendations.push({
        type: 'blur',
        message: 'Image appears blurry. Sharpening has been applied.',
        severity: 'warning'
      });
    }
    
    return recommendations;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePaths) {
    try {
      for (const filePath of filePaths) {
        await fs.unlink(filePath);
      }
      logger.debug(`Cleaned up ${filePaths.length} temporary files`);
    } catch (error) {
      logger.warn('Cleanup failed:', error);
    }
  }
}

module.exports = DocumentPreprocessor; 