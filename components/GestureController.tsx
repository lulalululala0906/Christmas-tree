import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useFrame } from '@react-three/fiber';

interface GestureControllerProps {
  onExplodeChange: (isExploded: boolean) => void;
  onRotationImpulse: (velocity: number) => void;
  isExploded: boolean;
  visible: boolean;
}

export const GestureController: React.FC<GestureControllerProps> = ({
  onExplodeChange,
  onRotationImpulse,
  isExploded,
  visible
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initializing AI...");
  
  // Tracking state
  const handPos = useRef(new THREE.Vector2(0, 0));
  const smoothHandPos = useRef(new THREE.Vector2(0, 0));
  const isHandDetected = useRef(false);
  const lastX = useRef<number | null>(null);
  const lastTime = useRef(0);
  
  // Visual feedback state
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });

  // Initialize MediaPipe
  useEffect(() => {
    const initAI = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "/wasm"
        );
        
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            // Use local model file from public folder
            modelAssetPath: `/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setLandmarker(handLandmarker);
        setLoading(false);
        setStatus("Waiting for camera...");
      } catch (error) {
        console.error("AI Init Error:", error);
        setStatus("AI Load Failed");
        setLoading(false);
      }
    };
    
    initAI();
  }, []);

  // Setup Camera
  useEffect(() => {
    if (!landmarker || !videoRef.current) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
        setStatus("Tracking Active");
      } catch (err) {
        console.error("Camera Error:", err);
        setStatus("Camera Denied");
      }
    };

    startCamera();
  }, [landmarker]);

  // Animation Loop for Cursor Smoothing
  useEffect(() => {
    let animId: number;
    const updateCursor = () => {
      smoothHandPos.current.lerp(handPos.current, 0.15);
      
      setCursor({
        x: smoothHandPos.current.x,
        y: smoothHandPos.current.y,
        visible: isHandDetected.current
      });
      
      animId = requestAnimationFrame(updateCursor);
    };
    updateCursor();
    return () => cancelAnimationFrame(animId);
  }, []);

  const predictWebcam = () => {
    if (!landmarker || !videoRef.current) return;

    const now = performance.now();
    // Cap at 30fps
    if (now - lastTime.current < 33) {
      requestAnimationFrame(predictWebcam);
      return;
    }
    lastTime.current = now;

    const startTimeMs = performance.now();
    const result = landmarker.detectForVideo(videoRef.current, startTimeMs);

    if (result.landmarks && result.landmarks.length > 0) {
      isHandDetected.current = true;
      const landmarks = result.landmarks[0];
      
      // Index finger tip (8) and Thumb tip (4)
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      
      // Calculate normalized position (flipped X because webcam is mirrored)
      const x = 1 - indexTip.x; 
      const y = indexTip.y;
      
      handPos.current.set(x * window.innerWidth, y * window.innerHeight);
      
      // Detect Pinch (distance between thumb and index)
      const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
      const isPinching = distance < 0.08; // Threshold

      // Gesture Logic
      if (isPinching) {
        setStatus("PINCH: Converge");
        onExplodeChange(false); // Form tree
      } else {
        setStatus("OPEN: Explode");
        onExplodeChange(true); // Explode tree
      }

      // Rotation Logic (horizontal movement)
      if (lastX.current !== null) {
        const deltaX = x - lastX.current;
        // Amplify movement
        if (Math.abs(deltaX) > 0.001) {
            onRotationImpulse(deltaX * 12);
        }
      }
      lastX.current = x;

    } else {
      isHandDetected.current = false;
      setStatus("No Hand Detected");
      lastX.current = null;
    }

    requestAnimationFrame(predictWebcam);
  };

  return (
    <>
      {/* Webcam Monitor UI 
          Responsive Positioning Logic:
          - Default (Mobile & Tablet): Top-Left (top-4 left-4). 
            Keeps it far away from bottom-center buttons.
          - Large Desktop (lg: >1024px): Bottom-Right. 
            Only moves to bottom-right when screen is wide enough that center buttons won't touch it.
      */}
      <div 
        className={`
          absolute z-50
          transition-opacity duration-500
          border border-white/20 rounded-lg overflow-hidden bg-black/50 backdrop-blur shadow-[0_0_20px_rgba(0,0,0,0.5)]
          
          /* Mobile & Tablet: Top Left */
          top-4 left-4 
          w-28 h-20 sm:w-32 sm:h-24

          /* Large Desktop: Bottom Right */
          lg:top-auto lg:left-auto lg:bottom-4 lg:right-4 
          lg:w-48 lg:h-36

          ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
         <video 
           ref={videoRef} 
           autoPlay 
           playsInline 
           className="w-full h-full object-cover transform -scale-x-100 opacity-80"
         />
         <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[8px] md:text-[10px] p-1 text-center font-mono truncate">
           {loading ? "Loading AI..." : status}
         </div>
      </div>

      {/* Custom Cursor */}
      {cursor.visible && visible && (
        <div 
          className="fixed w-8 h-8 pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <div className="w-full h-full border-2 border-[#F8D6E5] rounded-full animate-ping absolute opacity-50" />
          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#F8D6E5]" />
        </div>
      )}
    </>
  );
};
