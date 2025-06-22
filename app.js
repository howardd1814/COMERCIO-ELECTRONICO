/* ================================
   app.js - Versión para aplicación estática con Firebase
   ================================ */

// Inicialización de Firestore y Storage
const db = firebase.firestore();
const storageRef = firebase.storage().ref();

/* ================================
   ELEMENTOS DEL DOM
   ================================ */

const sections = {
  login: document.getElementById('login'),
  register: document.getElementById('register'),
  landing: document.getElementById('landing'),
  about: document.getElementById('about'),
  projects: document.getElementById('projects'),
  contact: document.getElementById('contact'),
  panel: document.getElementById('panel')
};

const authButtons = document.getElementById('authButtons');
const userBox = document.getElementById('userBox');
const userNameLabel = document.getElementById('userNameLabel');
const userEmailLabel = document.getElementById('userEmailLabel');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');

const form = document.getElementById('uploadForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const campaignList = document.getElementById('campaignList');

let currentUser = null;
let editingId = null;

// Variable global para almacenar la lista de proyectos públicos (útil para el modal)
let publicProjects = [];

/* ================================
   AUTENTICACIÓN CON FIREBASE
   ================================ */

// Se controla la sesión mediante onAuthStateChanged. Así se actualizará la UI automáticamente.
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    // Se ha iniciado sesión
    currentUser = {
      email: user.email,
      username: user.displayName || user.email,
      uid: user.uid
    };
    showUserBox(currentUser);
  } else {
    currentUser = null;
    toggleSection('landing');
  }
});

function showUserBox(user) {
  userNameLabel.textContent = user.username;
  userEmailLabel.textContent = user.email;
  authButtons.classList.add('hidden');
  userBox.classList.remove('hidden');
  toggleSection('panel');
  loadUserProjects();
}

function logout() {
  firebase.auth().signOut().then(() => {
    currentUser = null;
    userBox.classList.add('hidden');
    authButtons.classList.remove('hidden');
    toggleSection('landing');
  }).catch(err => {
    console.error("Error al cerrar sesión: ", err);
    alert("Error al cerrar sesión.");
  });
}

/* ================================
   NAVEGACIÓN ENTRE SECCIONES
   ================================ */

document.querySelectorAll('[data-section]')?.forEach(el => {
  el.addEventListener('click', e => {
    const secId = e.currentTarget.getAttribute('data-section');
    if (secId) toggleSection(secId);
  });
});

