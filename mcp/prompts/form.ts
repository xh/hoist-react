/**
 * Form prompt builder for the Hoist MCP server.
 *
 * Composes documentation excerpts, type signatures, conventions, and code
 * templates into a structured guide for creating Hoist forms with validation.
 * This prompt gives an LLM everything it needs to generate correct, idiomatic
 * form code in a single response.
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
function parseBoolish(value?: string, defaultValue = true): boolean {
    if (value == null) return defaultValue;
    const lower = value.trim().toLowerCase();
    return !['false', 'no', '0'].includes(lower);
}

/**
 * Build a structured prompt for creating a Hoist form.
 *
 * Composes form/input documentation, FormModel/FieldModel type info, Hoist
 * conventions, and an adaptive code template into a single markdown guide.
 * Output adapts based on provided `fields` and `validation` arguments.
 *
 * @param args.fields - Comma-separated field names (e.g. "firstName,lastName,email,age")
 * @param args.validation - Whether to include validation examples ("true" or "false")
 */
export async function buildFormPrompt(args: {
    fields?: string;
    validation?: string;
}): Promise<GetPromptResult> {
    const fields = parseCSV(args.fields);
    const includeValidation = parseBoolish(args.validation, true);

    //------------------------------------------------------------------
    // Load documentation
    //------------------------------------------------------------------
    const formDoc = loadDoc('cmp/form');
    const inputDoc = loadDoc('cmp/input');

    //------------------------------------------------------------------
    // Extract relevant doc sections
    //------------------------------------------------------------------
    const docSections: string[] = [];

    const formModelSection = extractSection(formDoc, 'FormModel');
    if (formModelSection) docSections.push('### FormModel\n\n' + formModelSection);

    const fieldModelSection = extractSection(formDoc, 'FieldModel');
    if (fieldModelSection) docSections.push('### FieldModel\n\n' + fieldModelSection);

    const formComponent = extractSection(formDoc, 'Form Component');
    if (formComponent) docSections.push('### Form Component\n\n' + formComponent);

    const commonPatterns = extractSection(formDoc, 'Common Patterns');
    if (commonPatterns) docSections.push('### Common Patterns\n\n' + commonPatterns);

    const pitfalls = extractSection(formDoc, 'Common Pitfalls');
    if (pitfalls) docSections.push('### Common Pitfalls\n\n' + pitfalls);

    // Pull input overview for context on available input components
    const inputOverview = extractSection(inputDoc, 'Overview');
    if (inputOverview) docSections.push('### Input Components\n\n' + inputOverview);

    //------------------------------------------------------------------
    // Type information
    //------------------------------------------------------------------
    const formModelSummary = formatSymbolSummary('FormModel');
    const formModelMembers = formatKeyMembers('FormModel', [
        'fields',
        'values',
        'isValid',
        'isDirty',
        'init',
        'reset',
        'getData'
    ]);
    const fieldModelSummary = formatSymbolSummary('FieldModel');

    //------------------------------------------------------------------
    // Build adaptive code template
    //------------------------------------------------------------------
    const fieldNames = fields.length > 0 ? fields : ['firstName', 'lastName', 'email', 'age'];

    // Build field definitions with optional validation
    const fieldDefs = fieldNames.map(name => {
        const rules: string[] = [];
        if (includeValidation) {
            if (name.toLowerCase().includes('email')) {
                rules.push('required', 'validEmail');
            } else if (
                name.toLowerCase().includes('age') ||
                name.toLowerCase().includes('amount') ||
                name.toLowerCase().includes('price')
            ) {
                rules.push('numberIs({min: 0})');
            } else if (name.toLowerCase().includes('name') || name === fieldNames[0]) {
                rules.push('required');
            }
        }
        const rulesStr = rules.length > 0 ? `, rules: [${rules.join(', ')}]` : '';
        return `            {name: '${name}'${rulesStr}}`;
    });

    // Build formField items matching fields to appropriate input types
    const formFieldItems = fieldNames.map(name => {
        let inputType = 'textInput()';
        const lower = name.toLowerCase();
        if (
            lower.includes('age') ||
            lower.includes('amount') ||
            lower.includes('price') ||
            lower.includes('quantity')
        ) {
            inputType = 'numberInput()';
        } else if (lower.includes('date')) {
            inputType = 'dateInput()';
        } else if (
            lower.includes('active') ||
            lower.includes('enabled') ||
            lower.includes('flag')
        ) {
            inputType = 'switchInput()';
        } else if (
            lower.includes('type') ||
            lower.includes('status') ||
            lower.includes('category')
        ) {
            inputType = 'select({options: [/* TODO: populate options */]})';
        }
        return `            formField({field: '${name}', item: ${inputType}})`;
    });

    const validationImport = includeValidation
        ? "import {required, numberIs, validEmail} from '@xh/hoist/data';\n"
        : '';

    const validationBlock = includeValidation
        ? `
    async saveAsync() {
        const isValid = await this.formModel.validateAsync({display: true});
        if (!isValid) return;

        const data = this.formModel.getData();
        await XH.postJson({url: 'api/myData', body: data});
    }`
        : `
    async saveAsync() {
        const data = this.formModel.getData();
        await XH.postJson({url: 'api/myData', body: data});
    }`;

    const codeTemplate = `
### Model File (\`MyFormPanelModel.ts\`)

\`\`\`typescript
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {FormModel} from '@xh/hoist/cmp/form';
import {makeObservable} from '@xh/hoist/mobx';
${validationImport}
export class MyFormPanelModel extends HoistModel {

    @managed
    formModel: FormModel = new FormModel({
        fields: [
${fieldDefs.join(',\n')}
        ]
    });

    constructor() {
        super();
        makeObservable(this);
    }

    /** Initialize form with data from server. */
    async loadDataAsync(record: Record<string, any>) {
        this.formModel.init(record);
    }
${validationBlock}
}
\`\`\`

### Component File (\`MyFormPanel.ts\`)

\`\`\`typescript
import {hoistCmp, creates} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput, numberInput, dateInput, select, switchInput} from '@xh/hoist/desktop/cmp/input';
import {MyFormPanelModel} from './MyFormPanelModel';

export const myFormPanel = hoistCmp.factory({
    model: creates(MyFormPanelModel),

    render({model}) {
        return panel({
            title: 'My Form',
            item: form({
                model: model.formModel,
                fieldDefaults: {inline: true, labelWidth: 130},
                items: [
${formFieldItems.join(',\n')}
                ]
            }),
            bbar: []  // Add Save / Reset buttons as needed
        });
    }
});
\`\`\``.trim();

    //------------------------------------------------------------------
    // Compose final markdown
    //------------------------------------------------------------------
    const sections = [
        '# Task: Create a Hoist Form',
        '',
        hoistConventionsSection(),
        '',
        '## Form Documentation',
        '',
        ...(docSections.length > 0
            ? docSections
            : ['(Form documentation not available -- refer to MCP tools below.)']),
        '',
        '## FormModel API Reference',
        '',
        formModelSummary,
        '',
        '**Key Members:**',
        formModelMembers,
        '',
        '### FieldModel',
        '',
        fieldModelSummary,
        '',
        '## Code Template',
        '',
        codeTemplate,
        '',
        '## Next Steps',
        '',
        'Use these MCP tools for more detail:',
        '- `hoist-search-docs` -- Search documentation by keyword',
        '- `hoist-get-members FormModel` -- Full list of FormModel properties and methods',
        '- `hoist-get-members FieldModel` -- Full list of FieldModel properties and methods',
        '- `hoist-search-symbols` -- Find validation constraints, input components, and related types',
        ''
    ];

    const text = sections.join('\n');

    return {
        description:
            'Hoist form creation guide with documentation, type info, validation rules, and code template.',
        messages: [
            {
                role: 'user',
                content: {type: 'text', text}
            }
        ]
    };
}
