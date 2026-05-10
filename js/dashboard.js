// js/dashboard.js — customer view with reservation modal
import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc,
  query, where, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allBeaches  = [];
let currentUser = null;
let activeBeach = null;

// AUTH GUARD
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  currentUser = user;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const name = userDoc.data().firstName || user.email.split('@')[0];
      document.getElementById('user-display-name').textContent = name;
    }
  } catch (_) {}
  loadBeaches();
});

// LOGOUT
document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// LOAD APPROVED BEACHES
async function loadBeaches() {
  try {
    const q    = query(collection(db, 'beaches'), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    allBeaches = [];
    snap.forEach(d => allBeaches.push({ id: d.id, ...d.data() }));
    renderCards(allBeaches);
  } catch (err) {
    document.getElementById('beach-list').innerHTML =
      `<div class="state-box"><span class="state-icon">⚠️</span><h3>Could not load listings</h3><p>${err.message}</p></div>`;
  }
}

// RENDER CARDS
function renderCards(list) {
  const grid  = document.getElementById('beach-list');
  const badge = document.getElementById('results-badge');
  badge.textContent = `${list.length} listing${list.length !== 1 ? 's' : ''} found`;
  if (list.length === 0) {
    grid.innerHTML = `<div class="state-box"><span class="state-icon">🏖️</span><h3>No beaches found</h3><p>Try adjusting your budget or location filter.</p></div>`;
    return;
  }
  grid.innerHTML = list.map((b, i) => {
    const locLabel    = b.location === 'north' ? 'North Cebu' : 'South Cebu';
    const pills       = (b.amenities || []).slice(0, 4).map(a => `<span class="pill">${a}</span>`).join('');
    const imgHtml     = b.image ? `<img src="${b.image}" alt="${b.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
    const imgFallback = `<div class="card-img-placeholder" style="${b.image ? 'display:none' : ''}">🏖️</div>`;
    return `
      <div class="beach-card" style="animation-delay:${i * 0.07}s">
        <div class="card-img-wrap">${imgHtml}${imgFallback}<div class="card-loc-tag">${locLabel}</div></div>
        <div class="card-body">
          <div class="card-name">${b.name}</div>
          ${b.description ? `<div class="card-desc">${b.description}</div>` : ''}
          <div class="card-meta">
            <div class="card-price">₱${Number(b.price).toLocaleString()} <span>/ night</span></div>
            ${b.contact ? `<div class="card-contact">📞 ${b.contact}</div>` : ''}
          </div>
          ${pills ? `<div class="amenity-pills">${pills}</div>` : ''}
          <button class="btn-reserve" onclick="openReserveModal('${b.id}')">Reserve Now</button>
        </div>
      </div>`;
  }).join('');
}

// OPEN MODAL
window.openReserveModal = function (beachId) {
  activeBeach = allBeaches.find(b => b.id === beachId);
  if (!activeBeach) return;
  document.getElementById('modal-beach-name').textContent     = activeBeach.name;
  document.getElementById('modal-beach-price').textContent    = `₱${Number(activeBeach.price).toLocaleString()} / night`;
  document.getElementById('modal-beach-location').textContent = activeBeach.location === 'north' ? 'North Cebu' : 'South Cebu';
  const contactWrap = document.getElementById('modal-contact-wrap');
  if (activeBeach.contact) {
    document.getElementById('modal-contact-number').textContent = activeBeach.contact;
    const siteEl = document.getElementById('modal-contact-website');
    siteEl.textContent    = activeBeach.website || '';
    siteEl.href           = activeBeach.website || '#';
    siteEl.style.display  = activeBeach.website ? 'inline' : 'none';
    contactWrap.style.display = 'block';
  } else {
    contactWrap.style.display = 'none';
  }
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('res-checkin').min  = today;
  document.getElementById('res-checkout').min = today;
  if (currentUser) {
    getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        document.getElementById('res-name').value = d.fullName || `${d.firstName||''} ${d.lastName||''}`.trim();
      }
    }).catch(() => {});
  }
  document.getElementById('reserve-form').reset();
  document.getElementById('modal-alert').style.display   = 'none';
  document.getElementById('modal-success').style.display = 'none';
  document.getElementById('reserve-form').style.display  = 'block';
  document.getElementById('modal-submit-btn').disabled   = false;
  document.getElementById('modal-submit-btn').textContent = 'Confirm Reservation';
  document.getElementById('reserve-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
};

// CLOSE MODAL
window.closeReserveModal = function () {
  document.getElementById('reserve-modal').classList.remove('open');
  document.body.style.overflow = '';
  activeBeach = null;
};
document.getElementById('reserve-modal').addEventListener('click', function (e) {
  if (e.target === this) closeReserveModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeReserveModal(); });

// DATE CHANGE — update night count
document.getElementById('res-checkin').addEventListener('change', function () {
  document.getElementById('res-checkout').min = this.value;
  if (document.getElementById('res-checkout').value < this.value)
    document.getElementById('res-checkout').value = '';
  updateNightCount();
});
document.getElementById('res-checkout').addEventListener('change', updateNightCount);

function updateNightCount() {
  const checkin  = document.getElementById('res-checkin').value;
  const checkout = document.getElementById('res-checkout').value;
  const nightEl  = document.getElementById('night-count');
  if (checkin && checkout && activeBeach) {
    const nights = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
    if (nights > 0) {
      nightEl.textContent = `${nights} night${nights !== 1 ? 's' : ''} · Total: ₱${(nights * activeBeach.price).toLocaleString()}`;
      nightEl.style.display = 'block';
      return;
    }
  }
  nightEl.style.display = 'none';
}

// SUBMIT RESERVATION
document.getElementById('reserve-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser || !activeBeach) return;
  const name     = document.getElementById('res-name').value.trim();
  const checkin  = document.getElementById('res-checkin').value;
  const checkout = document.getElementById('res-checkout').value;
  const guests   = Number(document.getElementById('res-guests').value);
  const notes    = document.getElementById('res-notes').value.trim();
  if (new Date(checkout) <= new Date(checkin)) {
    showModalAlert('Check-out must be after check-in.', 'error'); return;
  }
  const nights     = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
  const totalPrice = nights * activeBeach.price;
  const btn = document.getElementById('modal-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    await addDoc(collection(db, 'reservations'), {
      guestId: currentUser.uid, guestEmail: currentUser.email, guestName: name,
      beachId: activeBeach.id, beachName: activeBeach.name, ownerId: activeBeach.ownerId,
      checkIn: checkin, checkOut: checkout, nights, guests, totalPrice, notes,
      status: 'pending', createdAt: serverTimestamp()
    });
    document.getElementById('reserve-form').style.display  = 'none';
    document.getElementById('modal-success').style.display = 'block';
    document.getElementById('success-beach-name').textContent = activeBeach.name;
    document.getElementById('success-dates').textContent =
      `${checkin} → ${checkout} (${nights} night${nights !== 1 ? 's' : ''})`;
    document.getElementById('success-total').textContent = `₱${totalPrice.toLocaleString()}`;
  } catch (err) {
    showModalAlert('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Confirm Reservation';
  }
});

function showModalAlert(msg, type) {
  const box = document.getElementById('modal-alert');
  box.textContent   = msg;
  box.className     = `modal-alert ${type}`;
  box.style.display = 'block';
}

// HERO SEARCH
window.findBeaches = function () {
  const budget   = Number(document.getElementById('budget').value);
  const location = document.getElementById('location').value;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip[data-filter="all"]').classList.add('active');
  renderCards(allBeaches.filter(b => (budget ? b.price <= budget : true) && (location ? b.location === location : true)));
};

// FILTER CHIPS
window.filterChip = function (el, filter) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderCards(filter === 'all' ? allBeaches : allBeaches.filter(b => b.location === filter));
};

// NAV SEARCH
document.getElementById('nav-search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  renderCards(!q ? allBeaches : allBeaches.filter(b =>
    b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)));
});