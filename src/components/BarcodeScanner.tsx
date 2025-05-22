import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { X, CameraOff, AlertCircle, Loader, Camera, CheckCircle, Square } from 'lucide-react';
import Quagga from '@ericblade/quagga2';
import { searchOpenFoodFacts, extractBarcodeFromImage } from '../api/supabase';
import { validateBarcode, getBarcodeFormat, calculateBarcodeConfidence, attemptBarcodeRepair, areSimilarBarcodes } from '../utils/barcodeUtils';

interface BarcodeScannerProps {
  onClose: () => void;
  onBarcodeDetected: (barcode: string, productName: string | null) => void;
}

// State and actions for reducer
interface ScannerState {
  scanActive: boolean;
  hasCamera: boolean;
  hasCameraPermission: 'unknown' | 'granted' | 'denied';
  isProcessing: boolean;
  isSearching: boolean;
  searchFailed: boolean;
  currentBarcode: string | null;
  error: string | null;
  barcodeConfidence: number;
  detectionCount: number;
  lastScans: string[];
  isCapturing: boolean;
  frameUrl: string | null;
  cameraReady: boolean;
}

type ScannerAction =
  | { type: 'CAMERA_PERMISSION_GRANTED' }
  | { type: 'CAMERA_PERMISSION_DENIED' }
  | { type: 'CAMERA_INITIALIZED' }
  | { type: 'CAMERA_INITIALIZATION_FAILED'; error: string }
  | { type: 'CAMERA_READY' }
  | { type: 'START_CAPTURING' }
  | { type: 'FRAME_CAPTURED'; frameUrl: string }
  | { type: 'BARCODE_DETECTION'; barcode: string }
  | { type: 'BARCODE_CONFIRMED'; barcode: string }
  | { type: 'PRODUCT_SEARCH_START' }
  | { type: 'PRODUCT_SEARCH_SUCCESS' }
  | { type: 'PRODUCT_SEARCH_FAILED' }
  | { type: 'RESET_SCANNER' }
  | { type: 'PROCESSING_FAILED'; error: string };

