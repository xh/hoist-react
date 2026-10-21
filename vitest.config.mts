/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import configureVitest from '@xh/hoist-dev-utils/configureVitest';
import {configDefaults, defineConfig, mergeConfig} from 'vitest/config';

/**
 * Vitest config for hoist-react's unit tests. See docs/unit-testing.md.
 *
 * Built on the same `configureVitest()` preset that apps use, so this suite checks the preset's
 * compiler, `XH` constants and test defaults on every PR. `selfHost` aliases `@xh/hoist` to this
 * repo and loads `test-support/setup.ts` from it.
 */

const isCI = !!process.env.CI,
    // Writes the run summary and HTML report to .vitest/report - see
    // test-support/report/TestReporter.ts.
    reportReporter = './test-support/report/TestReporter.ts';

export default defineConfig(
    mergeConfig(
        configureVitest({
            selfHost: true,
            appCode: 'testApp',
            // Specs assert on these, via XH and the fake hoist-core's environment.
            appVersion: '1.0.0',
            appBuild: 'test',
            include: ['**/*.spec.ts']
        }),
        {
            test: {
                // mcp/ has its own node:test specs, run by `pnpm test:mcp`. Dot-directories are
                // excluded so a run from the main checkout never collects specs from worktrees
                // under .claude/.
                exclude: [...configDefaults.exclude, 'build/**', 'mcp/**', '.*/**'],
                // Record each test's line number, for links from reports to the spec source.
                includeTaskLocation: true,
                // Show values interpolated into it.each() test names in full - they describe the
                // case.
                taskTitleValueFormatTruncate: 1000,
                // In CI, annotate failures inline on the PR diff and write a report of the run. The
                // report replaces the github-actions reporter's own (counts-only) job summary.
                reporters: isCI
                    ? [
                          'default',
                          ['github-actions', {jobSummary: {enabled: false}}],
                          reportReporter
                      ]
                    : ['default']
            }
        }
    )
);
