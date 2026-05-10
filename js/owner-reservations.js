// js/owner-reservations.js — reservation management for owners
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, query, where, getDocs,
  doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentOwner = null;

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentOwner = user;
  // Load pending count for badge even before tab is clicked
  loadReservations(true);
});

// LOAD RESERVATIONS
async function loadReservations(badgeOnly = false) {
  if (!currentOwner) return;
  const wrap = document.getElementById('reservations-wrap');

  if (!badgeOnly && wrap) {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px;"><span class="spinner"></span> Loading reservations...</div>';
  }

  try {
    const q    = query(collection(db, 'reservations'), where('ownerId', '==', currentOwner.uid));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));

    // Sort: pending first, then newest
    list.sort((a, b) => {
      const order = { pending: 0, confirmed: 1, declined: 2 };
      if ((order[a.status]||0) !== (order[b.status]||0)) return (order[a.status]||0) - (order[b.status]||0);
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    // Update pending badge on tab
    const pending = list.filter(r => r.status === 'pending').length;
    const badge   = document.getElementById('res-tab-badge');
    if (badge) {
      badge.textContent    = pending > 0 ? pending : '';
      badge.style.display  = pending > 0 ? 'inline-flex' : 'none';
    }

    if (badgeOnly) return;

    if (list.length === 0) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--muted);">
          <div style="font-size:40px;opacity:0.2;margin-bottom:14px;">📋</div>
          <h3 style="font-size:15px;color:rgba(255,255,255,0.2);margin-bottom:6px;">No reservations yet</h3>
          <p style="font-size:13px;">Guest booking requests will appear here.</p>
        </div>`;
      return;
    }

    wrap.innerHTML = list.map(r => renderCard(r)).join('');

    // Attach events
    wrap.querySelectorAll('.res-btn.confirm').forEach(btn => {
      btn.addEventListener('click', () => updateReservation(btn.dataset.id, 'confirmed'));
    });
    wrap.querySelectorAll('.res-btn.decline').forEach(btn => {
      btn.addEventListener('click', () => updateReservation(btn.dataset.id, 'declined'));
    });
    wrap.querySelectorAll('.res-btn.undo').forEach(btn => {
      btn.addEventListener('click', () => updateReservation(btn.dataset.id, 'pending'));
    });

  } catch (err) {
    if (wrap) wrap.innerHTML = `<div style="padding:30px;text-align:center;color:#f87171;font-size:13px;">Error: ${err.message}</div>`;
  }
}

// RENDER CARD
function renderCard(r) {
  const status      = r.status || 'pending';
  const statusLabel = { pending:'⏳ Pending', confirmed:'✅ Confirmed', declined:'❌ Declined' }[status] || status;

  const actionBtns = status === 'pending'
    ? `<button class="res-btn confirm" data-id="${r.id}">✅ Confirm</button>
       <button class="res-btn decline" data-id="${r.id}">❌ Decline</button>`
    : `<button class="res-btn undo" data-id="${r.id}">↩ Move to Pending</button>`;

  return `
    <div class="res-booking-card">
      <div class="res-booking-top">
        <div>
          <div class="res-booking-name">${r.beachName}</div>
          <div class="res-booking-guest">Guest: <strong>${r.guestName}</strong> · ${r.guestEmail}</div>
        </div>
        <span class="res-status ${status}">${statusLabel}</span>
      </div>

      <div class="res-booking-grid">
        <div class="res-info-cell">
          <div class="res-info-label">Check-in</div>
          <div class="res-info-value">${r.checkIn}</div>
        </div>
        <div class="res-info-cell">
          <div class="res-info-label">Check-out</div>
          <div class="res-info-value">${r.checkOut}</div>
        </div>
        <div class="res-info-cell">
          <div class="res-info-label">Guests</div>
          <div class="res-info-value">${r.guests} guest${r.guests > 1 ? 's' : ''}</div>
        </div>
        <div class="res-info-cell highlight">
          <div class="res-info-label">${r.nights} night${r.nights !== 1 ? 's' : ''}</div>
          <div class="res-info-value">₱${Number(r.totalPrice).toLocaleString()}</div>
        </div>
      </div>

      ${r.notes ? `<div class="res-booking-notes">📝 ${r.notes}</div>` : ''}

      <div class="res-actions">${actionBtns}</div>
    </div>`;
}

// UPDATE STATUS
async function updateReservation(id, newStatus) {
  try {
    await updateDoc(doc(db, 'reservations', id), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    loadReservations();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// TAB SWITCH
window.showOwnerTab = function (tab) {
  const listSec = document.getElementById('listings-section');
  const resSec  = document.getElementById('reservations-section');
  const tabL    = document.getElementById('tab-listings');
  const tabR    = document.getElementById('tab-reservations');

  if (tab === 'listings') {
    listSec.style.display = 'block';
    resSec.style.display  = 'none';
    tabL.classList.add('active');
    tabR.classList.remove('active');
  } else {
    listSec.style.display = 'none';
    resSec.style.display  = 'block';
    tabL.classList.remove('active');
    tabR.classList.add('active');
    loadReservations();
  }
};