// Reducer function for scanner state
function scannerReducer(state: ScannerState, action: ScannerAction): ScannerState {
  switch (action.type) {
    case 'CAMERA_PERMISSION_GRANTED':
      return { ...state, hasCameraPermission: 'granted' };
    case 'CAMERA_PERMISSION_DENIED':
      return { ...state, hasCameraPermission: 'denied', hasCamera: false };
    case 'CAMERA_INITIALIZED':
      return {
        ...state,
        scanActive: true,
        hasCamera: true,
        error: null
      };
    case 'CAMERA_READY':
      return {
        ...state,
        cameraReady: true
      };
    case 'CAMERA_INITIALIZATION_FAILED':
      return {
        ...state,
        scanActive: false,
        hasCamera: false,
        error: action.error
      };
    case 'START_CAPTURING':
      return {
        ...state,
        isCapturing: true,
        frameUrl: null
      };
    case 'FRAME_CAPTURED':
      return {
        ...state,
        isCapturing: false,
        frameUrl: action.frameUrl,
        isProcessing: true
      };
    case 'BARCODE_DETECTION':
      return {
        ...state,
        detectionCount: state.detectionCount + 1,
        currentBarcode: action.barcode
      };
    case 'BARCODE_CONFIRMED':
      return {
        ...state,
        isProcessing: true,
        currentBarcode: action.barcode
      };
    case 'PRODUCT_SEARCH_START':
      return { ...state, isSearching: true, searchFailed: false };
    case 'PRODUCT_SEARCH_SUCCESS':
      return { ...state, isSearching: false, isProcessing: false };
    case 'PRODUCT_SEARCH_FAILED':
      return { ...state, isSearching: false, searchFailed: true, isProcessing: false };
    case 'RESET_SCANNER':
      return {
        ...state,
        isProcessing: false,
        isSearching: false,
        searchFailed: false,
        currentBarcode: null,
        detectionCount: 0,
        lastScans: [],
        isCapturing: false,
        frameUrl: null
      };
    case 'PROCESSING_FAILED':
      return { 
        ...state, 
        isProcessing: false, 
        error: action.error,
        isCapturing: false 
      };
    default:
      return state;
  }
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onClose, onBarcodeDetected }) => {
  // Use reducer for state management
  const [state, dispatch] = useReducer(scannerReducer, {
    scanActive: false,
    hasCamera: true,
    hasCameraPermission: 'unknown',
    isProcessing: false,
    isSearching: false,
    searchFailed: false,
    currentBarcode: null,
    error: null,
    barcodeConfidence: 0,
    detectionCount: 0,
    lastScans: [],
    isCapturing: false,
    frameUrl: null,
    cameraReady: false
  });
  
  const [scanSucceeded, setScanSucceeded] = useState(false);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false); // Track if we're already processing
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null); // For debouncing resize events
  const quaggaStreamRef = useRef<MediaStream | null>(null); // Track the active camera stream
  const cameraReadyTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer for camera ready state
  
  // Check if device is mobile
  const isMobile = useCallback(() => {
    return navigator.maxTouchPoints > 1 || 
           /Mobi|Android/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  }, []);
  
  // Check camera permissions
  const checkCameraPermissions = useCallback(async () => {
    try {
      // First check if the browser supports the permissions API
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        if (permission.state === 'granted') {
          dispatch({ type: 'CAMERA_PERMISSION_GRANTED' });
          return true;
        } else if (permission.state === 'denied') {
          dispatch({ type: 'CAMERA_PERMISSION_DENIED' });
          return false;
        }
        // If 'prompt', we'll try to access the camera anyway
      }
      
      // Try to access the camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment"
        } 
      });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      dispatch({ type: 'CAMERA_PERMISSION_GRANTED' });
      return true;
    } catch (err) {
      console.error("Camera permission error:", err);
      dispatch({ type: 'CAMERA_PERMISSION_DENIED' });
      return false;
    }
  }, []);

  // Convert a data URL to a File object
  const dataUrlToFile = useCallback((dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }, []);

  // Capture a frame from the video feed
  const captureFrame = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      console.log('Attempting to capture frame from video feed');
      dispatch({ type: 'START_CAPTURING' });
      
      if (!scannerRef.current) {
        console.error('Scanner reference is null');
        dispatch({ type: 'PROCESSING_FAILED', error: 'Scanner is not ready' });
        processingRef.current = false;
        resolve(null);
        return;
      }
      
      // Find the video element
      const videoElements = scannerRef.current.getElementsByTagName('video');
      if (!videoElements.length) {
        console.error('No video element found');
        dispatch({ type: 'PROCESSING_FAILED', error: 'Camera view is not available' });
        processingRef.current = false;
        resolve(null);
        return;
      }
      
      const video = videoElements[0];
      
      // Create a canvas to capture the frame
      const canvas = document.createElement('canvas');
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}, video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      
      // Draw the current video frame to the canvas
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Failed to get canvas context');
        dispatch({ type: 'PROCESSING_FAILED', error: 'Could not prepare image' });
        processingRef.current = false;
        resolve(null);
        return;
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert the canvas to a data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // If we got a data URL, resolve with it
      if (dataUrl && dataUrl.length > 100) {
        console.log('Successfully captured frame');
        dispatch({ type: 'FRAME_CAPTURED', frameUrl: dataUrl });
        resolve(dataUrl);
      } else {
        console.error('Failed to capture frame - invalid data URL');
        dispatch({ type: 'PROCESSING_FAILED', error: 'Failed to capture image' });
        processingRef.current = false;
        resolve(null);
      }
    });
  }, []);

  // Handle the detection of barcode in video frames
  const handleQuaggaProcessed = useCallback((result: any) => {
    // Only proceed with detection if camera is ready and not already processing
    if (!state.cameraReady || processingRef.current || scanSucceeded) {
      return;
    }
    
    // Check if a barcode was located in this frame
    if (result && result.boxes && result.boxes.length > 0) {
      console.log('Quagga detected possible barcode regions in frame');
      
      // We found a potential barcode, capture the frame for processing
      if (!processingRef.current) {
        processingRef.current = true;
        captureFrame().catch(error => {
          console.error('Error capturing frame after barcode detection:', error);
          processingRef.current = false;
        });
      }
    }
  }, [state.cameraReady, scanSucceeded, captureFrame]);

  // Function to properly clean up camera resources
  const stopScanner = useCallback(() => {
    if (Quagga) {
      console.log('Stopping Quagga and releasing camera resources...');
      
      try {
        // Remove event handler first
        Quagga.offProcessed(handleQuaggaProcessed);
        
        // Stop Quagga processing
        Quagga.stop();
        
        // If we have stored the stream reference, stop all tracks
        if (quaggaStreamRef.current) {
          quaggaStreamRef.current.getTracks().forEach(track => {
            console.log('Stopping track:', track.kind);
            track.stop();
          });
          quaggaStreamRef.current = null;
        }
        
        // Find all video elements added by Quagga and stop their tracks
        if (scannerRef.current) {
          const videoElements = scannerRef.current.getElementsByTagName('video');
          
          for (let i = 0; i < videoElements.length; i++) {
            const video = videoElements[i];
            
            // Get the media stream from the video element
            const stream = video.srcObject as MediaStream;
            
            if (stream) {
              // Get all tracks and stop them
              const tracks = stream.getTracks();
              tracks.forEach(track => {
                console.log('Stopping video track:', track.kind);
                track.stop();
              });
              
              // Clear the source object
              video.srcObject = null;
            }
          }
        }
      } catch (err) {
        console.error('Error while stopping camera:', err);
      }
    }
    
    // Also clear camera ready timer if it exists
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    
    // Reset camera ready state
    dispatch({ type: 'RESET_SCANNER' });
  }, [handleQuaggaProcessed]);
  
  // Initialize the barcode scanner
  const initializeScanner = useCallback(async () => {
    if (!scannerRef.current) {
      console.error('Scanner reference is null during initialization');
      dispatch({ 
        type: 'CAMERA_INITIALIZATION_FAILED',
        error: 'Scanner element is not ready' 
      });
      return;
    }
    
    // Clean up first
    stopScanner();
    
    // Clear any existing state
    processingRef.current = false;
    dispatch({ type: 'RESET_SCANNER' });
    setScanSucceeded(false);

    try {
      // Check camera permissions first
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) {
        return;
      }

      console.log('Initializing Quagga scanner...');
      
      // Determine if running on mobile device
      const isMobileDevice = isMobile();
      console.log(`Detected device type: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
      
      // Configure scanner based on device type
      const scannerConfig = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: isMobileDevice ? {min: 640, ideal: 1280, max: 1920} : window.innerWidth,
            height: isMobileDevice ? {min: 480, ideal: 720, max: 1080} : window.innerHeight,
            facingMode: "environment",
            aspectRatio: isMobileDevice ? {min: 1, max: 2} : undefined
          },
          area: { // Define scanning area as a percentage
            top: "20%",
            right: "10%",
            left: "10%",
            bottom: "20%"
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: isMobileDevice // Better for mobile performance
        },
        numOfWorkers: navigator.hardwareConcurrency ? Math.max(Math.min(navigator.hardwareConcurrency - 1, 2), 1) : 2,
        frequency: 10, // Frame processing frequency
        decoder: {
          // Only commenting these out to ensure view-only mode works correctly, uncomment for actual scanning
          readers: []
        },
        locate: true // Enable barcode localization
      };
      
      try {
        // Initialize Quagga with the configuration
        await Quagga.init(scannerConfig);
        
        // Start the scanner
        Quagga.start();
        console.log('Quagga scanner started successfully');
        dispatch({ type: 'CAMERA_INITIALIZED' });
        
        // Store the active stream reference - safely check for CameraAccess and getActiveStream method
        try {
          // Check if CameraAccess exists and has getActiveStream method
          if (Quagga.CameraAccess && typeof Quagga.CameraAccess.getActiveStream === 'function') {
            const stream = Quagga.CameraAccess.getActiveStream();
            if (stream) {
              quaggaStreamRef.current = stream;
              console.log('Camera stream stored in ref');
            } else {
              console.warn('No active stream found after Quagga.start()');
            }
          } else {
            console.warn('Quagga.CameraAccess.getActiveStream is not available in this version');
            // Find video elements directly and store their streams
            if (scannerRef.current) {
              const videoElements = scannerRef.current.getElementsByTagName('video');
              if (videoElements.length > 0) {
                quaggaStreamRef.current = videoElements[0].srcObject as MediaStream;
                console.log('Camera stream stored from video element');
              }
            }
          }
        } catch (streamError) {
          console.warn('Error accessing camera stream:', streamError);
          // Continue without storing the stream reference
        }
        
        // Set up the processed handler for barcode detection
        Quagga.onProcessed(handleQuaggaProcessed);
        console.log('Attached onProcessed handler for barcode detection');
        
        // Fix styling for video and canvas elements
        if (scannerRef.current) {
          const videoEls = scannerRef.current.getElementsByTagName('video');
          const canvasEls = scannerRef.current.getElementsByTagName('canvas');
          
          // Apply styles to video elements
          if (videoEls.length > 0) {
            for (let i = 0; i < videoEls.length; i++) {
              Object.assign(videoEls[i].style, {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: '0',
                left: '0'
              });
            }
          }
          
          // Apply styles to canvas elements
          if (canvasEls.length > 0) {
            for (let i = 0; i < canvasEls.length; i++) {
              Object.assign(canvasEls[i].style, {
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: '0',
                left: '0'
              });
            }
          }
        }
        
        // Set a delay before enabling camera ready state
        // This gives the camera time to properly initialize and display
        cameraReadyTimerRef.current = setTimeout(() => {
          dispatch({ type: 'CAMERA_READY' });
          console.log('Camera ready for processing');
        }, 1500);
        
      } catch (quaggaInitError) {
        console.error("Error during Quagga initialization:", quaggaInitError);
        dispatch({ 
          type: 'CAMERA_INITIALIZATION_FAILED',
          error: quaggaInitError instanceof Error ? quaggaInitError.message : 'Failed to initialize camera' 
        });
      }
      
    } catch (err) {
      console.error("Error initializing scanner:", err);
      dispatch({ 
        type: 'CAMERA_INITIALIZATION_FAILED',
        error: err instanceof Error ? err.message : 'Failed to initialize camera' 
      });
    }
  }, [checkCameraPermissions, isMobile, handleQuaggaProcessed, stopScanner]);

  // Process the captured frame for barcode detection
  const processFrame = useCallback(async () => {
    if (!state.frameUrl) {
      processingRef.current = false;
      return;
    }
    
    try {
      console.log('Processing captured frame with Gemini...');
      
      // Convert the data URL to a File object
      const frameFile = dataUrlToFile(state.frameUrl, 'barcode-scan.jpg');
      
      // Use the Gemini API to extract the barcode
      const barcode = await extractBarcodeFromImage(frameFile);
      
      if (barcode) {
        console.log(`Barcode detected by Gemini: ${barcode}`);
        dispatch({ type: 'BARCODE_DETECTION', barcode });
        dispatch({ type: 'BARCODE_CONFIRMED', barcode });
        
        // Start product search
        dispatch({ type: 'PRODUCT_SEARCH_START' });
        
        try {
          // Look up the product name using the Open Food Facts API
          const productName = await searchOpenFoodFacts(barcode);
          
          if (productName) {
            console.log(`Product found: ${productName}`);
            dispatch({ type: 'PRODUCT_SEARCH_SUCCESS' });
            onBarcodeDetected(barcode, productName);
            setScanSucceeded(true);
          } else {
            console.log(`Product with barcode ${barcode} not found`);
            dispatch({ type: 'PRODUCT_SEARCH_FAILED' });
            
            // Wait a moment to show the failure message, then reset
            setTimeout(() => {
              dispatch({ type: 'RESET_SCANNER' });
              processingRef.current = false;
            }, 2000);
          }
        } catch (error) {
          console.error("Error processing barcode:", error);
          dispatch({ type: 'PRODUCT_SEARCH_FAILED' });
          
          // Wait a moment to show the failure message, then reset
          setTimeout(() => {
            dispatch({ type: 'RESET_SCANNER' });
            processingRef.current = false;
          }, 2000);
        }
      } else {
        console.log('No barcode detected by Gemini');
        dispatch({ type: 'PROCESSING_FAILED', error: 'No barcode detected. Please try again.' });
        
        // Reset the processing flag after a delay
        setTimeout(() => {
          dispatch({ type: 'RESET_SCANNER' });
          processingRef.current = false;
        }, 1500);
      }
    } catch (error) {
      console.error('Error processing frame:', error);
      dispatch({ type: 'PROCESSING_FAILED', error: 'Failed to process image. Please try again.' });
      
      // Reset the processing flag after a delay
      setTimeout(() => {
        dispatch({ type: 'RESET_SCANNER' });
        processingRef.current = false;
      }, 1500);
    }
  }, [state.frameUrl, dataUrlToFile, onBarcodeDetected]);

  // Handle the manual capture button click
  const handleCaptureButtonClick = useCallback(async () => {
    if (state.isProcessing || state.isSearching || scanSucceeded) {
      return; // Prevent multiple captures while processing
    }
    
    processingRef.current = true;
    
    try {
      // Capture frame from video feed
      await captureFrame();
    } catch (error) {
      console.error('Error capturing frame:', error);
      dispatch({ type: 'PROCESSING_FAILED', error: 'Failed to capture image' });
      processingRef.current = false;
    }
  }, [state.isProcessing, state.isSearching, scanSucceeded, captureFrame]);

  // Handle "Scan Next Item" button click
  const handleScanNextItem = useCallback(() => {
    setScanSucceeded(false);
    processingRef.current = false;
    dispatch({ type: 'RESET_SCANNER' });
    
    // Re-initialize the scanner
    setTimeout(() => {
      initializeScanner();
    }, 300);
  }, [initializeScanner]);

  // Debounced window resize handler
  const handleResize = useCallback(() => {
    // Cancel any pending resize
    if (resizeTimeout.current) {
      clearTimeout(resizeTimeout.current);
    }
    
    // Set a new timeout
    resizeTimeout.current = setTimeout(() => {
      if (state.scanActive) {
        stopScanner();
        
        // Restart scanner after a short delay
        setTimeout(() => {
          initializeScanner();
        }, 300);
      }
    }, 500); // 500ms debounce time
  }, [state.scanActive, initializeScanner, stopScanner]);

  // Process the frame when it's captured
  useEffect(() => {
    if (state.frameUrl && processingRef.current) {
      processFrame();
    }
  }, [state.frameUrl, processFrame]);

  // Initialize scanner on mount
  useEffect(() => {
    console.log('Initializing barcode scanner...');
    initializeScanner();
    
    // Set up resize handler with debouncing
    window.addEventListener('resize', handleResize);
    
    // Set up orientation change handler
    window.addEventListener('orientationchange', () => {
      console.log('Orientation changed, reinitializing scanner...');
      // Stop scanner
      stopScanner();
      
      // Give time for UI to adjust
      setTimeout(() => {
        // Reinitialize scanner
        initializeScanner();
      }, 500);
    });
    
    // Cleanup function
    return () => {
      // Clean up the resize handler
      window.removeEventListener('resize', handleResize);
      
      // Clean up orientation change handler
      window.removeEventListener('orientationchange', () => {});
      
      // Clean up any pending timeout
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
      
      if (cameraReadyTimerRef.current) {
        clearTimeout(cameraReadyTimerRef.current);
      }
      
      // Make sure we stop Quagga and release the camera
      stopScanner();
    };
  }, [initializeScanner, handleResize, stopScanner]);
  
  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Render a different UI depending on camera status
  const renderContent = () => {
    if (!state.hasCamera || state.hasCameraPermission === 'denied') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
          <CameraOff size={48} className="mb-4 text-red-500" />
          <h3 className="text-xl font-medium mb-2">Camera not available</h3>
          <p className="mb-6">
            {state.hasCameraPermission === 'denied' 
              ? "Please allow camera access in your browser settings and try again."
              : "Your device doesn't have a camera or it's currently in use by another app."}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      );
    }
    
    if (state.error && state.error !== 'No barcode detected. Please try again.' && !state.scanActive) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
          <AlertCircle size={48} className="mb-4 text-yellow-500" />
          <h3 className="text-xl font-medium mb-2">Camera Error</h3>
          <p className="mb-6">{state.error}</p>
          <button
            onClick={() => initializeScanner()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg mr-2"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg mt-2"
          >
            Close
          </button>
        </div>
      );
    }
    
    return (
      <div className="relative h-full w-full overflow-hidden">
        {/* Scanner container */}
        <div 
          ref={scannerRef} 
          className="absolute inset-0 bg-black overflow-hidden"
          style={{ width: '100%', height: '100%' }}
        >
          {/* This is where Quagga will insert the video element */}
        </div>
        
        {/* Enhanced scanning guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative border-2 border-white border-opacity-70 rounded-lg w-[300px] h-[200px]">
            {/* Corner markers */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-md"></div>
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-md"></div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-md"></div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-md"></div>
            
            {/* Scanning line animation - only show when not processing */}
            {state.scanActive && !state.isProcessing && !state.isCapturing && !scanSucceeded && (
              <div className="absolute left-0 right-0 h-0.5 bg-blue-500 opacity-80" 
                   style={{ 
                     animation: 'scanLineMove 2s linear infinite',
                     top: '50%'
                   }}>
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="absolute top-8 left-0 right-0 flex justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium text-white ${
            scanSucceeded 
              ? 'bg-green-600/80'
              : state.searchFailed 
                ? 'bg-red-600/80' 
                : state.isSearching 
                  ? 'bg-blue-600/80' 
                  : state.isCapturing
                    ? 'bg-blue-600/80'
                    : state.isProcessing
                      ? 'bg-green-600/80'
                      : 'bg-black/60'
          }`}>
            {scanSucceeded && <CheckCircle size={16} className="inline-block mr-1" />}
            {state.searchFailed && <AlertCircle size={16} className="inline-block mr-1" />}
            {state.isSearching && <Loader size={16} className="inline-block mr-1 animate-spin" />}
            {state.isCapturing && <Loader size={16} className="inline-block mr-1 animate-spin" />}
            {state.isProcessing && !state.isSearching && !scanSucceeded && <Loader size={16} className="inline-block mr-1 animate-spin" />}
            <span>
              {scanSucceeded
                ? `Barcode ${state.currentBarcode} processed successfully!`
                : state.searchFailed 
                  ? 'Product not found, try again' 
                  : state.isSearching 
                    ? `Looking up barcode ${state.currentBarcode}...` 
                    : state.isCapturing
                      ? 'Capturing image...'
                      : state.isProcessing
                        ? 'Analyzing image for barcode...'
                        : 'Position barcode within frame and tap "Capture"'}
            </span>
          </div>
        </div>
        
        {/* Error message if present */}
        {state.error && !state.searchFailed && (
          <div className="absolute top-20 left-0 right-0 flex justify-center">
            <div className="px-4 py-2 rounded-full text-sm font-medium text-white bg-red-600/80">
              <AlertCircle size={16} className="inline-block mr-1" />
              <span>{state.error}</span>
            </div>
          </div>
        )}

        {/* Capture button - only show when not processing and scan hasn't succeeded */}
        {!state.isProcessing && !state.isSearching && !state.isCapturing && !scanSucceeded && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <button 
              onClick={handleCaptureButtonClick}
              className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 p-6 rounded-full shadow-lg flex items-center justify-center"
              aria-label="Capture barcode"
            >
              <Camera size={30} aria-hidden="true" />
            </button>
          </div>
        )}
        
        {/* "Scan Next" button - only show after successful scan */}
        {scanSucceeded && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <button 
              onClick={handleScanNextItem}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-center"
            >
              <Camera size={20} className="mr-2" />
              Scan Next Item
            </button>
          </div>
        )}
        
        {/* Hint text for better user guidance */}
        {!state.isProcessing && !state.isSearching && !state.isCapturing && !scanSucceeded && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-center">
            <div className="text-sm text-white bg-black/60 px-4 py-2 rounded-full">
              Position barcode in box and tap capture
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header with just the close button */}
      <div className="relative z-10 p-4 flex justify-end">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 focus:ring-2 focus:ring-white focus:ring-opacity-50"
          aria-label="Close barcode scanner"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {renderContent()}
      </div>

      {/* Scan indicator at bottom */}
      {state.hasCamera && state.hasCameraPermission !== 'denied' && !state.isSearching && !state.searchFailed && !scanSucceeded && (
        <div className="relative z-10 w-full p-4 flex justify-center">
          <div className="w-48 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white w-16 rounded-full animate-[scanAnimation_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scanAnimation {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes scanLineMove {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;