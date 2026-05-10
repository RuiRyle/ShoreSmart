import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const form =
  document.getElementById('login-form');

const alertBox =
  document.getElementById('alert-box');

const submitBtn =
  document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const email =
    document.getElementById('email')
    .value
    .trim();

  const password =
    document.getElementById('password')
    .value;

  submitBtn.disabled = true;

  submitBtn.innerHTML =
    '<span class="spinner"></span>Signing in...';

  try {

    const cred =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const userDoc =
      await getDoc(
        doc(db, 'users', cred.user.uid)
      );

    if (
      !userDoc.exists() ||
      userDoc.data().role !== 'owner'
    ) {

      await auth.signOut();

      throw {
        message:
        'This account is not registered as a store owner.'
      };
    }

    window.location.href =
      'owner-dashboard.html';

  } catch (err) {

    let msg =
      'Invalid email or password.';

    if (err.message) {
      msg = err.message;
    }

    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/wrong-password'
    ) {

      msg =
        'Invalid email or password.';
    }

    alertBox.textContent = msg;

    alertBox.className =
      'alert error';

    alertBox.style.display =
      'block';

    submitBtn.disabled = false;

    submitBtn.textContent =
      'Sign In';
  }

});