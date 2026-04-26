import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.findBeaches = function () {
  const budget = Number(document.getElementById("budget").value);
  const location = document.getElementById("location").value;
  const list = document.getElementById("beach-list");

  list.innerHTML = "";

  const beaches = [
    { name: "Basdaku Beach", price: 100, location: "south", image: "assets/images/beach1.jpg" },
    { name: "Panagsama Beach", price: 150, location: "south", image: "assets/images/beach2.jpg" },
    { name: "Bantayan Beach", price: 200, location: "north", image: "assets/images/beach3.jpg" },
    { name: "Malapascua Beach", price: 250, location: "north", image: "assets/images/beach4.jpg" }
  ];

  const filtered = beaches.filter(b => {
    const matchBudget = budget ? b.price <= budget : true;
    const matchLocation = location ? b.location === location : true;
    return matchBudget && matchLocation;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<p>No beaches found within your budget.</p>";
    return;
  }

  filtered.forEach(b => {
    list.innerHTML += `
      <div class="beach-card">
        <img src="${b.image}" alt="${b.name}">
        <div class="card-content">
          <h3>${b.name}</h3>
          <p>₱${b.price}</p>
          <p>${b.location.toUpperCase()}</p>
          <button class="reserve-btn" onclick="reserveBeach('${b.name}')">Reserve</button>
        </div>
      </div>
    `;
  });
};
const logoutBtn = document.querySelector(".logout-btn");

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out successfully");
    window.location.href = "login.html";
  } catch (error) {
    alert(error.message);
  }
});

function reserveBeach(name) {
  alert("Reservation for " + name + " coming soon!");
}