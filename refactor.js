const fs = require('fs');
const path = require('path');

const apiDir = __dirname;
const srcDir = path.join(apiDir, 'src');

// 1. Move src/* to api/
const dirs = ['controllers', 'routes', 'models', 'middlewares', 'config', 'utils', 'services'];
for (const dir of dirs) {
  const srcPath = path.join(srcDir, dir);
  const destPath = path.join(apiDir, dir);
  if (fs.existsSync(srcPath)) {
    if (!fs.existsSync(destPath)) {
      fs.renameSync(srcPath, destPath);
      console.log(`Moved ${dir} to api/`);
    }
  }
}

// 2. Remove src directory if empty
if (fs.existsSync(srcDir) && fs.readdirSync(srcDir).length === 0) {
  fs.rmdirSync(srcDir);
  console.log('Removed empty src directory');
}

// 3. Update paths in all .js files
function updateImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && file !== 'node_modules') {
      updateImports(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      // Replace src/ paths
      content = content.replace(/(\.\.\/|\.\/)(src\/)/g, '$1');
      // For app.js and server.js, replace './' with './'
      if (file === 'app.js' || file === 'server.js') {
          content = content.replace(/\.\/src\//g, './');
      }

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${filePath}`);
      }
    }
  }
}

updateImports(apiDir);
console.log('Refactoring step 1 completed.');
