/* ================================
   app.js - Versión actualizada con perfil de usuario
   y funcionalidad para crear campañas
   ================================ */

// Inicialización de Firebase (Firestore, Storage, Auth)
const db = firebase.firestore();
const storageRef = firebase.storage().ref();

/* ================================
   ELEMENTOS DEL DOM, SECCIONES Y VARIABLES GLOBALES
   ================================ */

// Secciones generales de la UI
const sections = {
  landing: document.getElementById('landing'),
  about: document.getElementById('about'),
  muro: document.getElementById('muro'),
  contact: document.getElementById('contact'),
  panel: document.getElementById('panel'),
  login: document.getElementById('login'),
  register: document.getElementById('register')
};

// Elementos de la cabecera y autenticación
const authButtons = document.getElementById('authButtons');
const userBox = document.getElementById('userBox');
const userNameLabel = document.getElementById('userNameLabel');
const userEmailLabel = document.getElementById('userEmailLabel');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');

// Formularios y listados de campañas
const newCampaignForm = document.getElementById('newCampaignForm'); // Formulario para crear/editar campaña
const campaignList = document.getElementById('campaignList');         // Lista de campañas del usuario (dashboard)
const publicList = document.getElementById('publicList');             // Lista de campañas públicas

// Modales para datos extra y postulación
const extraDataModal = document.getElementById('extraDataModal');
const extraDataForm = document.getElementById('extraDataForm');
const projectModal = document.getElementById('projectModal');
const applyMessage = document.getElementById('applyMessage');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Elementos adicionales:
// • Botón "Campañas" en la navegación (visible solo si el usuario está logueado)
const navCampaignsBtn = document.getElementById("btnCampaigns");
// • Botón "Crear Campaña" en el muro (visible solo si el usuario está logueado)
const publicCreateBtn = document.getElementById("createCampaignBtn");
// • Botón "Crear Campaña" en el panel de campañas (para desplegar el formulario)
const panelCreateBtn = document.getElementById("panelCreateBtn");

// Modal y formulario para editar perfil
const profileModal = document.getElementById("profileModal");
const profileForm = document.getElementById("profileForm");
const cancelProfileBtn = document.getElementById("cancelProfileBtn");
const editProfileBtn = document.getElementById("editProfileBtn");

let currentUser = null;
let editingCampaignId = null;
// Array para almacenar campañas públicas (para uso en el modal de postulación)
let publicCampaigns = [];

/* ================================
   FUNCIONES DE UTILIDAD: Mostrar/Ocultar Elementos
   ================================ */
function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
}

/* ================================
   GESTIÓN DE AUTENTICACIÓN
   ================================ */
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    // Construir el objeto currentUser y actualizar la UI
    currentUser = {
      email: user.email,
      username: user.displayName || user.email,
      uid: user.uid
    };
    showUserBox(currentUser);
    
    // Verificar si ya se ha guardado la información extendida (fecha de nacimiento, tipo de usuario)
    const profileKey = `userProfile_${currentUser.uid}`;
    let extraData = localStorage.getItem(profileKey);
    if (!extraData) {
      showExtraDataModal();
    } else {
      currentUser.profile = JSON.parse(extraData);
    }

    // Mostrar elementos solo para usuarios autenticados
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

/* Actualizar UI al iniciar sesión: muestra el nombre completo y carga campañas propias */
function showUserBox(user) {
  // Se muestra el nombre completo obtenido de displayName
  userNameLabel.textContent = user.username;
  // Actualizamos también el correo en el menú desplegable
  userEmailLabel.textContent = user.email;
  hideElement(authButtons);
  showElement(userBox);
  toggleSection('panel');
  loadUserCampaigns();
}

/* Función para cerrar sesión */
function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      currentUser = null;
      hideElement(userBox);
      showElement(authButtons);
      toggleSection('landing');
    })
    .catch(err => {
      console.error("Error al cerrar sesión:", err);
      alert("Error al cerrar sesión.");
    });
}

/* ================================
   NAVEGACIÓN ENTRE SECCIONES
   ================================ */
