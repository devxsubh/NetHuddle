"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VideoStreamDisplayProps {
  streamData: ArrayBuffer | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const VideoStreamDisplay = ({
  streamData,
  isLoading = false,
  error = null,
  className = "",
}: VideoStreamDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!streamData || !canvasRef.current) return;

    try {
      // Create image from ArrayBuffer
      const blob = new Blob([streamData], { type: 'image/webp' });
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      // Draw to canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Maintain aspect ratio
        const aspectRatio = img.width / img.height;
        const containerWidth = canvas.parentElement?.clientWidth || canvas.width;
        const containerHeight = canvas.parentElement?.clientHeight || canvas.height;

        let width = containerWidth;
        let height = containerWidth / aspectRatio;

        if (height > containerHeight) {
          height = containerHeight;
          width = containerHeight * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Cleanup
        URL.revokeObjectURL(url);
        setImageUrl(null);
      };
      img.onerror = () => {
        console.error('Failed to load image from stream data');
        URL.revokeObjectURL(url);
        setImageUrl(null);
      };
      img.src = url;
    } catch (error) {
      console.error('Error displaying stream:', error);
    }
  }, [streamData]);

  return (
    <div className={`relative w-full h-full bg-secondary-dark rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
      />

      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/50 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-white text-sm">Loading stream...</p>
          </div>
        </motion.div>
      )}

      {/* Error overlay */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-500/20 flex items-center justify-center"
        >
          <div className="text-center p-4">
            <p className="text-red-500 font-medium">Error</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!streamData && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-secondary-darker">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-16 h-16 mx-auto mb-2 opacity-50"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <p className="text-sm">No stream data</p>
          </div>
        </div>
      )}
    </div>
  );
};

