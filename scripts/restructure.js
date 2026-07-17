const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

const modules = {
  P01: { prefix: 'patient', name: 'Patient' },
  P02: { prefix: 'doctor', name: 'Doctor' },
  P03: { prefix: 'appointment', name: 'Appointment' },
  P05: { prefix: 'queue', name: 'Queue' },
  P08: { prefix: 'ehr', name: 'EHR' },
  P09: { prefix: 'prescription', name: 'Prescription' },
  P10: { prefix: 'lab', name: 'Lab' },
  P11: { prefix: 'pharmacy', name: 'Pharmacy' },
  P12: { prefix: 'billing', name: 'Billing' },
  P13: { prefix: 'ward', name: 'Ward' },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveFile(oldPath, newPath) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${path.basename(oldPath)} to ${path.dirname(newPath)}`);
  }
}

// 1. Move files
Object.entries(modules).forEach(([pFolder, info]) => {
  const pPath = path.join(SRC_DIR, pFolder);
  ensureDir(pPath);

  moveFile(path.join(SRC_DIR, 'controllers', `${info.prefix}Controller.js`), path.join(pPath, `${info.prefix}Controller.js`));
  moveFile(path.join(SRC_DIR, 'repositories', `${info.prefix}Repository.js`), path.join(pPath, `${info.prefix}Repository.js`));
  moveFile(path.join(SRC_DIR, 'validators', `${info.prefix}Validator.js`), path.join(pPath, `${info.prefix}Validator.js`));
  
  // Routes are in v1 except maybe auth (but these are all v1)
  let routeName = `${info.prefix}Routes.js`;
  if (info.prefix === 'patient') routeName = 'patientsRoutes.js';
  if (info.prefix === 'doctor') routeName = 'doctorsRoutes.js';
  if (info.prefix === 'appointment') routeName = 'appointmentsRoutes.js';
  if (info.prefix === 'prescription') routeName = 'prescriptionsRoutes.js';
  
  moveFile(path.join(SRC_DIR, 'routes', 'v1', routeName), path.join(pPath, routeName));
});

// 2. Fix require paths in the moved files
function fixRequires(filePath, info) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace intra-module requires
  // e.g. require('../repositories/patientRepository') -> require('./patientRepository')
  content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/repositories\\/${info.prefix}Repository['"\`]\\)`, 'g'), `require('./${info.prefix}Repository')`);
  content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/validators\\/${info.prefix}Validator['"\`]\\)`, 'g'), `require('./${info.prefix}Validator')`);
  
  let routeName = `${info.prefix}Routes.js`;
  if (info.prefix === 'patient') routeName = 'patientsRoutes.js';
  if (info.prefix === 'doctor') routeName = 'doctorsRoutes.js';
  if (info.prefix === 'appointment') routeName = 'appointmentsRoutes.js';
  if (info.prefix === 'prescription') routeName = 'prescriptionsRoutes.js';
  
  content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/\\.\\.\\/controllers\\/${info.prefix}Controller['"\`]\\)`, 'g'), `require('./${info.prefix}Controller')`);
  content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/controllers\\/${info.prefix}Controller['"\`]\\)`, 'g'), `require('./${info.prefix}Controller')`);

  // Replace cross-module repository calls (e.g. appointment calling patient)
  Object.entries(modules).forEach(([otherFolder, otherInfo]) => {
    if (otherFolder !== info.prefix) {
      content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/repositories\\/${otherInfo.prefix}Repository['"\`]\\)`, 'g'), `require('../${otherFolder}/${otherInfo.prefix}Repository')`);
    }
  });

  // Replace utility/middleware requires
  // from controller/repository: '../utils/...' -> '../utils/...' (same depth)
  // from route: '../../middleware/...' -> '../middleware/...'
  content = content.replace(/require\(['"`]\.\.\/\.\.\/middleware/g, "require('../middleware");
  content = content.replace(/require\(['"`]\.\.\/\.\.\/utils/g, "require('../utils");

  fs.writeFileSync(filePath, content, 'utf-8');
}

Object.entries(modules).forEach(([pFolder, info]) => {
  const pPath = path.join(SRC_DIR, pFolder);
  
  const cPath = path.join(pPath, `${info.prefix}Controller.js`);
  const rPath = path.join(pPath, `${info.prefix}Repository.js`);
  const vPath = path.join(pPath, `${info.prefix}Validator.js`);
  
  let routeName = `${info.prefix}Routes.js`;
  if (info.prefix === 'patient') routeName = 'patientsRoutes.js';
  if (info.prefix === 'doctor') routeName = 'doctorsRoutes.js';
  if (info.prefix === 'appointment') routeName = 'appointmentsRoutes.js';
  if (info.prefix === 'prescription') routeName = 'prescriptionsRoutes.js';
  const rtPath = path.join(pPath, routeName);

  fixRequires(cPath, info);
  fixRequires(rPath, info);
  fixRequires(vPath, info);
  fixRequires(rtPath, info);
});

// 3. Update server.js
const serverPath = path.join(SRC_DIR, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf-8');
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/patientsRoutes'\)/g, "require('./P01/patientsRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/doctorsRoutes'\)/g, "require('./P02/doctorsRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/appointmentsRoutes'\)/g, "require('./P03/appointmentsRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/queueRoutes'\)/g, "require('./P05/queueRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/ehrRoutes'\)/g, "require('./P08/ehrRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/prescriptionsRoutes'\)/g, "require('./P09/prescriptionsRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/labRoutes'\)/g, "require('./P10/labRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/pharmacyRoutes'\)/g, "require('./P11/pharmacyRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/billingRoutes'\)/g, "require('./P12/billingRoutes')");
serverContent = serverContent.replace(/require\('\.\/routes\/v1\/wardRoutes'\)/g, "require('./P13/wardRoutes')");

fs.writeFileSync(serverPath, serverContent, 'utf-8');

console.log("Restructuring complete.");
