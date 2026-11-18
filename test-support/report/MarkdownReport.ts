/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {groupBy} from 'lodash';
import {fullName, type ReportFile, type ReportTest, type TestReport} from './TestReporter';

/** Marker that lets the Unit Tests workflow find and update its own PR comment. */
export const COMMENT_MARKER = '<!-- hoist-unit-tests -->';

const MAX_LISTED_FAILURES = 10;

/** Full report, written to the GitHub Actions job summary of the run. */
export function renderSummary(report: TestReport): string {
    return [
        headline(report),
        failures(report, Infinity),
        packageTable(report),
        knownBugs(report),
        allTests(report)
    ]
        .filter(Boolean)
        .join('\n\n')
        .concat('\n');
}

/** Compact report for a pull request comment, linking to the full report on the run. */
export function renderComment(report: TestReport): string {
    const {runUrl} = report.git,
        links = runUrl
            ? `📊 [Full report and all tests](${runUrl}) · interactive HTML report attached to the run`
            : null;

    return [
        COMMENT_MARKER,
        headline(report),
        failures(report, MAX_LISTED_FAILURES),
        knownBugs(report),
        links
    ]
        .filter(Boolean)
        .join('\n\n')
        .concat('\n');
}

//------------------------
// Sections
//------------------------
function headline(report: TestReport): string {
    const {totals, files, git} = report,
        pkgCount = new Set(files.map(it => it.pkg)).size,
        passing = isPassing(report),
        title = passing
            ? `## ✅ Unit tests passed - ${fmtCount(totals.passed, 'test')}`
            : `## ❌ Unit tests failed - ${failureSummary(report)}`;

    const stats = [
        `**${fmtCount(totals.total, 'test')}**`,
        fmtCount(files.length, 'spec file'),
        fmtCount(pkgCount, 'package'),
        fmtDuration(report.duration)
    ];
    if (git.sha) stats.push(`commit \`${git.sha.slice(0, 8)}\``);
    if (git.branch) stats.push(`\`${git.branch}\``);

    const notes = [];
    if (totals.knownBugs) notes.push(`${fmtCount(totals.knownBugs, 'known bug')} documented`);
    if (totals.skipped) notes.push(`${totals.skipped} skipped`);

    return [title, stats.join(' · '), notes.length ? `<sub>${notes.join(' · ')}</sub>` : null]
        .filter(Boolean)
        .join('\n');
}

function failures(report: TestReport, max: number): string {
    const failed = report.files.flatMap(file =>
            file.tests.filter(it => it.state === 'failed').map(test => ({file, test}))
        ),
        loadFailed = report.files.filter(it => it.loadErrors.length);

    if (!failed.length && !loadFailed.length && !report.unhandledErrors.length) return null;

    const ret = ['### Failures'];
    loadFailed.forEach(file => {
        ret.push(`#### 💥 ${fileLink(report, file, null)} could not run`);
        ret.push(codeBlock(file.loadErrors.join('\n\n')));
    });
    failed.slice(0, max).forEach(({file, test}) => {
        const [err] = test.errors;
        ret.push(`#### ❌ ${fullName(test)}`);
        ret.push(fileLink(report, file, err?.line ?? test.line));
        if (err)
            ret.push(codeBlock(err.message) + (err.diff ? '\n' + codeBlock(err.diff, 'diff') : ''));
    });
    if (failed.length > max) {
        ret.push(`<sub>…and ${failed.length - max} more - see the full report.</sub>`);
    }
    report.unhandledErrors.forEach(msg => {
        ret.push('#### 💥 Unhandled error outside of any test');
        ret.push(codeBlock(msg));
    });
    return ret.join('\n\n');
}

function packageTable(report: TestReport): string {
    const byPkg = groupBy(report.files, it => it.pkg),
        rows = Object.entries(byPkg).map(([pkg, files]) => {
            const tests = files.flatMap(it => it.tests),
                failed = tests.filter(it => it.state === 'failed').length,
                broken = files.some(it => it.loadErrors.length),
                status = failed || broken ? `❌ ${failed || ''}`.trim() : '✅';
            return `| \`${pkg}\` | ${files.length} | ${tests.length} | ${status} |`;
        });

    return [
        '### Tests by package',
        '| Package | Spec files | Tests | Result |',
        '|:--|--:|--:|:--:|',
        ...rows
    ].join('\n');
}

function knownBugs(report: TestReport): string {
    const bugs = report.files.flatMap(file =>
        file.tests.filter(it => it.knownBug).map(test => ({file, test}))
    );
    if (!bugs.length) return null;

    return [
        `<details><summary>🐞 <b>${fmtCount(bugs.length, 'known bug')}</b> documented by <code>it.fails</code> tests</summary>`,
        '',
        'Each test asserts the correct behavior and is expected to fail until the bug is fixed.',
        '',
        ...bugs.map(({file, test}) => `- ${fullName(test)} - ${fileLink(report, file, test.line)}`),
        '',
        '</details>'
    ].join('\n');
}

function allTests(report: TestReport): string {
    const lines = report.files.map(file => {
        const tests = file.tests.map(test => `  - ${statusIcon(test)} ${fullName(test)}`);
        return [`- **${fileLink(report, file, null)}**`, ...tests].join('\n');
    });

    return [
        `<details><summary>📋 <b>All ${fmtCount(report.totals.total, 'test')}</b>, by spec file</summary>`,
        '',
        ...lines,
        '',
        '</details>'
    ].join('\n');
}

//------------------------
// Helpers
//------------------------
function isPassing(report: TestReport): boolean {
    return !report.totals.failed && !report.loadFailures && !report.unhandledErrors.length;
}

function failureSummary(report: TestReport): string {
    const {totals, loadFailures, unhandledErrors} = report,
        parts = [];
    if (totals.failed) parts.push(`${totals.failed} of ${fmtCount(totals.total, 'test')} failed`);
    if (loadFailures) parts.push(`${fmtCount(loadFailures, 'spec file')} could not run`);
    if (unhandledErrors.length) parts.push(fmtCount(unhandledErrors.length, 'unhandled error'));
    return parts.join(', ');
}

function statusIcon(test: ReportTest): string {
    if (test.state === 'failed') return '❌';
    if (test.state === 'skipped') return '⏭️';
    return test.knownBug ? '🐞' : '✅';
}

function fileLink(report: TestReport, file: ReportFile, line: number): string {
    const label = line ? `${file.path}:${line}` : file.path,
        {blobUrl} = report.git;
    if (!blobUrl) return `\`${label}\``;
    return `[\`${label}\`](${blobUrl}/${file.path}${line ? `#L${line}` : ''})`;
}

function codeBlock(text: string, lang = ''): string {
    return '```' + lang + '\n' + text.trim() + '\n```';
}

function fmtCount(n: number, noun: string): string {
    return `${n.toLocaleString('en-US')} ${noun}${n === 1 ? '' : 's'}`;
}

export function fmtDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}
