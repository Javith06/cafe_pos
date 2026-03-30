/**
 * Centralized configuration for the POS system.
 * Use this file to switch between Local testing and Production.
 */

// 1. FOR PRODUCTION / MULTI-DEVICE (Mobile, Tab, POS Machine, LAP):
// Use your Railway URL.
const PRODUCTION_URL = "https://cafepos-production-3428.up.railway.app";

// 2. FOR LOCAL TESTING (On the same machine as the backend):
// Use localhost (Web only).
const LOCAL_URL = "http://localhost:3000";

// 3. FOR LOCAL TESTING (On Mobile/Tab connected to the SAME Wi-Fi):
// Use your computer's IP address (e.g., "http://192.168.1.10:3000").
const LOCAL_IP_URL = "http://localhost:3000"; // Replace 'localhost' with your IP if needed.

export const API_URL = PRODUCTION_URL; // <--- CHANGE THIS TO SWITCH MODES
