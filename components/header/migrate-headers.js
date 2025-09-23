/**
 * Migration Script for Header Component
 * Run this script to automatically migrate all pages to use the Header Component
 */

const fs = require('fs');
const path = require('path');

// Configuration for each page type
const pageConfigs = {
  'youtube.html': 'youtube',
  'netflix.html': 'netflix', 
  'chatgpt.html': 'chatgpt',
  'spotify.html': 'spotify',
  'prime-video.html': 'prime',
  'disney-plus.html': 'disney',
  'hbo.html': 'hbo',
  'crunchyroll.html': 'crunchyroll',
  'surfshark.html': 'surfshark',
  'telegram-premium.html': 'telegram',
  'gemini-veo3.html': 'gemini',
  'free-fire.html': 'freefire',
  'pay.html': 'pay',
  'delivery.html': 'delivery'
};

function migrateFile(filePath, configKey) {
  console.log(`Migrating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Add header component imports after meta tags
  if (!content.includes('header-component.css')) {
    content = content.replace(
      /(<meta name="twitter:image"[^>]*>)/,
      '$1\n\n  <!-- Header Component -->\n  <link rel="stylesheet" href="../assets/header-component.css">\n  <script defer src="../assets/header-component.js"></script>'
    );
  }
  
  // 2. Remove existing header HTML
  content = content.replace(
    /<header class="topbar">[\s\S]*?<\/header>\s*/,
    '<!-- Header will be injected by HeaderComponent -->\n\n    '
  );
  
  // 3. Add initialization script before closing body tag
  if (!content.includes('HeaderComponent.create')) {
    content = content.replace(
      /(\s*)<\/script>\s*<\/body>/,
      `$1
      // Initialize Header Component
      HeaderComponent.create(HeaderComponent.configs.${configKey});
    </script>
  </body>`
    );
  }
  
  // 4. Remove duplicate topbar styles (basic cleanup)
  content = content.replace(
    /\.topbar\s*\{[\s\S]*?\}\s*\.topbar\s+\.inner[\s\S]*?\}\s*\.brand[\s\S]*?\}\s*\.brand-logo[\s\S]*?\}/,
    ''
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Migrated ${filePath}`);
}

function migrateIndexPage() {
  const indexPath = path.join(__dirname, '..', 'index.html');
  console.log(`Migrating ${indexPath}...`);
  
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Add header component imports
  if (!content.includes('header-component.css')) {
    content = content.replace(
      /(<link rel="stylesheet" href="assets\/styles\.css">)/,
      '$1\n    <link rel="stylesheet" href="assets/header-component.css">\n    <script defer src="assets/header-component.js"></script>'
    );
  }
  
  // Replace existing header
  content = content.replace(
    /<header class="topbar">[\s\S]*?<\/header>/,
    '<!-- Header will be injected by HeaderComponent -->'
  );
  
  // Add initialization script
  if (!content.includes('HeaderComponent.create')) {
    content = content.replace(
      /(<\/body>)/,
      `    <script>
    document.addEventListener('DOMContentLoaded', function() {
      HeaderComponent.create(HeaderComponent.configs.home);
    });
    </script>
$1`
    );
  }
  
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`✅ Migrated ${indexPath}`);
}

// Main migration function
function migrate() {
  console.log('🚀 Starting Header Component Migration...\n');
  
  // Migrate index page
  migrateIndexPage();
  
  // Migrate product pages
  const productsDir = path.join(__dirname, '..', 'products');
  
  Object.entries(pageConfigs).forEach(([filename, configKey]) => {
    const filePath = path.join(productsDir, filename);
    if (fs.existsSync(filePath)) {
      migrateFile(filePath, configKey);
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  });
  
  console.log('\n✅ Migration completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Test each page to ensure headers appear correctly');
  console.log('2. Remove any remaining duplicate CSS styles manually');
  console.log('3. Check responsive design on mobile devices');
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };