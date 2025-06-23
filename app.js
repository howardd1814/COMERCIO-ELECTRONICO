/* ================================
   app.js - Versión consolidada y actualizada
   Integrando autenticación, gestión de campañas,
   edición de perfil y manejo de foto de perfil
   ================================ */

// Inicialización de Firebase (Firestore, Storage, Auth)
const db = firebase.firestore();
const storageRef = firebase.storage().ref();

// ---------------------------
// Elementos del DOM y Variables Globales
// ---------------------------
const sections = {
  landing: document.getElementById('landing'),
  about: document.getElementById('about'),
  muro: document.getElementById('muro'),
  contact: document.getElementById('contact'),
  panel: document.getElementById('panel'),
  login: document.getElementById('login'),
  register: document.getElementById('register')
};

const authButtons = document.getElementById('authButtons');
const userBox = document.getElementById('userBox');
const userNameLabel = document.getElementById('userNameLabel');
const userEmailLabel = document.getElementById('userEmailLabel');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');

// Formularios y listados
const newCampaignForm = document.getElementById('newCampaignForm');
const campaignList = document.getElementById('campaignList');
const publicList = document.getElementById('publicList');

// Modales y formularios adicionales
const extraDataModal = document.getElementById('extraDataModal');
const extraDataForm = document.getElementById('extraDataForm');
const projectModal = document.getElementById('projectModal');
const applyMessage = document.getElementById('applyMessage');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Botones visibles solo para usuarios autenticados
const navCampaignsBtn = document.getElementById("btnCampaigns");
const publicCreateBtn = document.getElementById("createCampaignBtn");
const panelCreateBtn = document.getElementById("panelCreateBtn");

// Elementos para editar perfil
const profileModal = document.getElementById("profileModal");
const profileForm = document.getElementById("profileForm");
const cancelProfileBtn = document.getElementById("cancelProfileBtn");
const editProfileBtn = document.getElementById("editProfile");

// Elementos para cambiar foto de perfil
const userAvatar = document.getElementById("userAvatar");
const userPhoto = document.getElementById("userPhoto");
const defaultAvatar = document.getElementById("defaultAvatar");
const sidebarUserPhoto = document.getElementById("sidebarUserPhoto");
const sidebarDefaultAvatar = document.getElementById("sidebarDefaultAvatar");
const sidebarUserRole = document.getElementById("sidebarUserRole");
const changeProfilePhotoLink = document.getElementById("changeProfilePhotoLink");
const changePhotoModal = document.getElementById("changePhotoModal");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const cancelPhotoBtn = document.getElementById("cancelPhotoBtn");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");

// Estado de la aplicación
let currentUser = null;
let editingCampaignId = null;
let publicCampaigns = [];

// ---------------------------
// Utilidades para mostrar/ocultar elementos
// ---------------------------
function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
}

// ---------------------------
// Gestión de autenticación y carga de perfil
// ---------------------------
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    currentUser = {
      email: user.email,
      username: user.displayName || user.email,
      uid: user.uid
    };
    // Actualiza la interfaz con el nombre completo y correo
    showUserBox(currentUser);
    
    // Mostrar foto de perfil: si existe foto (almacenada, por ejemplo, en currentUser.photoURL)
    if (user.photoURL) {
      userPhoto.src = user.photoURL;
      showElement(userPhoto);
      hideElement(defaultAvatar);
      sidebarUserPhoto.src = user.photoURL;
      showElement(sidebarUserPhoto);
      hideElement(sidebarDefaultAvatar);
    } else {
      // Si no hay foto, mostrar un avatar por defecto con las iniciales
      const initials = currentUser.username.split(" ").map(n => n[0]).join("").toUpperCase();
      defaultAvatar.textContent = initials;
      sidebarDefaultAvatar.textContent = initials;
      hideElement(userPhoto);
      showElement(defaultAvatar);
      hideElement(sidebarUserPhoto);
      showElement(sidebarDefaultAvatar);
    }
    
    // Verificar datos extendidos (por ejemplo, para roles)
    const profileKey = `userProfile_${currentUser.uid}`;
    let extraData = localStorage.getItem(profileKey);
    if (!extraData) {
      showExtraDataModal();
    } else {
      currentUser.profile = JSON.parse(extraData);
      // Actualizar el rol real en el sidebar
      sidebarUserRole.textContent = currentUser.profile.userType || currentUser.role || "Estudiante";
    }
    showElement(navCampaignsBtn);
    showElement(publicCreateBtn);
  } else {
    currentUser = null;
    hideElement(navCampaignsBtn);
    hideElement(publicCreateBtn);
    hideElement(newCampaignForm);
    toggleSection('landing');
  }
});

function showUserBox(user) {
  userNameLabel.textContent = user.username;
  userEmailLabel.textContent = user.email;
  hideElement(authButtons);
  showElement(userBox);
  toggleSection('panel');
  loadUserCampaigns();
}

function logout() {
  firebase.auth().signOut().then(() => {
    currentUser = null;
    hideElement(userBox);
    showElement(authButtons);
    toggleSection('landing');
  }).catch(err => {
    console.error("Error al cerrar sesión:", err);
    alert("Error al cerrar sesión.");
  });
}

// ---------------------------
// Navegación entre secciones
// ---------------------------
function toggleSection(sectionId) {
  Object.entries(sections).forEach(([key, section]) => {
    if (section) {
      if (key === sectionId) {
        if (key === "panel" && !currentUser) {
          toggleSection("login");
        } else {
          section.classList.remove("hidden");
        }
      } else {
        section.classList.add("hidden");
      }
    }
  });
}

function setupAuthButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      // Al hacer clic en login, ocultar secciones de campañas
      toggleSection("login");
      hideElement(publicList);
      hideElement(document.getElementById("panel"));
    });
  }
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      // Al hacer clic en registro, ocultar campañas
      toggleSection("register");
      hideElement(publicList);
      hideElement(document.getElementById("panel"));
    });
  }
  const userMenuBtn = document.getElementById("userMenuBtn");
  if (userMenuBtn) {
    userMenuBtn.addEventListener("click", () => {
      userDropdown.classList.toggle("hidden");
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

document.querySelectorAll("[data-section]").forEach(el => {
  el.addEventListener("click", e => {
    const secId = e.currentTarget.getAttribute("data-section");
    if (secId) toggleSection(secId);
  });
});

document.querySelector('[data-section="landing"]')?.addEventListener("click", () => {
  toggleSection("landing");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------------------------
// Login y Registro
// ---------------------------
document.getElementById("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  // Al iniciar sesión, ocultar secciones de campañas
  toggleSection("login");
  hideElement(publicList);
  hideElement(document.getElementById("panel"));
  const email = e.target.username.value.trim();
  const password = e.target.password.value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

document.getElementById("registerForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  // Ocultar paneles de campaña
  hideElement(publicList);
  hideElement(document.getElementById("panel"));
  const username = e.target.username.value.trim();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;
  const role = e.target.role?.value || "estudiante";
  if (!username || !email || !password) {
    alert("Todos los campos son obligatorios");
    return;
  }
  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: username });
    await db.collection("users").doc(userCredential.user.uid).set({
      username,
      email,
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Registro exitoso");
    toggleSection("login");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

document.getElementById("googleBtn")?.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await firebase.auth().signInWithPopup(provider);
    const user = result.user;
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection("users").doc(user.uid).set({
        username: user.displayName,
        email: user.email,
        role: "estudiante",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Error con Google:", err);
    alert("Error en inicio de sesión con Google");
  }
});

// ---------------------------
// Datos extra tras Login (si es necesario)
// ---------------------------
function showExtraDataModal() {
  extraDataModal.classList.remove("hidden");
}
function hideExtraDataModal() {
  extraDataModal.classList.add("hidden");
}
extraDataForm?.addEventListener("submit", e => {
  e.preventDefault();
  const birthdate = e.target.birthdate.value;
  const userType = e.target.userType.value;
  const extraData = { birthdate, userType, subscriptionActive: false };
  const profileKey = `userProfile_${currentUser.uid}`;
  localStorage.setItem(profileKey, JSON.stringify(extraData));
  currentUser.profile = extraData;
  // Actualizar rol real en el sidebar
  sidebarUserRole.textContent = userType;
  hideExtraDataModal();
});

// ---------------------------
// Gestión de Campañas (Crear, Editar, Eliminar, Publicar)
// ---------------------------
newCampaignForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const titulo = e.target.titulo.value.trim();
  const descripcion = e.target.descripcion.value.trim();
  const meta = e.target.meta.value.trim();
  const imagen = e.target.imagen.value.trim();
  const video = e.target.video.value.trim();
  if (!titulo || !descripcion || !meta || !imagen) {
    alert("Por favor completa todos los campos requeridos");
    return;
  }
  const metaNumber = parseFloat(meta);
  if (isNaN(metaNumber) || metaNumber <= 0) {
    alert("La meta debe ser un número positivo");
    return;
  }
  try {
    const campaignData = {
      creador: currentUser.email,
      titulo,
      descripcion,
      meta: metaNumber,
      imagen,
      video,
      estado: editingCampaignId ? undefined : "privada",
      vistas: editingCampaignId ? undefined : 0,
      aportes: editingCampaignId ? undefined : 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: editingCampaignId ? undefined : firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editingCampaignId) {
      await db.collection("campaigns").doc(editingCampaignId).update(campaignData);
      alert("Campaña actualizada correctamente");
      editingCampaignId = null;
    } else {
      await db.collection("campaigns").add(campaignData);
      alert("Campaña guardada correctamente");
    }
    newCampaignForm.reset();
    hideElement(newCampaignForm);
    loadUserCampaigns();
    loadPublicCampaigns();
  } catch (err) {
    console.error(err);
    alert("Error al guardar la campaña");
  }
});

async function loadUserCampaigns() {
  if (!currentUser) return;
  try {
    const snapshot = await db.collection("campaigns")
                              .where("creador", "==", currentUser.email)
                              .get();
    campaignList.innerHTML = "";
    snapshot.forEach(doc => {
      const campaign = { id: doc.id, ...doc.data() };
      renderUserCampaignCard(campaign);
    });
  } catch (err) {
    console.error(err);
  }
}

function renderUserCampaignCard(campaign) {
  const card = document.createElement("div");
  card.className = "border p-4 rounded shadow bg-gray-50 relative";
  card.innerHTML = `
    <h4 class="text-xl font-semibold text-blue-700 mb-1">${campaign.titulo}</h4>
    <p class="text-gray-700 text-sm mb-2">${campaign.descripcion}</p>
    <p class="text-sm text-green-700 font-medium">Meta: $${campaign.meta}</p>
    <div class="text-xs text-gray-500 mt-2">👁️ ${campaign.vistas || 0} visitas | 🤝 ${campaign.aportes || 0} aportes</div>
    <div class="flex gap-2 mt-3">
      <button class="bg-yellow-500 text-white px-3 py-1 rounded text-sm" data-action="edit" data-id="${campaign.id}" aria-label="Editar campaña ${campaign.titulo}">Editar</button>
      <button class="bg-red-600 text-white px-3 py-1 rounded text-sm" data-action="delete" data-id="${campaign.id}" aria-label="Eliminar campaña ${campaign.titulo}">Eliminar</button>
      ${currentUser.profile && currentUser.profile.subscriptionActive ? `<button class="bg-blue-600 text-white px-3 py-1 rounded text-sm" data-action="publish" data-id="${campaign.id}" aria-label="Publicar campaña ${campaign.titulo}">Publicar</button>` : ""}
    </div>
  `;
  card.querySelector("[data-action='edit']").addEventListener("click", () => editCampaign(campaign.id));
  card.querySelector("[data-action='delete']").addEventListener("click", () => deleteCampaign(campaign.id));
  const publishBtn = card.querySelector("[data-action='publish']");
  if (publishBtn) {
    publishBtn.addEventListener("click", () => publishCampaign(campaign.id));
  }
  campaignList.appendChild(card);
}

async function editCampaign(id) {
  try {
    const doc = await db.collection("campaigns").doc(id).get();
    const campaign = { id: doc.id, ...doc.data() };
    if (!campaign || campaign.creador !== currentUser.email) return;
    newCampaignForm.titulo.value = campaign.titulo;
    newCampaignForm.descripcion.value = campaign.descripcion;
    newCampaignForm.meta.value = campaign.meta;
    newCampaignForm.imagen.value = campaign.imagen;
    newCampaignForm.video.value = campaign.video || "";
    editingCampaignId = id;
    showElement(newCampaignForm);
  } catch (err) {
    console.error(err);
  }
}

async function deleteCampaign(id) {
  if (!confirm("¿Estás seguro de eliminar esta campaña?")) return;
  try {
    await db.collection("campaigns").doc(id).delete();
    alert("Campaña eliminada");
    loadUserCampaigns();
    loadPublicCampaigns();
  } catch (err) {
    console.error(err);
    alert("Error al eliminar la campaña");
  }
}

async function publishCampaign(id) {
  if (!(currentUser.profile && currentUser.profile.subscriptionActive)) {
    alert("No tienes suscripción activa para publicar campañas.");
    return;
  }
  try {
    await db.collection("campaigns").doc(id).update({
      estado: "publico",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Campaña publicada");
    loadUserCampaigns();
    loadPublicCampaigns();
  } catch (err) {
    console.error(err);
    alert("Error al publicar la campaña");
  }
}

// ---------------------------
// Campañas Públicas y Modal de Postulación
// ---------------------------
async function loadPublicCampaigns() {
  try {
    const snapshot = await db.collection("campaigns")
                             .where("estado", "==", "publico")
                             .get();
    publicList.innerHTML = "";
    publicCampaigns = [];
    snapshot.forEach(doc => {
      const campaign = { id: doc.id, ...doc.data() };
      publicCampaigns.push(campaign);
      renderPublicCampaignCard(campaign);
    });
    if (publicList.innerHTML.trim() === "") {
      publicList.innerHTML = `<p class="text-center text-gray-500">Aún no hay campañas disponibles.</p>`;
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPublicCampaignCard(campaign) {
  const div = document.createElement("div");
  div.className = "border rounded p-4 shadow";
  div.innerHTML = `
    <img src="${campaign.imagen}" alt="Imagen del proyecto ${campaign.titulo}" class="w-full h-40 object-cover rounded">
    <h3 class="font-bold text-lg mt-2">${campaign.titulo}</h3>
    <p class="text-gray-700">${campaign.descripcion.slice(0, 100)}...</p>
    <button data-action="openModal" data-id="${campaign.id}" class="text-blue-600 underline mt-2" aria-label="Ver más detalles sobre la campaña ${campaign.titulo}">Ver más</button>
  `;
  div.querySelector("[data-action='openModal']").addEventListener("click", () => openCampaignModal(campaign.id));
  publicList.appendChild(div);
}

function openCampaignModal(id) {
  const campaign = publicCampaigns.find(x => x.id === id);
  if (!campaign) {
    alert("Campaña no encontrada");
    return;
  }
  document.getElementById("applyBtn").onclick = () => applyToCampaign(id);
  projectModal.classList.remove("hidden");
}

async function applyToCampaign(campaignId) {
  const message = applyMessage.value;
  if (!currentUser) {
    alert("Debes iniciar sesión para postularte");
    return;
  }
  try {
    await db.collection("applications").add({
      campaignId,
      applicant: currentUser.email,
      message,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Postulación enviada");
    applyMessage.value = "";
    projectModal.classList.add("hidden");
  } catch (err) {
    console.error(err);
    alert("Error al enviar la postulación");
  }
}

cancelModalBtn?.addEventListener("click", () => {
  projectModal.classList.add("hidden");
});

// ---------------------------
// Botones para mostrar formularios y secciones
// ---------------------------
document.getElementById("createCampaignBtn")?.addEventListener("click", () => {
  toggleSection("panel");
});

panelCreateBtn?.addEventListener("click", () => {
  if (newCampaignForm.classList.contains("hidden")) {
    showElement(newCampaignForm);
  } else {
    hideElement(newCampaignForm);
  }
});

// ---------------------------
// Gestión del Perfil: Editar y Cambiar Foto
// ---------------------------
editProfileBtn?.addEventListener("click", () => {
  document.getElementById("profileName").value = currentUser.username;
  document.getElementById("profileEmail").value = currentUser.email;
  document.getElementById("profilePassword").value = "";
  showElement(profileModal);
});

cancelProfileBtn?.addEventListener("click", () => {
  hideElement(profileModal);
});

profileForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const newName = document.getElementById("profileName").value.trim();
  const newPassword = document.getElementById("profilePassword").value.trim();
  try {
    if (newName && newName !== currentUser.username) {
      await firebase.auth().currentUser.updateProfile({ displayName: newName });
      await db.collection("users").doc(currentUser.uid).update({ username: newName });
      currentUser.username = newName;
      userNameLabel.textContent = newName;
      document.getElementById("sidebarUserName").textContent = newName;
    }
    if (newPassword) {
      await firebase.auth().currentUser.updatePassword(newPassword);
    }
    alert("Perfil actualizado correctamente");
    hideElement(profileModal);
  } catch (err) {
    console.error(err);
    alert("Error al actualizar el perfil");
  }
});

// Abrir modal para cambiar foto de perfil
changeProfilePhotoLink?.addEventListener("click", (e) => {
  e.preventDefault();
  showElement(changePhotoModal);
});

// Cancelar cambio de foto
cancelPhotoBtn?.addEventListener("click", () => {
  hideElement(changePhotoModal);
});

// Subir foto de perfil (simulación básica, esta lógica debería ajustarse a tu backend o Storage)
uploadPhotoBtn?.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) {
    alert("Selecciona una imagen primero");
    return;
  }
  try {
    const ref = storageRef.child(`profiles/${currentUser.uid}/${Date.now()}_${file.name}`);
    await ref.put(file);
    const photoURL = await ref.getDownloadURL();
    await firebase.auth().currentUser.updateProfile({ photoURL });
    // Actualizamos la UI: mostramos la foto y ocultamos el avatar por defecto
    userPhoto.src = photoURL;
    showElement(userPhoto);
    hideElement(defaultAvatar);
    sidebarUserPhoto.src = photoURL;
    showElement(sidebarUserPhoto);
    hideElement(sidebarDefaultAvatar);
    hideElement(changePhotoModal);
    alert("Foto de perfil actualizada");
  } catch (err) {
    console.error(err);
    alert("Error al actualizar la foto de perfil");
  }
});

// ---------------------------
// Inicio de la aplicación
// ---------------------------
window.addEventListener("DOMContentLoaded", () => {
  setupAuthButtons();
  loadPublicCampaigns();
});
