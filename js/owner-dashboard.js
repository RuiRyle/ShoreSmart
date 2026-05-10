// js/owner-dashboard.js
// Listings are saved with status: "pending" — admin must approve before customers see them.

import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let editingId   = null;

// ── Auth guard: must be role "owner" ──
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'owner-login.html'; return; }

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists() || userDoc.data().role !== 'owner') {
    alert('Access denied.');
    await signOut(auth);
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;
  const data  = userDoc.data();
  document.getElementById('nav-owner-name').textContent =
    data.businessName || data.fullName || user.email;

  loadListings();
});

// ── Logout ──
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'owner-login.html';
});

// ── Image URL preview ──
document.getElementById('f-image').addEventListener('input', function () {
  const url         = this.value.trim();
  const preview     = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  if (url) {
    preview.src       = url;
    preview.className = 'img-preview visible';
    placeholder.style.display = 'none';
    preview.onerror = () => {
      preview.className = 'img-preview';
      placeholder.style.display = 'flex';
    };
  } else {
    preview.className = 'img-preview';
    placeholder.style.display = 'flex';
  }
});

// ── Amenity checkbox highlight ──
document.querySelectorAll('.amenity-check').forEach(label => {
  label.querySelector('input[type="checkbox"]').addEventListener('change', function () {
    label.classList.toggle('checked', this.checked);
  });
});

// ── Form submit (Add / Edit) ──
document.getElementById('listing-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const name     = document.getElementById('f-name').value.trim();
  const desc     = document.getElementById('f-desc').value.trim();
  const location = document.getElementById('f-location').value;
  const price    = Number(document.getElementById('f-price').value);
  const contact  = document.getElementById('f-contact').value.trim();
  const website  = document.getElementById('f-website').value.trim();
  const image    = document.getElementById('f-image').value.trim();
  const amenities = Array.from(
    document.querySelectorAll('.amenities-grid input:checked')
  ).map(cb => cb.value);

  if (!name || !location || !price) {
    showFormAlert('Please fill in all required fields.', 'error');
    return;
  }

  const submitBtn = document.getElementById('form-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? 'Saving...' : 'Submitting...';

  const payload = {
    name, description: desc, location, price,
    contact, website, image, amenities,
    ownerId: currentUser.uid,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      // Keep existing status if already reviewed; reset to pending if content changes
      await updateDoc(doc(db, 'beaches', editingId), {
        ...payload,
        status: 'pending',          // re-submit for review on edit
        rejectionReason: ''
      });
      showFormAlert('Listing re-submitted for admin review.', 'success');
      cancelEdit();
    } else {
      // New listing always starts as pending
      await addDoc(collection(db, 'beaches'), {
        ...payload,
        status: 'pending',          // ← key: admin must approve
        createdAt: serverTimestamp()
      });
      showFormAlert('Listing submitted! Awaiting admin approval.', 'success');
      document.getElementById('listing-form').reset();
      resetImagePreview();
      document.querySelectorAll('.amenity-check').forEach(l => l.classList.remove('checked'));
    }

    loadListings();
  } catch (err) {
    showFormAlert('Error: ' + err.message, 'error');
  }

  submitBtn.disabled = false;
  submitBtn.textContent = editingId ? 'Save Changes' : 'Submit for Approval';
});

