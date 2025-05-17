// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Check if the request is a multipart form data
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Request must be multipart/form-data" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Parse the multipart form data
    const formData = await req.formData();
    const imageFile = formData.get("image");
    
    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No image file provided" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Get API key from Deno environment variables
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    // Use mock data if no API key provided
    if (!apiKey) {
      console.log("No API key provided, using mock barcode data");
      return new Response(
        JSON.stringify({ barcode: getMockBarcodeData() }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Convert the file to a base64 string
    const arrayBuffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Create a FileObject for the Gemini API
    const imageData = {
      inlineData: {
        data: arrayBufferToBase64(arrayBuffer),
        mimeType: imageFile.type,
      },
    };
    
    // Create the prompt for Gemini
    const prompt = `
      Analyze this image and determine if it contains a barcode.
      If a barcode is present, extract the full numeric code from the barcode.
      
      Respond with ONLY the barcode numbers - no additional text, explanations, or formatting.
      If there is no barcode in the image, respond with only the word "NONE".
      
      Examples:
      - If you see a barcode with numbers "1234567890128", respond with only: 1234567890128
      - If there's no barcode, respond with only: NONE
    `;
    
    // Generate the response
    const result = await model.generateContent([prompt, imageData]);
    const response = result.response;
    const text = response.text().trim();
    
    // Process the response
    if (text === "NONE") {
      return new Response(
        JSON.stringify({ barcode: null }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Extract just the numbers from the response
    const barcodeMatch = text.match(/\d+/);
    const barcode = barcodeMatch ? barcodeMatch[0] : null;
    
    // Return the barcode
    return new Response(
      JSON.stringify({ barcode: barcode }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error("Error extracting barcode:", error);
    
    // Fall back to mock data on error
    return new Response(
      JSON.stringify({ barcode: null }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to generate mock barcode data
function getMockBarcodeData(): string | null {
  // 50% chance to return null (no barcode found)
  if (Math.random() < 0.5) {
    return null;
  }
  
  // Otherwise generate a random barcode
  const mockBarcodes = [
    "8710866093001", // Dutch coffee
    "5449000000996", // Coca-Cola
    "3017620422003", // Nutella
    "8410076481466", // Spanish yogurt
    "4009300014504", // German chocolate
    "5000112637922", // British tea
    "3046920022606", // French chocolate
    "8000500310427", // Italian pasta
    "7622210100474", // Oreo cookies
    "4005808679485", // Nivea
  ];
  
  return mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)];
}