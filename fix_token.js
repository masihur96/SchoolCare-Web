const fs = require('fs');
const path = require('path');

const getApiTokenCode = `const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('const API_TOKEN = ')) {
    // Replace the definition
    content = content.replace(/const API_TOKEN = ['"].*['"];/g, getApiTokenCode);
    
    // Replace usages
    // First, to avoid matching inside getApiTokenCode, just replace all API_TOKEN with getApiToken()
    // It's safe since API_TOKEN is the only identifier.
    content = content.replace(/\bAPI_TOKEN\b/g, 'getApiToken()');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walk(path.join(__dirname, 'src'));
console.log('Done');
