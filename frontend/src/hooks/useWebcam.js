import { useState, useRef, useEffect, useCallback } from 'react';

export const useWebcam = (autoStart = true) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setHasPermission(true);
    } catch (err) {
      console.error('Webcam initialization failed:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Camera access permission denied. Please allow camera access in your browser settings.'
        : `Camera error: ${err.message}`
      );
      setHasPermission(false);
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Capture current video frame as base64 JPEG
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !isActive) {
      return null;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Draw frame (normal, unmirrored on canvas for computer vision)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [isActive]);

  // Burst capture: captures N frames spaced by intervalMs for liveness/angles
  const captureBurst = useCallback(async (count = 15, intervalMs = 200) => {
    const frames = [];
    for (let i = 0; i < count; i++) {
      const f = captureFrame();
      if (f) frames.push(f);
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
    return frames;
  }, [captureFrame]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  return {
    videoRef,
    isActive,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    captureFrame,
    captureBurst
  };
};
