const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pubDir = path.join(root, 'public', 'assets', 'models');
const srcDir = path.join(root, 'src', 'assets', 'models');

fs.mkdirSync(pubDir, { recursive: true });
fs.mkdirSync(srcDir, { recursive: true });

function downloadFile(url, destFile) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destFile).then(resolve).catch(reject);
      }
      if (res.statusCode === 200) {
        const outStream = fs.createWriteStream(destFile);
        res.pipe(outStream);
        outStream.on('finish', () => {
          outStream.close(() => resolve(true));
        });
      } else {
        console.error(`Failed (${res.statusCode}): ${url}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.error(`Error (${err.message}): ${url}`);
      resolve(false);
    });
  });
}

const fileList = [
  { name: 'shadow-katana.glb', url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
  { name: 'demon-edge-dagger.glb', url: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb' },
  { name: 'cyber-samurai-mask.glb', url: 'https://modelviewer.dev/shared-assets/models/glTF-Sample-Assets/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb' },
  { name: 'otaku-desk-dragon.glb', url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
  { name: 'shonen-hero-emblem.glb', url: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb' }
];

async function main() {
  for (const item of fileList) {
    const destPub = path.join(pubDir, item.name);
    const destSrc = path.join(srcDir, item.name);
    console.log(`Downloading ${item.name}...`);
    const success = await downloadFile(item.url, destPub);
    if (success && fs.existsSync(destPub)) {
      fs.copyFileSync(destPub, destSrc);
      console.log(`Saved ${item.name} (${fs.statSync(destPub).size} bytes)`);
    }
  }
  console.log('Done downloading models!');
}

main();
