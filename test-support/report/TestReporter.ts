/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {appendFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import type {Reporter, SerializedError, TestCase, TestModule} from 'vitest/node';
import {renderHtml} from './HtmlReport';
import {renderComment, renderSummary} from './MarkdownReport';

/**
 * Vitest reporter that writes a human-friendly report of a test run, grouped by Hoist package:
 *
 *  - `summary.md` - the full report, also written to the GitHub Actions job summary when run there.
 *  - `comment.md` - a compact version, posted to pull requests by the Unit Tests workflow.
 *  - `index.html` - a self-contained page with every test, viewable offline or on GitHub Pages.
 *
 * Output goes to `.vitest/report`. Enabled in CI by vitest.config.mts, or locally with
 * `pnpm test:report`. See docs/unit-testing.md.
 */
export default class TestReporter implements Reporter {
    private root: string;
    private startTime: number;

    onInit(vitest: {config: {root: string}}) {
        this.root = vitest.config.root;
    }

    onTestRunStart() {
        this.startTime = Date.now();
    }

    onTestRunEnd(
        testModules: ReadonlyArray<TestModule>,
        unhandledErrors: ReadonlyArray<SerializedError>
    ) {
        const report = this.buildReport(testModules, unhandledErrors),
            outDir = join(this.root, '.vitest', 'report');

        mkdirSync(outDir, {recursive: true});
        const summary = renderSummary(report);
        writeFileSync(join(outDir, 'summary.md'), summary);
        writeFileSync(join(outDir, 'comment.md'), renderComment(report));
        writeFileSync(join(outDir, 'index.html'), renderHtml(report));

        const {GITHUB_STEP_SUMMARY} = process.env;
        if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, summary);
    }

    //------------------------
    // Implementation
    //------------------------
    private buildReport(
        testModules: ReadonlyArray<TestModule>,
        unhandledErrors: ReadonlyArray<SerializedError>
    ): TestReport {
        const files = testModules
            .map(mod => {
                const path = relative(this.root, mod.moduleId),
                    tests = [...mod.children.allTests()].map(it => this.toReportTest(it)),
                    loadErrors = mod.errors().map(e => cleanError(e).message);
                return {path, pkg: packageOf(path), tests, loadErrors};
            })
            .sort((a, b) => a.path.localeCompare(b.path));

        const allTests = files.flatMap(it => it.tests),
            count = (state: TestState) => allTests.filter(it => it.state === state).length;

        return {
            files,
            totals: {
                total: allTests.length,
                passed: count('passed'),
                failed: count('failed'),
                skipped: count('skipped'),
                knownBugs: allTests.filter(it => it.knownBug).length
            },
            loadFailures: files.filter(it => it.loadErrors.length).length,
            unhandledErrors: unhandledErrors.map(e => cleanError(e).message),
            duration: Date.now() - this.startTime,
            timestamp: new Date().toISOString(),
            git: gitContext()
        };
    }

    private toReportTest(test: TestCase): ReportTest {
        const result = test.result(),
            state: TestState =
                result.state === 'failed'
                    ? 'failed'
                    : result.state === 'passed'
                      ? 'passed'
                      : 'skipped';

        const suites: string[] = [];
        for (let p = test.parent; p.type === 'suite'; p = p.parent) suites.unshift(p.name);

        return {
            name: test.name,
            suites,
            state,
            knownBug: !!test.options.fails,
            duration: test.diagnostic()?.duration ?? 0,
            line: test.location?.line,
            errors: result.state === 'failed' ? result.errors.map(cleanError) : []
        };
    }
}

//------------------------
// Report model
//------------------------
export type TestState = 'passed' | 'failed' | 'skipped';

export interface ReportTest {
    name: string;
    /** Names of the enclosing describe blocks, outermost first. */
    suites: string[];
    state: TestState;
    /** True for `it.fails()` tests, which document a known library bug. */
    knownBug: boolean;
    duration: number;
    line: number;
    errors: ReportError[];
}

export interface ReportError {
    message: string;
    diff: string;
    /** Line in the spec file where the failure was thrown, if known. */
    line: number;
}

export interface ReportFile {
    /** Path relative to the repo root. */
    path: string;
    /** Hoist package the spec belongs to, e.g. `data/cube`. */
    pkg: string;
    tests: ReportTest[];
    /** Errors that stopped the file from loading or running, e.g. a failing beforeAll. */
    loadErrors: string[];
}

export interface TestReport {
    files: ReportFile[];
    totals: {total: number; passed: number; failed: number; skipped: number; knownBugs: number};
    loadFailures: number;
    unhandledErrors: string[];
    duration: number;
    timestamp: string;
    git: GitContext;
}

export interface GitContext {
    /** Base URL for links to repo files at the tested commit, if running in GitHub Actions. */
    blobUrl: string;
    runUrl: string;
    sha: string;
    branch: string;
    /** GitHub Actions event that triggered the run, e.g. `push` or `pull_request`. */
    event: string;
}

/** Full test name, as shown in reports - e.g. `Store › loadData › reuses records`. */
export function fullName(test: ReportTest): string {
    return [...test.suites, test.name].join(' › ');
}

//------------------------
// Helpers
//------------------------
// Group specs by Hoist package: the spec's directory, at most two levels deep.
function packageOf(path: string): string {
    const parts = dirname(path).split('/');
    return parts.slice(0, 2).join('/') || '.';
}

const ANSI = /\x1b\[[0-9;]*m/g; // eslint-disable-line no-control-regex

function cleanError(e: SerializedError & {diff?: string}): ReportError {
    const frame = e.stacks?.find(it => it.file.endsWith('.spec.ts'));
    return {
        message: (e.message ?? String(e)).replace(ANSI, ''),
        diff: e.diff?.replace(ANSI, '') ?? null,
        line: frame?.line ?? null
    };
}

function gitContext(): GitContext {
    const env = process.env,
        server = env.GITHUB_SERVER_URL,
        repo = env.GITHUB_REPOSITORY,
        // The Unit Tests workflow passes the PR head commit - GITHUB_SHA is a merge commit on PRs.
        sha = env.REPORT_SHA || env.GITHUB_SHA || null,
        inActions = server && repo && sha;

    return {
        blobUrl: inActions ? `${server}/${repo}/blob/${sha}` : null,
        runUrl:
            inActions && env.GITHUB_RUN_ID
                ? `${server}/${repo}/actions/runs/${env.GITHUB_RUN_ID}`
                : null,
        sha,
        branch: env.REPORT_BRANCH || env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || null,
        event: env.GITHUB_EVENT_NAME || null
    };
}
