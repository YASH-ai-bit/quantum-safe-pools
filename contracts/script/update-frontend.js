#!/usr/bin/env node

/**
 * Script to update frontend contracts.ts with deployed addresses
 * Usage: node update-frontend.js <registry> <factory> <verifier> <paymaster>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 4) {
  console.error('Usage: node update-frontend.js <registry> <factory> <verifier> <paymaster>');
  process.exit(1);
}

const [registry, factory, verifier, paymaster] = args;

const contractsFile = path.join(__dirname, '../../frontend/shared/contracts.ts');

let content = fs.readFileSync(contractsFile, 'utf8');

// Update addresses
content = content.replace(
  /QUANTUM_REGISTRY: '[^']*'/,
  `QUANTUM_REGISTRY: '${registry}'`
);

content = content.replace(
  /QUANTUM_ACCOUNT_FACTORY: '[^']*'/,
  `QUANTUM_ACCOUNT_FACTORY: '${factory}'`
);

content = content.replace(
  /GROTH16_VERIFIER: '[^']*'/,
  `GROTH16_VERIFIER: '${verifier}'`
);

content = content.replace(
  /HACKATHON_PAYMASTER: '[^']*'/,
  `HACKATHON_PAYMASTER: '${paymaster}'`
);

fs.writeFileSync(contractsFile, content, 'utf8');

console.log('✅ Frontend contracts.ts updated!');
console.log(`   Registry: ${registry}`);
console.log(`   Factory: ${factory}`);
console.log(`   Verifier: ${verifier}`);
console.log(`   Paymaster: ${paymaster}`);
