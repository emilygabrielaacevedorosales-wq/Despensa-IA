// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCWzXZhG44vQmJsorgaAp1KiLPQNypUTz8",
  authDomain: "ridersconnect-75182.firebaseapp.com",
  databaseURL: "https://ridersconnect-75182-default-rtdb.firebaseio.com",
  projectId: "ridersconnect-75182",
  storageBucket: "ridersconnect-75182.firebasestorage.app",
  messagingSenderId: "627080367503",
  appId: "1:627080367503:web:4a06d9b4d9427548be0ffa",
  measurementId: "G-KTZK7VPLTN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);