document.getElementById('brandBtn')?.addEventListener('click', () => {
  toggleSection('landing');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ================================
   LOGIN Y REGISTRO CON Firebase Auth
   ================================ */

// Inicio de sesión con email/contraseña
document.getElementById('loginForm')?.addEventListener('submit', async e => {
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
document.getElementById('registerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const username = e.target.username.value.trim();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;
  const role = e.target.role?.value || 'estudiante';

  if (!username || !email || !password) {
    alert('Todos los campos son obligatorios');
    return;
  }

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    // Actualizar el perfil del usuario con el nombre
    await userCredential.user.updateProfile({
      displayName: username
    });
    // Opcional: guardar información adicional en Firestore
    await db.collection('users').doc(userCredential.user.uid).set({
      username,
      email,
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Registro exitoso');
    toggleSection('login');
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// Inicio de sesión con Google
document.getElementById('googleBtn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await firebase.auth().signInWithPopup(provider);
    // Si el usuario se logea por primera vez, guardarlo en Firestore
    const user = result.user;
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection('users').doc(user.uid).set({
        username: user.displayName,
        email: user.email,
        role: 'estudiante',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    // La sesión se actualizará vía onAuthStateChanged
  } catch (err) {
    console.error("Error con Google:", err);
    alert('Fallo el inicio de sesión con Google');
  }
});

/* ================================
   GESTIÓN DE PROYECTOS (CAMPAÑAS) CON Firestore
   ================================ */

// El formulario para crear/editar proyectos. Se espera que los inputs para imagen y video sean de tipo "file".
form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;

  const projectName = form.projectName.value.trim();
  const description = form.description.value.trim();
  const goal = form.goal.value.trim();
  const videoFile = form.video?.files ? form.video.files[0] : null;
  const imageFile = form.image?.files ? form.image.files[0] : null;

  if (!projectName || !description || !goal || (!imageFile && !form.image.value.trim())) {
    alert('Por favor completa todos los campos requeridos (incluyendo imagen).');
    return;
  }

  try {
    // Subida de archivo(s) a Firebase Storage
    let imageUrl = '';
    let videoUrl = '';
    if (imageFile) {
      const imageRef = storageRef.child(`images/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
      await imageRef.put(imageFile);
      imageUrl = await imageRef.getDownloadURL();
    } else if (form.image.value.trim()) {
      imageUrl = form.image.value.trim();
    }
    if (videoFile) {
      const videoRef = storageRef.child(`videos/${currentUser.uid}/${Date.now()}_${videoFile.name}`);
      await videoRef.put(videoFile);
      videoUrl = await videoRef.getDownloadURL();
    } else if (form.video.value.trim()) {
      videoUrl = form.video.value.trim();
    }

    // Construir objeto proyecto
    const projectData = {
      user: currentUser.email,
      projectName,
      description,
      goal: parseFloat(goal),
      image: imageUrl,
      video: videoUrl,
      // Valores fijos para proyectos nuevos
      views: editingId ? undefined : 0,
      contributions: editingId ? undefined : Math.floor(Math.random() * 20),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: editingId ? undefined : firebase.firestore.FieldValue.serverTimestamp()
    };

    if (editingId) {
      // Actualización de proyecto existente
      await db.collection('projects').doc(editingId).update(projectData);
      alert('Proyecto actualizado correctamente');
      editingId = null;
      cancelEditBtn.classList.add('hidden');
    } else {
      // Creación de nuevo proyecto
      await db.collection('projects').add(projectData);
      alert('Proyecto guardado correctamente');
    }
    form.reset();
    loadUserProjects();
  } catch (err) {
    console.error(err);
    alert('Error al guardar el proyecto');
  }
});

cancelEditBtn?.addEventListener('click', () => {
  form.reset();
  editingId = null;
  cancelEditBtn.classList.add('hidden');
});

// Cargar proyectos del usuario (desde Firestore)
async function loadUserProjects() {
  if (!currentUser) return;
  try {
    const snapshot = await db.collection('projects')
                             .where('user', '==', currentUser.email)
                             .get();
    campaignList.innerHTML = '';
    snapshot.forEach(doc => {
      const project = { id: doc.id, ...doc.data() };
      renderProjectCard(project);
    });
  } catch (err) {
    console.error(err);
  }
}

// Renderizar cada tarjeta de proyecto en el panel del usuario
function renderProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'border p-4 rounded shadow bg-gray-50 relative';
  const imagePath = project.image || '';

  card.innerHTML = `
    <h4 class="text-xl font-semibold text-blue-700 mb-1">${project.projectName}</h4>
    <p class="text-gray-700 text-sm mb-2">${project.description}</p>
    <p class="text-sm text-green-700 font-medium">Meta: $${project.goal}</p>
    ${project.video ? `<p class="text-sm text-blue-600 mt-2"><a href="${project.video}" target="_blank">🎥 Ver video</a></p>` : ''}
    ${project.image ? `<img src="${imagePath}" alt="imagen" class="w-full h-40 object-cover mt-2 rounded" />` : ''}
    <div class="text-xs text-gray-500 mt-2">👁️ ${project.views || 0} visitas | 🤝 ${project.contributions || 0} aportes</div>
    <div class="flex gap-2 mt-3">
      <button class="bg-yellow-500 text-white px-3 py-1 rounded text-sm" data-action="edit" data-id="${project.id}">Editar</button>
      <button class="bg-red-600 text-white px-3 py-1 rounded text-sm" data-action="delete" data-id="${project.id}">Eliminar</button>
    </div>
  `;
  card.querySelector('[data-action="edit"]').addEventListener('click', () => editProject(project.id));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProject(project.id));
  campaignList.appendChild(card);
}

// Función para editar un proyecto
async function editProject(id) {
  try {
    const doc = await db.collection('projects').doc(id).get();
    const project = { id: doc.id, ...doc.data() };
    if (!project || project.user !== currentUser.email) return;
    form.projectName.value = project.projectName;
    form.description.value = project.description;
    form.goal.value = project.goal;
    form.video.value = project.video || '';
    form.image.value = project.image || '';
    editingId = id;
    cancelEditBtn.classList.remove('hidden');
  } catch (err) {
    console.error(err);
  }
}

// Función para eliminar un proyecto
async function deleteProject(id) {
  const confirmDelete = confirm('¿Estás seguro de eliminar este proyecto?');
  if (!confirmDelete) return;
  try {
    await db.collection('projects').doc(id).delete();
    alert('Proyecto eliminado');
    loadUserProjects();
  } catch (err) {
    console.error(err);
    alert('Error al eliminar el proyecto');
  }
}

/* ================================
   PROYECTOS PÚBLICOS Y MODAL DE POSTULACIÓN
   ================================ */

// Cargar todas las campañas públicas (todos los proyectos)
async function loadPublicCampaigns() {
  try {
    const snapshot = await db.collection('projects').get();
    publicProjects = [];
    const publicList = document.getElementById('publicList');
    publicList.innerHTML = '';
    snapshot.forEach(doc => {
      const project = { id: doc.id, ...doc.data() };
      publicProjects.push(project);
      renderPublicProject(project);
    });
  } catch (err) {
    console.error(err);
  }
}

// Renderizar cada proyecto en la sección pública
function renderPublicProject(c) {
  const div = document.createElement('div');
  div.className = 'border rounded p-4 shadow';
  const imagePath = c.image || '';
  div.innerHTML = `
    <img src="${imagePath}" alt="Imagen del proyecto" class="w-full h-40 object-cover rounded" />
    <h3 class="font-bold text-lg mt-2">${c.projectName}</h3>
    <p class="text-gray-700">${c.description.slice(0, 100)}...</p>
    <button data-action="openModal" data-id="${c.id}" class="text-blue-600 underline mt-2">Ver más</button>
  `;
  div.querySelector('[data-action="openModal"]').addEventListener('click', () => openProjectModal(c.id));
  document.getElementById('publicList').appendChild(div);
}

// Abrir el modal para postulación a un proyecto
function openProjectModal(id) {
  const project = publicProjects.find(x => x.id === id);
  if (!project) {
    alert('Proyecto no encontrado');
    return;
  }
  document.getElementById('applyBtn').onclick = () => applyToProject(id);
  document.getElementById('projectModal').classList.remove('hidden');
}

// Enviar la postulación a un proyecto
async function applyToProject(projectId) {
  const message = document.getElementById('applyMessage').value;
  if (!currentUser) {
    alert('Debes iniciar sesión para postularte');
    return;
  }
  try {
    await db.collection('applications').add({
      projectId,
      investorEmail: currentUser.email,
      message,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Tu postulación fue enviada');
    document.getElementById('applyMessage').value = '';
    document.getElementById('projectModal').classList.add('hidden');
  } catch (err) {
    console.error(err);
    alert('Error al enviar la postulación');
  }
}

/* ================================
   GESTIÓN DE SECCIONES Y BOTONES DE AUTENTICACIÓN
   ================================ */

function toggleSection(sectionId) {
  Object.entries(sections).forEach(([key, section]) => {
    if (section) {
      if (key === sectionId) {
        // Si se intenta acceder al panel sin estar logueado, redirige a login
        if (key === 'panel' && !currentUser) {
          toggleSection('login');
        } else {
          section.classList.remove('hidden');
        }
      } else {
        section.classList.add('hidden');
      }
    }
  });
}

function setupAuthButtons() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => toggleSection('login'));
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => toggleSection('register'));
  }

  const userMenuBtn = document.getElementById('userMenuBtn');
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', () => {
      userDropdown.classList.toggle('hidden');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

/* ================================
   INICIO DE LA APLICACIÓN
   ================================ */

window.addEventListener('DOMContentLoaded', () => {
  setupAuthButtons();
  loadPublicCampaigns();
});
