#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const GITHUB_REPO = 'forklaunch/forklaunch-js';
const VERSION = require('../package.json').version;

function getPlatform() {
  const type = process.platform;
  const arch = process.arch;

  if (type === 'darwin') {
    return arch === 'arm64' ? 'darwin-aarch64' : 'darwin-x86_64';
  }
  if (type === 'linux') {
    return arch === 'arm64' ? 'linux-aarch64' : 'linux-x86_64';
  }
  if (type === 'win32') {
    return 'windows-x86_64';
  }

  throw new Error(`Unsupported platform: ${type} ${arch}`);
}

function createAlias(source, target) {
  // Remove existing alias if it exists
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
  
  if (process.platform === 'win32') {
    // Create a copy of the binary on Windows
    fs.copyFileSync(source, target);
  } else {
    // Create a symbolic link on Unix-based systems using relative path
    const relativePath = path.relative(path.dirname(target), source);
    fs.symlinkSync(relativePath, target);
  }
  
  // Make alias executable on Unix systems
  if (process.platform !== 'win32') {
    fs.chmodSync(target, 0o755);
  }
}

function downloadBinary() {
  const platform = getPlatform();
  const binaryName = process.platform === 'win32' ? 'forklaunch.exe' : 'forklaunch';
  const aliasName = process.platform === 'win32' ? 'fl.exe' : 'fl';
  const artifactName = process.platform === 'win32' ? `forklaunch-${platform}.exe` : `forklaunch-${platform}`;
  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/cli-v${VERSION}/${artifactName}`;
  
  const binDir = path.join(__dirname, '..', 'bin');
  const binaryPath = path.join(binDir, binaryName);
  const aliasPath = path.join(binDir, aliasName);

  // Create bin directory if it doesn't exist
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Check if binary already exists
  if (fs.existsSync(binaryPath)) {
    console.log('forklaunch binary already exists');
    // Create alias if it doesn't exist
    if (!fs.existsSync(aliasPath)) {
      createAlias(binaryPath, aliasPath);
    }
    return;
  }

  console.log(`Downloading forklaunch for ${platform}...`);
  console.log(`URL: ${downloadUrl}`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(binaryPath);
    
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 404) {
        reject(new Error(`Binary not found for platform ${platform}. Please build locally or check if releases are available.`));
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        // Make binary executable
        fs.chmodSync(binaryPath, 0o755);
        
        // Create alias
        createAlias(binaryPath, aliasPath);
        
        console.log('forklaunch installed successfully');
        console.log('Available commands: forklaunch, fl');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(binaryPath, () => {});
      reject(err);
    });
  });
}

// Fallback: try to build locally if download fails
function buildLocally() {
  console.log('Attempting to build locally...');
  try {
    execSync('cargo build --release', { stdio: 'inherit' });
    
    const binDir = path.join(__dirname, '..', 'bin');
    const binaryName = process.platform === 'win32' ? 'forklaunch.exe' : 'forklaunch';
    const aliasName = process.platform === 'win32' ? 'fl.exe' : 'fl';
    const sourcePath = path.join(__dirname, '..', 'target', 'release', binaryName);
    const targetPath = path.join(binDir, binaryName);
    const aliasPath = path.join(binDir, aliasName);
    
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, 0o755);
    
    // Create alias
    createAlias(targetPath, aliasPath);
    
    console.log('Built and installed forklaunch locally');
    console.log('Available commands: forklaunch, fl');
  } catch (error) {
    console.error('Failed to build locally:', error.message);
    console.error('Please ensure Rust is installed and try running: cargo build --release');
    process.exit(1);
  }
}

async function main() {
  try {
    await downloadBinary();
  } catch (error) {
    console.warn('Download failed:', error.message);
    buildLocally();
  }
}

main();
