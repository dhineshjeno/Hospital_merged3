const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

const repoToModule = {
  'patientRepository': 'P01',
  'doctorRepository': 'P02',
  'appointmentRepository': 'P03',
  'scheduleRepository': 'P04',
  'queueRepository': 'P05',
  'searchRepository': 'P06',
  'ehrRepository': 'P08',
  'consultationRepository': 'P08',
  'diagnosisRepository': 'P08',
  'vitalRepository': 'P08',
  'prescriptionRepository': 'P09',
  'prescriptionItemRepository': 'P09',
  'labRepository': 'P10',
  'labOrderRepository': 'P10',
  'labResultRepository': 'P10',
  'pharmacyRepository': 'P11',
  'billingRepository': 'P12',
  'invoiceRepository': 'P12',
  'invoiceItemRepository': 'P12',
  'paymentRepository': 'P12',
  'wardRepository': 'P13',
  'admissionRepository': 'P13',
  'bedRepository': 'P13',
  'roomRepository': 'P13',
  'reportsRepository': 'P14'
};

function fixAllCrossRequires(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixAllCrossRequires(fullPath);
    } else if (entry.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      // Fix instances where a file requires `../repositories/someRepository`
      Object.entries(repoToModule).forEach(([repoName, modName]) => {
        // If the current file is NOT in the target module
        if (!fullPath.includes(`\\${modName}\\`) && !fullPath.includes(`/${modName}/`)) {
          // Replace require('../repositories/someRepository') with require('../PXX/someRepository')
          content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/repositories\\/${repoName}['"\`]\\)`, 'g'), `require('../${modName}/${repoName}')`);
        } else {
          // If the current file IS in the target module, replace with require('./someRepository')
          content = content.replace(new RegExp(`require\\(['"\`]\\.\\.\\/repositories\\/${repoName}['"\`]\\)`, 'g'), `require('./${repoName}')`);
        }
      });
      
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

fixAllCrossRequires(SRC_DIR);
console.log("All ../repositories/ requires fixed.");
