const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = {
  'bg-zinc-950': 'bg-background',
  'bg-zinc-900': 'bg-card',
  'border-zinc-800': 'border-border',
  'text-zinc-500': 'text-muted',
  'text-zinc-400': 'text-muted',
  'text-zinc-300': 'text-foreground',
  'text-zinc-200': 'text-foreground',
  'text-zinc-100': 'text-foreground',
  'bg-slate-900': 'bg-card',
  'border-slate-800': 'border-border',
  'text-slate-500': 'text-muted',
  'text-slate-400': 'text-muted',
  'text-slate-300': 'text-foreground',
  'bg-black': 'bg-foreground',
  'text-white': 'text-foreground', // this might break button texts, but we'll see
};

walkDir(path.join(__dirname, '../src'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Simple string replacements
    for (const [key, value] of Object.entries(replacements)) {
      // Use word boundaries or just global replace with space padding to avoid partial matches
      // but classes might be at the start/end of strings or have quotes
      const regex = new RegExp(`(?<=[\\s"'\\\`])${key}(?=[\\s"'\\\`])`, 'g');
      content = content.replace(regex, value);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

console.log('Class replacement complete!');
