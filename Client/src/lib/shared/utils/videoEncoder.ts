/**
 * Video Frame Encoder Utility
 * Handles capturing and encoding video frames for QUIC streaming
 */

/**
 * Capture a single frame from a video element
 */
export function captureFrame(videoElement: HTMLVideoElement): HTMLCanvasElement | null {
  if (!videoElement || videoElement.readyState < 2) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Encode a canvas frame to ArrayBuffer
 */
export async function encodeFrame(
  canvas: HTMLCanvasElement,
  format: 'webp' | 'jpeg' = 'webp',
  quality: number = 0.8
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode frame'));
          return;
        }

        blob.arrayBuffer().then(resolve).catch(reject);
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Frame capture loop configuration
 */
export interface FrameCaptureConfig {
  fps: number; // Frames per second
  format?: 'webp' | 'jpeg';
  quality?: number;
  onFrame?: (frame: ArrayBuffer) => void;
  onError?: (error: Error) => void;
}

/**
 * Create a frame capture loop
 */
export function createFrameCaptureLoop(
  videoElement: HTMLVideoElement,
  config: FrameCaptureConfig
): () => void {
  const {
    fps,
    format = 'webp',
    quality = 0.8,
    onFrame,
    onError,
  } = config;

  let isRunning = true;
  let lastFrameTime = 0;
  const frameInterval = 1000 / fps;

  const captureFrame = async () => {
    if (!isRunning) return;

    const now = performance.now();
    const elapsed = now - lastFrameTime;

    if (elapsed >= frameInterval) {
      try {
        const canvas = captureFrame(videoElement);
        if (canvas) {
          const frameData = await encodeFrame(canvas, format, quality);
          onFrame?.(frameData);
          lastFrameTime = now;
        }
      } catch (error) {
        onError?.(error as Error);
      }
    }

    if (isRunning) {
      requestAnimationFrame(captureFrame);
    }
  };

  // Start the loop
  requestAnimationFrame(captureFrame);

  // Return stop function
  return () => {
    isRunning = false;
  };
}

/**
 * Get available video devices
 */
export async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error getting video devices:', error);
    return [];
  }
}

/**
 * Get user media stream
 */
export async function getUserMediaStream(
  deviceId?: string,
  constraints?: MediaStreamConstraints
): Promise<MediaStream> {
  const defaultConstraints: MediaStreamConstraints = {
    video: deviceId
      ? { deviceId: { exact: deviceId } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: false,
  };

  return navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);
}

