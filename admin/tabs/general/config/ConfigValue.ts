/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {span} from '@xh/hoist/cmp/layout';
import {tabContainer, TabContainerModel, TabConfig} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp, HoistModel, managed} from '@xh/hoist/core';
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
import {ReactElement} from 'react';
import {ConfigUtils} from './ConfigUtils';
import './ConfigValue.scss';

/**
 * Presentation of a config's value within the config editor, bound to the enclosing RestForm's
 * `value` field. Plain configs render a single editor by type; configs with a typedClass and/or
 * an active instance-config override render a tab set over the applicable views of the value.
 */
export const configValue = hoistCmp.factory<ConfigValueModel>({
    displayName: 'ConfigValue',
    className: 'xh-config-value',
    model: creates(() => new ConfigValueModel()),

    render({model, className}) {
        return model.usesTabs
            ? tabContainer({model: model.tabContainerModel, className})
            : valueFormField(model.valueType, model.height, model.defaultValue, className);
    }
});

class ConfigValueModel extends HoistModel {
    override xhImpl = true;

    @managed tabContainerModel: TabContainerModel;

    get formModel(): FormModel {
        return this.componentProps.formModel;
    }
    get height(): number {
        return this.componentProps.height ?? 250;
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

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        if (this.usesTabs) this.buildTabs();
    }

    private buildTabs() {
        const {resolvedValue, defaultValue, overrideValue, valueType, valueField, height} = this,
            hasOverride = overrideValue != null,
            hasResolved = resolvedValue != null,
            hasDefaults = defaultValue != null,
            tabs: TabConfig[] = [];

        // Resolved - effective value with typedClass defaults applied.
        if (hasResolved) {
            // Mute keys whose resolved values match the code defaults. Older hoist-core versions
            // do not supply defaults - fall back to muting keys not set in the effective value.
            const changedKeys = hasDefaults
                    ? ConfigUtils.changedKeysFromDefaults(resolvedValue, defaultValue)
                    : ConfigUtils.changedKeysFromStored(
                          parseValue(hasOverride ? overrideValue : valueField?.value)
                      ),
                {text, highlightLines} = ConfigUtils.buildResolvedJson(resolvedValue, changedKeys);
            tabs.push({
                id: 'resolved',
                title: 'Resolved',
                icon: Icon.bolt(),
                content: () =>
                    jsonInput({
                        value: text,
                        readonly: true,
                        autoFormat: false,
                        lineStyles: mutedLineStyles(text, highlightLines),
                        enableSearch: true,
                        height
                    })
            });
        }

        if (hasOverride) {
            tabs.push({
                id: 'instance',
                title: 'Instance',
                icon: Icon.warning({intent: 'warning'}),
                content: () => readonlyValue(valueType, overrideValue, height, defaultValue)
            });
        }

        tabs.push({
            id: 'db',
            title: hasOverride
                ? span({className: 'xh-config-value__overridden', item: 'Database'})
                : 'Database',
            icon: Icon.edit(),
            content: () => valueFormField(valueType, height, defaultValue)
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
                        height
                    })
            });
        }

        this.tabContainerModel = new TabContainerModel({defaultTabId: tabs[0].id, tabs});

        // Allow clearing the DB value - normalized to '{}' on blur so it remains valid to save.
        if (valueType === 'json') {
            this.addReaction({
                track: () => [valueField?.boundInput?.hasFocus, valueField?.value],
                run: () => {
                    if (!valueField) return;
                    const {boundInput, value, isDirty} = valueField;
                    if (!boundInput?.hasFocus && isDirty && !value?.trim()) {
                        valueField.setValue('{}');
                    }
                }
            });
        }

        // DB edits stale the Resolved view - but only when no override is active.
        if (hasResolved && !hasOverride) {
            this.addReaction({
                track: () => valueField?.isDirty ?? false,
                run: dirty => {
                    this.tabContainerModel.findTab('resolved')?.setDisabled(dirty);
                    if (dirty) this.tabContainerModel.activateTab('db');
                },
                fireImmediately: true
            });
        }
    }
}

//------------------------
// Implementation
//------------------------
// Label-less FormField for `value`, bound via the enclosing Form context for standard validation
// display and read-only rendering. The plain branch passes `className` for the full-width rule.
function valueFormField(
    valueType: string,
    height: number,
    defaults?: any,
    className?: string
): ReactElement {
    return formField({
        field: 'value',
        label: null,
        className: classNames('xh-config-value__field', className),
        readonlyRenderer: v => readonlyValue(valueType, v, height, defaults),
        item: valueInput(valueType, height, defaults)
    });
}

// Editable input for a config value, by type. Bound by the enclosing FormField.
function valueInput(valueType: string, height: number, defaults?: any): ReactElement {
    switch (valueType) {
        case 'json':
            return jsonInput({
                autoFormat: true,
                enableSearch: true,
                lineStyles: defaults != null ? text => dbValueLineStyles(text, defaults) : null,
                height
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

// Read-only display of a raw stored value, by type. Mutes JSON matching the code defaults;
// masks pwd.
function readonlyValue(
    valueType: string,
    value: any,
    height: number,
    defaults?: any
): ReactElement {
    switch (valueType) {
        case 'json': {
            const parsed = defaults != null ? parseValue(value) : null;
            if (parsed != null && typeof parsed === 'object') {
                const {text, highlightLines} = ConfigUtils.buildResolvedJson(
                    parsed,
                    ConfigUtils.changedKeysFromDefaults(parsed, defaults)
                );
                return jsonInput({
                    value: text,
                    readonly: true,
                    autoFormat: false,
                    lineStyles: mutedLineStyles(text, highlightLines),
                    enableSearch: true,
                    width: null,
                    height
                });
            }
            return jsonInput({
                value,
                readonly: true,
                autoFormat: true,
                enableSearch: true,
                width: null,
                height
            });
        }
        case 'pwd':
            return textInput({value: value == null ? '' : '*****', disabled: true});
        default:
            return textInput({value: value?.toString() ?? '', disabled: true});
    }
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

// Muting styles for the editable DB editor, re-evaluated as the document changes. Muting only
// applies while the text is in canonical autoFormat form, where the line mapping is reliable.
function dbValueLineStyles(text: string, defaults: any): CodeInputLineStyles[] {
    const parsed = parseValue(text);
    if (parsed == null || typeof parsed !== 'object') return [];
    const {text: canonical, highlightLines} = ConfigUtils.buildResolvedJson(
        parsed,
        ConfigUtils.changedKeysFromDefaults(parsed, defaults)
    );
    return text === canonical ? mutedLineStyles(text, highlightLines) : [];
}

function parseValue(v: any): any {
    if (typeof v !== 'string') return v;
    try {
        return JSON.parse(v);
    } catch {
        return null;
    }
}
