/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isBoolean, isNumber, isNil} from 'lodash';
import {Icon} from '@xh/hoist/icon';

export const addAction = {
    text: 'Add',
    icon: Icon.add(),
    intent: 'success'
};

export const editAction = {
    text: 'Edit',
    icon: Icon.edit(),
    intent: 'primary',
    recordsRequired: 1
};

export const viewAction = {
    text: 'View',
    icon: Icon.search(),
    recordsRequired: 1
};

export const deleteAction = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    recordsRequired: true
};

/**
 * A RecordAction encapsulates a shared set of configuration for items within components such as
 * StoreContextMenu and RecordActionBar (aka grid context menus and action columns).
 *
 * Components passed these actions will render them with an appropriate UI (e.g. menu item, button)
 * and call their `actionFn` when clicked, passing it a data object sourced from the selected row(s)
 * or node(s) on the underlying grid or data view.
 *
 * The `prepareFn` callback provides a way for actions to customize their enabled state, visibility,
 * text, or other characteristics prior to being shown, based on the same relevant data object(s).
 * @see RecordActionBar
 * @see StoreContextMenu
 */
export class RecordAction {

    text;
    icon;
    intent;
    tooltip;
    actionFn;
    items;
    disabled;
    hidden;
    prepareFn;
    recordsRequired;

    /**
     * @param {Object} c - RecordAction configuration.
     * @param {string} [c.text] - label to be displayed.
     * @param {Object} [c.icon] - icon to be displayed.
     * @param {string} [c.intent] - intent to be used for rendering the action.
     * @param {string} [c.tooltip] - tooltip to display when hovering over the action.
     * @param {Object[]} [c.items] - child actions.
     * @param {ActionCb} [c.actionFn] - called on store action activation.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     * @param {PrepareFnCb} [c.prepareFn] - called prior to showing the action in the UI.
     * @param {(number|boolean)} [c.recordsRequired] - how many records must be 'active'
     *      (selected and / or clicked upon) for the action to be enabled.
     *      int: specifies exactly n number of records. Defaults to 1 for single record actions.
     *          Can specify 0 to only enable action if no records are active.
     *      true: specifies that number of records > 0. Allows for arbitrary number of records.
     *      false: specifies any number of records (0 - infinity, inclusive). Always active.
     */
    constructor({
        text,
        icon = null,
        intent,
        tooltip,
        actionFn = null,
        items = null,
        disabled = false,
        hidden = false,
        prepareFn = null,
        recordsRequired = false
    }) {
        this.text = text;
        this.icon = icon;
        this.intent = intent;
        this.tooltip = tooltip;
        this.actionFn = actionFn;
        this.items = items;
        this.disabled = disabled;
        this.hidden = hidden;
        this.prepareFn = prepareFn;
        this.recordsRequired = recordsRequired;
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
 * @param {Object[]} [p.selection] - all currently selected records (if any).
 * @param {*} ...rest - additional data provided by the context where this action presides
 */

/**
 * @callback PrepareFnCb - called prior to rendering the action's UI element.
 * @param {RecordAction} action - the action itself.
 * @param {Record} [record] - row-level Record.
 * @param {Record[]} [selection] - all currently selected Records.
 */
