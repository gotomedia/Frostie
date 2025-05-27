import React from 'react';
import { useState, useRef, useEffect } from "react";
import { Mic, Send, ScanBarcode, ImagePlus, Loader, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import BarcodeScanner from "./BarcodeScanner";
import { logger } from "@/lib/logger";

interface UniversalInputBarProps {
  onSubmit: (value: string) => Promise<void> | void;
  onImageUpload?: (file: File) => Promise<void> | void;
  onBarcodeScanned?: (barcode: string) => void;
  onVoiceInput?: (transcript: string) => void;
  placeholder?: string;
}

// Voice recording states
type VoiceState = 'inactive' | 'recording' | 'processing';

const UniversalInputBar: React.FC<UniversalInputBarProps> = ({
  onSubmit,
  onImageUpload,
  onBarcodeScanned,
  onVoiceInput,
  placeholder = "Add item to freezer..."
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('inactive');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Speech recognition setup
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');
  
  // Browser compatibility check for SpeechRecognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasSpeechRecognition = !!SpeechRecognition;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsTyping(value.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading && !isUploading && !isParsing) {
      try {
        setIsLoading(true);
        setIsParsing(true);
        await onSubmit(inputValue.trim());
        setInputValue('');
        setIsTyping(false);
      } catch (error) {
        logger.error('Error submitting input:', error);
      } finally {
        setIsLoading(false);
        setIsParsing(false);
      }
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onImageUpload) {
      const file = files[0];
      setSelectedFile(file);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Small delay at 100% before completing
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            setIsParsing(true); // Start parsing animation
            setIsTyping(true); // Show send button instead of voice input
            onImageUpload(file)
              .finally(() => {
                setIsParsing(false); // End parsing animation regardless of result
                setIsTyping(false); // Reset typing state if no text was entered
                setSelectedFile(null); // Clear selected file
              });
            e.target.value = '';
          }, 300);
        }
        setUploadProgress(Math.min(progress, 100));
      }, 200);
    }
  };

  const handleBarcodeScanning = () => {
    if (onBarcodeScanned) {
      setShowBarcodeScanner(true);
    }
  };

  // Handle barcode detection from the scanner
  const handleBarcodeDetected = async (barcode: string, productName: string | null) => {
    setShowBarcodeScanner(false);
    
    // If product name was already found, use it
    if (productName) {
      logger.debug(`Product found: ${productName}`);
      setIsParsing(true);
      setIsTyping(true);
      
      try {
        await onSubmit(productName);
      } catch (error) {
        logger.error('Error submitting product from barcode:', error);
      } finally {
        setIsParsing(false);
        setIsTyping(false);
      }
    } 
    // Otherwise process the barcode directly
    else if (onBarcodeScanned) {
      logger.debug(`Processing barcode: ${barcode}`);
      setIsParsing(true);
      setIsTyping(true);
      
      try {
        onBarcodeScanned(barcode);
      } finally {
        setTimeout(() => {
          setIsParsing(false);
          setIsTyping(false);
        }, 1000);
      }
    }
  };

  // Initialize and start speech recognition
  const startVoiceRecognition = () => {
    if (!hasSpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please try using Chrome or Edge.');
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Configure recognition
      recognition.continuous = true; // Keep listening until explicitly stopped
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Set up event handlers
      recognition.onstart = () => {
        logger.debug('Voice recognition started');
        setVoiceState('recording');
        transcriptRef.current = ''; // Reset transcript ref
      };
      
      recognition.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        
        logger.debug('Transcript updated:', currentTranscript);
        transcriptRef.current = currentTranscript; // Store in ref for access when stopping
      };
      
      recognition.onerror = (event) => {
        logger.error('Speech recognition error:', event.error);
        // No alert for no-speech error, just reset UI
        setVoiceState('inactive');
      };
      
      recognition.onend = () => {
        logger.debug('Voice recognition ended');
        
        // We don't process here - processing happens in stopVoiceRecognition
        // When user clicks the stop button
        
        // If recognition ended without user stopping (e.g., timeout or error)
        // and we're still in recording state, reset the UI
        if (voiceState === 'recording') {
          setVoiceState('inactive');
        }
      };
      
      // Start recognition
      recognition.start();
      
    } catch (error) {
      logger.error('Error starting speech recognition:', error);
      alert('Failed to start speech recognition. Please try again.');
      setVoiceState('inactive');
    }
  };

  // Stop speech recognition and process the transcript
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      // Get the current transcript before stopping
      const currentTranscript = transcriptRef.current;
      logger.debug('Stopping voice recognition with transcript:', currentTranscript);
      
      // Stop the recognition
      recognitionRef.current.stop();
      
      // Process the transcript if it exists
      if (currentTranscript) {
        processVoiceInput(currentTranscript);
      } else {
        // No transcript detected, just reset UI
        setVoiceState('inactive');
      }
    }
  };

  // Process voice input (called after recognition ends with transcript)
  const processVoiceInput = async (text: string) => {
    logger.debug('Processing voice input:', text);
    
    // First update UI to show processing state
    setInputValue(text);
    setIsTyping(true); // Show send button instead of voice input
    setVoiceState('processing');
    
    try {
      // Start parsing animation - wait a bit to ensure UI updates are visible
      setIsParsing(true);
      
      // Small delay to ensure UI updates before processing begins
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Handle the voice input
      if (onVoiceInput) {
        await onVoiceInput(text);
      } else {
        await onSubmit(text);
      }
      
      // Reset input after successful processing
      setInputValue('');
    } catch (error) {
      logger.error('Error processing voice input:', error);
    } finally {
      // Reset all states after a short delay to ensure user sees the completion
      setTimeout(() => {
        setIsParsing(false);
        setIsTyping(false);
        setVoiceState('inactive');
      }, 300);
    }
  };

  const handleVoiceInput = () => {
    if (voiceState === 'inactive') {
      startVoiceRecognition();
    } else if (voiceState === 'recording') {
      stopVoiceRecognition();
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      // Clean up any object URLs created for file previews
      if (selectedFile) {
        URL.revokeObjectURL(URL.createObjectURL(selectedFile));
      }
    };
  }, [selectedFile]);

  // Update placeholder text based on voice state
  const getPlaceholderText = () => {
    if (voiceState === 'recording') {
      return "Listening...";
    } else if (voiceState === 'processing') {
      return "Processing...";
    }
    return placeholder;
  };

  const inputBarId = 'universal-input-bar';

  return (
    <>
      <div 
        className={cn(
          "input-bar-container", 
          isFocused && "focused",
          isUploading && "uploading",
          voiceState === 'recording' && "recording"
        )}
        role="search"
        aria-label="Add items to freezer"
        style={{ 
          ...(isUploading ? {'--progress-width': `${uploadProgress.toString()}%`} as React.CSSProperties : {}) 
        }}
      >
        {isUploading && (
          <div 
            className="absolute left-0 bottom-0 h-3px bg-blue-500 transition-all duration-300"
            style={{ width: `${uploadProgress}%`, height: '3px', borderRadius: '0 0 12px 12px' }}
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="sr-only">Uploading image: {Math.round(uploadProgress)}%</span>
          </div>
        )}
        
        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="input-bar-form"
        >
          <div className="input-field-container">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={getPlaceholderText()}
              className="input-field"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              aria-label="Item name input"
              disabled={isLoading || isUploading || isParsing || voiceState !== 'inactive'}
              id={`${inputBarId}-text-input`}
            />
          </div>
          
          <div className="input-bar-actions">
            <div className="left-actions" role="group" aria-label="Input options">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden-file-input"
                aria-hidden="true"
                id={`${inputBarId}-file-input`}
              />
              <Button 
                variant="icon"
                onClick={handleImageUpload}
                type="button"
                className={cn(
                  "icon-button secondary",
                  isUploading && "bg-blue-50 dark:bg-blue-900/30"
                )}
                aria-label="Upload image of item"
                disabled={isLoading || isUploading || isParsing || voiceState !== 'inactive'}
              >
                <ImagePlus 
                  size={20} 
                  className={cn(
                    "text-gray-500 dark:text-gray-400",
                    isUploading && "text-blue-500 dark:text-blue-400"
                  )}
                  aria-hidden="true" 
                />
              </Button>
              <Button 
                variant="icon"
                onClick={handleBarcodeScanning}
                type="button"
                className="icon-button secondary"
                aria-label="Scan barcode"
                disabled={isLoading || isUploading || isParsing || voiceState !== 'inactive'}
              >
                <ScanBarcode size={20} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
              </Button>
            </div>
            
            <div className="right-actions">
              {(isTyping || isParsing || inputValue) ? (
                <Button
                  variant="icon"
                  type="submit"
                  className="icon-button primary"
                  aria-label={isLoading || isParsing ? "Processing..." : "Add item"}
                  disabled={isLoading || isUploading || isParsing || !inputValue.trim()}
                >
                  {isLoading || isParsing ? (
                    <Loader size={20} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Send size={20} aria-hidden="true" />
                  )}
                </Button>
              ) : (
                voiceState === 'recording' ? (
                  <Button
                    variant="icon"
                    onClick={handleVoiceInput}
                    type="button"
                    className="icon-button recording"
                    aria-label="Stop recording"
                    aria-pressed="true"
                  >
                    <Square size={20} className="text-red-500" aria-hidden="true" />
                    <span className="sr-only">Stop recording</span>
                  </Button>
                ) : voiceState === 'processing' ? (
                  <Button
                    variant="icon"
                    type="button"
                    className="icon-button secondary"
                    aria-label="Processing voice input"
                    disabled
                  >
                    <Loader size={20} className="animate-spin text-blue-500" aria-hidden="true" />
                    <span className="sr-only">Processing voice input</span>
                  </Button>
                ) : (
                  <Button
                    variant="icon"
                    onClick={handleVoiceInput}
                    type="button"
                    className="icon-button secondary"
                    aria-label="Voice input"
                    disabled={isLoading || isUploading || isParsing || !hasSpeechRecognition}
                    aria-pressed="false"
                  >
                    <Mic size={20} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    <span className="sr-only">Start voice input</span>
                  </Button>
                )
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <BarcodeScanner 
          onClose={() => setShowBarcodeScanner(false)} 
          onBarcodeDetected={handleBarcodeDetected}
        />
      )}

      <style jsx="true">{`
        .input-bar-container {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          padding: 12px 16px;
          margin: 8px 0;
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .dark .input-bar-container {
          background: rgba(30, 41, 59, 0.8);
          border-color: #334155;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
        }

        .input-bar-container.focused {
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
          border-color: #3b82f6;
        }

        .dark .input-bar-container.focused {
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
          border-color: #3b82f6;
        }

        .input-bar-container.recording {
          border-color: #ef4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .input-bar-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-field-container {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .input-field {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding: 8px 12px !important;
          font-size: 16px !important;
          height: auto !important;
        }

        .dark .input-field {
          color: #f1f5f9 !important;
        }

        .input-field:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .input-bar-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .left-actions, .right-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .hidden-file-input {
          display: none;
        }

        /* Icon button styles */
        .icon-button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: none !important;
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          position: relative !important;
          overflow: hidden !important;
          padding: 0 !important;
        }

        .icon-button svg {
          transition: transform 0.2s ease !important;
          color: #6b7280 !important;
        }

        .dark .icon-button svg {
          color: #9ca3af !important;
        }

        .icon-button:hover svg {
          transform: scale(1.1) !important;
        }

        .icon-button.primary {
          background-color: #3b82f6 !important;
        }

        .dark .icon-button.primary {
          background-color: #2563eb !important;
        }

        .icon-button.primary svg {
          color: white !important;
        }

        .icon-button.secondary:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }

        .dark .icon-button.secondary:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }

        .icon-button.primary:hover {
          background-color: #2563eb !important;
        }

        .dark .icon-button.primary:hover {
          background-color: #1d4ed8 !important;
        }

        .icon-button:active {
          transform: scale(0.95) !important;
        }

        .icon-button.recording {
          background-color: #fee2e2 !important;  /* Light red background */
        }

        .dark .icon-button.recording {
          background-color: rgba(239, 68, 68, 0.2) !important;  /* Dark mode light red */
        }

        /* Responsive styles */
        @media (max-width: 480px) {
          .input-bar-container {
            border-radius: 8px;
            padding: 8px 12px;
          }
          
          .input-field {
            padding: 6px 8px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </>
  );
};

export default UniversalInputBar;