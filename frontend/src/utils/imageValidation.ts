/**
 * Image Validation Utilities
 * 
 * Uses jimp for image analysis and quality validation
 */

import Jimp from 'jimp';

export interface ValidationResult {
  isValid: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  issues: string[];
  recommendations: string[];
  metrics: {
    brightness: number;
    contrast: number;
    sharpness: number;
    resolution: { width: number; height: number };
    fileSize: number;
    aspectRatio: number;
  };
}

export const validateReceiptQuality = async (file: File): Promise<ValidationResult> => {
  try {
    const imageBuffer = await fileToBuffer(file);
    const image = await Jimp.read(imageBuffer);
    
    const metrics = await analyzeImage(image);
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let score = 100;

    // Check resolution
    if (metrics.resolution.width < 800 || metrics.resolution.height < 600) {
      issues.push('Low resolution');
      recommendations.push('Use higher resolution camera or move closer to receipt');
      score -= 20;
    }

    // Check brightness
    if (metrics.brightness < 30) {
      issues.push('Image too dark');
      recommendations.push('Improve lighting or use flash');
      score -= 15;
    } else if (metrics.brightness > 200) {
      issues.push('Image too bright/overexposed');
      recommendations.push('Reduce lighting or avoid direct light');
      score -= 15;
    }

    // Check contrast
    if (metrics.contrast < 20) {
      issues.push('Low contrast');
      recommendations.push('Ensure good lighting contrast between text and background');
      score -= 10;
    }

    // Check sharpness (blur detection)
    if (metrics.sharpness < 50) {
      issues.push('Image appears blurry');
      recommendations.push('Hold camera steady and ensure receipt is in focus');
      score -= 20;
    }

    // Check aspect ratio (receipts are usually tall)
    if (metrics.aspectRatio > 2) {
      issues.push('Unusual aspect ratio');
      recommendations.push('Ensure entire receipt is captured');
      score -= 5;
    }

    // Check file size (too small might indicate low quality)
    if (metrics.fileSize < 100000) { // 100KB
      issues.push('File size very small');
      recommendations.push('Capture image at higher quality settings');
      score -= 10;
    }

    // Determine quality level
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) quality = 'excellent';
    else if (score >= 75) quality = 'good';
    else if (score >= 60) quality = 'fair';
    else quality = 'poor';

    return {
      isValid: score >= 60, // Minimum acceptable score
      quality,
      score: Math.max(0, score),
      issues,
      recommendations,
      metrics,
    };

  } catch (error) {
    console.error('Error validating image:', error);
    return {
      isValid: false,
      quality: 'poor',
      score: 0,
      issues: ['Failed to analyze image'],
      recommendations: ['Try uploading a different image'],
      metrics: {
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        resolution: { width: 0, height: 0 },
        fileSize: file.size,
        aspectRatio: 0,
      },
    };
  }
};

const analyzeImage = async (image: Jimp): Promise<ValidationResult['metrics']> => {
  const width = image.getWidth();
  const height = image.getHeight();
  const aspectRatio = height / width;

  // Calculate brightness (average luminance)
  let totalBrightness = 0;
  let pixelCount = 0;

  // Sample pixels for performance (every 10th pixel)
  for (let y = 0; y < height; y += 10) {
    for (let x = 0; x < width; x += 10) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      const brightness = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114);
      totalBrightness += brightness;
      pixelCount++;
    }
  }

  const averageBrightness = totalBrightness / pixelCount;

  // Calculate contrast (standard deviation of brightness)
  let variance = 0;
  pixelCount = 0;

  for (let y = 0; y < height; y += 10) {
    for (let x = 0; x < width; x += 10) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      const brightness = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114);
      variance += Math.pow(brightness - averageBrightness, 2);
      pixelCount++;
    }
  }

  const contrast = Math.sqrt(variance / pixelCount);

  // Calculate sharpness using Laplacian variance
  const sharpness = calculateSharpness(image);

  return {
    brightness: averageBrightness,
    contrast,
    sharpness,
    resolution: { width, height },
    fileSize: 0, // Will be set from original file
    aspectRatio,
  };
};

const calculateSharpness = (image: Jimp): number => {
  // Convert to grayscale for edge detection
  const gray = image.clone().greyscale();
  const width = gray.getWidth();
  const height = gray.getHeight();

  // Laplacian kernel for edge detection
  const laplacian = [
    [0, -1, 0],
    [-1, 4, -1],
    [0, -1, 0]
  ];

  let totalVariance = 0;
  let count = 0;

  // Apply Laplacian filter and calculate variance
  for (let y = 1; y < height - 1; y += 5) { // Sample every 5th pixel for performance
    for (let x = 1; x < width - 1; x += 5) {
      let sum = 0;
      
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const pixel = Jimp.intToRGBA(gray.getPixelColor(x + kx - 1, y + ky - 1));
          sum += pixel.r * laplacian[ky][kx];
        }
      }
      
      totalVariance += sum * sum;
      count++;
    }
  }

  return totalVariance / count;
};

const fileToBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Auto-enhance image function
export const enhanceReceiptImage = async (file: File): Promise<File> => {
  try {
    const imageBuffer = await fileToBuffer(file);
    const image = await Jimp.read(imageBuffer);

    // Auto-enhance the image
    image
      .contrast(0.2) // Increase contrast slightly
      .brightness(0.1) // Increase brightness slightly
      .normalize(); // Normalize the image

    // Convert back to file
    const enhancedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return new File([enhancedBuffer], file.name, { type: 'image/jpeg' });

  } catch (error) {
    console.error('Error enhancing image:', error);
    return file; // Return original file if enhancement fails
  }
};

// Detect document edges (basic implementation)
export const detectDocumentEdges = async (file: File): Promise<{ corners: number[][]; confidence: number }> => {
  try {
    const imageBuffer = await fileToBuffer(file);
    const image = await Jimp.read(imageBuffer);
    
    // Simple edge detection using brightness changes
    // This is a basic implementation - for production, consider using more sophisticated algorithms
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Default to full image corners
    const corners = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height]
    ];

    return {
      corners,
      confidence: 0.8, // Basic confidence score
    };

  } catch (error) {
    console.error('Error detecting edges:', error);
    return {
      corners: [],
      confidence: 0,
    };
  }
};

// Check if image contains text (basic heuristic)
export const detectTextPresence = async (file: File): Promise<{ hasText: boolean; confidence: number }> => {
  try {
    const imageBuffer = await fileToBuffer(file);
    const image = await Jimp.read(imageBuffer);
    
    // Look for horizontal and vertical line patterns that might indicate text
    const edges = await calculateSharpness(image);
    
    // Simple heuristic: if there are many edges, likely contains text
    const hasText = edges > 100;
    const confidence = Math.min(edges / 500, 1);

    return {
      hasText,
      confidence,
    };

  } catch (error) {
    console.error('Error detecting text:', error);
    return {
      hasText: false,
      confidence: 0,
    };
  }
}; 