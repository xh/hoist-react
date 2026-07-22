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
import {jsonInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {ReactElement} from 'react';
import {ConfigUtils} from './ConfigUtils';
import './ConfigValue.scss';

/**
 * Presentation of a config's value within the Admin Console config editor, bound to the enclosing
 * RestForm's `value` field. Branches on the config:
 *  - Plain configs render a single editor for the value, by type.
 *  - Configs with a registered typedClass and/or an active instance-config override render a tab set
 *    surfacing the resolved, instance-override, and editable DB values as appropriate.
 * In both cases edits flow through the same `value` field.
 */
export const configValue = hoistCmp.factory<ConfigValueModel>({
    displayName: 'ConfigValue',
    className: 'xh-config-value',
    model: creates(() => new ConfigValueModel()),

    render({model, className}) {
        return model.usesTabs
            ? tabContainer({model: model.tabContainerModel, className})
            : boundValueInput(model.valueType, model.valueField, model.height, className);
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
    get overrideValue(): string {
        return this.formModel?.values?.overrideValue;
    }
    get valueType(): string {
        return this.formModel?.values?.valueType;
    }

    // Tabbed presentation applies when there's more than one view of the value - i.e. a typedClass
    // (resolved value) and/or an active instance-config override. Otherwise a single plain editor.
    get usesTabs(): boolean {
        return this.resolvedValue != null || this.overrideValue != null;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        if (this.usesTabs) this.buildTabs();
    }

    private buildTabs() {
        const {resolvedValue, overrideValue, valueType, valueField, height} = this,
            hasOverride = overrideValue != null,
            hasResolved = resolvedValue != null,
            tabs: TabConfig[] = [];

        // Resolved - effective value with typedClass defaults applied (typed configs only).
        if (hasResolved) {
            // Highlight the keys explicitly set in the effective value (override wins over DB).
            const effective = parseValue(hasOverride ? overrideValue : valueField?.value),
                {text, highlightLines} = ConfigUtils.buildResolvedJson(
                    resolvedValue,
                    ConfigUtils.changedKeysFromStored(effective)
                ),
                changed = new Set(highlightLines),
                otherLines: number[] = [];
            for (let i = 1; i <= text.split('\n').length; i++) {
                if (!changed.has(i)) otherLines.push(i);
            }
            tabs.push({
                id: 'resolved',
                title: 'Resolved',
                icon: Icon.bolt(),
                content: () =>
                    jsonInput({
                        value: text,
                        readonly: true,
                        autoFormat: false,
                        // Mute default/unchanged lines so explicitly-set keys stand out.
                        lineStyles: [{lines: otherLines, className: 'xh-config-value__muted'}],
                        enableSearch: true,
                        width: '100%',
                        height
                    })
            });
        }

        // Instance Value - the raw instance-config override, read-only (when overridden).
        if (hasOverride) {
            tabs.push({
                id: 'instance',
                title: 'Instance Value',
                icon: Icon.warning({intent: 'warning'}),
                content: () => readonlyValue(valueType, overrideValue, height)
            });
        }

        // DB Value - the editable stored value. Struck through in the label when an instance value
        // overrides it (mirrors the grid's overridden-value cue).
        tabs.push({
            id: 'db',
            title: hasOverride
                ? span({className: 'xh-config-value__overridden', item: 'DB Value'})
                : 'DB Value',
            icon: Icon.database(),
            content: () => boundValueInput(valueType, valueField, height)
        });

        this.tabContainerModel = new TabContainerModel({defaultTabId: tabs[0].id, tabs});

        // Editing the DB value only makes the Resolved view stale when there's no override - with an
        // override active, the effective/resolved value is unaffected by DB edits.
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
// Editable input for the value field, by config type, bound directly to the field. `className` is
// passed by the plain (non-tabbed) branch so the full-width stretch rule applies (in the tab set
// the container carries it instead).
function boundValueInput(
    valueType: string,
    field: any,
    height: number,
    className?: string
): ReactElement {
    const bind = {model: field, bind: 'value', className};
    switch (valueType) {
        case 'json':
            return jsonInput({
                ...bind,
                autoFormat: true,
                enableSearch: true,
                width: '100%',
                height
            });
        case 'bool':
            return select({...bind, options: [true, false], enableClear: false});
        case 'int':
            return numberInput({...bind, precision: 0});
        case 'long':
        case 'double':
            return numberInput({...bind});
        case 'pwd':
            // `key` forces a fresh DOM input so Chrome stops offering password autofill here.
            return textInput({...bind, type: 'password', key: '_pwd'});
        default:
            return textInput({...bind});
    }
}

// Read-only display of a raw stored value string, by config type.
function readonlyValue(valueType: string, value: string, height: number): ReactElement {
    return valueType === 'json'
        ? jsonInput({
              value,
              readonly: true,
              autoFormat: true,
              enableSearch: true,
              width: '100%',
              height
          })
        : textInput({value, disabled: true, width: '100%'});
}

// The stored config value arrives as a JSON string - parse it (null on failure).
function parseValue(v: any): any {
    if (typeof v !== 'string') return v;
    try {
        return JSON.parse(v);
    } catch {
        return null;
    }
}
