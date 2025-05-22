# ❄️ Frostie – Smart Freezer Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📌 Problem & Purpose

Are you tired of a freezer filled with mystery items and forgotten meals? Frostie is here to help! This web application helps you:

*   **Track your freezer inventory:** Easily log what's inside your freezer.
*   **Reduce food waste:** Get notified about items expiring soon.
*   **Discover meal ideas:** Find recipes using what you already have.

## 🚀 Key Features

*   **Universal Input:** Add items using text, image upload, barcode scan, or voice input.
*   **Smart Inventory:** Filter, sort, and manage your freezer contents.
*   **Expiring Item Alerts:** Reduce waste with timely notifications.
*   **AI-Powered Suggestions:** Discover meal ideas based on your inventory.
*   **Responsive Design:** Works beautifully on desktop and mobile devices.
*   **Dietary Preferences:** Filter meal ideas based on your dietary needs.
*   **Image Recognition:** Use images to automatically identify and add items.
*   **Barcode Scanning:** Quickly add items by scanning barcodes.
*   **Voice Input:** Add items hands-free using voice recognition.

## 💻 Technologies Used

*   **React:** For building the user interface.
*   **Vite:** For fast development and bundling.
*   **TypeScript:** For type safety and maintainability.
*   **Tailwind CSS:** For styling the user interface.
*   **Lucide React:** For icons.
*   **Supabase:** For backend, database, and authentication.
*   **Gemini API:** For AI-powered features (image recognition, text parsing, meal idea generation).

## ✨ Core Pages

*   **Home:** A dashboard with quick summaries and input options.
*   **Freezer:** A detailed, filterable view of your freezer inventory.
*   **Shopping:** A grocery list to help you shop efficiently.
*   **Ideas:** A source of inspiration for using your frozen items.
*   **Settings:** Customize your experience and manage your account.

## ⚙️ Current Functionality

*   **Adding Items:**
    *   Text input with natural language parsing for item details and expiration dates.
    *   Image upload for automatic item recognition using the Gemini API.
    *   Barcode scanning for quick product identification.
    *   Voice input for hands-free item entry.
*   **Freezer Inventory Management:**
    *   View items with details like name, quantity, size, category, and expiration date.
    *   Filter and sort items by various criteria.
    *   Edit and delete items from your freezer.
*   **Shopping List:**
    *   Add items to your shopping list.
    *   Mark items as complete.
    *   Edit and remove items.
*   **Meal Ideas:**
    *   Generate meal ideas based on your current freezer inventory.
    *   Filter meal ideas by dietary preferences (vegetarian, vegan, gluten-free, dairy-free).
    *   Favorite meal ideas for later use.
*   **Settings:**
    *   Choose between light, dark, or system theme.
    *   Enable or disable expiration notifications.
    *   Set the timing for expiration notifications.
    *   Configure dietary preferences.

## 🔐 Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

*   `VITE_SUPABASE_URL`: Your Supabase project URL.
*   `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key.
*   `GEMINI_API_KEY`: Your Google Gemini API key.
*   `UNSPLASH_API_KEY`: Your Unsplash API key.
*   `PEXELS_API_KEY`: Your Pexels API key.
