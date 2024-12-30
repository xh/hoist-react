/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {isBoolean, isEmpty, isNil, isNumber, isString} from 'lodash';
import {ReactElement} from 'react';
import {Intent, PlainObject, TestSupportProps} from '../core';
import {StoreRecord} from './StoreRecord';
import {Column, GridModel} from '../cmp/grid';

export interface RecordActionSpec extends TestSupportProps {
    /** Label to be displayed. */
    text?: string;

    /** Additional label to be displayed, usually in a minimal fashion.*/
    secondaryText?: string;

    /** Icon to be displayed.*/
    icon?: ReactElement;

    /** Intent to be used for rendering the action.*/
    intent?: Intent;

    /** Css class name to be added when rendering the action. */
    className?: string;

    /** Tooltip to display when hovering over the action. */
    tooltip?: string;

    /** Function called on action execution. */
    actionFn?: (data: ActionFnData) => void;

    /** Function called prior to showing this item. */
    displayFn?: (data: DisplayFnData) => PlainObject;

    /** Sub-actions for this action. */
    items?: RecordActionLike[];

    /** True to disable this item. */
    disabled?: boolean;

    /** True to hide this item. */
    hidden?: boolean;

    /**
     * Count of records that must be 'active' (selected and / or clicked upon) for the action to be
     * enabled.
     *  - int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *      Can specify 0 to only enable action if *no* records are active.
     *  - true: specifies a non-zero number of records.
     *  - false: specifies any number of records (0 - infinity, inclusive). Always active.
     */
    recordsRequired?: boolean | number;
}

export type RecordActionLike = RecordAction | RecordActionSpec | '-';

/**
 * Data passed to the Action Function of a RecordAction
 */
export interface ActionFnData {
    /** The triggering action itself. */
    action?: RecordAction;

    /** Row data object (entire row, if any).*/
    record?: StoreRecord;

    /** All currently selected records (if any).*/
    selectedRecords?: StoreRecord[];

    /** Grid model where action occurred (if any). */
    gridModel?: GridModel;

    /** Column where action occurred (if any). */
    column?: Column;

    /** Additional data provided by the context where this action presides */
    [x: string]: any;
}

/**
 * A RecordAction encapsulates a shared set of configuration for items within components such as
 * a Grid Context Menu nd RecordActionBar (aka grid context menus and action columns).
 *
 * Components passed these actions will render them with an appropriate UI (e.g. menu item, button)
 * and call their `actionFn` when clicked, passing it a data object (if available) sourced from the
 * selected row(s) or node(s) on the underlying grid or data view.
 *
 * The `displayFn` callback allows apps to customize any display properties of the action prior to
 * each render by returning an object with keys/values to override (e.g. `{hidden: true}`).
 *
 * NOTE that both `actionFn` and `displayFn` can be called with a null record - e.g. when showing a
 * context menu on a full-width grid group row, where there is no backing record for the row.
 * Applications should ensure these callbacks handle their `record` param in a null-safe manner.
 *
 * @see RecordActionBar
 * @see GridContextMenuSpec
 */
export class RecordAction {
    text: string;
    secondaryText: string;
    icon: ReactElement;
    intent: Intent;
    className: string;
    tooltip: string;
    actionFn: (data: ActionFnData) => void;
    displayFn: (data: DisplayFnData) => PlainObject;
    items: Array<RecordAction | string>;
    disabled: boolean;
    hidden: boolean;
    recordsRequired: boolean | number;
    testId: string;

    constructor({
        text,
        secondaryText,
        icon = null,
        intent,
        className,
        tooltip,
        actionFn = null,
        items = null,
        disabled = false,
        hidden = false,
        displayFn = null,
        recordsRequired = false,
        testId = null
    }: RecordActionSpec) {
        this.text = text;
        this.secondaryText = secondaryText;
        this.icon = icon;
        this.intent = intent;
        this.className = className;
        this.tooltip = tooltip;
        this.actionFn = actionFn;
        this.disabled = disabled;
        this.hidden = hidden;
        this.displayFn = displayFn;
        this.recordsRequired = recordsRequired;
        this.testId = testId;

        this.items = items?.map(it => {
            if (isString(it)) return it;
            return it instanceof RecordAction ? it : new RecordAction(it);
        });
    }

    /**
     * Called by UI elements to get the display configuration for rendering the action.
     * @internal
     */
    getDisplaySpec({record, selectedRecords, gridModel, column, ...rest}: ActionFnData) {
        const recordCount =
            record && isEmpty(selectedRecords) ? 1 : selectedRecords ? selectedRecords.length : 0;

        const defaultDisplay = {
            icon: this.icon,
            text: this.text,
            secondaryText: this.secondaryText,
            intent: this.intent,
            className: this.className,
            tooltip: this.tooltip,
            items: this.items,
            hidden: this.hidden,
            disabled: this.disabled || !this.meetsRecordRequirement(recordCount)
        };

        if (this.displayFn) {
            return {
                ...defaultDisplay,
                ...this.displayFn({
                    action: this,
                    record,
                    selectedRecords,
                    gridModel,
                    column,
                    ...rest
                })
            };
        }

        return defaultDisplay;
    }

    /**
     * Called by UI elements to trigger the action.
     * @internal
     */
    call({record, selectedRecords, gridModel, column, ...rest}: ActionFnData) {
        if (!this.actionFn) return;

        let store = record?.store;
        if (!store) store = gridModel?.store;

        this.actionFn({action: this, record, selectedRecords, store, gridModel, column, ...rest});
    }

    private meetsRecordRequirement(count: number) {
        const required = this.recordsRequired;
        return (
            isNil(required) ||
            (isBoolean(required) && (!required || (required && count > 0))) ||
            (isNumber(required) && count === required)
        );
    }
}

interface DisplayFnData extends ActionFnData {
    /** Default display config for the action */
    defaultConfig?: PlainObject;
}
