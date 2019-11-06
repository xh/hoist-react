/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {isBoolean, isNumber, isNil, isEmpty} from 'lodash';

/**
 * A RecordAction encapsulates a shared set of configuration for items within components such as
 * StoreContextMenu and RecordActionBar (aka grid context menus and action columns).
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
 * @see StoreContextMenu
 */
export class RecordAction {

    text;
    secondaryText;
    icon;
    intent;
    tooltip;
    actionFn;
    items;
    disabled;
    hidden;
    displayFn;
    recordsRequired;

    /**
     * @param {Object} c - RecordAction configuration.
     * @param {string} [c.text] - label to be displayed.
     * @param {string} [c.secondaryText] - additional label to be displayed, usually in a minimal fashion.
     * @param {Object} [c.icon] - icon to be displayed.
     * @param {string} [c.intent] - intent to be used for rendering the action.
     * @param {string} [c.tooltip] - tooltip to display when hovering over the action.
     * @param {Object[]} [c.items] - child actions.
     * @param {ActionCb} [c.actionFn] - called on store action activation.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     * @param {DisplayFn} [c.displayFn] - called prior to showing the action in the UI.
     * @param {(number|boolean)} [c.recordsRequired] - how many records must be 'active'
     *      (selected and / or clicked upon) for the action to be enabled.
     *      int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *          Can specify 0 to only enable action if no records are active.
     *      true: specifies that number of records > 0. Allows for arbitrary number of records.
     *      false: specifies any number of records (0 - infinity, inclusive). Always active.
     */
    constructor({
        text,
        secondaryText,
        icon = null,
        intent,
        tooltip,
        actionFn = null,
        items = null,
        disabled = false,
        hidden = false,
        displayFn = null,
        recordsRequired = false
    }) {
        this.text = text;
        this.secondaryText = secondaryText;
        this.icon = icon;
        this.intent = intent;
        this.tooltip = tooltip;
        this.actionFn = actionFn;
        this.items = items;
        this.disabled = disabled;
        this.hidden = hidden;
        this.displayFn = displayFn;
        this.recordsRequired = recordsRequired;
    }

    /**
     * Called by UI elements to get the display configuration for rendering the action. Not
     * typically used by applications.
     *
     * @param p - action parameters
     * @param {Object} [p.record] - row data object (entire row, if any).
     * @param {Object[]} [p.selectedRecords] - all currently selected records (if any).
     * @param {GridModel} [p.gridModel] - grid model where action occurred (if any).
     * @param {Column} [p.column] - column where action occurred (if any).
     * @param {*} [p...rest] - additional data provided by the context where this action presides
     */
    getDisplaySpec({record, selectedRecords, gridModel, column, ...rest}) {
        const recordCount = record && isEmpty(selectedRecords) ?
            1 :
            selectedRecords ? selectedRecords.length : 0;

        const defaultDisplay = {
            icon: this.icon,
            text: this.text,
            secondaryText: this.secondaryText,
            intent: this.intent,
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
     * Called by UI elements to trigger the action. Not typically used by applications.
     *
     * @param p
     * @param {Object} [p.record] - row data object (entire row, if any).
     * @param {Object[]} [p.selectedRecords] - all currently selected records (if any).
     * @param {GridModel} [p.gridModel] - grid model where action occurred (if any).
     * @param {Column} [p.column] - column where action occurred (if any).
     * @param {*} [p...rest] - additional data provided by the context where this action presides
     */
    call({record, selectedRecords, gridModel, column, ...rest}) {
        if (!this.actionFn) return;
        this.actionFn({action: this, record, selectedRecords, gridModel, column, ...rest});
    }

    meetsRecordRequirement(count) {
        const required = this.recordsRequired;
        return isNil(required) ||
            (isBoolean(required) && (!required || required && count > 0)) ||
            (isNumber(required) && count === required);
    }
}

/**
 * @callback ActionCb - called when the action's UI element is clicked or otherwise triggered.
 * @param {Object} p
 * @param {RecordAction} p.action - the action itself.
 * @param {Object} [p.record] - row data object (entire row, if any).
 * @param {Object[]} [p.selectedRecords] - all currently selected records (if any).
 * @param {GridModel} [p.gridModel] - grid model where action occurred (if any).
 * @param {Column} [p.column] - column where action occurred (if any).
 * @param {*} [p...rest] - additional data provided by the context where this action presides
 */

/**
 * @callback DisplayFn - called prior to rendering the action's UI element.
 * @param {Object} p
 * @param {RecordAction} p.action - the action itself.
 * @param {Object} p.defaultConfig - default display config for the action
 * @param {Object} [p.record] - row data object (entire row, if any).
 * @param {Object[]} [p.selection] - all currently selected records (if any).
 * @param {*} [p...rest] - additional data provided by the context where this action presides
 * @returns {Object} - display configs to override for this render of the action.
 */
