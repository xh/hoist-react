/**
 * CLI entry point for hoist-codemod -- automated source migrations for Hoist API changes.
 *
 * Each subcommand loads the app's TypeScript project, collects edits with the type checker,
 * and writes them (or prints them with `--dry-run`).
 */
import {existsSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';

import {Command} from 'commander';
import {Project} from 'ts-morph';

import {
    collectItemsToChildren,
    type CodemodResult,
    type Finding,
    writeEdits
} from '../codemod/items-to-children.js';

const program = new Command()
    .name('hoist-codemod')
    .description('Automated source migrations for Hoist API changes.');

program
    .command('items-to-children')
    .description(
        'Rename the legacy `item` / `items` element spec keys to `children`. Uses the type ' +
            'checker, so data keys named `items` (menus, column groups) are left alone.'
    )
    .argument(
        '[paths...]',
        'Limit edits to these files or directories (default: the folder holding the tsconfig)'
    )
    .option(
        '-p, --project <tsconfig>',
        'Path to tsconfig.json (default: ./tsconfig.json, then ./client-app/tsconfig.json)'
    )
    .option('--dry-run', 'Report changes without writing files')
    .option('--json', 'Print the full result as JSON')
    .action((paths: string[], opts: {project?: string; dryRun?: boolean; json?: boolean}) => {
        const cwd = process.cwd(),
            tsConfigFilePath = resolveTsConfig(cwd, opts.project);

        log(`Loading ${relative(cwd, tsConfigFilePath) || tsConfigFilePath}...`, opts.json);
        const project = new Project({tsConfigFilePath}),
            scope = paths.length ? paths.map(p => resolve(cwd, p)) : [dirname(tsConfigFilePath)],
            result = collectItemsToChildren(project, {paths: scope});

        if (!opts.dryRun) writeEdits(project, result);

        if (opts.json) {
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        } else {
            printSummary(result, cwd, !!opts.dryRun);
        }
    });

await program.parseAsync();

//------------------------
// Implementation
//------------------------
function resolveTsConfig(cwd: string, explicit: string | undefined): string {
    if (explicit) {
        const path = resolve(cwd, explicit);
        if (!existsSync(path)) fail(`tsconfig not found: ${path}`);
        return path;
    }
    for (const candidate of ['tsconfig.json', 'client-app/tsconfig.json']) {
        const path = resolve(cwd, candidate);
        if (existsSync(path)) return path;
    }
    return fail('No tsconfig.json found in . or ./client-app - pass one with --project.');
}

function printSummary(result: CodemodResult, cwd: string, dryRun: boolean) {
    const {files, renameCount, findings} = result,
        verb = dryRun ? 'Would rename' : 'Renamed';

    console.log(`${verb} ${renameCount} key(s) in ${files.length} file(s).`);
    if (dryRun) {
        for (const {file} of files) console.log(`  ${relative(cwd, file)}`);
    }

    const groups: Array<[Finding['kind'], string]> = [
        ['conflict', 'Conflicts - left unchanged, merge by hand'],
        ['manual', 'Not converted - check and convert by hand'],
        ['review', 'Renamed - worth a review']
    ];
    for (const [kind, title] of groups) {
        const items = findings.filter(f => f.kind === kind);
        if (!items.length) continue;
        console.log(`\n${title} (${items.length}):`);
        for (const f of items) {
            console.log(`  ${relative(cwd, f.file)}:${f.line}:${f.column} - ${f.message}`);
        }
    }

    if (renameCount && !dryRun) {
        console.log('\nRun your formatter (e.g. prettier) over the changed files.');
    }
}

function log(msg: string, quiet: boolean | undefined) {
    if (!quiet) console.log(msg);
}

function fail(msg: string): never {
    console.error(msg);
    process.exit(1);
}
