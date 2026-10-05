/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import swc from 'unplugin-swc';
import {configDefaults, defineConfig} from 'vitest/config';

/**
 * Vitest config for hoist-react's unit tests. See docs/unit-testing.md.
 */

// Pin the time zone so date-sensitive tests give the same result on every machine and in CI.
process.env.TZ = 'America/New_York';

const isCI = !!process.env.CI,
    // Writes the run summary and HTML report to .vitest/report - see test/report/TestReporter.ts.
    reportReporter = './test/report/TestReporter.ts';

export default defineConfig({
    plugins: [
        // Compile TypeScript with SWC, using the options hoist-dev-utils' configureRsbuild() gives
        // the SWC inside Rsbuild when apps build hoist-react. This is load-bearing: Hoist's TC39
        // decorators ('2023-11', e.g. `@bindable accessor`) must run with exactly the semantics apps
        // ship, and Vite's built-in Oxc transform cannot compile decorators at all.
        swc.vite({
            tsconfigFile: false,
            include: /\.tsx?$/,
            jsc: {
                target: 'es2022',
                parser: {syntax: 'typescript', tsx: true, decorators: true},
                transform: {
                    decoratorVersion: '2023-11',
                    useDefineForClassFields: true,
                    react: {runtime: 'automatic'}
                }
            }
        }),

        // Stand in for the changelog JSON that hoist-dev-utils generates for app builds.
        {
            name: 'xh-app-changelog',
            resolveId: id => (id === '@xh/app-changelog.json' ? '\0xh-app-changelog' : null),
            load: id => (id === '\0xh-app-changelog' ? 'export default {};' : null)
        },

        // Skip reading stylesheets - tests do not render styles, and Vite would otherwise try to
        // load the source maps that some vendored CSS references.
        {
            name: 'xh-skip-styles',
            enforce: 'pre',
            load: id => (/\.s?css$/.test(id) ? '' : null)
        }
    ],

    // SWC (above) owns the TS transform.
    oxc: false,

    // Build-time constants that hoist-dev-utils defines for app builds (see core/XH.ts).
    // `xhBaseUrl` matches the dev-utils default, which the fake hoist-core in test/ serves under.
    define: {
        xhAppCode: JSON.stringify('testApp'),
        xhAppName: JSON.stringify('Test App'),
        xhAppVersion: JSON.stringify('1.0.0'),
        xhAppBuild: JSON.stringify('test'),
        xhBaseUrl: JSON.stringify('/api/'),
        xhBuildTimestamp: '0',
        xhClientApps: JSON.stringify(['app']),
        xhIsDevelopmentMode: 'false'
    },

    resolve: {
        alias: [{find: /^@xh\/hoist\//, replacement: `${import.meta.dirname}/`}]
    },

    test: {
        include: ['**/*.spec.ts'],
        // mcp/ has its own node:test specs, run by `pnpm test:mcp`. Dot-directories are excluded so
        // a run from the main checkout never collects specs from worktrees under .claude/.
        exclude: [...configDefaults.exclude, 'build/**', 'mcp/**', '.*/**'],
        environment: 'jsdom',
        setupFiles: ['test/setup.ts'],
        // Allow for initTestAppAsync() in beforeAll, which loads the full desktop module graph.
        hookTimeout: 30_000,
        // Show console output only for failing tests - Hoist logs freely, and the logs of a test
        // that passed are noise.
        silent: 'passed-only',
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        // Record each test's line number, for links from reports to the spec source.
        includeTaskLocation: true,
        // In CI, annotate failures inline on the PR diff and write a report of the run. The report
        // replaces the github-actions reporter's own (counts-only) job summary.
        reporters: isCI
            ? ['default', ['github-actions', {jobSummary: {enabled: false}}], reportReporter]
            : ['default']
    }
});
