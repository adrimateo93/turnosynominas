@@ -11,9 +11,8 @@ import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Payroll from "@/pages/Payroll";

const BACKEND_URL = "https://seguriturno.onrender.com";
export const API = `${BACKEND_URL}/api`; 
const BACKEND_URL = "https://seguriturno1-5.onrender.com";
export const API = `${BACKEND_URL}/api`;

// Register Service Worker for PWA and Push Notifications
if ('serviceWorker' in navigator) {