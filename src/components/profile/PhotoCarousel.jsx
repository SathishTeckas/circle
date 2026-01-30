import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PhotoCarousel({ photos = [], userName = 'User' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!photos || photos.length === 0) {
    return (
      <div className="w-full aspect-[4/5] rounded-2xl flex items-center justify-center" style={{ background: '#FFF3B8' }}>
        <p style={{ color: '#636E72' }}>No photos</p>
      </div>
    );
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (photos.length === 1) {
    return (
      <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden">
        <img
          src={photos[0]}
          alt={userName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden group">
      {/* Main Image */}
      <img
        src={photos[currentIndex]}
        alt={`${userName} - Photo ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {currentIndex < photos.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      
      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {photos.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: idx === currentIndex ? '24px' : '6px',
              background: idx === currentIndex ? '#FFD93D' : 'rgba(255,255,255,0.5)'
            }}
          />
        ))}
      </div>
    </div>
  );
}