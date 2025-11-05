#!/usr/bin/env node

/**
 * Script pour mettre à jour les informations de build automatiquement
 * Usage: node scripts/update-build-info.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Récupérer le commit hash actuel
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const buildTime = new Date().toISOString();
  
  console.log(`🔄 Mise à jour des informations de build:`);
  console.log(`   - Commit: ${commitHash}`);
  console.log(`   - Branche: ${branch}`);
  console.log(`   - Build Time: ${buildTime}`);
  
  // Chemin vers le fichier version.ts
  const versionPath = path.join(__dirname, '../src/version.ts');
  
  // Lire le fichier actuel
  let content = fs.readFileSync(versionPath, 'utf8');
  
  // Mettre à jour le commitRef par défaut
  content = content.replace(
    /commitRef: \(import\.meta\.env\.VITE_COMMIT_REF \?\? '[^']+'\)\.slice\(0, 7\)/,
    `commitRef: (import.meta.env.VITE_COMMIT_REF ?? '${commitHash}').slice(0, 7)`
  );
  
  // Mettre à jour la branche par défaut
  content = content.replace(
    /branch: import\.meta\.env\.VITE_BRANCH \?\? '[^']+'/,
    `branch: import.meta.env.VITE_BRANCH ?? '${branch}'`
  );
  
  // Écrire le fichier mis à jour
  fs.writeFileSync(versionPath, content);
  
  console.log(`✅ Fichier version.ts mis à jour avec succès !`);
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour des informations de build:', error.message);
  process.exit(1);
}
