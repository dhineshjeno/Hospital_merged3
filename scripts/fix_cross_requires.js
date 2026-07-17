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
  'prescriptionRepository': 'P09',
  'labRepository': 'P10',
  'pharmacyRepository': 'P11',
  'billingRepository': 'P12',
  'wardRepository': 'P13',
  'reportsRepository': 'P14'
};

function fixCrossModuleRequires(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixCrossModuleRequires(fullPath);
    } else if (entry.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      // Fix instances where a file mistakenly requires a repository from './' but it should be from another module
      Object.entries(repoToModule).forEach(([repoName, modName]) => {
        // If the current file is NOT in the target module
        if (!fullPath.includes(`\\${modName}\\`) && !fullPath.includes(`/${modName}/`)) {
          // Replace require('./someRepository') with require('../PXX/someRepository')
          content = content.replace(new RegExp(`require\\(['"\`]\\.\\/${repoName}['"\`]\\)`, 'g'), `require('../${modName}/${repoName}')`);
        }
      });
      
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

fixCrossModuleRequires(SRC_DIR);
console.log("Cross-module requires fixed.");
