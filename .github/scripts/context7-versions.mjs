#!/usr/bin/env node
// Keeps `previousVersions` in context7.json in sync with release tags.
//
// Context7 (https://context7.com) indexes only the versions declared in context7.json (or in the
// library's admin panel) - it does not discover new git tags on its own. This script lists the
// newest release tag of each of the most recent majors, so the Context7 workflow can open a PR
// whenever a release adds or moves a major.
//
// Usage: node .github/scripts/context7-versions.mjs [--majors N] [--check]
//   --majors N  number of most recent majors to keep (default 6)
//   --check     exit 1 instead of writing when context7.json is out of date
//
// Run from the repository root with tags fetched (`git fetch --tags`).
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';

const args = process.argv.slice(2),
    majorsArg = args.indexOf('--majors'),
    majorCount = majorsArg >= 0 ? Number(args[majorsArg + 1]) : 6,
    checkOnly = args.includes('--check'),
    file = 'context7.json';

// Release tags only - vMAJOR.MINOR.PATCH, no pre-release suffix.
const tags = execFileSync('git', ['tag', '--list', 'v*'], {encoding: 'utf8'})
    .split('\n')
    .map(t => t.trim())
    .filter(t => /^v\d+\.\d+\.\d+$/.test(t))
    .map(t => ({tag: t, parts: t.slice(1).split('.').map(Number)}));

const newestPerMajor = new Map();
for (const t of tags) {
    const [major] = t.parts,
        current = newestPerMajor.get(major);
    if (!current || compare(t.parts, current.parts) > 0) newestPerMajor.set(major, t);
}

const previousVersions = [...newestPerMajor.keys()]
    .sort((a, b) => b - a)
    .slice(0, majorCount)
    .map(major => ({tag: newestPerMajor.get(major).tag}));

const raw = readFileSync(file, 'utf8'),
    config = JSON.parse(raw);

if (JSON.stringify(config.previousVersions ?? []) === JSON.stringify(previousVersions)) {
    console.log(`${file} previousVersions already current: ${previousVersions.map(v => v.tag).join(', ')}`);
    process.exit(0);
}

if (checkOnly) {
    console.error(`${file} previousVersions out of date. Expected: ${previousVersions.map(v => v.tag).join(', ')}`);
    process.exit(1);
}

// Preserve key order and 4-space formatting, keep url/public_key (the ownership claim) last.
config.previousVersions = previousVersions;
writeFileSync(file, JSON.stringify(config, null, 4) + '\n');
console.log(`Updated ${file} previousVersions: ${previousVersions.map(v => v.tag).join(', ')}`);

function compare(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
}
