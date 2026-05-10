import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Admin emails — update this if you change your admin account ──
const ADMIN_EMAILS = ['admin@gmail.com'];

// ── Tab toggle ──
const loginTab      = document.getElementById('login-tab');
const registerTab   = document.getElementById('register-tab');
const loginPanel    = document.getElementById('login-panel');
const registerPanel = document.getElementById('register-panel');

loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginPanel.classList.remove('hidden');
  registerPanel.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerPanel.classList.remove('hidden');
  loginPanel.classList.add('hidden');
});

// ── Alert helper ──
function showAlert(id, msg, type) {
  const box = document.getElementById(id);
  box.textContent = msg;
  box.className = `alert ${type}`;
  box.style.display = 'block';
}

// ── Login ──
document.getElementById('login-form')
.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const cred        = await signInWithEmailAndPassword(auth, email, password);
    const loggedEmail = cred.user.email.toLowerCase();

    // If admin tries to log in here, block and redirect to admin portal
    if (ADMIN_EMAILS.includes(loggedEmail)) {
      await signOut(auth);
      showAlert('login-alert', 'Admin accounts must use the Admin Portal.', 'error');
      setTimeout(() => window.location.href = 'admin-login.html', 1800);
      return;
    }

    showAlert('login-alert', 'Login successful!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);

  } catch (err) {
    showAlert('login-alert', 'Invalid email or password.', 'error');
  }
});

// ── Register ──
document.getElementById('register-form')
.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fname    = document.getElementById('reg-fname').value.trim();
  const lname    = document.getElementById('reg-lname').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  if (password !== confirm) {
    showAlert('register-alert', 'Passwords do not match.', 'error');
    return;
  }

  // Block admin email from registering as a guest
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    showAlert('register-alert', 'This email cannot be used for guest registration.', 'error');
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'users', cred.user.uid), {
      uid:       cred.user.uid,
      firstName: fname,
      lastName:  lname,
      email:     email,
      role:      'guest'
    });

    showAlert('register-alert', 'Account created successfully!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);

  } catch (err) {
    showAlert('register-alert', err.message, 'error');
  }
});