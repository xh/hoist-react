//
// Verifies that files vendored into this repo from dependencies match their installed source.
// Run via `pnpm check:vendored` - also a CI step. Add new vendored files to VENDORED below.
//
import {readFileSync} from 'fs';

// Checked-in path -> source path within node_modules.
const VENDORED = {
    'public/msal-redirect-bridge.min.js':
        'node_modules/@azure/msal-browser/lib/redirect-bridge/msal-redirect-bridge.min.js'
};

let ok = true;
for (const [dest, src] of Object.entries(VENDORED)) {
    if (!readFileSync(src).equals(readFileSync(dest))) {
        console.error(`${dest} is out of date - run: cp ${src} ${dest}`);
        ok = false;
    }
}
process.exit(ok ? 0 : 1);
