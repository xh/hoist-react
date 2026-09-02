/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {placeholder, span} from '@xh/hoist/cmp/layout';
import {tabContainer, TabContainerModel, TabConfig} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp, HoistModel, managed, PlainObject} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {
    CodeInputLineStyles,
    jsonInput,
    numberInput,
    select,
    textInput
} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {isPlainObject, last, union} from 'lodash';
import {ReactElement} from 'react';
import {buildResolvedJson, changedKeysFromStored} from './ConfigUtils';
import './ConfigValue.scss';

/**
 * Presentation of a config's value, bound to the `value` field of an enclosing Form. Plain configs
 * render a single editor by type; configs with a typedClass and/or an active instance-config
 * override render a tab set over the applicable views of the value.
 *
 * Used within the RestGrid editor dialog (editable, opening on the Database tab) and the docked
 * detail panel (read-only, opening on the most-derived view). Pass `height` for a fixed-height
 * display, or omit it to fill the available space.
 */
export const configValue = hoistCmp.factory<ConfigValueModel>({
    displayName: 'ConfigValue',
    className: 'xh-config-value',
    model: creates(() => new ConfigValueModel()),

    render({model, className}) {
        const {height} = model;
        className = classNames(className, height == null ? 'xh-config-value--fill' : null);
        return model.usesTabs
            ? tabContainer({model: model.tabContainerModel, className})
            : valueFormField(model.valueType, height, className);
    }
});

class ConfigValueModel extends HoistModel {
    override xhImpl = true;

    @managed tabContainerModel: TabContainerModel;

    get formModel(): FormModel {
        return this.componentProps.formModel;
    }
    /** Fixed height for the value display, or null to fill available space. */
    get height(): number | null {
        return this.componentProps.height ?? null;
    }
    get readonly(): boolean {
        return this.formModel?.readonly ?? false;
    }
    get valueField() {
        return this.formModel?.fields?.value;
    }
    get resolvedValue(): any {
        return this.formModel?.values?.resolvedValue;
    }
    get defaultValue(): any {
        return this.formModel?.values?.defaultValue;
    }
    get overrideValue(): string {
        return this.formModel?.values?.overrideValue;
    }
    get valueType(): string {
        return this.formModel?.values?.valueType;
    }

    // Tabbed when there is more than one view of the value - a typedClass and/or an active override.
    get usesTabs(): boolean {
        return (
            this.resolvedValue != null || this.defaultValue != null || this.overrideValue != null
        );
    }

    get resolvedIsStale(): boolean {
        return this.overrideValue == null && (this.valueField?.isDirty ?? false);
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        if (this.usesTabs) this.buildTabs();
    }

    private buildTabs() {
        const {
                resolvedValue,
                defaultValue,
                overrideValue,
                valueType,
                valueField,
                height,
                readonly
            } = this,
            hasOverride = overrideValue != null,
            hasResolved = resolvedValue != null,
            hasDefaults = defaultValue != null,
            tabs: TabConfig[] = [];

        // Resolved - effective value with typedClass defaults applied.
        if (hasResolved) {
            // Highlight keys explicitly set in the database value or an instance override - all
            // other entries come from the typedClass defaults and are muted.
            const setKeys = union(
                    changedKeysFromStored(parseValue(valueField?.value)),
                    changedKeysFromStored(parseValue(overrideValue))
                ),
                {text, highlightLines} = buildResolvedJson(resolvedValue, setKeys),
                lineStyles = isPlainObject(resolvedValue)
                    ? mutedLineStyles(text, highlightLines)
                    : null;
            tabs.push({
                id: 'resolved',
                title: 'Resolved',
                icon: Icon.bolt(),
                content: () => resolvedTab({text, lineStyles, ...sizeProps(height)})
            });
        }

        if (hasOverride) {
            tabs.push({
                id: 'instance',
                title: 'Instance',
                icon: Icon.warning({intent: 'warning'}),
                content: () => readonlyValue(valueType, overrideValue, height)
            });
        }

        tabs.push({
            id: 'db',
            title: hasOverride
                ? span({className: 'xh-config-value__overridden', item: 'Database'})
                : 'Database',
            icon: Icon.edit(),
            content: () => valueFormField(valueType, height)
        });

        // Defaults - the typedClass defaults as declared in code.
        if (hasDefaults) {
            tabs.push({
                id: 'defaults',
                title: 'Defaults',
                icon: Icon.code(),
                content: () =>
                    jsonInput({
                        value: JSON.stringify(defaultValue),
                        readonly: true,
                        autoFormat: true,
                        enableSearch: true,
                        className: 'xh-config-value__defaults',
                        ...sizeProps(height)
                    })
            });
        }

        // Built most- to least-derived above, but displayed the other way round. Editable forms
        // open on Database - the one view that can actually be edited. Read-only displays open on
        // the last tab, i.e. the most derived view available.
        tabs.reverse();
        this.tabContainerModel = new TabContainerModel({
            defaultTabId: readonly ? last(tabs).id : 'db',
            tabs
        });
    }
}

