import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAv74YNJR8FXhQ-cbvDW-yBaCECyS_D30",
  authDomain: "shoresmart-5fc2d.firebaseapp.com",
  projectId: "shoresmart-5fc2d",
  storageBucket: "shoresmart-5fc2d.firebasestorage.app",
  messagingSenderId: "1035637427343",
  appId: "1:1035637427343:web:4f8728e2efe1c62058f4fa",
  measurementId: "G-714LTKEJPP"
};  	

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById('owner-register-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

function showAlert(msg, type) {
  alertBox.textContent = msg;
  alertBox.className = `alert ${type}`;
  alertBox.style.display = 'block';
}

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();

  const businessName = document.getElementById('business-name').value.trim();

  const contact = document.getElementById('contact').value.trim();

  const email = document.getElementById('email').value.trim();

  const password = document.getElementById('password').value;

  const confirm = document.getElementById('confirm-password').value;

  if (password !== confirm) {
    showAlert('Passwords do not match.', 'error');
    return;
  }

  if (password.length < 8) {
    showAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  submitBtn.disabled = true;

  submitBtn.innerHTML =
    '<span class="spinner"></span>Creating account...';

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const uid = userCredential.user.uid;

    await setDoc(doc(db, 'users', uid), {

      uid,

      firstName: fname,
      lastName: lname,

      fullName: `${fname} ${lname}`,

      businessName,
      contact,
      email,

      role: 'owner',

      createdAt: new Date().toISOString()

    });

    showAlert(
      'Account created successfully!',
      'success'
    );

    setTimeout(() => {
      window.location.href = 'owner-dashboard.html';
    }, 1800);

  } catch (error) {

    let msg =
      'Something went wrong. Please try again.';

    if (error.code === 'auth/email-already-in-use') {
      msg = 'This email is already registered.';
    }

    if (error.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email.';
    }

    showAlert(msg, 'error');

    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Owner Account';
  }

});