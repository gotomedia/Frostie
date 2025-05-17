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
      console.log("No API key provided, using mock recognition");
      return new Response(
        JSON.stringify({ recognizedText: getMockRecognizedItem() }),
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
      Look at this image of a food item. Please identify what it is in the format:
      "[Item name] [Size if visible] #[category]"
      
      For example:
      "Frozen Chicken Breast 500g #protein"
      "Ice Cream 1L #dessert"
      "Frozen Pizza 12" #dinner"
      
      Only provide the formatted response, nothing else. The category tag should be one word.
      If you cannot identify the item clearly, make your best guess.
    `;
    
    // Generate the response
    const result = await model.generateContent([prompt, imageData]);
    const response = result.response;
    const text = response.text().trim();
    
    // Return the recognized text
    return new Response(
      JSON.stringify({ recognizedText: text }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error("Error processing image:", error);
    
    // Fall back to mock data on error
    return new Response(
      JSON.stringify({ recognizedText: getMockRecognizedItem() }),
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

// Function to generate a mock recognized item
function getMockRecognizedItem(): string {
  const mockItems = [
    'Frozen Chicken Breast 500g #protein',
    'Ice Cream 1L #dessert',
    'Frozen Pizza 12" #dinner',
    'Frozen Vegetables 250g #healthy',
    'Homemade Soup 500ml #leftovers'
  ];
  return mockItems[Math.floor(Math.random() * mockItems.length)];
}