const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');

const fixSafeArea = (dir) => {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixSafeArea(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Check if SafeAreaView is imported from react-native
      const rnImportRegex = /import\s+{([^}]*?SafeAreaView[^}]*?)}\s+from\s+['"]react-native['"];/;
      const match = content.match(rnImportRegex);

      if (match) {
        // Remove SafeAreaView from the react-native import
        let newImportList = match[1].replace(/\bSafeAreaView\b,?\s*/, '').trim();
        // Remove trailing comma if present
        if (newImportList.endsWith(',')) {
          newImportList = newImportList.slice(0, -1);
        }

        let newImportStmt = '';
        if (newImportList.length > 0) {
          newImportStmt = `import { ${newImportList} } from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';`;
        } else {
          newImportStmt = `import { SafeAreaView } from 'react-native-safe-area-context';`;
        }

        content = content.replace(rnImportRegex, newImportStmt);
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed ${file}`);
      }
    }
  });
};

fixSafeArea(screensDir);
console.log('Done!');
