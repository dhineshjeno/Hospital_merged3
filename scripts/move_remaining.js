const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

const repoMapping = {
  'admissionRepository.js': 'P13',
  'bedRepository.js': 'P13',
  'roomRepository.js': 'P13',
  'consultationRepository.js': 'P08',
  'diagnosisRepository.js': 'P08',
  'vitalRepository.js': 'P08',
  'invoiceRepository.js': 'P12',
  'invoiceItemRepository.js': 'P12',
  'paymentRepository.js': 'P12',
  'labOrderRepository.js': 'P10',
  'labResultRepository.js': 'P10',
  'prescriptionItemRepository.js': 'P09'
};

function moveFile(oldPath, newPath) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${path.basename(oldPath)} to ${path.dirname(newPath)}`);
  }
}

Object.entries(repoMapping).forEach(([fileName, targetModule]) => {
  const oldPath = path.join(SRC_DIR, 'repositories', fileName);
  const newPath = path.join(SRC_DIR, targetModule, fileName);
  moveFile(oldPath, newPath);
});

// Now we need to update the require paths inside these files
Object.entries(repoMapping).forEach(([fileName, targetModule]) => {
  const fullPath = path.join(SRC_DIR, targetModule, fileName);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    content = content.replace(/require\(['"`]\.\.\/\.\.\/config/g, "require('../config");
    content = content.replace(/require\(['"`]\.\.\/config/g, "require('../config");
    content = content.replace(/require\(['"`]\.\.\/\.\.\/utils/g, "require('../utils");
    content = content.replace(/require\(['"`]\.\.\/utils/g, "require('../utils");
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
});

console.log("Remaining repositories moved.");