//------------------------
// Implementation
//------------------------
// Resolved value, or a prompt to save when unsaved DB edits have left it stale. Remaining props
// include the `flex` that Tab injects into its content - must pass through to size correctly.
const resolvedTab = hoistCmp.factory<ConfigValueModel>(({model, text, lineStyles, ...rest}) =>
    model.resolvedIsStale
        ? placeholder({
              ...rest,
              className: 'xh-config-value__stale',
              items: [Icon.bolt(), 'Update pending. Save or revert to recompute.']
          })
        : jsonInput({
              value: text,
              readonly: true,
              autoFormat: false,
              lineStyles,
              enableSearch: true,
              ...rest
          })
);

// Label-less FormField for `value`, bound via the enclosing Form context for standard validation
// display and read-only rendering. The plain branch passes `className` for the full-width rule.
function valueFormField(
    valueType: string,
    height: number | null,
    className?: string
): ReactElement {
    return formField({
        field: 'value',
        label: null,
        className: classNames('xh-config-value__field', className),
        readonlyRenderer: v => readonlyValue(valueType, v, height),
        item: valueInput(valueType, height)
    });
}

// Editable input for a config value, by type. Bound by the enclosing FormField.
function valueInput(valueType: string, height: number | null): ReactElement {
    switch (valueType) {
        case 'json':
            return jsonInput({
                autoFormat: true,
                enableSearch: true,
                ...sizeProps(height)
            });
        case 'bool':
            return select({options: [true, false], enableClear: false});
        case 'int':
            return numberInput({precision: 0});
        case 'long':
        case 'double':
            return numberInput();
        case 'pwd':
            // `key` forces a fresh DOM input so Chrome stops offering password autofill here.
            return textInput({type: 'password', key: '_pwd'});
        default:
            return textInput();
    }
}

// Read-only display of a raw stored value, by type. Masks pwd.
function readonlyValue(valueType: string, value: any, height: number | null): ReactElement {
    switch (valueType) {
        case 'json':
            return jsonInput({
                value,
                readonly: true,
                autoFormat: true,
                enableSearch: true,
                width: null,
                ...sizeProps(height)
            });
        case 'pwd':
            return span(value == null ? '' : '*****');
        default:
            return span(value?.toString() ?? '');
    }
}

// Layout props for a JSON editor - fixed to `height` if given, otherwise filling its container.
function sizeProps(height: number | null): PlainObject {
    return height != null ? {height} : {flex: 1, height: '100%', width: '100%'};
}

// Muting styles for pre-rendered JSON `text` - every line NOT in `highlightLines`.
function mutedLineStyles(text: string, highlightLines: number[]): CodeInputLineStyles[] {
    const changed = new Set(highlightLines),
        lineCount = text.split('\n').length,
        muted: number[] = [];
    for (let i = 1; i <= lineCount; i++) {
        if (!changed.has(i)) muted.push(i);
    }
    return [{lines: muted, className: 'xh-config-value__muted'}];
}

function parseValue(v: any): any {
    if (typeof v !== 'string') return v;
    try {
        return JSON.parse(v);
    } catch {
        return null;
    }
}
