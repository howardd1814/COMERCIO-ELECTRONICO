/*/* ================================
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
const completeProfileLink = document.getElementById("completeProfileLink");


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
let campaignImageBase64 = "";         // Para almacenar la imagen convertida a base64
let publicCampaigns = [];
let interactionHistory = JSON.parse(localStorage.getItem("interactionHistory")) || []; // Historial para recomendación (array de categorías)

// ---------------------------
// Utilidades para mostrar/ocultar elementos
// ---------------------------
function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
}

/**
 * Devuelve true si el user es patrocinador y tiene suscripción activa
 */
function tieneSubscripcionActiva(user) {
  return (
    user &&
    user.profile &&
    user.profile.userType === 'patrocinador' &&
    user.profile.subscriptionActive === true
  );
}

// ---------------------------
// Gestión de autenticación y carga de perfil
// ---------------------------
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    currentUser = {
      email: user.email,
      username: user.displayName || user.email,
      uid: user.uid,
      photoURL: user.photoURL,
      role: user.role
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
      sidebarUserRole.textContent = currentUser.profile.userType || currentUser.role || "Estudiante" ;
        //  A) Ocultar el "Crear campaña" de los patrocinadores
        if (currentUser.profile.userType === 'patrocinador' || currentUser.role=== 'patrocinador') {
          hideElement(panelCreateBtn);
          hideElement(navCampaignsBtn);
          hideElement(publicCreateBtn);
          hideElement(newCampaignForm);
          showElement(document.getElementById("subscriberBlock"));
          
        } else {
          showElement(panelCreateBtn);
          hideElement(document.getElementById("subscriberBlock"));
        }

        //  B) Configurar btnCampaigns como portal de campañas
        navCampaignsBtn.textContent = 
          currentUser.role === 'estudiante'
            ? 'Mis Campañas'
            : 'Explorar Campañas';

        navCampaignsBtn.dataset.section = 
          currentUser.role === 'estudiante'
            ? 'panel'
            : 'muro-publico';

        //  C) Oferta de suscripción: solo para patrocinadores sin subscripción
        if (currentUser.role === 'patrocinador' 
            && !currentUser.profile.subscriptionActive) {
          
          hideElement(navCampaignsBtn);
        } else {
          showElement(navCampaignsBtn);
        }

        completeProfileLink?.addEventListener("click", (e) => {
  e.preventDefault();
  
  // Recupera el usuario desde localStorage (asegúrate de que se guarde en 'loggedUser')
  const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
  if (!loggedUser|| loggedUser.role  || !loggedUser.currentUser.role) {
    alert("No se encontró información del usuario");
    return;
  }
  
  if(currentUser.role === 'patrocinador' || currentUser.profile.userType === 'patrocinador') {
        // Al hacer clic en el título, mostrar ficha técnica
      card.querySelector("h4").addEventListener("click", () => showDetailPaymentModal(campaign));
      
        const pubBtn = card.querySelector("[data-action='publicar']");
        if (pubBtn) {
          // Para campañas que requieren pago (solo estudiantes)
              pubBtn.addEventListener("click", () => showDetailPaymentModal(campaign.id));
            campaignList.appendChild(card);
        }

  }
  
  // Inyecta el HTML del formulario en el contenedor del modal
  const modalContainer = document.getElementById("extraDataModal");
  modalContainer.innerHTML = `
    <div class="bg-white p-6 rounded shadow-lg max-w-md w-full">
      <h3 class="text-xl font-bold mb-4">Completar Información</h3>
      <form id="profileExtraForm" class="space-y-4">
        ${formFields}
        <div class="flex justify-end gap-2">
          <button type="button" id="cancelExtraBtn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancelar</button>
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Guardar información</button>
        </div>
      </form>
    </div>
  `;
  
  // Muestra el modal removiendo la clase "hidden"
  modalContainer.classList.remove("hidden");
  
  // Evento para el botón "Cancelar" que cierra el modal
  document.getElementById("cancelExtraBtn").addEventListener("click", () => {
    modalContainer.classList.add("hidden");
  });
  
  const sponsorBlock = document.createElement('div');
    sponsorBlock.id = 'sponsorBlock';
    sponsorBlock.className = 'p-6 text-center bg-yellow-50 rounded shadow';
    sponsorBlock.innerHTML = `
      <p class="mb-4">
        Para explorar y apoyar campañas necesitas una suscripción activa.
      </p>
      <button id="subscribeBtn" class="bg-green-600 text-white px-4 py-2 rounded">
        Suscribirme
      </button>
    `;


  // Evento para el submit del formulario
  document.getElementById("profileExtraForm").addEventListener("submit", (evt) => {
    evt.preventDefault();
    
    // Recoger los datos del formulario
    const formData = new FormData(evt.target);
    const extraData = {};
    formData.forEach((value, key) => {
      extraData[key] = value.trim();
    });
    
    // Validación básica: se omiten los campos opcionales (telefono, portfolio, presupuesto)
    let valid = true;
    for (let [key, value] of Object.entries(extraData)) {
      if (!value && !["telefono", "portfolio", "presupuesto"].includes(key)) {
        valid = false;
        break;
      }
    }
    
    if (!valid) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }
    
    // Guarda la información en localStorage (o envíala al backend)
    const profileKey = `userProfile_${loggedUser.uid}`;
    localStorage.setItem(profileKey, JSON.stringify(extraData));
    alert("Información guardada correctamente.");
    
    // Oculta el modal
    modalContainer.classList.add("hidden");
  });
});
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
  const sidebarUserName = document.getElementById('sidebarUserName');
  if (sidebarUserName) {
    sidebarUserName.textContent = user.username;
  }
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

    showElement(document.getElementById("subscribeBtn"));

    // 3) Engancha el botón para invocar showDetailPaymentModal:
    const subscribeNowBtn = document.getElementById("subscribeBtn");
    subscribeNowBtn.addEventListener("click", () => {
      // Simulamos un "campaign" genérico para la suscripción
      const subscriptionCampaign = {
        id: "suscripcion",
        titulo: "Suscripción mensual",
        descripcion: "Acceso ilimitado a campañas públicas"
      };
      showDetailPaymentModal(subscriptionCampaign);
      
    });

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
        role: user.role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Error con Google:", err);
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

