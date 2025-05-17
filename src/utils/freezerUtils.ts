import { FreezerItem } from '../types';

/**
 * Utility functions for freezer items
 */

// Check if an item is expired
export const isItemExpired = (item: FreezerItem): boolean => {
  const today = new Date();
  const expirationDate = new Date(item.expirationDate);
  return expirationDate < today;
};

// Check if an item is about to expire (within the next 7 days)
export const isItemExpiringWithin = (item: FreezerItem, days: number = 7): boolean => {
  const today = new Date();
  const expirationDate = new Date(item.expirationDate);
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= days;
};

// Calculate days until expiration
export const getDaysUntilExpiration = (item: FreezerItem): number => {
  const today = new Date();
  const expirationDate = new Date(item.expirationDate);
  const diffTime = expirationDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Format date for display
export const formatDate = (date: Date): string => {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  return date.toLocaleDateString();
};

// Get expiration status text
export const getExpirationStatus = (daysLeft: number): string => {
  if (daysLeft <= 0) return 'Expired';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
};

// Get expiration status color class
export const getExpirationStatusColor = (daysLeft: number): string => {
  if (daysLeft <= 0) return 'text-red-500 dark:text-red-400';
  if (daysLeft <= 3) return 'text-orange-500 dark:text-orange-400';
  if (daysLeft <= 7) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-green-500 dark:text-green-400';
};

// Parse a potential date string from user input
export const parseDateFromText = (text: string): Date | null => {
  const dateRegex = /expires?:?\s?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;
  const match = text.match(dateRegex);
  
  if (match && match[1]) {
    try {
      const parsedDate = new Date(match[1]);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (e) {
      console.error("Couldn't parse date", e);
    }
  }
  
  return null;
};