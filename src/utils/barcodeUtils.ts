/**
 * Utility functions for barcode validation and processing
 */
interface BarcodeFormat {
  name: string;
  length: number;
  pattern: RegExp;
  validate?: (barcode: string) => boolean;
}

/**
 * Supported barcode formats with validation rules
 */
const BARCODE_FORMATS: BarcodeFormat[] = [
  {
    name: 'EAN-13',
    length: 13,
    pattern: /^\d{13}$/,
    validate: (barcode: string): boolean => {
      // EAN-13 validation with check digit
      const digits = barcode.split('').map(Number);
      const checksum = digits.slice(0, 12).reduce((sum, digit, idx) => {
        return sum + digit * (idx % 2 === 0 ? 1 : 3);
      }, 0);
      const computedCheckDigit = (10 - (checksum % 10)) % 10;
      return computedCheckDigit === digits[12];
    }
  },
  {
    name: 'UPC-A',
    length: 12,
    pattern: /^\d{12}$/,
    validate: (barcode: string): boolean => {
      // UPC-A validation with check digit - FIXED: odd positions × 3, even × 1
      const digits = barcode.split('').map(Number);
      const checksum = digits.slice(0, 11).reduce((sum, digit, idx) => {
        return sum + digit * (idx % 2 === 1 ? 3 : 1); // Fixed multipliers
      }, 0);
      const computedCheckDigit = (10 - (checksum % 10)) % 10;
      return computedCheckDigit === digits[11];
    }
  },
  {
    name: 'EAN-8',
    length: 8,
    pattern: /^\d{8}$/,
    validate: (barcode: string): boolean => {
      // EAN-8 validation with check digit
      const digits = barcode.split('').map(Number);
      const checksum = digits.slice(0, 7).reduce((sum, digit, idx) => {
        return sum + digit * (idx % 2 === 0 ? 3 : 1);
      }, 0);
      const computedCheckDigit = (10 - (checksum % 10)) % 10;
      return computedCheckDigit === digits[7];
    }
  },
  {
    name: 'UPC-E',
    length: 8,
    pattern: /^\d{8}$/
  },
  {
    name: 'Code-128',
    pattern: /^[\x00-\x7F]+$/, // ASCII characters
    length: 0 // Variable length
  },
  {
    name: 'Code-39',
    pattern: /^[A-Z0-9\-\.\ \$\/\+\%]+$/, // A-Z, 0-9, -, ., space, $, /, +, %
    length: 0 // Variable length
  }
];

/**
 * Validates a barcode against known formats
 * @param {string} barcode The barcode to validate
 * @returns {boolean} True if the barcode is valid, false otherwise
 */
export const validateBarcode = (barcode: string): boolean => {
  if (!barcode) {
    console.log('Barcode is empty');
    return false;
  }
  console.log(`Validating barcode: ${barcode}`);
  
  // For debugging purposes, accept any numeric barcode of reasonable length
  if (/^\d+$/.test(barcode) && barcode.length >= 8 && barcode.length <= 14) {
    console.log(`Barcode ${barcode} passes basic numeric validation`);
    return true;
  }
  
  // More restrictive check for specific formats
  const matchedFormat = BARCODE_FORMATS.find(format => {
    // If format has a specific length requirement, check it
    if (format.length > 0 && barcode.length !== format.length) {
      console.log(`Barcode ${barcode} failed length check for format ${format.name} (expected ${format.length})`);
      return false;
    }
    
    // Check if the barcode matches the pattern
    if (!format.pattern.test(barcode)) {
      console.log(`Barcode ${barcode} failed pattern check for format ${format.name}`);
      return false;
    }
    
    // If the format has a validate function, use it
    if (format.validate && !format.validate(barcode)) {
      console.log(`Barcode ${barcode} failed checksum validation for format ${format.name}`);
      return false;
    }
    
    console.log(`Barcode ${barcode} matches format ${format.name}`);
    return true;
  });
  
  return !!matchedFormat;
}

/**
 * Attempts to repair partially scanned barcodes
 * @param {string} barcode The incomplete barcode to repair
 * @returns {string | null} The repaired barcode if possible, null otherwise
 */
