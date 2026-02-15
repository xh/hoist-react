/**
 * Tab container prompt builder for the Hoist MCP server.
 *
 * Composes documentation excerpts, type signatures, conventions, and code
 * templates into a structured guide for creating Hoist tabbed interfaces.
 * This prompt gives an LLM everything it needs to generate correct, idiomatic
 * tab container code in a single response.
 */
import type {GetPromptResult} from '@modelcontextprotocol/sdk/types.js';

import {
    loadDoc,
    extractSection,
    formatSymbolSummary,
    formatKeyMembers,
    hoistConventionsSection
} from './util.js';

/** Parse a comma-separated string into a trimmed, non-empty array. */
function parseCSV(value?: string): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

/** Parse a boolean-ish string. Treats "false"/"no"/"0" as false, everything else as true. */
function parseBoolish(value?: string, defaultValue = false): boolean {
    if (value == null) return defaultValue;
    const lower = value.trim().toLowerCase();
    if (['false', 'no', '0'].includes(lower)) return false;
    return true;
}

/**
 * Build a structured prompt for creating a Hoist tabbed interface.
 *
 * Composes tab documentation, TabContainerModel type info, Hoist conventions,
 * and an adaptive code template into a single markdown guide. Output adapts
 * based on provided `tabs` and `routing` arguments.
 *
 * @param args.tabs - Comma-separated tab names (e.g. "overview,details,history")
 * @param args.routing - Whether to include route integration ("true" or "false")
 */
export async function buildTabsPrompt(args: {
    tabs?: string;
    routing?: string;
}): Promise<GetPromptResult> {
    const tabNames = parseCSV(args.tabs);
    const includeRouting = parseBoolish(args.routing, false);

    //------------------------------------------------------------------
    // Load documentation
    //------------------------------------------------------------------
    const tabDoc = loadDoc('cmp/tab');

    //------------------------------------------------------------------
    // Extract relevant doc sections
    //------------------------------------------------------------------
    const docSections: string[] = [];

    const tabContainerSection = extractSection(tabDoc, 'TabContainerModel');
    if (tabContainerSection) docSections.push('### TabContainerModel\n\n' + tabContainerSection);

    const tabModelSection = extractSection(tabDoc, 'TabModel');
    if (tabModelSection) docSections.push('### TabModel\n\n' + tabModelSection);

    const refreshSection = extractSection(tabDoc, 'Refresh Integration');
    if (refreshSection) docSections.push('### Refresh Integration\n\n' + refreshSection);

    const commonPatterns = extractSection(tabDoc, 'Common Patterns');
    if (commonPatterns) docSections.push('### Common Patterns\n\n' + commonPatterns);

    const pitfalls = extractSection(tabDoc, 'Common Pitfalls');
    if (pitfalls) docSections.push('### Common Pitfalls\n\n' + pitfalls);

    //------------------------------------------------------------------
    // Type information
    //------------------------------------------------------------------
    const tabContainerModelSummary = formatSymbolSummary('TabContainerModel');
    const tabContainerModelMembers = formatKeyMembers('TabContainerModel', [
        'tabs',
        'activeTabId',
        'route',
        'switcherPosition',
        'refreshMode',
        'renderMode'
    ]);

    //------------------------------------------------------------------
    // Build adaptive code template
    //------------------------------------------------------------------
    const names = tabNames.length > 0 ? tabNames : ['overview', 'details', 'history'];

    // Generate tab definitions
    const tabDefs = names.map(name => {
        const title = name.charAt(0).toUpperCase() + name.slice(1);
        return `            {id: '${name}', title: '${title}', content: () => ${name}Panel()}`;
    });

    // Generate content panel stubs
    const contentPanels = names.map(name => {
        const title = name.charAt(0).toUpperCase() + name.slice(1);
        return `
/** ${title} tab content panel. */
export const ${name}Panel = hoistCmp.factory(
    () => panel({
        title: '${title}',
        item: placeholder('${title} content goes here')
    })
);`;
    });

    // Routing config
    const routeConfig = includeRouting ? "\n        route: 'default'," : '';
    const routingComment = includeRouting
        ? `
// IMPORTANT: When using route integration, ensure your AppModel.getRoutes()
// defines matching routes. Tab IDs must correspond to child route names.
// Example:
//   getRoutes() {
//     return [{
//       name: 'default', path: '/app',
//       children: [
${names.map(n => `//         {name: '${n}', path: '/${n}'}`).join(',\n')}
//       ]
//     }];
//   }
`
        : '';

    const codeTemplate = `
### Model File (\`MyTabbedPanelModel.ts\`)

\`\`\`typescript
import {HoistModel, managed} from '@xh/hoist/core';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {makeObservable} from '@xh/hoist/mobx';
${routingComment}
export class MyTabbedPanelModel extends HoistModel {

    @managed
    tabContainerModel: TabContainerModel = new TabContainerModel({
        tabs: [
${tabDefs.join(',\n')}
        ],${routeConfig}
        renderMode: 'lazy',
        refreshMode: 'onShowLazy'
    });

    constructor() {
        super();
        makeObservable(this);
    }
}
\`\`\`

### Component File (\`MyTabbedPanel.ts\`)

\`\`\`typescript
import {hoistCmp, creates} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabContainer} from '@xh/hoist/desktop/cmp/tab';
import {placeholder} from '@xh/hoist/cmp/layout';
import {MyTabbedPanelModel} from './MyTabbedPanelModel';

export const myTabbedPanel = hoistCmp.factory({
    model: creates(MyTabbedPanelModel),

    render({model}) {
        return panel({
            title: 'My Tabbed Panel',
            item: tabContainer({model: model.tabContainerModel})
        });
    }
});
${contentPanels.join('\n')}
\`\`\``.trim();

    //------------------------------------------------------------------
    // Compose final markdown
    //------------------------------------------------------------------
    const sections = [
        '# Task: Create a Hoist Tab Container',
        '',
        hoistConventionsSection(),
        '',
        '## Tab Documentation',
        '',
        ...(docSections.length > 0
            ? docSections
            : ['(Tab documentation not available -- refer to MCP tools below.)']),
        '',
        '## TabContainerModel API Reference',
        '',
        tabContainerModelSummary,
        '',
        '**Key Members:**',
        tabContainerModelMembers,
        '',
        '## Code Template',
        '',
        codeTemplate,
        '',
        '## Next Steps',
        '',
        'Use these MCP tools for more detail:',
        '- `hoist-search-docs` -- Search documentation by keyword',
        '- `hoist-get-members TabContainerModel` -- Full list of TabContainerModel properties and methods',
        '- `hoist-get-members TabModel` -- Full list of TabModel properties and methods',
        '- `hoist-search-symbols` -- Find RenderMode, RefreshMode, and related types',
        ''
    ];

    const text = sections.join('\n');

    return {
        description:
            'Hoist tab container creation guide with documentation, type info, conventions, and code template.',
        messages: [
            {
                role: 'user',
                content: {type: 'text', text}
            }
        ]
    };
}
