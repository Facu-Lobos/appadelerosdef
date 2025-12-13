// Import the functions you need from the SDKs you need
import { getFirestore } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAKFHG2EbTGK6zrtusAB265x2Nbjn-zh9c",
  authDomain: "appadeleros-padel.firebaseapp.com",
  projectId: "appadeleros-padel",
  storageBucket: "appadeleros-padel.firebasestorage.app",
  messagingSenderId: "619945132501",
  appId: "1:619945132501:web:00aa508909c5e30b557d5c",
  measurementId: "G-39W9FJNYYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const analytics = getAnalytics(app);