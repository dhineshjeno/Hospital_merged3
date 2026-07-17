const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const DB_DIR = path.join(__dirname, '../../../scratch/hospital_db');

const missingModules = ['P04', 'P06', 'P07', 'P14'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy the missing modules
missingModules.forEach(mod => {
  copyDir(path.join(DB_DIR, mod), path.join(SRC_DIR, mod));
});

// Patch requires in the copied files
function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // db/pool -> config/database
  content = content.replace(/require\(['"`]\.\.\/db\/pool['"`]\)/g, "require('../config/database')");
  
  // utils/ApiError
  content = content.replace(/require\(['"`]\.\.\/utils\/ApiError['"`]\)/g, "require('../utils/ApiError')");
  
  // In controllers, requiring repositories from the same folder
  content = content.replace(/require\(['"`]\.\.\/repositories\/([a-zA-Z]+)['"`]\)/g, "require('./$1')");
  content = content.replace(/require\(['"`]\.\.\/validators\/([a-zA-Z]+)['"`]\)/g, "require('./$1')");
  content = content.replace(/require\(['"`]\.\.\/controllers\/([a-zA-Z]+)['"`]\)/g, "require('./$1')");
  
  // Some routes might use express.Router
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

missingModules.forEach(mod => {
  const dirPath = path.join(SRC_DIR, mod);
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    patchFile(path.join(dirPath, file));
  });
});

// Register routes in server.js
const serverPath = path.join(SRC_DIR, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf-8');

const routeRegistrations = `
// --- Missing modules routes ---
app.use('/api/v1/schedule', require('./P04/scheduleRoutes'));
app.use('/api/v1/search', require('./P06/searchRoutes'));
app.use('/api/v1/patient-portal', require('./P07/patientPortalRoutes'));
app.use('/api/v1/reports', require('./P14/reportsRoutes'));
`;

if (!serverContent.includes('P04/scheduleRoutes')) {
  serverContent = serverContent.replace('app.use(notFoundHandler);', routeRegistrations + '\napp.use(notFoundHandler);');
  fs.writeFileSync(serverPath, serverContent, 'utf-8');
}

console.log("Missing modules ported and patched.");
