/**
 * Grid prompt builder for the Hoist MCP server.
 *
 * Composes documentation excerpts, type signatures, conventions, and code
 * templates into a structured guide for creating Hoist grid panels. This
 * prompt gives an LLM everything it needs to generate correct, idiomatic
 * grid code in a single response.
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

/**
 * Build a structured prompt for creating a Hoist grid panel.
 *
 * Composes grid documentation, GridModel/Column type info, Hoist conventions,
 * and an adaptive code template into a single markdown guide. Output adapts
 * based on provided `dataFields` and `features` arguments.
 *
 * @param args.dataFields - Comma-separated data field names (e.g. "name,value,date")
 * @param args.features - Comma-separated features: sorting, grouping, selection, export, filtering, treeMode
 */
export async function buildGridPrompt(args: {
    dataFields?: string;
    features?: string;
}): Promise<GetPromptResult> {
    const fields = parseCSV(args.dataFields);
    const features = parseCSV(args.features);
    const featureSet = new Set(features.map(f => f.toLowerCase()));

    //------------------------------------------------------------------
    // Load documentation
    //------------------------------------------------------------------
    const gridDoc = loadDoc('cmp/grid');

    //------------------------------------------------------------------
    // Extract relevant doc sections
    //------------------------------------------------------------------
    const docSections: string[] = [];

    const basicSetup = extractSection(gridDoc, 'Common Usage Patterns');
    if (basicSetup) docSections.push('### Grid Setup Patterns\n\n' + basicSetup);

    const columnRef = extractSection(gridDoc, 'Column Properties Reference');
    if (columnRef) docSections.push('### Column Properties Reference\n\n' + columnRef);

    const configPattern = extractSection(gridDoc, 'Configuration Pattern');
    if (configPattern) docSections.push('### Configuration Pattern\n\n' + configPattern);

    //------------------------------------------------------------------
    // Type information
    //------------------------------------------------------------------
    const gridModelSummary = formatSymbolSummary('GridModel');
    const gridModelMembers = formatKeyMembers('GridModel', [
        'store',
        'columns',
        'sortBy',
        'selModel',
        'groupBy',
        'emptyText',
        'onRowDoubleClicked'
    ]);
    const columnSummary = formatSymbolSummary('Column');

    //------------------------------------------------------------------
    // Build adaptive code template
    //------------------------------------------------------------------
    const fieldDefs =
        fields.length > 0 ? fields.map(f => `'${f}'`).join(', ') : "'name', 'value', 'date'";

    const columnDefs =
        fields.length > 0
            ? fields.map(f => `        {field: '${f}', flex: 1}`).join(',\n')
            : "        {field: 'name', flex: 1},\n        {field: 'value', ...number},\n        {field: 'date', ...date}";

    // Build optional GridModel config lines based on features
    const gridConfigLines: string[] = [];
    if (featureSet.has('sorting') || featureSet.has('sort')) {
        gridConfigLines.push("    sortBy: 'name',");
    }
    if (featureSet.has('grouping') || featureSet.has('group')) {
        gridConfigLines.push("    groupBy: 'category',");
    }
    if (featureSet.has('selection') || featureSet.has('select')) {
        gridConfigLines.push("    selModel: 'single',");
    }
    if (featureSet.has('export')) {
        gridConfigLines.push('    enableExport: true,');
    }
    if (featureSet.has('filtering') || featureSet.has('filter')) {
        gridConfigLines.push('    filterModel: true,');
    }
    if (featureSet.has('treemode') || featureSet.has('tree')) {
        gridConfigLines.push('    treeMode: true,');
    }
    if (featureSet.has('emptytext')) {
        gridConfigLines.push("    emptyText: 'No records found.',");
    }

    const extraConfig = gridConfigLines.length > 0 ? '\n' + gridConfigLines.join('\n') : '';

    const codeTemplate = `
### Model File (\`MyGridPanelModel.ts\`)

\`\`\`typescript
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {makeObservable} from '@xh/hoist/mobx';

export class MyGridPanelModel extends HoistModel {

    @managed
    gridModel: GridModel = new GridModel({
        store: {
            fields: [${fieldDefs}]
        },
        columns: [
${columnDefs}
        ],${extraConfig}
        emptyText: 'No records found.'
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override async doLoadAsync() {
        const data = await XH.fetchJson({url: 'api/myData'});
        this.gridModel.loadData(data);
    }
}
\`\`\`

### Component File (\`MyGridPanel.ts\`)

\`\`\`typescript
import {hoistCmp, creates} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {MyGridPanelModel} from './MyGridPanelModel';

export const myGridPanel = hoistCmp.factory({
    model: creates(MyGridPanelModel),

    render({model}) {
        return panel({
            title: 'My Grid',
            item: grid({model: model.gridModel}),
            bbar: []  // Add toolbar buttons as needed
        });
    }
});
\`\`\``.trim();

    //------------------------------------------------------------------
    // Compose final markdown
    //------------------------------------------------------------------
    const sections = [
        '# Task: Create a Hoist Grid Panel',
        '',
        hoistConventionsSection(),
        '',
        '## Grid Documentation',
        '',
        ...(docSections.length > 0
            ? docSections
            : ['(Grid documentation not available -- refer to MCP tools below.)']),
        '',
        '## GridModel API Reference',
        '',
        gridModelSummary,
        '',
        '**Key Members:**',
        gridModelMembers,
        '',
        '### Column',
        '',
        columnSummary,
        '',
        '## Code Template',
        '',
        codeTemplate,
        '',
        '## Next Steps',
        '',
        'Use these MCP tools for more detail:',
        '- `hoist-search-docs` -- Search documentation by keyword',
        '- `hoist-get-members GridModel` -- Full list of GridModel properties and methods',
        '- `hoist-search-symbols Column` -- Find Column and related types',
        '- `hoist-get-members Column` -- Full list of Column properties',
        ''
    ];

    const text = sections.join('\n');

    return {
        description:
            'Hoist grid panel creation guide with documentation, type info, conventions, and code template.',
        messages: [
            {
                role: 'user',
                content: {type: 'text', text}
            }
        ]
    };
}