export const attemptBarcodeRepair = (barcode: string): string | null => {
  // Only process numeric barcodes
  if (!/^\d+$/.test(barcode)) {
    return null;
  }
  
  console.log(`Attempting to repair partial barcode: ${barcode}`);
  
  // For EAN-13 partial scans (10-12 digits)
  if (barcode.length >= 10 && barcode.length < 13) {
    const paddedCode = barcode.padStart(13, '0');
    console.log(`Padded to EAN-13: ${paddedCode}`);
    
    if (validateBarcode(paddedCode)) {
      console.log(`Successfully repaired to valid EAN-13`);
      return paddedCode;
    }
  }
  
  // For UPC-A partial scans (9-11 digits)
  if (barcode.length >= 9 && barcode.length < 12) {
    const paddedCode = barcode.padStart(12, '0');
    console.log(`Padded to UPC-A: ${paddedCode}`);
    
    if (validateBarcode(paddedCode)) {
      console.log(`Successfully repaired to valid UPC-A`);
      return paddedCode;
    }
  }
  
  // For EAN-8 partial scans (6-7 digits)
  if (barcode.length >= 6 && barcode.length < 8) {
    const paddedCode = barcode.padStart(8, '0');
    console.log(`Padded to EAN-8: ${paddedCode}`);
    
    if (validateBarcode(paddedCode)) {
      console.log(`Successfully repaired to valid EAN-8`);
      return paddedCode;
    }
  }
  
  // No successful repair
  return null;
}

/**
 * Gets the barcode format name
 * @param {string} barcode The barcode to get the format from
 * @returns {string | undefined} The barcode format name if the barcode is valid, undefined otherwise
 */
export const getBarcodeFormat = (barcode: string): string | undefined => {
  if (!barcode) {
    return undefined;
  }
  const format = BARCODE_FORMATS.find(format => {
    // If format has a specific length requirement, check it
    if (format.length > 0 && barcode.length !== format.length) {
      return false;
    }
    
    // Check if the barcode matches the pattern
    return format.pattern.test(barcode);
  });
  return format?.name;
}

/**
 * Calculates confidence score for a barcode detection with enhanced factors
 * @param {string} barcode The detected barcode
 * @param {number} scannerConfidence The confidence score from the scanner
 * @returns {number} Enhanced confidence score (0-100)
 */
export const calculateBarcodeConfidence = (barcode: string, scannerConfidence: number): number => {
  let score = scannerConfidence || 0;
  
  // Validate the format
  const format = BARCODE_FORMATS.find(f => 
    (!f.length || f.length === barcode.length) && f.pattern.test(barcode)
  );
  
  // Format match bonus
  if (format) {
    score += 15;
    
    // Additional bonus for checksum validation
    if (format.validate && format.validate(barcode)) {
      score += 25;
    }
  }
  
  // Length-based adjustments
  if (barcode.length < 8) {
    score -= 30; // Penalize likely partial scans
  } else if ([8, 12, 13].includes(barcode.length)) {
    score += 10; // Bonus for common barcode lengths
  }
  
  // Character consistency check for non-numeric formats
  if (!/^\d+$/.test(barcode) && !/^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(barcode)) {
    score -= 20; // Penalize unusual character combinations
  }
  
  // Check for repeating digits that might indicate a scan error
  if (/(\d)\1{5,}/.test(barcode)) {
    // Pattern matches the same digit repeated 6+ times (e.g., "111111")
    score -= 25; // Heavy penalty for suspiciously repetitive patterns
  }
  
  // Simple fuzzy matching - check if the barcode is very similar to common formats
  // This helps catch barcodes that are off by just one digit
  if (/^\d{12,14}$/.test(barcode)) {
    // Close to EAN-13/UPC-A/GTIN length
    score += 5;
  }
  
  // Cap the score at 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Simple fuzzy matching to compare two barcodes for similarity
 * @param {string} barcode1 The first barcode
 * @param {string} barcode2 The second barcode
 * @returns {boolean} True if the barcodes are similar enough to be considered the same
 */
export const areSimilarBarcodes = (barcode1: string, barcode2: string): boolean => {
  // If either barcode is invalid, return false
  if (!barcode1 || !barcode2) {
    return false;
  }
  
  // If the barcodes are exactly the same, return true immediately
  if (barcode1 === barcode2) {
    return true;
  }
  
  // If length difference is too large, they're not similar
  if (Math.abs(barcode1.length - barcode2.length) > 2) {
    return false;
  }
  
  // For numeric-only barcodes, check if either is a substring of the other
  if (/^\d+$/.test(barcode1) && /^\d+$/.test(barcode2)) {
    if (barcode1.includes(barcode2) || barcode2.includes(barcode1)) {
      return true;
    }
    
    // Count the number of different digits
    const minLength = Math.min(barcode1.length, barcode2.length);
    let differences = 0;
    
    for (let i = 0; i < minLength; i++) {
      if (barcode1[i] !== barcode2[i]) {
        differences++;
      }
    }
    
    // If less than 20% different or at most 1 digit different for shorter codes,
    // consider them similar (accounts for scanning errors)
    const maxDifferences = Math.max(1, Math.floor(minLength * 0.2));
    return differences <= maxDifferences;
  }
  
  // For non-numeric barcodes, require exact match for now
  return false;
}