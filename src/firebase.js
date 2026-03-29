import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDSv4XfQmpZvCouylmrVRHFksV55VR3_Ow",
    authDomain: "scholarbridge-7f62c.firebaseapp.com",
    projectId: "scholarbridge-7f62c",
    storageBucket: "scholarbridge-7f62c.firebasestorage.app",
    messagingSenderId: "1037288700484",
    appId: "1:1037288700484:web:2cb903f7075115aee59a11",
    measurementId: "G-HQQJ9P6BKW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- THESE ARE THE CRITICAL MISSING EXPORTS ---
export const db = getFirestore(app);      // This lets you save profile data
export const storage = getStorage(app);   // This will handle CV uploads later
export const auth = getAuth(app);         // This handles the login/sign-up