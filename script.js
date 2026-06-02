const fs = require('fs');
const path = require('path');
const dir = 'd:/UGC-PLATFORM/ugc-platform/client/features/orders/components/creator-order-detail';
fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  content = content.replace(/shadow-sm h-fit/g, 'shadow-sm h-full flex flex-col');
  content = content.replace(/className="bg-background rounded-lg border border-border\/40 p-5 shadow-sm"/g, 'className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col"');
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
});
