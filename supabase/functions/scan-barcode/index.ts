// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Mock barcode database
const mockBarcodeDatabase: Record<string, string> = {
  "1234": "Frozen Chicken Breast 500g #protein",
  "2345": "Ice Cream 1L #dessert",
  "3456": "Frozen Pizza 12\" #dinner",
  "4567": "Frozen Mixed Vegetables 250g #healthy",
  "5678": "Frozen Berries 400g #breakfast",
  "6789": "Fish Fillets 300g #protein",
  "7890": "Ready Meal - Lasagna 350g #dinner",
  "8901": "Frozen Dumplings 20pk #dinner",
  "9012": "Frozen Bread Rolls 6pk #bakery",
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
    const { barcode } = await req.json();
    
    if (!barcode) {
      return new Response(
        JSON.stringify({ error: "No barcode provided" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Try to find the barcode in our mock database
    // In a real app, we would call a barcode lookup API here
    const firstFourDigits = barcode.substring(0, 4);
    const productName = mockBarcodeDatabase[firstFourDigits] || `Unknown Item ${barcode.substring(0, 8)} #other`;
    
    return new Response(
      JSON.stringify({ productName }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error("Error processing barcode:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});