// js/dashboard.js — customer view
// Only listings with status: "approved" are shown to guests.

import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allBeaches = [];

// ── Auth guard ──
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const name = userDoc.data().firstName || user.email.split('@')[0];
      document.getElementById('user-display-name').textContent = name;
    }
  } catch (_) {}
  loadBeaches();
});

// ── Logout ──
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ── Load ONLY approved beaches from Firestore ──
async function loadBeaches() {
  try {
    const q    = query(collection(db, 'beaches'), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    allBeaches  = [];
    snap.forEach(d => allBeaches.push({ id: d.id, ...d.data() }));
    renderCards(allBeaches);
  } catch (err) {
    document.getElementById('beach-grid').innerHTML = `
      <div class="state-box">
        <span class="state-icon">⚠️</span>
        <h3>Could not load listings</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

// ── Render cards ──
function renderCards(list) {
  const grid  = document.getElementById('beach-grid');
  const badge = document.getElementById('results-badge');
  badge.textContent = `${list.length} listing${list.length !== 1 ? 's' : ''} found`;

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="state-box">
        <span class="state-icon">🏖️</span>
        <h3>No beaches found</h3>
        <p>Try adjusting your budget or location filter.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((b, i) => {
    const locLabel    = b.location === 'north' ? 'North Cebu' : 'South Cebu';
    const pills       = (b.amenities || []).slice(0, 4).map(a => `<span class="pill">${a}</span>`).join('');
    const imgHtml     = b.image
      ? `<img src="${b.image}" alt="${b.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const imgFallback = `<div class="card-img-placeholder" style="${b.image ? 'display:none' : ''}">🏖️</div>`;
    return `
      <div class="beach-card" style="animation-delay:${i * 0.07}s">
        <div class="card-img-wrap">
          ${imgHtml}
          ${imgFallback}
          <div class="card-loc-tag">${locLabel}</div>
        </div>
        <div class="card-body">
          <div class="card-name">${b.name}</div>
          ${b.description ? `<div class="card-desc">${b.description}</div>` : ''}
          <div class="card-meta">
            <div class="card-price">₱${Number(b.price).toLocaleString()} <span>/ night</span></div>
            ${b.contact ? `<div class="card-contact">📞 ${b.contact}</div>` : ''}
          </div>
          ${pills ? `<div class="amenity-pills">${pills}</div>` : ''}
          <button class="btn-reserve" onclick="reserveBeach('${b.name}')">Reserve Now</button>
        </div>
      </div>`;
  }).join('');
}

// ── Hero search ──
window.findBeaches = function () {
  const budget   = Number(document.getElementById('budget').value);
  const location = document.getElementById('location').value;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip[data-filter="all"]').classList.add('active');
  const filtered = allBeaches.filter(b => {
    const okBudget = budget ? b.price <= budget : true;
    const okLoc    = location ? b.location === location : true;
    return okBudget && okLoc;
  });
  renderCards(filtered);
};

// ── Filter chips ──
window.filterChip = function (el, filter) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const filtered = filter === 'all' ? allBeaches : allBeaches.filter(b => b.location === filter);
  renderCards(filtered);
};

// ── Navbar search ──
document.getElementById('nav-search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  if (!q) { renderCards(allBeaches); return; }
  const filtered = allBeaches.filter(b =>
    b.name.toLowerCase().includes(q) ||
    (b.description || '').toLowerCase().includes(q)
  );
  renderCards(filtered);
});

// ── Reserve placeholder ──
window.reserveBeach = function (name) {
  alert(`Reservation for "${name}" — coming soon!`);
};