// ===============================
// GESTIÓN DE CAMPAÑAS Y PANEL DE USUARIOS
// ===============================

// --- Conversión de imagen a base64 ---
// El input file debe tener id="campaignImage" en el HTML.
const campaignImageInput = document.getElementById("campaignImage");
if (campaignImageInput) {
  campaignImageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = function () {
        campaignImageBase64 = reader.result;
        console.log("Imagen convertida a base64:", campaignImageBase64);
      };
      reader.readAsDataURL(file);
    }
  });
}

// --- Guardar Campaña como "Borrador" ---
// El formulario debe tener id="newCampaignForm".
newCampaignForm?.addEventListener("submit", e => {
  e.preventDefault();
  if (!currentUser) return;

  // Recoger los valores del formulario
  const titulo = e.target.titulo.value.trim();
  const descripcion = e.target.descripcion.value.trim();
  const meta = e.target.meta.value.trim();
  const video = e.target.video.value.trim();
  // Campos opcionales para filtrado (puedes agregarlos en el formulario):
  const categoria = e.target.categoria ? e.target.categoria.value.trim() : "general";
  const universidad = e.target.universidad ? e.target.universidad.value.trim() : "No definida";

  // Validación
  if (!titulo || !descripcion || !meta || !campaignImageBase64) {
    alert("Por favor completa todos los campos requeridos");
    return;
  }
  const metaNumber = parseFloat(meta);
  if (isNaN(metaNumber) || metaNumber <= 0) {
    alert("La meta debe ser un número positivo");
    return;
  }
  
  // Definir el estado. Si es una campaña de prueba (por ejemplo, título "Campaña de Prueba"), se guarda como publicada.
  let estadoDefault = "borrador";
  if (titulo === "Campaña de Prueba") {
    estadoDefault = "publicada";
  }

  // Armar el objeto campaña
  const campaignData = {
    id: editingCampaignId ? editingCampaignId : Date.now().toString(),
    creador: currentUser.email,
    titulo,
    descripcion,
    meta: metaNumber,
    imagen: campaignImageBase64,
    video,
    categoria,
    universidad,
    estado: editingCampaignId ? undefined : estadoDefault,
    vistas: editingCampaignId ? undefined : 0,
    aportes: editingCampaignId ? undefined : 0,
    createdAt: editingCampaignId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Recuperar campañas guardadas o iniciar arreglo vacío
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  if (editingCampaignId) {
  // Actualizamos la campaña manteniendo los valores originales que no queremos modificar (estado, vistas, aportes, createdAt)
  campaigns = campaigns.map(camp => {
    if (camp.id === editingCampaignId) {
      return {
        ...camp, // Conserva los valores existentes
        titulo,
        descripcion,
        meta: metaNumber,
        imagen: campaignImageBase64,
        video,
        categoria,
        universidad,
        updatedAt: new Date().toISOString()
      };
    }
    return camp;
  });
  alert("Campaña actualizada correctamente");
  editingCampaignId = null;
} else {
  campaigns.push({
    id: Date.now().toString(),
    creador: currentUser.email,
    titulo,
    descripcion,
    meta: metaNumber,
    imagen: campaignImageBase64,
    video,
    categoria,
    universidad,
    estado: estadoDefault,  // Donde 'estadoDefault' se define (por ejemplo, "borrador" o "publicada" en caso de campaña de prueba)
    vistas: 0,
    aportes: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  alert("Campaña guardada correctamente");
}

  localStorage.setItem("campaigns", JSON.stringify(campaigns));
  newCampaignForm.reset();
  campaignImageBase64 = "";
  hideElement(newCampaignForm);

  // Actualizar listas: para el creador (filtrado según estado) y para público
  loadUserCampaigns();
  loadPublicCampaigns();
});

// --- Cargar Campañas del Usuario (para estudiantes) ---
// Se muestran solo las campañas creadas por el usuario activo, filtradas por estado.
// Puedes invocar filterCampaignsByState("borrador") u otros según el botón seleccionado.
function loadUserCampaigns() {
  if (!currentUser) return;
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  // Por defecto, cargar "borrador"
  const userCampaigns = campaigns.filter(camp => camp.creador === currentUser.email && camp.estado === "borrador");
  campaignList.innerHTML = "";
  userCampaigns.forEach(campaign => {
    renderUserCampaignCard(campaign);
  });
}

// --- Función para filtrar campañas del estudiante ---
function filterCampaignsByState(estado) {
  if (!currentUser) return;
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  const userCampaigns = campaigns.filter(camp => camp.creador === currentUser.email && camp.estado === estado);
  campaignList.innerHTML = "";
  if (userCampaigns.length === 0) {
    campaignList.innerHTML = `<p class="text-center text-gray-500">No se encontraron campañas en estado "${estado}".</p>`;
  } else {
    userCampaigns.forEach(campaign => renderUserCampaignCard(campaign));
  }
}
// Listeners para botones de filtrado (asegúrate de tener estos IDs en el HTML)
document.getElementById("filterBorradores")?.addEventListener("click", () => filterCampaignsByState("borrador"));
document.getElementById("filterPublicadas")?.addEventListener("click", () => filterCampaignsByState("publicada"));
document.getElementById("filterFinalizadas")?.addEventListener("click", () => filterCampaignsByState("finalizada"));

// --- Renderizar Tarjeta de Campaña en el Panel del Creador ---
function renderUserCampaignCard(campaign) {
  const card = document.createElement("div");
  card.className = "border p-4 rounded shadow bg-gray-50 relative";
  card.innerHTML = `
    <h4 class="text-xl font-semibold text-blue-700 mb-1 cursor-pointer" data-id="${campaign.id}">${campaign.titulo}</h4>
    <p class="text-gray-700 text-sm mb-2">${campaign.descripcion.slice(0, 100)}...</p>
    <p class="text-sm text-green-700 font-medium">Meta: $${campaign.meta}</p>
    <div class="text-xs text-gray-500 mt-2">👁️ ${campaign.vistas || 0} visitas | 🤝 ${campaign.aportes || 0} aportes</div>
    <div class="flex gap-2 mt-3">
      <button class="bg-yellow-500 text-white px-3 py-1 rounded text-sm" data-action="edit" data-id="${campaign.id}">Editar</button>
      <button class="bg-red-600 text-white px-3 py-1 rounded text-sm" data-action="delete" data-id="${campaign.id}">Eliminar</button>
      ${campaign.estado === "borrador" ? `<button class="bg-blue-600 text-white px-3 py-1 rounded text-sm" data-action="publicar" data-id="${campaign.id}">Quiero hacerla pública</button>` : ""}
    </div>
  `;

  // Al hacer clic en el título, mostrar ficha técnica
  card.querySelector("h4").addEventListener("click", () => showCampaignDetails(campaign));
  card.querySelector("[data-action='edit']").addEventListener("click", () => editCampaign(campaign.id));
  card.querySelector("[data-action='delete']").addEventListener("click", () => deleteCampaign(campaign.id));
    
    const pubBtn = card.querySelector("[data-action='publicar']");
    if (pubBtn) {
      // Para campañas que requieren pago (solo estudiantes)
          pubBtn.addEventListener("click", () => showPaymentModal(campaign.id));
        campaignList.appendChild(card);
    }
  
}

// --- Editar Campaña ---
function editCampaign(id) {
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  const campaign = campaigns.find(camp => camp.id === id);
  if (!campaign || campaign.creador !== currentUser.email) return;
  newCampaignForm.titulo.value = campaign.titulo;
  newCampaignForm.descripcion.value = campaign.descripcion;
  newCampaignForm.meta.value = campaign.meta;
  // Para la imagen, se guarda en la variable global (no se puede asignar al input file)
  campaignImageBase64 = campaign.imagen;
  newCampaignForm.video.value = campaign.video || "";
  if (newCampaignForm.categoria) newCampaignForm.categoria.value = campaign.categoria || "";
  if (newCampaignForm.universidad) newCampaignForm.universidad.value = campaign.universidad || "";
  editingCampaignId = id;
  showElement(newCampaignForm);
}

// --- Eliminar Campaña ---
function deleteCampaign(id) {
  if (!confirm("¿Estás seguro de eliminar esta campaña?")) return;
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  campaigns = campaigns.filter(camp => camp.id !== id);
  localStorage.setItem("campaigns", JSON.stringify(campaigns));
  alert("Campaña eliminada");
  loadUserCampaigns();
  loadPublicCampaigns();
}

// --- Mostrar Ficha Técnica de la Campaña ---
// Al hacer clic en el título (en azul) se abre un modal con la ficha técnica.
function showCampaignDetails(campaign) {
  const modal = document.getElementById("campaignModal");
  modal.innerHTML = `
    <div class="bg-white p-6 rounded shadow-lg max-w-lg w-full">
      <h3 class="text-2xl font-bold mb-4">${campaign.titulo}</h3>
      <img src="${campaign.imagen}" alt="Imagen de ${campaign.titulo}" class="w-full h-60 object-cover rounded mb-4">
      <p class="mb-4">${campaign.descripcion}</p>
      <p class="font-semibold">Meta: $${campaign.meta}</p>
      ${campaign.video ? `<p class="mt-2">Video: <a href="${campaign.video}" target="_blank" class="text-blue-600 underline">Ver video</a></p>` : ""}
      <button id="closeCampaignModal" class="mt-4 bg-gray-300 text-gray-800 px-4 py-2 rounded">Cerrar</button>
    </div>
  `;
  showElement(modal);
  document.getElementById("closeCampaignModal").addEventListener("click", () => hideElement(modal));
}
  if (currentUser && currentUser.role.toLowerCase() === "estudiante") {
    showElement(document.getElementById("createCampaignSection"));
  } else {
    hideElement(document.getElementById("createCampaignSection"));
  }


function showPaymentModal(campaignId) {
  // Solo se debe mostrar para estudiantes, si ese es el comportamiento requerido
  const modal = document.getElementById("paymentModal");
  modal.innerHTML = `
    <div class="bg-white p-6 rounded shadow-lg max-w-md w-full">
      <p class="mb-4 text-center">Para publicar esta campaña debes pagar una suscripción mensual de 20.000 COP.</p>
      <div class="flex justify-end gap-2">
        <button id="cancelPayment" class="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancelar</button>
        <button id="payWithWompi" class="bg-green-600 text-white px-4 py-2 rounded">Pagar con Wompi</button>
      </div>
    </div>
  `;
  
  showElement(modal);
  
  document.getElementById("cancelPayment").addEventListener("click", () => hideElement(modal));
  
  document.getElementById("payWithWompi").addEventListener("click", () => {
    // Abrir la pasarela de pago en una nueva pestaña para no interrumpir el flujo
    window.open("https://checkout.wompi.co/l/test_VPOS_Em91ui", "_blank");
    // Simular el pago exitoso después de 3 segundos (puedes ajustar este tiempo)
    setTimeout(() => {
      // Actualizamos la campaña a "publicada"
      let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
      campaigns = campaigns.map(camp => {
        if (camp.id === campaignId) {
          camp.estado = "publicada";
          camp.updatedAt = new Date().toISOString();
        }
        return camp;
      });
      localStorage.setItem("campaigns", JSON.stringify(campaigns));
      alert("La campaña ha sido publicada.");
      hideElement(modal);
      // Actualizamos las listas: tanto la de campañas del creador como la pública
      loadUserCampaigns();
      loadPublicCampaigns();
    }, 100);
  });
}

function showDetailPaymentModal(campaign) {
  const modal = document.getElementById("paymentModal");
  const body  = modal.querySelector(".modal-body");
  body.innerHTML = `
    <div class="bg-white p-6 rounded shadow-lg max-w-md w-full">
      <p class="mb-4 text-center">
        Para ver los detalles de esta campaña, debes pagar 40.000 COP.
      </p>
      <div class="flex justify-end gap-2">
        <button id="cancelDetailPayment" class="bg-gray-300 px-4 py-2 rounded">Cancelar</button>
        <button id="payForDetails" class="bg-green-600 text-white px-4 py-2 rounded">
          Pagar 40.000 COP
        </button>
      </div>
    </div>
  `;
  showElement(modal);

  document.getElementById("cancelDetailPayment").onclick = () =>
    hideElement(modal);

  document.getElementById("payForDetails").onclick = () => {
    window.open("https://checkout.wompi.co/l/test_VPOS_Em91ui", "_blank");
    setTimeout(() => {
      // 1) Marcamos la suscripción activa
      currentUser.profile.subscriptionActive = true;
      const key  = `userProfile_${currentUser.uid}`;
      const extra = JSON.parse(localStorage.getItem(key)) || {};
      extra.subscriptionActive = true;
      localStorage.setItem(key, JSON.stringify(extra));

      // 2) Ocultamos el banner y el botón de suscripción
      hideElement(document.getElementById("subscriberBlock"));
      hideElement(document.getElementById("subscribeBtn"));

      // 3) Cerramos el modal y mostramos detalles
      hideElement(modal);
      alert("Pago exitoso. Ahora puedes ver los detalles.");
      showCampaignDetails(campaign);

      // 4) (Opcional) Recargamos campañas públicas o el panel de inversores
      loadPublicCampaigns();
    }, 3000);
  };
}


// --- Cargar Campañas Públicas ---
// Se muestran todas las campañas con estado "publicada" (de todos los usuarios).
function loadPublicCampaigns() {
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  // Filtra por campañas publicadas sin condición de creador
  let publicCampaigns = campaigns.filter(camp => camp.estado === "publicada");
  publicList.innerHTML = "";
  if (publicCampaigns.length === 0) {
    publicList.innerHTML = `<p class="text-center text-gray-500">Aún no hay campañas publicadas.</p>`;
  } else {
    publicCampaigns.forEach(campaign => renderPublicCampaignCard(campaign));
  }
}

// --- Renderizar Tarjeta de Campaña Pública ---
function renderPublicCampaignCard(campaign) {
  const div = document.createElement("div");
  div.className = "border rounded p-4 shadow mb-4";
  div.innerHTML = `
    <img src="${campaign.imagen}" alt="Imagen del proyecto ${campaign.titulo}" class="w-full h-40 object-cover rounded">
    <h3 class="font-bold text-lg mt-2 text-blue-700 cursor-pointer">${campaign.titulo}</h3>
    <p class="text-gray-700">${campaign.descripcion.slice(0, 100)}...</p>
    <p class="font-semibold">Meta: $${campaign.meta}</p>
  `;
    // --- Apoyar Emprendimiento (solo para patroc. con subscripción) ---
  if (currentUser?.profile.userType === 'patrocinador') {
    if (hasActiveSubscription(currentUser)) {
      const btnApoyar = document.createElement('button');
      btnApoyar.textContent = 'Apoyar emprendimiento';
      btnApoyar.className = 'bg-purple-600 text-white px-3 py-1 rounded mt-2';
      btnApoyar.addEventListener('click', () => {
        const supportKey = `apoyos_${campaign.id}_${currentUser.uid}`;
        if (!localStorage.getItem(supportKey)) {
          localStorage.setItem(
            supportKey,
            JSON.stringify({ date: Date.now() })
          );
          alert('¡Gracias por apoyar este emprendimiento!');
        } else {
          alert('Ya has apoyado este emprendimiento.');
        }
      });
      card.appendChild(btnApoyar);
    } else {
      const btnSub = document.createElement('button');
      btnSub.textContent = 'Suscribirme';
      btnSub.className = 'bg-green-600 text-white px-3 py-1 rounded mt-2';
      btnSub.addEventListener('click', () => {
        window.open(
          'https://checkout.wompi.co/l/test_VPOS_Em91ui',
          '_blank'
        );
      });
      card.appendChild(btnSub);
    }
  }

  // Título clickeable para ver detalles
  div.querySelector("h3").addEventListener("click", () => showCampaignDetails(campaign));
  // Si el usuario es patrocinador (inversionista), agregar botón "Apoyar proyecto"
    if (currentUser && currentUser.role === "patrocinador") {
        const apoyarBtn = document.createElement("button");
        apoyarBtn.textContent = "Apoyar proyecto";
        apoyarBtn.className = "bg-purple-600 text-white px-3 py-1 rounded mt-2";
        apoyarBtn.addEventListener("click", () => {
      let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
      campaigns = campaigns.map(camp => {
        if (camp.id === campaign.id) {
          camp.aportes = (camp.aportes || 0) + 1;
        }
        return camp;
      });
      localStorage.setItem("campaigns", JSON.stringify(campaigns));
      // Registrar la categoría en el historial de interacciones, para simular la recomendación
      interactionHistory.push(campaign.categoria);
      localStorage.setItem("interactionHistory", JSON.stringify(interactionHistory));
      alert("¡Gracias por apoyar el proyecto!");
      loadPublicCampaigns();
    });
    div.appendChild(apoyarBtn);
  }
  publicList.appendChild(div);
}

function loadInvestorPanel() {
  let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  // Se muestran todas las campañas que estén publicadas
  let visibleCampaigns = campaigns.filter(camp => camp.estado === "publicada");
  
  // Si tienes selectores de filtro, los aplicas
  const filtroCategoria = document.getElementById("filterCategoria")?.value || "";
  const filtroEstado = document.getElementById("filterEstado")?.value || "";
  const filtroUniversidad = document.getElementById("filterUniversidad")?.value || "";
  
  if (filtroCategoria) {
    visibleCampaigns = visibleCampaigns.filter(camp => camp.categoria === filtroCategoria);
  }
  if (filtroEstado) {
    visibleCampaigns = visibleCampaigns.filter(camp => camp.estado === filtroEstado);
  }
  if (filtroUniversidad) {
    visibleCampaigns = visibleCampaigns.filter(camp => camp.universidad === filtroUniversidad);
  }
  
  // (Opcional) Recomendación por afinidad
  let interactionHistory = JSON.parse(localStorage.getItem("interactionHistory")) || [];
  if (interactionHistory.length > 0) {
    const counts = {};
    interactionHistory.forEach(cat => { counts[cat] = (counts[cat] || 0) + 1; });
    const favoriteCategory = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    visibleCampaigns.sort((a, b) => {
      if (a.categoria === favoriteCategory && b.categoria !== favoriteCategory) return -1;
      if (b.categoria === favoriteCategory && a.categoria !== favoriteCategory) return 1;
      return 0;
    });
  }
  
  // Renderizar en el contenedor de inversión
  const container = document.getElementById("investorCampaignList");
  container.innerHTML = "";
  if (visibleCampaigns.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500">No se encontraron campañas.</p>`;
  } else {
    visibleCampaigns.forEach(camp => {
      const card = document.createElement("div");
      card.className = "border p-4 rounded shadow mb-4";
      card.innerHTML = `
        <h4 class="text-xl font-semibold text-blue-700 mb-1 cursor-pointer">${camp.titulo}</h4>
        <p class="text-gray-700">${camp.descripcion.slice(0, 100)}...</p>
        <p class="font-semibold">Meta: $${camp.meta}</p>
      `;
      card.querySelector("h4").addEventListener("click", () => showCampaignDetails(camp));
      const btnApoyar = document.createElement("button");
      btnApoyar.textContent = "Apoyar proyecto";
      btnApoyar.className = "bg-purple-600 text-white px-3 py-1 rounded mt-2";
      btnApoyar.addEventListener("click", () => {
        let campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
        campaigns = campaigns.map(campObj => {
          if (campObj.id === camp.id) {
            campObj.aportes = (campObj.aportes || 0) + 1;
          }
          return campObj;
        });
        localStorage.setItem("campaigns", JSON.stringify(campaigns));
        let interactionHistory = JSON.parse(localStorage.getItem("interactionHistory")) || [];
        interactionHistory.push(camp.categoria);
        localStorage.setItem("interactionHistory", JSON.stringify(interactionHistory));
        alert("¡Has apoyado el proyecto!");
        loadInvestorPanel();
      });
      card.appendChild(btnApoyar);
      container.appendChild(card);
    });
  }
}

// Asignar listeners para los selectores de filtro en el panel de inversores (si existen)
document.getElementById("filterCategoria")?.addEventListener("change", loadInvestorPanel);
document.getElementById("filterEstado")?.addEventListener("change", loadInvestorPanel);
document.getElementById("filterUniversidad")?.addEventListener("change", loadInvestorPanel);

if (currentUser && currentUser.role.toLowerCase() === "patrocinador") {
  loadInvestorPanel();
}

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

function verDetalleCampaña(id) {
  fetch('projects.json')
    .then(res => res.json())
    .then(data => {
      const proyecto = data.find(p => p.id === id);
      if (!proyecto) return alert('Campaña no encontrada');

      const detalle = document.getElementById('detalleContenido');
      detalle.innerHTML = `
        <h2 class="text-2xl font-bold text-blue-700">${proyecto.titulo}</h2>
        <p>${proyecto.descripcion}</p>
        ${proyecto.imagen ? `<img src="${proyecto.imagen}" alt="${proyecto.titulo}" class="w-full rounded">` : ''}
        ${proyecto.video ? `<iframe src="${proyecto.video}" class="w-full h-60 rounded" allowfullscreen></iframe>` : ''}
        <p><strong>Meta:</strong> $${proyecto.meta}</p>
        <p><strong>Recaudado:</strong> $${proyecto.recaudado || 0}</p>
        <p><strong>Categoría:</strong> ${proyecto.categoria || 'N/A'}</p>
        <p><strong>Universidad:</strong> ${proyecto.universidad || 'N/A'}</p>
        <button onclick="mostrarFormularioApoyo('${proyecto.id}')" class="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Apoyar este proyecto
        </button>
      `;
      document.getElementById('detalleModal').classList.remove('hidden');
    });
}

// Cerrar el modal
document.getElementById('cerrarDetalleBtn').addEventListener('click', () => {
  document.getElementById('detalleModal').classList.add('hidden');
});

// ----- Función para filtrar campañas por estado -----
function filtrarCampañasPorEstado(estado) {
  // Recupera el array de campañas de localStorage
  const campaigns = JSON.parse(localStorage.getItem("campaigns")) || [];
  let filtered = [];
  
  if (estado === "borrador") {
    // Mostrar solo las campañas del usuario activo con estado "borrador"
    if (currentUser) {
      filtered = campaigns.filter(camp => camp.estado === "borrador" && camp.creador === currentUser.email);
    } else {
      filtered = [];
    }
  } else {
    // Para "publicada" y "finalizada" mostrar campañas de todos los usuarios
    filtered = campaigns.filter(camp => camp.estado === estado);
  }
  
  // Actualiza el DOM en el contenedor asignado para los filtros
  const container = document.getElementById("campaignFilterResults");
  container.innerHTML = "";
  
  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500">No se encontraron campañas en estado "${estado}".</p>`;
  } else {
    filtered.forEach(camp => {
      // Se crea una tarjeta simple por campaña; puedes personalizar el markup según tu UI
      const card = document.createElement("div");
      card.className = "border p-4 rounded mb-2";
      card.innerHTML = `
        <h4 class="font-bold text-xl">${camp.titulo}</h4>
        <p>${camp.descripcion}</p>
        <p class="text-sm text-gray-500">Meta: $${camp.meta}</p>
        <p class="text-sm">Estado: ${camp.estado}</p>
      `;
      container.appendChild(card);
    });
  }
}

// ---------------------------
// Inicio de la aplicación
// ---------------------------
window.addEventListener("DOMContentLoaded", () => {
  setupAuthButtons();
  loadPublicCampaigns();
});