// ── Load owner's own listings (all statuses) ──
async function loadListings() {
  if (!currentUser) return;
  const grid = document.getElementById('listings-grid');
  grid.innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading...</div>';

  try {
    const q    = query(collection(db, 'beaches'), where('ownerId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const listings = [];
    snap.forEach(d => listings.push({ id: d.id, ...d.data() }));

    listings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    updateStats(listings);

    if (listings.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          <h3>No listings yet</h3>
          <p>Use the form on the left to submit your first beach property for approval.</p>
        </div>`;
      return;
    }

    grid.innerHTML = listings.map(l => renderCard(l)).join('');

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.id, listings));
    });
    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteListing(btn.dataset.id));
    });

  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

function renderCard(l) {
  const locLabel = l.location === 'north' ? 'North Cebu' : 'South Cebu';
  const status   = l.status || 'pending';

  // Status badge styles
  const badgeStyle = {
    pending:  'background:rgba(217,119,6,0.15);border:1px solid rgba(217,119,6,0.35);color:#fbbf24;',
    approved: 'background:rgba(5,150,105,0.15);border:1px solid rgba(5,150,105,0.35);color:#34d399;',
    rejected: 'background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);color:#f87171;'
  }[status] || '';

  const statusLabel = {
    pending:  '⏳ Pending review',
    approved: '✅ Approved — live',
    rejected: '❌ Rejected'
  }[status] || status;

  const imgHtml = l.image
    ? `<img class="listing-img" src="${l.image}" alt="${l.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const imgPlaceholder = `<div class="listing-img-placeholder" style="${l.image ? 'display:none' : ''}">🏖️</div>`;
  const amenityTags = (l.amenities || []).slice(0, 4)
    .map(a => `<span class="amenity-tag">${a}</span>`).join('');

  return `
    <div class="listing-card">
      ${imgHtml}
      ${imgPlaceholder}
      <div class="listing-body">
        <div class="listing-location-badge">${locLabel}</div>
        <div style="margin-bottom:8px;">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;${badgeStyle}">${statusLabel}</span>
        </div>
        ${status === 'rejected' && l.rejectionReason
          ? `<div style="font-size:11px;color:#f87171;margin-bottom:8px;padding:6px 10px;background:rgba(220,38,38,0.08);border-radius:6px;border:1px solid rgba(220,38,38,0.2);">
               Reason: ${l.rejectionReason}
             </div>`
          : ''}
        <div class="listing-name">${l.name}</div>
        ${l.description ? `<div class="listing-desc">${l.description}</div>` : ''}
        <div class="listing-price">₱${Number(l.price).toLocaleString()} <span>/ night</span></div>
        ${amenityTags ? `<div class="amenity-tags">${amenityTags}</div>` : ''}
        <div class="listing-footer">
          <button class="btn-edit" data-id="${l.id}">✏️ Edit</button>
          <button class="btn-delete" data-id="${l.id}">🗑️ Delete</button>
        </div>
      </div>
    </div>`;
}

function updateStats(listings) {
  const count    = listings.length;
  const pending  = listings.filter(l => l.status === 'pending').length;
  const approved = listings.filter(l => l.status === 'approved').length;
  const prices   = listings.filter(l => l.status === 'approved').map(l => l.price).filter(Boolean);
  const avg      = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;

  document.getElementById('stat-total').textContent   = count;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-approved').textContent = approved;
  document.getElementById('stat-avg').textContent     = avg ? `₱${avg.toLocaleString()}` : '—';
  document.getElementById('listings-count').textContent = `${count} listing${count !== 1 ? 's' : ''}`;

  // Update submit button label on form
  document.getElementById('form-submit-btn').textContent =
    editingId ? 'Save Changes' : 'Submit for Approval';
}

// ── Edit ──
function startEdit(id, listings) {
  const l = listings.find(x => x.id === id);
  if (!l) return;
  editingId = id;
  document.getElementById('f-name').value     = l.name || '';
  document.getElementById('f-desc').value     = l.description || '';
  document.getElementById('f-location').value = l.location || '';
  document.getElementById('f-price').value    = l.price || '';
  document.getElementById('f-contact').value  = l.contact || '';
  document.getElementById('f-website').value  = l.website || '';
  document.getElementById('f-image').value    = l.image || '';
  document.getElementById('f-image').dispatchEvent(new Event('input'));
  document.querySelectorAll('.amenities-grid input[type="checkbox"]').forEach(cb => {
    const checked = (l.amenities || []).includes(cb.value);
    cb.checked = checked;
    cb.closest('.amenity-check').classList.toggle('checked', checked);
  });
  document.getElementById('form-mode-title').textContent = 'Edit Listing';
  document.getElementById('form-submit-btn').textContent = 'Save Changes';
  document.getElementById('cancel-edit-btn').style.display = 'block';
  document.querySelector('.sidebar').scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);

function cancelEdit() {
  editingId = null;
  document.getElementById('listing-form').reset();
  resetImagePreview();
  document.querySelectorAll('.amenity-check').forEach(l => l.classList.remove('checked'));
  document.getElementById('form-mode-title').textContent = 'Add New Listing';
  document.getElementById('form-submit-btn').textContent = 'Submit for Approval';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  clearFormAlert();
}

// ── Delete ──
async function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'beaches', id));
    loadListings();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ── Helpers ──
function showFormAlert(msg, type) {
  const box = document.getElementById('form-alert');
  box.textContent = msg;
  box.className   = `alert ${type}`;
  box.style.display = 'block';
  if (type === 'success') setTimeout(clearFormAlert, 4000);
}

function clearFormAlert() {
  document.getElementById('form-alert').style.display = 'none';
}

function resetImagePreview() {
  document.getElementById('img-preview').className = 'img-preview';
  document.getElementById('img-placeholder').style.display = 'flex';
}

// ── TAB SWITCHING ──
window.showOwnerTab = function(tab) {

  const listingsTab = document.getElementById('tab-listings');
  const reservationsTab = document.getElementById('tab-reservations');

  const listingsSection = document.getElementById('listings-section');
  const reservationsSection = document.getElementById('reservations-section');

  // reset tabs
  listingsTab.classList.remove('active');
  reservationsTab.classList.remove('active');

  // hide sections
  listingsSection.style.display = 'none';
  reservationsSection.style.display = 'none';

  // show selected
  if (tab === 'listings') {
    listingsTab.classList.add('active');
    listingsSection.style.display = 'block';
  }

  if (tab === 'reservations') {
    reservationsTab.classList.add('active');
    reservationsSection.style.display = 'block';
  }
};