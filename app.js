/* ================================
   app.js - Versión actualizada para el prototipo con campaña
   ================================ */

// Inicialización de Firebase (Firestore, Storage, Auth)
const db = firebase.firestore();
const storageRef = firebase.storage().ref();

/* ================================
   ELEMENTOS DEL DOM, SECCIONES Y VARIABLES GLOBALES
   ================================ */

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

const newCampaignForm = document.getElementById('newCampaignForm');
const campaignList = document.getElementById('campaignList');
const publicList = document.getElementById('publicList');

const extraDataModal = document.getElementById('extraDataModal');
const extraDataForm = document.getElementById('extraDataForm');

const projectModal = document.getElementById('projectModal');
const applyMessage = document.getElementById('applyMessage');
const cancelModalBtn = document.getElementById('cancelModalBtn');

let currentUser = null;
let editingCampaignId = null;
// Array para almacenar campañas públicas (para uso en el modal de postulación)
let publicCampaigns = [];

/* ================================
   AUTENTICACIÓN CON FIREBASE Y RECOLECCIÓN DE DATOS EXTRA
   ================================ */

firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    // Construimos el objeto currentUser y mostramos la UI correspondiente
    currentUser = {
      email: user.email,
      username: user.displayName || user.email,
      uid: user.uid
    };
    showUserBox(currentUser);
    
    // Verificamos si ya se ha guardado la información extendida
    const profileKey = `userProfile_${currentUser.uid}`;
    let extraData = localStorage.getItem(profileKey);
    if (!extraData) {
      // Si no existe, mostramos el modal para solicitar fecha de nacimiento y tipo de usuario
      showExtraDataModal();
    } else {
      currentUser.profile = JSON.parse(extraData);
    }
  } else {
    currentUser = null;
    toggleSection('landing');
  }
});

/* Mostrar la información del usuario en la cabecera y cargar las campañas propias */
function showUserBox(user) {
  userNameLabel.textContent = user.username;
  userEmailLabel.textContent = user.email;
  authButtons.classList.add('hidden');
  userBox.classList.remove('hidden');
  toggleSection('panel');
  loadUserCampaigns();
}

/* Cerrar sesión */
function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      currentUser = null;
      userBox.classList.add('hidden');
      authButtons.classList.remove('hidden');
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

/* Configurar botones de navegación y autenticación */
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

/* Botón del logo/redirección a inicio */
document.querySelector('[data-section="landing"]')?.addEventListener("click", () => {
  toggleSection("landing");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ================================
   LOGIN Y REGISTRO CON EMAIL/CONTRASEÑA y Google
   ================================ */

// Inicio de sesión con email/contraseña
document.getElementById("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = e.target.username.value.trim();
  const password = e.target.password.value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    // onAuthStateChanged actualizará la UI
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// Registro de usuario con email/contraseña
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
    const userCredential = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: username });
    // Guardamos información mínima en Firestore
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
    // onAuthStateChanged actualizará la UI y pedirá datos extra si es necesario
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
  // Agregamos "subscriptionActive" en false por defecto
  const extraData = {
    birthdate,
    userType,
    subscriptionActive: false
  };
  const profileKey = `userProfile_${currentUser.uid}`;
  localStorage.setItem(profileKey, JSON.stringify(extraData));
  currentUser.profile = extraData;
  hideExtraDataModal();
});

/* ================================
   GESTIÓN DE CAMPAÑAS (CREAR, EDITAR, ELIMINAR, PUBLICAR)
   ================================ */

// Manejo del formulario para crear o editar campañas (modo privado inicial)
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
      // Al crear una campaña nueva, se guarda como "privado"
      estado: editingCampaignId ? undefined : "privado",
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
    loadUserCampaigns();
    loadPublicCampaigns();
  } catch (err) {
    console.error(err);
    alert("Error al guardar la campaña");
  }
});

// Cargar las campañas del usuario (dashboard)
async function loadUserCampaigns() {
  if (!currentUser) return;
  try {
    const snapshot = await db
      .collection("campaigns")
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

// Renderiza cada tarjeta de campaña en el panel del usuario
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

// Función para editar una campaña (cargando datos en el formulario)
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
  // Solo se permite publicar si el usuario cuenta con una suscripción activa
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

// Cargar las campañas públicas (donde estado es "publico")
async function loadPublicCampaigns() {
  try {
    const snapshot = await db
      .collection("campaigns")
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

// Renderizar cada campaña en el muro público
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

/* Cerrar el modal de postulación */
cancelModalBtn?.addEventListener("click", () => {
  projectModal.classList.add("hidden");
});

/* ================================
   EVENTOS PARA BOTONES ADICIONALES
   ================================ */

// Botón para "Crear Campaña" en el muro público (redirecciona al panel)
document.getElementById("createCampaignBtn")?.addEventListener("click", () => {
  toggleSection("panel");
});

/* ================================
   INICIO DE LA APLICACIÓN
   ================================ */

window.addEventListener("DOMContentLoaded", () => {
  setupAuthButtons();
  loadPublicCampaigns();
});
