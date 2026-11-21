// Pixel-diff two capture dirs. Usage: node diff.cjs <before> <after> <diffOut>
const fs = require('fs');
const path = require('path');
const {PNG} = require('pngjs');
const pixelmatch = require('pixelmatch');

const [before, after, out] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const files = fs.readdirSync(before).filter(f => f.endsWith('.png'));
const rows = [];
for (const f of files) {
    const b = path.join(before, f), a = path.join(after, f);
    if (!fs.existsSync(a)) { rows.push([f, 'MISSING']); continue; }
    const pb = PNG.sync.read(fs.readFileSync(b)), pa = PNG.sync.read(fs.readFileSync(a));
    if (pb.width !== pa.width || pb.height !== pa.height) { rows.push([f, 'SIZE']); continue; }
    const d = new PNG({width: pb.width, height: pb.height});
    const n = pixelmatch(pb.data, pa.data, d.data, pb.width, pb.height, {threshold: 0.1});
    if (n) { fs.writeFileSync(path.join(out, f), PNG.sync.write(d)); rows.push([f, n]); }
}
rows.sort((x, y) => (typeof y[1] === 'number' ? y[1] : 1e9) - (typeof x[1] === 'number' ? x[1] : 1e9));
console.log(`${files.length} compared, ${rows.length} differ`);
for (const [f, n] of rows) console.log(String(n).padStart(8), f);
