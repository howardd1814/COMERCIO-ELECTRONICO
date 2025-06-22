// ============================================
// app.js - Versión Actualizada
// ============================================

// Variables globales
let currentUser = null; // Datos del usuario autenticado
let publicCampaigns = []; // Campañas públicas (de otros estudiantes)
let myCampaigns = [];     // Campañas propias del usuario

// Se espera que Firebase ya esté inicializado en el HTML
const db = firebase.firestore();
const storageRef = firebase.storage().ref();

// --------------------------------------------
// Manejo de Sesión: onAuthStateChanged
// --------------------------------------------
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    const uid = user.uid;
    db.collection("users").doc(uid)
      .get()
      .then((doc) => {
        let userData = {};
        if (doc.exists) {
          userData = doc.data();
        }
        // Si el usuario (por ejemplo, Google) no tiene rol definido, mostrar modal
        if (!userData.role) {
          showRoleSelectionModal();
        }
        currentUser = {
          uid: uid,
          email: user.email,
          username: user.displayName || user.email,
          role: userData.role || null
        };
        updateUIForLoggedInUser();
      })
      .catch((err) => {
        console.error("Error al obtener datos del usuario:", err);
      });
  } else {
    currentUser = null;
    hideUserUI();
    toggleSection("landing");
  }
});

// --------------------------------------------
// Funciones para actualizar la UI según el estado
// --------------------------------------------
function updateUIForLoggedInUser() {
  document.getElementById("userNameLabel").textContent = currentUser.username;
  document.getElementById("userEmailLabel").textContent = currentUser.email;
  document.getElementById("authButtons").classList.add("hidden");
  document.getElementById("userBox").classList.remove("hidden");
  
  // Si el usuario es Estudiante, se muestra el botón "Crear campaña" y el panel correspondiente
  if (currentUser.role === "estudiante") {
    document.getElementById("createCampaignBtn").classList.remove("hidden");
    toggleSection("student-panel");
    loadMyCampaigns();
    showCampaignForm(); // Muestra el formulario extendido de campaña
  } else {
    // Para otros roles, se redirige a otra sección, por ejemplo, a "projects"
    toggleSection("projects");
  }
}

function hideUserUI() {
  document.getElementById("authButtons").classList.remove("hidden");
  document.getElementById("userBox").classList.add("hidden");
}

// --------------------------------------------
// Modal de Selección de Rol
// --------------------------------------------
function showRoleSelectionModal() {
  document.getElementById("roleSelectionModal").classList.remove("hidden");
}
function hideRoleSelectionModal() {
  document.getElementById("roleSelectionModal").classList.add("hidden");
}

document.getElementById("selectEstudianteBtn")?.addEventListener("click", () => {
  assignRoleToUser("estudiante");
});
document.getElementById("selectPatrocinadorBtn")?.addEventListener("click", () => {
  assignRoleToUser("patrocinador");
});

function assignRoleToUser(role) {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid).set({ role: role }, { merge: true })
    .then(() => {
      currentUser.role = role;
      hideRoleSelectionModal();
      updateUIForLoggedInUser();
    })
    .catch((err) => {
      console.error("Error al asignar el rol:", err);
      alert("No se pudo asignar el rol, intente de nuevo.");
    });
}

// --------------------------------------------
// Navegación entre secciones
// --------------------------------------------
function toggleSection(sectionId) {
  const sections = document.querySelectorAll("main > section");
  sections.forEach((sec) => {
    if (sec.id === sectionId) {
      sec.classList.remove("hidden");
    } else {
      sec.classList.add("hidden");
    }
  });
}

// --------------------------------------------
// Asignación de eventos tras cargar el DOM
// --------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Inicio de sesión
  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
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

  // Registro
  document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    const role = e.target.role?.value; // Se asigna en el formulario de registro
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
      await firebase.auth().signInWithPopup(provider);
      // onAuthStateChanged se encargará de actualizar la UI; si no hay rol, aparece el modal.
    } catch (err) {
      console.error("Error con Google:", err);
      alert("Fallo el inicio de sesión con Google");
    }
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    firebase.auth().signOut().catch((err) => {
      console.error("Error al cerrar sesión:", err);
      alert("Error al cerrar sesión");
    });
  });

  // Menú de usuario
  document.getElementById("userMenuBtn")?.addEventListener("click", () => {
    document.getElementById("userDropdown").classList.toggle("hidden");
  });

  // Navegación: botones con atributo data-section
  document.querySelectorAll("[data-section]")?.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const secId = e.currentTarget.getAttribute("data-section");
      if (secId) toggleSection(secId);
    });
  });
});

