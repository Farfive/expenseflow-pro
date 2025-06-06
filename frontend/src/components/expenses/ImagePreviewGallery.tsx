/**
 * Image Preview Gallery Component
 * 
 * Uses react-image-gallery for image preview and zoom functionality
 */

import React from 'react';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import { X } from 'lucide-react';

interface ImagePreviewGalleryProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
}

const ImagePreviewGallery: React.FC<ImagePreviewGalleryProps> = ({
  images,
  currentIndex,
  onClose
}) => {
  const galleryImages = images.map((image, index) => ({
    original: image,
    thumbnail: image,
    description: `Receipt ${index + 1}`,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Gallery */}
        <div className="h-full flex items-center justify-center">
          <ImageGallery
            items={galleryImages}
            startIndex={currentIndex}
            showThumbnails={true}
            showFullscreenButton={true}
            showPlayButton={false}
            showIndex={true}
            showBullets={false}
            infinite={false}
            additionalClass="expense-gallery"
            renderCustomControls={() => (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                Receipt Preview
              </div>
            )}
          />
        </div>
      </div>

      <style jsx global>{`
        .expense-gallery .image-gallery-content {
          background: transparent;
        }
        
        .expense-gallery .image-gallery-slide {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .expense-gallery .image-gallery-image {
          max-height: 80vh;
          width: auto;
          object-fit: contain;
        }
        
        .expense-gallery .image-gallery-thumbnails {
          background: rgba(0, 0, 0, 0.8);
          padding: 10px;
        }
        
        .expense-gallery .image-gallery-thumbnail {
          border: 2px solid transparent;
        }
        
        .expense-gallery .image-gallery-thumbnail.active {
          border-color: #3b82f6;
        }
        
        .expense-gallery .image-gallery-thumbnail img {
          height: 60px;
          width: 60px;
          object-fit: cover;
        }
        
        .expense-gallery .image-gallery-left-nav,
        .expense-gallery .image-gallery-right-nav {
          color: white;
          background: rgba(0, 0, 0, 0.5);
        }
        
        .expense-gallery .image-gallery-left-nav:hover,
        .expense-gallery .image-gallery-right-nav:hover {
          background: rgba(0, 0, 0, 0.7);
        }
        
        .expense-gallery .image-gallery-fullscreen-button,
        .expense-gallery .image-gallery-thumbnails-button {
          color: white;
          background: rgba(0, 0, 0, 0.5);
        }
        
        .expense-gallery .image-gallery-fullscreen-button:hover,
        .expense-gallery .image-gallery-thumbnails-button:hover {
          background: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
};

export default ImagePreviewGallery; 