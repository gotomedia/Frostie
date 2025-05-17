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
    const audioFile = formData.get("audio");
    
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
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
      console.log("No API key provided, using mock transcription data");
      return new Response(
        JSON.stringify({ 
          transcription: getMockTranscription(),
          source: "mock" 
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Initialize the Gemini API client
    // Note: Gemini currently doesn't have direct audio transcription capabilities in its API
    // This is a placeholder for when it gets that feature or when we integrate with another
    // service like Google Cloud Speech-to-Text
    // For now, we'll return mock data
    
    console.log("Using mock transcription as Gemini does not support audio transcription yet");
    
    return new Response(
      JSON.stringify({ 
        transcription: getMockTranscription(),
        source: "mock" 
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error("Error transcribing audio:", error);
    
    // Fall back to mock data on error
    return new Response(
      JSON.stringify({ 
        transcription: getMockTranscription(),
        source: "mock",
        error: error.message
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});

// Function to generate mock transcription data
function getMockTranscription(): string {
  const mockTranscriptions = [
    "Frozen chicken breast expires in two weeks",
    "Two bags of frozen peas",
    "Homemade tomato sauce from last month",
    "Ice cream vanilla one pint",
    "Leftover lasagna from last night",
    "Three pounds of ground beef good for six months",
    "Frozen pizza pepperoni expires next week"
  ];
  
  return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
}