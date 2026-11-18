//
// Verifies that files vendored into this repo from dependencies match their installed source.
// Run via `pnpm check:vendored` - also a CI step. Add new vendored files to VENDORED below, and
// files generated from a dependency to GENERATED.
//
import {readFileSync} from 'fs';
import {DEST as PDFJS_CSS, generatePdfJsCss} from './generate-pdfjs-css.mjs';

// Checked-in path -> source path within node_modules.
const VENDORED = {
    'public/msal-redirect-bridge.min.js':
        'node_modules/@azure/msal-browser/lib/redirect-bridge/msal-redirect-bridge.min.js'
};

// Checked-in path -> generator function and the command that regenerates it.
const GENERATED = {
    [PDFJS_CSS]: {generate: generatePdfJsCss, cmd: 'pnpm generate:pdfjs-css'}
};

let ok = true;
for (const [dest, src] of Object.entries(VENDORED)) {
    if (!readFileSync(src).equals(readFileSync(dest))) {
        console.error(`${dest} is out of date - run: cp ${src} ${dest}`);
        ok = false;
    }
}
for (const [dest, {generate, cmd}] of Object.entries(GENERATED)) {
    if (generate() !== readFileSync(dest, 'utf8')) {
        console.error(`${dest} is out of date - run: ${cmd}`);
        ok = false;
    }
}
process.exit(ok ? 0 : 1);
