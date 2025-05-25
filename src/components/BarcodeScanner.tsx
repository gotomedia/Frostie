import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { X, CameraOff, AlertCircle, Loader, Camera, CheckCircle, Square } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { searchOpenFoodFacts, extractBarcodeFromImage } from '../api/supabase';
import { validateBarcode, getBarcodeFormat, calculateBarcodeConfidence, attemptBarcodeRepair, areSimilarBarcodes } from '../utils/barcodeUtils';
import useFocusTrap from '../hooks/useFocusTrap';
import { logger } from "@/lib/logger";

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
  const qrCodeRef = useRef<Html5Qrcode | null>(null); // Track the HTML5QrCode scanner
  const cameraReadyTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer for camera ready state
  
  // Use focus trap for accessibility
  const focusTrapRef = useFocusTrap(true);
  
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
      logger.error("Camera permission error:", err);
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
      logger.debug('Attempting to capture frame from video feed');
      dispatch({ type: 'START_CAPTURING' });
      
      if (!scannerRef.current) {
        logger.error('Scanner reference is null');
        dispatch({ type: 'PROCESSING_FAILED', error: 'Scanner is not ready' });
        processingRef.current = false;
        resolve(null);
        return;
      }
      
      // Find the video element
      const videoElements = scannerRef.current.getElementsByTagName('video');
      if (!videoElements.length) {
        logger.error('No video element found');
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
      
      logger.debug(`Canvas dimensions: ${canvas.width}x${canvas.height}, video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      
      // Draw the current video frame to the canvas
      const context = canvas.getContext('2d');
      if (!context) {
        logger.error('Failed to get canvas context');
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
        logger.debug('Successfully captured frame');
        dispatch({ type: 'FRAME_CAPTURED', frameUrl: dataUrl });
        resolve(dataUrl);
      } else {
        logger.error('Failed to capture frame - invalid data URL');
        dispatch({ type: 'PROCESSING_FAILED', error: 'Failed to capture image' });
        processingRef.current = false;
        resolve(null);
      }
    });
  }, []);

  // Function to properly clean up camera resources
  const stopScanner = useCallback(() => {
    if (qrCodeRef.current) {
      logger.debug('Stopping Html5Qrcode scanner and releasing camera resources...');
      
      try {
        qrCodeRef.current.stop().catch(error => {
          logger.error('Error stopping Html5Qrcode scanner:', error);
        });
        qrCodeRef.current = null;
      } catch (err) {
        logger.error('Error while stopping camera:', err);
      }
    }
    
    // Also clear camera ready timer if it exists
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    
    // Reset camera ready state
    dispatch({ type: 'RESET_SCANNER' });
  }, []);
  
  // Initialize the barcode scanner
  const initializeScanner = useCallback(async () => {
    if (!scannerRef.current) {
      logger.error('Scanner reference is null during initialization');
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

      logger.debug('Initializing Html5Qrcode scanner...');
      
      // Determine if running on mobile device
      const isMobileDevice = isMobile();
      logger.debug(`Detected device type: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
      
      // Create an instance of Html5Qrcode
      const html5QrCode = new Html5Qrcode("html5-qrcode-reader");
      qrCodeRef.current = html5QrCode;
      
      const config = {
        fps: 10,
        qrbox: 320,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93
        ],
        rememberLastUsedCamera: true,
        aspectRatio: isMobileDevice ? 1.333 : undefined
      };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Only proceed if camera is ready and not already processing
          if (!state.cameraReady || processingRef.current || scanSucceeded) {
            return;
          }
          
          logger.debug('Html5Qrcode detected barcode:', decodedText);
          processingRef.current = true;
          dispatch({ type: 'BARCODE_DETECTION', barcode: decodedText });
          dispatch({ type: 'BARCODE_CONFIRMED', barcode: decodedText });
          
          // Process the detected barcode
          processBarcode(decodedText);
        },
        () => {
          // QR code scanning is in progress, no need to do anything here
        }
      );
      
      logger.debug('Html5Qrcode scanner started successfully');
      dispatch({ type: 'CAMERA_INITIALIZED' });
      
      // Style the scanner element
      const qrcodeElement = document.getElementById("html5-qrcode-reader");
      if (qrcodeElement) {
        // Apply styles to scanner elements
        const videoElements = qrcodeElement.getElementsByTagName('video');
        if (videoElements.length > 0) {
          const video = videoElements[0];
          Object.assign(video.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: '0',
            left: '0'
          });
        }
      }
      
      // Set a delay before enabling camera ready state
      // This gives the camera time to properly initialize and display
      cameraReadyTimerRef.current = setTimeout(() => {
        dispatch({ type: 'CAMERA_READY' });
        logger.debug('Camera ready for processing');
      }, 1500);
      
    } catch (err) {
      logger.error("Error initializing scanner:", err);
      dispatch({ 
        type: 'CAMERA_INITIALIZATION_FAILED',
        error: err instanceof Error ? err.message : 'Failed to initialize camera' 
      });
    }
  }, [checkCameraPermissions, isMobile, stopScanner, state.cameraReady, scanSucceeded]);

  // Process the detected barcode
  const processBarcode = useCallback(async (barcode: string) => {
    try {
      logger.debug(`Processing detected barcode: ${barcode}`);
      
      // Start product search
      dispatch({ type: 'PRODUCT_SEARCH_START' });
      
      // Look up the product name using the Open Food Facts API
      const productName = await searchOpenFoodFacts(barcode);
      
      if (productName) {
        logger.debug(`Product found: ${productName}`);
        dispatch({ type: 'PRODUCT_SEARCH_SUCCESS' });
        onBarcodeDetected(barcode, productName);
        setScanSucceeded(true);
      } else {
        logger.debug(`Product with barcode ${barcode} not found`);
        dispatch({ type: 'PRODUCT_SEARCH_FAILED' });
        
        // Wait a moment to show the failure message, then reset
        setTimeout(() => {
          dispatch({ type: 'RESET_SCANNER' });
          processingRef.current = false;
        }, 2000);
      }
    } catch (error) {
      logger.error("Error processing barcode:", error);
      dispatch({ type: 'PRODUCT_SEARCH_FAILED' });
      
      // Wait a moment to show the failure message, then reset
      setTimeout(() => {
        dispatch({ type: 'RESET_SCANNER' });
        processingRef.current = false;
      }, 2000);
    }
  }, [onBarcodeDetected]);

  // Process the captured frame for barcode detection
  const processFrame = useCallback(async () => {
    if (!state.frameUrl) {
      processingRef.current = false;
      return;
    }
    
    try {
      logger.debug('Processing captured frame with Gemini...');
      
      // Convert the data URL to a File object
      const frameFile = dataUrlToFile(state.frameUrl, 'barcode-scan.jpg');
      
      // Use the Gemini API to extract the barcode
      const barcode = await extractBarcodeFromImage(frameFile);
      
      if (barcode) {
        logger.debug(`Barcode detected by Gemini: ${barcode}`);
        dispatch({ type: 'BARCODE_DETECTION', barcode });
        dispatch({ type: 'BARCODE_CONFIRMED', barcode });
        
        // Process the detected barcode
        await processBarcode(barcode);
      } else {
        logger.debug('No barcode detected by Gemini');
        dispatch({ type: 'PROCESSING_FAILED', error: 'No barcode detected. Please try again.' });
        
        // Reset the processing flag after a delay
        setTimeout(() => {
          dispatch({ type: 'RESET_SCANNER' });
          processingRef.current = false;
        }, 1500);
      }
    } catch (error) {
      logger.error('Error processing frame:', error);
      dispatch({ type: 'PROCESSING_FAILED', error: 'Failed to process image. Please try again.' });
      
      // Reset the processing flag after a delay
      setTimeout(() => {
        dispatch({ type: 'RESET_SCANNER' });
        processingRef.current = false;
      }, 1500);
    }
  }, [state.frameUrl, dataUrlToFile, processBarcode]);

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
      logger.error('Error capturing frame:', error);
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
    logger.debug('Initializing barcode scanner...');
    
    // Add a div to hold the scanner before initialization
    const scannerDiv = document.createElement('div');
    scannerDiv.id = 'html5-qrcode-reader';
    scannerDiv.style.width = '100%';
    scannerDiv.style.height = '100%';
    
    // Append the div to the scanner ref
    if (scannerRef.current) {
      scannerRef.current.appendChild(scannerDiv);
    }
    
    // Initialize the scanner
    initializeScanner();
    
    // Set up resize handler with debouncing
    window.addEventListener('resize', handleResize);
    
    // Set up orientation change handler
    window.addEventListener('orientationchange', () => {
      logger.debug('Orientation changed, reinitializing scanner...');
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
      
      // Make sure we stop the scanner and release the camera
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
          <CameraOff size={48} className="mb-4 text-red-500" aria-hidden="true" />
          <h3 className="text-xl font-medium mb-2">Camera not available</h3>
          <p className="mb-6">
            {state.hasCameraPermission === 'denied' 
              ? "Please allow camera access in your browser settings and try again."
              : "Your device doesn't have a camera or it's currently in use by another app."}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Close
          </button>
        </div>
      );
    }
    
    if (state.error && state.error !== 'No barcode detected. Please try again.' && !state.scanActive) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
          <AlertCircle size={48} className="mb-4 text-yellow-500" aria-hidden="true" />
          <h3 className="text-xl font-medium mb-2">Camera Error</h3>
          <p className="mb-6">{state.error}</p>
          <button
            onClick={() => initializeScanner()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg mr-2 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg mt-2 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none"
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
          aria-live="polite"
          aria-atomic="true"
        >
          {/* This is where Html5Qrcode will insert the video element */}
        </div>

        {/* Status message */}
        <div className="absolute top-8 left-0 right-0 flex justify-center" aria-live="assertive">
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
            {scanSucceeded && <CheckCircle size={16} className="inline-block mr-1" aria-hidden="true" />}
            {state.searchFailed && <AlertCircle size={16} className="inline-block mr-1" aria-hidden="true" />}
            {state.isSearching && <Loader size={16} className="inline-block mr-1 animate-spin" aria-hidden="true" />}
            {state.isCapturing && <Loader size={16} className="inline-block mr-1 animate-spin" aria-hidden="true" />}
            {state.isProcessing && !state.isSearching && !scanSucceeded && <Loader size={16} className="inline-block mr-1 animate-spin" aria-hidden="true" />}
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
                        : 'Position barcode within frame to scan'}
            </span>
          </div>
        </div>
        
        {/* Error message if present */}
        {state.error && !state.searchFailed && (
          <div className="absolute top-20 left-0 right-0 flex justify-center" role="alert">
            <div className="px-4 py-2 rounded-full text-sm font-medium text-white bg-red-600/80">
              <AlertCircle size={16} className="inline-block mr-1" aria-hidden="true" />
              <span>{state.error}</span>
            </div>
          </div>
        )}

        {/* Capture button - only show when not processing and scan hasn't succeeded */}
        {!state.isProcessing && !state.isSearching && !state.isCapturing && !scanSucceeded && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <button 
              onClick={handleCaptureButtonClick}
              className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 p-6 rounded-full shadow-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none"
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
              className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Camera size={20} className="mr-2" aria-hidden="true" />
              Scan Next Item
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scanner-title"
      ref={focusTrapRef}
    >
      {/* Header with just the close button */}
      <div className="relative z-10 p-4 flex justify-between items-center">
        <h2 id="barcode-scanner-title" className="text-white text-lg font-medium sr-only">Barcode Scanner</h2>
        <div></div> {/* Empty div for flex spacing */}
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-50"
          aria-label="Close barcode scanner"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {renderContent()}
      </div>

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