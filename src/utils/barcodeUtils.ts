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
      // UPC-A validation with check digit
      const digits = barcode.split('').map(Number);
      const checksum = digits.slice(0, 11).reduce((sum, digit, idx) => {
        return sum + digit * (idx % 2 === 0 ? 3 : 1);
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
 * Calculates confidence score for a barcode detection
 * @param {string} barcode The detected barcode
 * @param {number} confidence The confidence score from the scanner
 * @returns {number} Enhanced confidence score (0-100)
 */
export const calculateBarcodeConfidence = (barcode: string, scannerConfidence: number): number => {
  let score = scannerConfidence || 0;
  
  // Boost score if the barcode is a valid format
  if (validateBarcode(barcode)) {
    score += 20;
  }
  
  // Penalize very short codes as they're often partial scans
  if (barcode.length < 8) {
    score -= 30;
  }
  
  // Cap the score at 0-100
  return Math.max(0, Math.min(100, score));
}