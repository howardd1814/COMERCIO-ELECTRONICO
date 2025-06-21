// ========== DEPENDENCIAS ==========
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');

// ========== CONFIGURACIÓN ==========
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== ARCHIVOS JSON ==========
const USERS_FILE = path.join(__dirname, 'users.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const APPLICATIONS_FILE = path.join(__dirname, 'applications.json');

// ========== UTILIDADES ==========
function loadJSON(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Error leyendo ${file}:`, err);
    return [];
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ========== MULTER ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.mp4'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ========== REGISTRO ==========
app.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' });
  }

  const users = loadJSON(USERS_FILE);
  if (users.find(u => u.email === email || u.username === username)) {
    return res.status(409).json({ message: 'Usuario o correo ya registrado' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      email,
      password: hashed,
      role,
      provider: 'local',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveJSON(USERS_FILE, users);
    res.status(200).json({ message: 'Registro exitoso' });
  } catch {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ========== LOGIN ==========
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = loadJSON(USERS_FILE);
  const user = users.find(u => u.email === email && u.provider === 'local');
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado o registrado por Google' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });

  res.status(200).json({ message: 'Inicio de sesión exitoso', username: user.username, role: user.role });
});

// ========== LOGIN CON GOOGLE ==========
app.post('/google-login', (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ message: 'Datos incompletos' });

  let users = loadJSON(USERS_FILE);
  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      username: name,
      email,
      role: 'estudiante',
      provider: 'google',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveJSON(USERS_FILE, users);
  }

  res.status(200).json({
    message: 'Autenticación con Google exitosa',
    username: user.username,
    role: user.role
  });
});

// ========== PROYECTOS ==========
app.post('/api/projects', upload.fields([{ name: 'image' }, { name: 'video' }]), (req, res) => {
  const { user, projectName, description, goal, id } = req.body;
  if (!user || !projectName || !description || !goal) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  const projects = loadJSON(PROJECTS_FILE);
  const newProject = {
    id: id || Date.now().toString(),
    user,
    projectName,
    description,
    goal: parseFloat(goal),
    image: req.files.image?.[0]?.filename || req.body.image || '',
    video: req.files.video?.[0]?.filename || req.body.video || '',
    views: id ? undefined : 0,
    contributions: id ? undefined : Math.floor(Math.random() * 20)
  };

  const idx = projects.findIndex(p => p.id === newProject.id);
  if (idx >= 0) projects[idx] = newProject;
  else projects.push(newProject);

  saveJSON(PROJECTS_FILE, projects);
  res.json({ message: 'Proyecto guardado correctamente', campaign: newProject });
});

app.get('/api/projects', (req, res) => {
  res.json(loadJSON(PROJECTS_FILE));
});

app.delete('/api/projects/:id', (req, res) => {
  const id = req.params.id;
  let projects = loadJSON(PROJECTS_FILE);
  projects = projects.filter(p => p.id !== id);
  saveJSON(PROJECTS_FILE, projects);
  res.json({ message: 'Proyecto eliminado' });
});

// ========== POSTULACIONES ==========
app.post('/api/apply', (req, res) => {
  const { projectId, investorEmail, message } = req.body;
  if (!projectId || !investorEmail) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  const apps = loadJSON(APPLICATIONS_FILE);
  apps.push({
    projectId,
    investorEmail,
    message,
    date: new Date().toISOString()
  });
  saveJSON(APPLICATIONS_FILE, apps);
  res.json({ message: 'Tu postulación fue enviada' });
});

// ========== HTML PRINCIPAL ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
