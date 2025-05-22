import { supabase } from './client';

// Extract barcode from image using Gemini AI
export const extractBarcodeFromImage = async (imageFile: File): Promise<string | null> => {
  // Check if we have a valid API endpoint to call
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiEndpoint = `${supabase.supabaseUrl}/functions/v1/extract-barcode`;
  
  console.log('Supabase URL used for edge function call:', supabase.supabaseUrl);
  
  try {
    if (apiEndpoint) {
      console.log('Sending image to Gemini for barcode extraction');
      // Create form data to send the image
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('apiKey', geminiApiKey || '');
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.barcode) {
        console.log('Barcode detected by Gemini:', data.barcode);
        return data.barcode;
      } else {
        console.log('No barcode detected by Gemini');
      }
    }
  } catch (error) {
    console.error('Error extracting barcode from image:', error);
  }
  
  console.log('No barcode detected or API error occurred');
  return null;
};

// Search Open Food Facts database for product information
export const searchOpenFoodFacts = async (barcode: string): Promise<string | null> => {
  try {
    const openFoodFactsUrl = `https://world.openfoodfacts.net/api/v2/product/${barcode}.json`;
    
    const response = await fetch(openFoodFactsUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Product with barcode ${barcode} not found in Open Food Facts`);
        return null;
      }
      throw new Error(`Open Food Facts API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      // Extract product name and add relevant details 
      const productBrand = data.product.brands || '';
      const productName = data.product.product_name || '';
      const quantity = data.product.quantity || '';
      
      // Format the product information
      let formattedProductInfo = '';
      if (productBrand && productName) {
        formattedProductInfo = `${productBrand} ${productName}`;
      } else if (productName) {
        formattedProductInfo = productName;
      } else if (productBrand) {
        formattedProductInfo = productBrand;
      } else {
        formattedProductInfo = `Unknown Product (${barcode})`;
      }
      
      // Add quantity if available
      if (quantity) {
        formattedProductInfo += ` ${quantity}`;
      }
      
      console.log('Found product:', formattedProductInfo);
      return formattedProductInfo;
    }
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
  }
  
  return null;
};

export const recognizeImageContent = async (imageFile: File): Promise<string> => {
  // Check if we have a valid API endpoint to call
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiEndpoint = `${supabase.supabaseUrl}/functions/v1/recognize-image`;
  
  console.log('Supabase URL used for image recognition:', supabase.supabaseUrl);
  
  try {
    // First, try to extract barcode from the image
    const barcode = await extractBarcodeFromImage(imageFile);
    
    // If a barcode is detected, try to look up the product
    if (barcode) {
      const productName = await searchOpenFoodFacts(barcode);
      if (productName) {
        return productName;
      }
      // If product lookup fails, fall back to generic barcode result
      return `Scanned Item ${barcode} #other`;
    }
    
    // No barcode detected or product lookup failed, proceed with regular image recognition
    // If we have a valid endpoint, make the API call
    if (apiEndpoint) {
      // Create form data to send the image
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('apiKey', geminiApiKey || '');
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.recognizedText;
    }
  } catch (error) {
    console.error('Error recognizing image content:', error);
  }
  
  // If API call fails or we don't have a valid endpoint, use mock data
  console.log('Using mock image recognition data');
  
  // Mock response
  const mockRecognitions = [
    'Frozen Chicken Breast 500g #protein',
    'Ice Cream 1L #dessert',
    'Frozen Pizza 12" #dinner',
    'Frozen Vegetables 250g #healthy',
    'Homemade Soup 500ml #leftovers'
  ];
  
  return mockRecognitions[Math.floor(Math.random() * mockRecognitions.length)];
};

export const scanBarcode = async (barcodeData: string): Promise<string> => {
  // Check if we have a valid API endpoint to call
  const apiEndpoint = `${supabase.supabaseUrl}/functions/v1/scan-barcode`;
  
  console.log('Supabase URL used for barcode scanning:', supabase.supabaseUrl);
  
  try {
    // If we have a valid endpoint, make the API call
    if (apiEndpoint) {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({ barcode: barcodeData })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.productName;
    }
  } catch (error) {
    console.error('Error scanning barcode:', error);
  }
  
  // If API call fails or we don't have a valid endpoint, use mock data
  console.log('Using mock barcode data');
  
  // Mock response
  return `Scanned Item ${barcodeData.substring(0, 4)}`;
};

export const parseItemTextWithAI = async (text: string): Promise<any> => {
  try {
    console.log('Calling parse-item-text-with-ai edge function with URL:', supabase.supabaseUrl);
    
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/parse-item-text-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.supabaseKey}`
      },
      body: JSON.stringify({ 
        inputText: text,
        defaultExpirationDays: 30
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API call failed with status: ${response.status}`, errorText);
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error parsing text with AI:', error);
    throw error;
  }
};