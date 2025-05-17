import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { X, CameraOff, AlertCircle, Loader, Camera } from 'lucide-react';
import Quagga from '@ericblade/quagga2';
import { searchOpenFoodFacts } from '../api/supabase';
import { validateBarcode, getBarcodeFormat, calculateBarcodeConfidence } from '../utils/barcodeUtils';

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
}

type ScannerAction =
  | { type: 'CAMERA_PERMISSION_GRANTED' }
  | { type: 'CAMERA_PERMISSION_DENIED' }
  | { type: 'CAMERA_INITIALIZED' }
  | { type: 'CAMERA_INITIALIZATION_FAILED'; error: string }
  | { type: 'BARCODE_DETECTION'; barcode: string; confidence: number }
  | { type: 'BARCODE_CONFIRMED'; barcode: string }
  | { type: 'PRODUCT_SEARCH_START' }
  | { type: 'PRODUCT_SEARCH_SUCCESS' }
  | { type: 'PRODUCT_SEARCH_FAILED' }
  | { type: 'RESET_SCANNER' }
  | { type: 'SET_ERROR'; error: string };

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
        error: null,
        detectionCount: 0,
        lastScans: []
      };
    case 'CAMERA_INITIALIZATION_FAILED':
      return {
        ...state,
        scanActive: false,
        hasCamera: false,
        error: action.error
      };
    case 'BARCODE_DETECTION':
      // Add the new scan to our lastScans array (keeping most recent 5)
      const newScans = [...state.lastScans, action.barcode].slice(-5);

      return {
        ...state,
        barcodeConfidence: action.confidence,
        detectionCount: state.detectionCount + 1,
        lastScans: newScans
      };
    case 'BARCODE_CONFIRMED':
      console.log('BARCODE_CONFIRMED action for', action.barcode);
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
      return { ...state, isSearching: false, searchFailed: true };
    case 'RESET_SCANNER':
      return {
        ...state,
        isProcessing: false,
        isSearching: false,
        searchFailed: false,
        currentBarcode: null,
        detectionCount: 0,
        lastScans: []
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
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
    lastScans: []
  });
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const barcodeDetected = useRef(false); // Track if we've already detected a barcode
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null); // For debouncing resize events
  const lastScansRef = useRef<string[]>([]); // Ref to track scans outside of React state flow
  
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
      await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment"
        } 
      });
      
      dispatch({ type: 'CAMERA_PERMISSION_GRANTED' });
      return true;
    } catch (err) {
      console.error("Camera permission error:", err);
      dispatch({ type: 'CAMERA_PERMISSION_DENIED' });
      return false;
    }
  }, []);
  
  // Check if barcode is valid with improved logging
  const isValidBarcode = useCallback((barcode: string): boolean => {
    console.log(`Validating barcode: ${barcode}`);
    return validateBarcode(barcode);
  }, []);
  
  // Check if we have consistent barcode readings
  const hasBarcodeConsensus = useCallback((): string | null => {
    const scans = [...state.lastScans]; // Create a copy of the current scans
    
    console.log('Checking barcode consensus with scans:', scans);
    
    if (scans.length < 3) {
      console.log('Not enough scans for consensus yet');
      return null; // Not enough scans yet
    }
    
    // Count occurrences of each barcode
    const counts: Record<string, number> = {};
    let mostFrequent = '';
    let maxCount = 0;
    
    for (const code of scans) {
      counts[code] = (counts[code] || 0) + 1;
      
      if (counts[code] > maxCount) {
        maxCount = counts[code];
        mostFrequent = code;
      }
    }
    
    console.log('Barcode counts:', counts, 'Most frequent:', mostFrequent, 'Count:', maxCount);
    
    // If the most frequent barcode appears at least 3 times (or in 60% of scans)
    const threshold = Math.max(3, Math.floor(scans.length * 0.6));
    console.log(`Threshold for consensus: ${threshold}/${scans.length}`);
    
    if (maxCount >= threshold) {
      // Check if the barcode is valid
      const isValid = isValidBarcode(mostFrequent);
      console.log(`Validation check for most frequent barcode ${mostFrequent}: ${isValid}`);
      
      if (isValid) {
        console.log(`Barcode consensus reached for ${mostFrequent}`);
        return mostFrequent;
      } else {
        console.log(`Barcode consensus reached but validation failed for ${mostFrequent}`);
      }
    }
    
    console.log('No consensus reached yet');
    return null;
  }, [state.lastScans, isValidBarcode]);
  
  // Initialize the barcode scanner with improved settings
  const initializeScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    
    // Clear any existing state
    barcodeDetected.current = false;
    lastScansRef.current = []; // Reset scans ref
    dispatch({ type: 'RESET_SCANNER' });

    try {
      // Check camera permissions first
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) {
        return;
      }

      console.log('Initializing Quagga barcode scanner...');
      
      // Initialize Quagga with enhanced settings
      await Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment", // Use back camera on mobile devices
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight },
            aspectRatio: { min: 1, max: 2 }
          },
          area: { // Define scanning area as a percentage of the viewport
            top: "20%",    // Reduce the scanning area for more focused scans
            right: "10%",  
            left: "10%",   
            bottom: "20%"
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: navigator.hardwareConcurrency ? Math.max(navigator.hardwareConcurrency - 1, 1) : 2,
        frequency: 10, // Scan frequency in frames
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader",
            "code_128_reader"
          ],
          multiple: false,
          debug: {
            showCanvas: true, // Set to true temporarily for debugging
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false
          }
        },
        locate: true
      });
      
      // Start the scanner
      Quagga.start();
      console.log('Quagga scanner started successfully');
      dispatch({ type: 'CAMERA_INITIALIZED' });
      
      // Fix styling for video and canvas elements
      const videoEls = scannerRef.current.getElementsByTagName('video');
      const canvasEls = scannerRef.current.getElementsByTagName('canvas');
      
      // Apply styles to video elements
      if (videoEls.length > 0) {
        for (let i = 0; i < videoEls.length; i++) {
          Object.assign(videoEls[i].style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute'
          });
        }
      }
      
      // Apply styles to canvas elements
      if (canvasEls.length > 0) {
        for (let i = 0; i < canvasEls.length; i++) {
          Object.assign(canvasEls[i].style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute'
          });
        }
      }
      
      // Set up the barcode detection handler
      Quagga.onProcessed(handleProcessed);
      Quagga.onDetected(handleBarcodeDetection);
      
    } catch (err) {
      console.error("Error initializing Quagga:", err);
      dispatch({ 
        type: 'CAMERA_INITIALIZATION_FAILED',
        error: err instanceof Error ? err.message : 'Failed to initialize camera' 
      });
    }
  }, [checkCameraPermissions]);
  
  // Function to properly clean up camera resources
  const stopScanner = useCallback(() => {
    if (Quagga) {
      console.log('Stopping Quagga and releasing camera resources...');
      
      try {
        // Stop Quagga processing
        Quagga.stop();
        
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
  }, []);

  // Handle processed frames - previously drew yellow and green boxes
  const handleProcessed = useCallback((result: any) => {
    // This is where the boxes were being drawn
    // We've removed that code to eliminate the yellow and green boxes
    
    // We're keeping this empty function to maintain the code structure
    // and avoid breaking any dependencies or function calls
  }, []);
  
  // Handle barcode detection with improved validation
  const handleBarcodeDetection = useCallback(async (result) => {
    // Debug logging for state
    console.log('handleBarcodeDetection called with state:', {
      isProcessing: state.isProcessing,
      isSearching: state.isSearching,
      barcodeDetectedRef: barcodeDetected.current,
      scanActive: state.scanActive,
      detectionCount: state.detectionCount,
      lastScans: state.lastScans
    });
    
    // Ignore if we're already processing
    if (state.isProcessing || state.isSearching || barcodeDetected.current) {
      console.log('Ignoring barcode detection, already processing or detected');
      return;
    }
    
    // Get the barcode value and confidence
    const barcode = result.codeResult.code;
    const scannerConfidence = result.codeResult.confidence || 50; // Use 50 as default if undefined
    
    if (!barcode) {
      console.log('No barcode in result, ignoring');
      return;
    }
    
    // Use the calculateBarcodeConfidence function with either the scanner confidence or a default value
    const confidence = calculateBarcodeConfidence(barcode, scannerConfidence);
    console.log(`Detected barcode: ${barcode} with scanner confidence: ${scannerConfidence}, enhanced confidence: ${confidence}`);
    
    // Store this detection in both state and ref
    dispatch({ 
      type: 'BARCODE_DETECTION', 
      barcode,
      confidence
    });
    
    // Also add to our ref for immediate access
    lastScansRef.current = [...lastScansRef.current, barcode].slice(-5);
    console.log('Updated lastScansRef:', lastScansRef.current);
    
    // Check if we have reached consensus on a valid barcode using both state and ref
    // First try using the ref for immediate access
    let confirmedBarcode = null;
    
    // Check both the ref (for immediate updates) and state (for react lifecycle)
    if (lastScansRef.current.length >= 3) {
      const counts: Record<string, number> = {};
      let mostFrequent = '';
      let maxCount = 0;
      
      for (const code of lastScansRef.current) {
        counts[code] = (counts[code] || 0) + 1;
        if (counts[code] > maxCount) {
          maxCount = counts[code];
          mostFrequent = code;
        }
      }
      
      const threshold = Math.max(3, Math.floor(lastScansRef.current.length * 0.6));
      
      if (maxCount >= threshold && isValidBarcode(mostFrequent)) {
        confirmedBarcode = mostFrequent;
        console.log(`Consensus reached from ref with ${mostFrequent}`);
      }
    }
    
    // If no consensus from ref, try using the hasBarcodeConsensus function
    if (!confirmedBarcode) {
      confirmedBarcode = hasBarcodeConsensus();
    }
    
    if (confirmedBarcode) {
      console.log(`*** CONSENSUS REACHED for barcode: ${confirmedBarcode} ***`);
      
      // Set the detection flag to prevent duplicate processing
      barcodeDetected.current = true;
      
      // Update state with confirmed barcode
      dispatch({ type: 'BARCODE_CONFIRMED', barcode: confirmedBarcode });
      
      // Stop the scanner
      stopScanner();
      
      // Start product search
      dispatch({ type: 'PRODUCT_SEARCH_START' });
      
      try {
        console.log(`Looking up product for barcode: ${confirmedBarcode}`);
        
        // Look up the product name using the Open Food Facts API
        const productName = await searchOpenFoodFacts(confirmedBarcode);
        
        console.log(`Product lookup result for ${confirmedBarcode}:`, productName ? productName : 'Not found');
        
        if (productName) {
          // Product found
          dispatch({ type: 'PRODUCT_SEARCH_SUCCESS' });
          onBarcodeDetected(confirmedBarcode, productName);
        } else {
          console.log(`Product with barcode ${confirmedBarcode} not found`);
          dispatch({ type: 'PRODUCT_SEARCH_FAILED' });
          
          // Wait a moment to show the failure message
          setTimeout(() => {
            barcodeDetected.current = false;
            lastScansRef.current = []; // Clear the ref
            dispatch({ type: 'RESET_SCANNER' });
            
            // Restart the scanner
            initializeScanner();
          }, 2000);
        }
      } catch (error) {
        console.error("Error processing barcode:", error);
        dispatch({ type: 'PRODUCT_SEARCH_FAILED' });
        
        // Wait a moment to show the failure message
        setTimeout(() => {
          barcodeDetected.current = false;
          lastScansRef.current = []; // Clear the ref
          dispatch({ type: 'RESET_SCANNER' });
          
          // Restart the scanner
          initializeScanner();
        }, 2000);
      }
    }
  }, [state.isProcessing, state.isSearching, state.scanActive, state.detectionCount, state.lastScans, hasBarcodeConsensus, onBarcodeDetected, initializeScanner, stopScanner, isValidBarcode]);
  
  // Highlight the detected barcode area
  const highlightDetection = (box: any, color: string = '#00F') => {
    if (!box) return;
    
    const overlay = document.querySelector<HTMLElement>('.drawingBuffer');
    if (!overlay) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = overlay.offsetWidth;
    canvas.height = overlay.offsetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    
    // Draw the box
    ctx.beginPath();
    ctx.moveTo(box[0][0], box[0][1]);
    for (let i = 1; i < box.length; i++) {
      ctx.lineTo(box[i][0], box[i][1]);
    }
    ctx.lineTo(box[0][0], box[0][1]);
    ctx.stroke();
    
    // Add a semi-transparent overlay to indicate processing
    ctx.fillStyle = `${color.slice(0, 7)}33`; // Add 20% opacity
    ctx.fill();
  };
  
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
  
  // Effect to handle closing the scanner and properly releasing resources
  useEffect(() => {
    // Function to handle cleanup when component unmounts or close button is clicked
    return () => {
      // Make sure we stop Quagga and release the camera
      stopScanner();
    };
  }, [stopScanner]);
  
  // Initialize scanner on mount
  useEffect(() => {
    console.log('Initializing barcode scanner...');
    initializeScanner();
    
    // Set up resize handler with debouncing
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      // Clean up the resize handler
      window.removeEventListener('resize', handleResize);
      
      // Clean up any pending timeout
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
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
    
    return (
      <div className="relative h-full w-full overflow-hidden">
        {/* Scanner container */}
        <div 
          ref={scannerRef} 
          className="absolute inset-0 bg-black overflow-hidden"
          style={{ width: '100%', height: '100%' }}
        >
        </div>
        
        {/* Enhanced scanning guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative border-2 border-white border-opacity-70 rounded-lg w-[300px] h-[200px]">
            {/* Corner markers */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-md"></div>
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-md"></div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-md"></div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-md"></div>
            
            {/* Scanning line animation */}
            <div className="absolute left-0 right-0 h-0.5 bg-blue-500 opacity-80" 
                style={{ 
                  animation: 'scanLineMove 2s linear infinite',
                  top: state.detectionCount > 0 ? '50%' : '10%'
                }}>
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="absolute top-8 left-0 right-0 flex justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium text-white ${
            state.searchFailed 
              ? 'bg-red-600/80' 
              : state.isSearching 
                ? 'bg-blue-600/80' 
                : state.detectionCount > 2
                  ? 'bg-green-600/80'
                  : 'bg-black/60'
          }`}>
            {state.searchFailed && <AlertCircle size={16} className="inline-block mr-1" />}
            {state.isSearching && <Loader size={16} className="inline-block mr-1 animate-spin" />}
            <span>
              {state.searchFailed 
                ? 'Product not found, try again' 
                : state.isSearching 
                  ? `Looking up barcode ${state.currentBarcode}...` 
                  : state.detectionCount > 2
                    ? 'Barcode detected, confirming...'
                    : 'Position barcode within the frame'}
            </span>
          </div>
        </div>
        
        {/* Detection counter (visual indicator of progress) */}
        {!state.isSearching && !state.searchFailed && state.detectionCount > 0 && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full ${
                    i < state.detectionCount ? 'bg-green-500' : 'bg-white/30'
                  }`}
                />
              ))}
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
      {state.hasCamera && state.hasCameraPermission !== 'denied' && !state.isSearching && !state.searchFailed && (
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