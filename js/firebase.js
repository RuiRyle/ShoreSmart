import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAv74YNJR8FXhQ-cbvDW-yBaCECyS_D30",
  authDomain: "shoresmart-5fc2d.firebaseapp.com",
  projectId: "shoresmart-5fc2d",
  storageBucket: "shoresmart-5fc2d.firebasestorage.app",
  messagingSenderId: "1035637427343",
  appId: "1:1035637427343:web:4f8728e2efe1c62058f4fa",
  measurementId: "G-714LTKEJPP"
};  

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);