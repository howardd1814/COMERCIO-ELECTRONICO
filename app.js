// ========== ELEMENTOS ==========
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
let currentUser = null;

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutos

// ========== SESIÓN ==========
function isSessionExpired() {
  const start = localStorage.getItem('session_start');
  if (!start) return true;
  return Date.now() - parseInt(start) > SESSION_TIMEOUT;
}

function isUserLoggedIn() {
  const user = localStorage.getItem('user');
  return user && !isSessionExpired();
}

function showUserBox(user) {
  currentUser = user;
  userNameLabel.textContent = user.username;
  userEmailLabel.textContent = user.email;
  authButtons.classList.add('hidden');
  userBox.classList.remove('hidden');
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('session_start', Date.now().toString());
  toggleSection('panel');
  loadUserProjects();
}

function checkSession() {
  const savedUser = localStorage.getItem('user');
  if (!savedUser || isSessionExpired()) {
    logout();
  } else {
    const user = JSON.parse(savedUser);
    showUserBox(user);
  }
}

function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('session_start');
  currentUser = null;
  userBox.classList.add('hidden');
  authButtons.classList.remove('hidden');
  toggleSection('landing');
}

// ========== NAVEGACIÓN CON data-section ==========
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

// ========== LOGIN MANUAL ==========
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.username.value.trim();
  const password = e.target.password.value;

  try {
    const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (res.status === 200) {
      showUserBox({ username: result.username, email, role: result.role });
    } else {
      alert(result.message);
    }
  } catch (err) {
    console.error(err);
    alert('Error en el servidor');
  }
});

// ========== REGISTRO ==========
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
    const res = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });

    const result = await res.json();

    if (res.status === 200) {
      alert(result.message);
      toggleSection('login');
    } else {
      alert(result.message);
    }
  } catch (err) {
    console.error(err);
    alert('Error en el servidor');
  }
});

// ========== LOGIN CON GOOGLE ==========
document.getElementById('googleBtn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await firebase.auth().signInWithPopup(provider);
    const user = result.user;

    const res = await fetch('http://localhost:3000/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, name: user.displayName })
    });

    const data = await res.json();
    showUserBox({ username: data.username, email: user.email, role: data.role });
  } catch (err) {
    console.error('Error con Google:', err);
    alert('Fallo el inicio de sesión con Google');
  }
});

// ========== CAMPAÑAS ==========
const form = document.getElementById('uploadForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const campaignList = document.getElementById('campaignList');
let editingId = null;

form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;

  const projectName = form.projectName.value.trim();
  const description = form.description.value.trim();
  const goal = form.goal.value.trim();
  const videoFile = form.video.files[0];
  const imageFile = form.image.files[0];

  if (!projectName || !description || !goal || !imageFile) {
    alert('Por favor completa todos los campos requeridos (incluyendo imagen).');
    return;
  }

  const formData = new FormData();
  formData.append('user', currentUser.email);
  formData.append('projectName', projectName);
  formData.append('description', description);
  formData.append('goal', goal);

  if (editingId) formData.append('id', editingId);
  if (videoFile) formData.append('video', videoFile);
  if (imageFile) formData.append('image', imageFile);

  try {
    const res = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    alert(result.message || 'Proyecto guardado correctamente');
    form.reset();
    editingId = null;
    cancelEditBtn.classList.add('hidden');
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

async function loadUserProjects() {
  if (!currentUser) return;

  try {
    const res = await fetch('http://localhost:3000/api/projects');
    const data = await res.json();
    const userProjects = data.filter(p => p.user === currentUser.email);

    campaignList.innerHTML = '';
    userProjects.forEach(renderProjectCard);
  } catch (err) {
    console.error(err);
  }
}

function renderProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'border p-4 rounded shadow bg-gray-50 relative';

  card.innerHTML = `
    <h4 class="text-xl font-semibold text-blue-700 mb-1">${project.projectName}</h4>
    <p class="text-gray-700 text-sm mb-2">${project.description}</p>
    <p class="text-sm text-green-700 font-medium">Meta: $${project.goal}</p>
    ${project.video ? `<p class="text-sm text-blue-600 mt-2"><a href="${project.video}" target="_blank">🎥 Ver video</a></p>` : ''}
    ${project.image ? `<img src="${project.image}" alt="imagen" class="w-full h-40 object-cover mt-2 rounded" />` : ''}
    <div class="text-xs text-gray-500 mt-2">👁️ ${project.views || 0} visitas | 🤝 ${project.contributions || 0} aportes</div>
    <div class="flex gap-2 mt-3">
      <button class="bg-yellow-500 text-white px-3 py-1 rounded text-sm" onclick="editProject('${project.id}')">Editar</button>
      <button class="bg-red-600 text-white px-3 py-1 rounded text-sm" onclick="deleteProject('${project.id}')">Eliminar</button>
    </div>
  `;

  campaignList.appendChild(card);
}

async function editProject(id) {
  try {
    const res = await fetch('http://localhost:3000/api/projects');
    const data = await res.json();
    const project = data.find(p => p.id === id && p.user === currentUser.email);
    if (!project) return;

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

async function deleteProject(id) {
  const confirmDelete = confirm('¿Estás seguro de eliminar este proyecto?');
  if (!confirmDelete) return;

  try {
    const res = await fetch(`http://localhost:3000/api/projects/${id}`, {
      method: 'DELETE'
    });

    const result = await res.json();
    alert(result.message || 'Proyecto eliminado');
    loadUserProjects();
  } catch (err) {
    console.error(err);
    alert('Error al eliminar el proyecto');
  }
}

// ========== PÚBLICO ==========
async function loadPublicCampaigns() {
  const res = await fetch('http://localhost:3000/api/projects');
  const data = await res.json();
  document.getElementById('publicList').innerHTML = '';
  data.forEach(c => renderPublicProject(c));
}

function renderPublicProject(c) {
  const div = document.createElement('div');
  div.className = 'border rounded p-4 shadow';
  div.innerHTML = `
    <img src="/uploads/${c.image}" class="w-full h-40 object-cover rounded" />
    <h3 class="font-bold text-lg mt-2">${c.projectName}</h3>
    <p class="text-gray-700">${c.description.slice(0, 100)}...</p>
    <button onclick="openProjectModal('${c.id}')" class="text-blue-600 underline mt-2">Ver más</button>
  `;
  document.getElementById('publicList').appendChild(div);
}

function openProjectModal(id) {
  const p = projects.find(x => x.id === id);
  document.getElementById('applyBtn').onclick = () => applyToProject(id);
  document.getElementById('projectModal').classList.remove('hidden');
}

async function applyToProject(projectId) {
  const message = document.getElementById('applyMessage').value;
  const res = await fetch('http://localhost:3000/api/apply', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({projectId, investorEmail: currentUser.email, message})
  });
  const r = await res.json();
  alert(r.message);
  document.getElementById('projectModal').classList.add('hidden');
}

// ========== GESTIÓN DE SECCIONES ==========
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


// ========== INICIO ==========
window.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupAuthButtons();  // Esta línea es crucial
  loadPublicCampaigns(); // También debes cargar campañas públicas
});