// --------------------------------------------
// Campaña: Mostrar formulario extendido
// --------------------------------------------
function showCampaignForm() {
  const formContainer = document.getElementById("campaign-form-container");
  formContainer.classList.remove("hidden");
  // Nota: Si usabas un botón de "pagar suscripción", aquí se omite para mostrar el formulario de inmediato.
}

// Manejo del formulario para crear/editar campaña
document.getElementById("campaign-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  // Recoger datos extendidos del formulario
  const title = document.getElementById("campaign-title").value.trim();
  const description = document.getElementById("campaign-description").value.trim();
  const goal = document.getElementById("campaign-goal").value.trim();
  const image = document.getElementById("campaign-image").value.trim();
  const video = document.getElementById("campaign-video").value.trim();
  const sector = document.getElementById("campaign-sector").value.trim();
  const anio = document.getElementById("campaign-anio").value.trim();
  const website = document.getElementById("campaign-web").value.trim();
  
  if (!title || !description || !goal || !image || !sector || !anio) {
    alert("Complete todos los campos obligatorios");
    return;
  }
  
  const campaignData = {
    title,
    description,
    goal: parseFloat(goal),
    image,
    video,
    sector,
    anio: parseInt(anio),
    website,
    user: currentUser.email,
    isPublic: false, // Se guarda inicialmente como privada
    views: 0,
    contributions: Math.floor(Math.random() * 20),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    const formEl = document.getElementById("campaign-form");
    if (formEl.getAttribute("data-editing-id")) {
      // Actualizar campaña existente
      const campaignId = formEl.getAttribute("data-editing-id");
      await db.collection("projects").doc(campaignId).update(campaignData);
      alert("Campaña actualizada correctamente");
      formEl.removeAttribute("data-editing-id");
    } else {
      // Crear nueva campaña
      await db.collection("projects").add(campaignData);
      alert("Campaña creada (privada) correctamente");
    }
    formEl.reset();
    loadMyCampaigns();
  } catch (err) {
    console.error(err);
    alert("Error al guardar la campaña");
  }
});

// --------------------------------------------
// Carga y renderizado de campañas
// --------------------------------------------
// Campañas públicas (de otros estudiantes con isPublic === true)
async function loadPublicCampaigns() {
  try {
    const snapshot = await db.collection("projects")
      .where("isPublic", "==", true)
      .get();
    publicCampaigns = [];
    const container = document.getElementById("public-campaigns");
    container.innerHTML = "";
    snapshot.forEach((doc) => {
      const campaign = { id: doc.id, ...doc.data() };
      publicCampaigns.push(campaign);
      container.appendChild(renderCampaignCard(campaign));
    });
  } catch (err) {
    console.error(err);
  }
}

// Campañas propias del usuario
async function loadMyCampaigns() {
  if (!currentUser) return;
  try {
    const snapshot = await db.collection("projects")
      .where("user", "==", currentUser.email)
      .get();
    myCampaigns = [];
    const container = document.getElementById("my-campaigns");
    container.innerHTML = "";
    snapshot.forEach((doc) => {
      const campaign = { id: doc.id, ...doc.data() };
      myCampaigns.push(campaign);
      container.appendChild(renderCampaignCard(campaign, true));
    });
  } catch (err) {
    console.error(err);
  }
}