function toggleSection(sectionId) {
  Object.entries(sections).forEach(([key, section]) => {
    if (section) {
      if (key === sectionId) {
        // Si se intenta acceder al panel sin estar logueado, redirige al login
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

/* Configurar botones de navegación y de autenticación */
function setupAuthButtons() {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => toggleSection("login"));
  }
  if (registerBtn) {
    registerBtn.addEventListener("click", () => toggleSection("register"));
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

/* Asignar evento a elementos con data-section para la navegación */
document.querySelectorAll("[data-section]").forEach(el => {
  el.addEventListener("click", e => {
    const secId = e.currentTarget.getAttribute("data-section");
    if (secId) toggleSection(secId);
  });
});

/* Botón de logo: redirección a landing */
document.querySelector('[data-section="landing"]')?.addEventListener("click", () => {
  toggleSection("landing");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ================================
   LOGIN Y REGISTRO (Email/Contraseña y Google)
   ================================ */

// Inicio de sesión con email/contraseña
document.getElementById("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = e.target.username.value.trim();
  const password = e.target.password.value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// Registro con email/contraseña
document.getElementById("registerForm")?.addEventListener("submit", async e => {
  e.preventDefault();
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

// Inicio de sesión con Google
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

/* ================================
   FORMULARIO DE DATOS EXTRA TRAS LOGIN CON GOOGLE
   ================================ */
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
  hideExtraDataModal();
});

/* ================================
   GESTIÓN DE CAMPAÑAS (CREAR, EDITAR, ELIMINAR, PUBLICAR)
   ================================ */

// Manejo del formulario para crear o editar campañas (modo privado)
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
      // Si es creación nueva, se guarda como "privada"
      estado: editingCampaignId ? undefined : "privada",
      vistas: editingCampaignId ? undefined : 0,
      aportes: editingCampaignId ? undefined : 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: editingCampaignId
        ? undefined
        : firebase.firestore.FieldValue.serverTimestamp()
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

// Cargar campañas del usuario (dashboard)
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

// Renderizar cada campaña en el panel del usuario
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

// Función para editar una campaña: carga datos en el formulario
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

// Función para eliminar una campaña
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

// Función para publicar una campaña (cambiar estado a "publico")
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

/* ================================
   CAMPAÑAS PÚBLICAS Y MODAL DE POSTULACIÓN
   ================================ */
// Cargar campañas públicas (donde estado es "publico")
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

// Renderizar cada campaña pública en el muro
function renderPublicCampaignCard(campaign) {
  const div = document.createElement("div");
  div.className = "border rounded p-4 shadow";
  div.innerHTML = `
    <img src="${campaign.imagen}" alt="Imagen del proyecto ${campaign.titulo}" class="w-full h-40 object-cover rounded" />
    <h3 class="font-bold text-lg mt-2">${campaign.titulo}</h3>
    <p class="text-gray-700">${campaign.descripcion.slice(0, 100)}...</p>
    <button data-action="openModal" data-id="${campaign.id}" class="text-blue-600 underline mt-2" aria-label="Ver más detalles sobre la campaña ${campaign.titulo}">Ver más</button>
  `;
  div.querySelector("[data-action='openModal']").addEventListener("click", () => openCampaignModal(campaign.id));
  publicList.appendChild(div);
}

// Abrir el modal para postularse a una campaña
function openCampaignModal(id) {
  const campaign = publicCampaigns.find(x => x.id === id);
  if (!campaign) {
    alert("Campaña no encontrada");
    return;
  }
  document.getElementById("applyBtn").onclick = () => applyToCampaign(id);
  projectModal.classList.remove("hidden");
}

// Enviar la postulación a una campaña
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

// Cerrar el modal de postulación
cancelModalBtn?.addEventListener("click", () => {
  projectModal.classList.add("hidden");
});

/* ================================
   EVENTOS PARA BOTONES ADICIONALES
   ================================ */
// Botón "Crear Campaña" en el muro público: redirige al panel
document.getElementById("createCampaignBtn")?.addEventListener("click", () => {
  toggleSection("panel");
});

// Botón "Crear Campaña" en el panel: muestra/oculta el formulario de campaña
document.getElementById("panelCreateBtn")?.addEventListener("click", () => {
  if (newCampaignForm.classList.contains("hidden")) {
    showElement(newCampaignForm);
  } else {
    hideElement(newCampaignForm);
  }
});

/* ================================
   EDITAR PERFIL DE USUARIO
   ================================ */
// Al hacer clic en "Editar Perfil" del menú del usuario, se abre el modal de perfil
editProfileBtn?.addEventListener("click", () => {
  // Rellenar los campos del formulario con la información actual del usuario
  document.getElementById("profileName").value = currentUser.username;
  document.getElementById("profileEmail").value = currentUser.email;
  document.getElementById("profilePassword").value = ""; // dejar vacío para no cambiar
  showElement(profileModal);
});

// Cancelar edición de perfil
cancelProfileBtn?.addEventListener("click", () => {
  hideElement(profileModal);
});

// Gestión del formulario de edición de perfil
profileForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const newName = e.target.profileName.value.trim();
  const newPassword = e.target.profilePassword.value.trim();
  try {
    // Actualizar el nombre de usuario (displayName) si se cambió
    if (newName && newName !== currentUser.username) {
      await firebase.auth().currentUser.updateProfile({ displayName: newName });
      await db.collection("users").doc(currentUser.uid).update({
        username: newName
      });
      currentUser.username = newName;
      userNameLabel.textContent = newName;
    }
    // Actualizar la contraseña; solo se efectúa si el campo no está vacío
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

/* ================================
   INICIO DE LA APLICACIÓN
   ================================ */
window.addEventListener("DOMContentLoaded", () => {
  setupAuthButtons();
  loadPublicCampaigns();
});