// Función para renderizar una tarjeta de campaña (datos extendidos incluidos)
function renderCampaignCard(campaign, isMine = false) {
  const card = document.createElement("div");
  card.className = "border p-4 rounded shadow bg-gray-50";
  card.innerHTML = `
    <h4 class="text-xl font-semibold text-blue-700 mb-1">${campaign.title}</h4>
    <p class="text-gray-700 text-sm mb-2">${campaign.description}</p>
    <p class="text-sm text-green-700 font-medium">Meta: $${campaign.goal}</p>
    <p class="text-sm text-gray-600">Sector: ${campaign.sector}</p>
    <p class="text-sm text-gray-600">Año de inicio: ${campaign.anio}</p>
    ${campaign.website ? `<p class="text-sm text-blue-600"><a href="${campaign.website}" target="_blank">Sitio Web</a></p>` : ""}
    ${campaign.video ? `<p class="text-sm text-blue-600 mt-2"><a href="${campaign.video}" target="_blank">🎥 Ver video</a></p>` : ""}
    ${campaign.image ? `<img src="${campaign.image}" alt="imagen" class="w-full h-40 object-cover mt-2 rounded" />` : ""}
    <div class="text-xs text-gray-500 mt-2">👁️ ${campaign.views || 0} visitas | 🤝 ${campaign.contributions || 0} aportes</div>
    ${ isMine ? `
      <div class="flex gap-2 mt-3">
        <button class="bg-yellow-500 text-white px-3 py-1 rounded text-sm" onclick="editCampaign('${campaign.id}')">Editar</button>
        <button class="bg-red-600 text-white px-3 py-1 rounded text-sm" onclick="deleteCampaign('${campaign.id}')">Eliminar</button>
      </div>
    ` : "" }
  `;
  return card;
}

// Permite editar una campaña propia
async function editCampaign(id) {
  try {
    const doc = await db.collection("projects").doc(id).get();
    const campaign = { id: doc.id, ...doc.data() };
    if (campaign.user !== currentUser.email) return;
    document.getElementById("campaign-title").value = campaign.title;
    document.getElementById("campaign-description").value = campaign.description;
    document.getElementById("campaign-goal").value = campaign.goal;
    document.getElementById("campaign-image").value = campaign.image;
    document.getElementById("campaign-video").value = campaign.video || "";
    document.getElementById("campaign-sector").value = campaign.sector;
    document.getElementById("campaign-anio").value = campaign.anio;
    document.getElementById("campaign-web").value = campaign.website || "";
    document.getElementById("campaign-form").setAttribute("data-editing-id", id);
    showCampaignForm();
  } catch (err) {
    console.error(err);
    alert("Error al cargar la campaña para edición");
  }
}

// Permite eliminar una campaña propia
async function deleteCampaign(id) {
  if (confirm("¿Estás seguro de eliminar esta campaña?")) {
    try {
      await db.collection("projects").doc(id).delete();
      alert("Campaña eliminada");
      loadMyCampaigns();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar la campaña");
    }
  }
}

// --------------------------------------------
// Configuración de Perfil
// --------------------------------------------
document.getElementById("profileConfigBtn")?.addEventListener("click", () => {
  toggleSection("profile-config");
  loadProfileData();
});

function loadProfileData() {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const data = doc.data();
        document.getElementById("profile-nombres").value = data.nombres || "";
        document.getElementById("profile-apellidos").value = data.apellidos || "";
        document.getElementById("profile-fecha-nac").value = data.fechaNacimiento || "";
        document.getElementById("profile-institucion").value = data.institucion || "";
        document.getElementById("profile-metodos-pago").value = data.metodosPago || "";
      }
    })
    .catch((err) => console.error(err));
}

document.getElementById("profile-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const updatedData = {
    nombres: e.target.nombres.value.trim(),
    apellidos: e.target.apellidos.value.trim(),
    fechaNacimiento: e.target.fechaNacimiento.value,
    institucion: e.target.institucion.value.trim(),
    metodosPago: e.target.metodosPago.value.trim()
  };
  db.collection("users").doc(currentUser.uid)
    .set(updatedData, { merge: true })
    .then(() => {
      alert("Perfil actualizado");
      toggleSection("student-panel");
    })
    .catch((err) => {
      console.error(err);
      alert("Error al actualizar el perfil");
    });
});

// --------------------------------------------
// Inicialización: Carga inicial
// --------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Cargar campañas públicas de otros
  loadPublicCampaigns();
});
