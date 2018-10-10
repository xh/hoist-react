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
 * The `displayConfigFn` callback provides a means by which applications can customize any display
 * properties of the action prior to each render.
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
    displayConfigFn;
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
     * @param {DisplayConfigFn} [c.displayConfigFn] - called prior to showing the action in the UI.
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
        displayConfigFn = null,
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
        this.displayConfigFn = displayConfigFn;
        this.recordsRequired = recordsRequired;
    }

    getDisplayConfig(params) {
        const defaultConfig = {
            icon: this.icon,
            text: this.text,
            intent: this.intent,
            tooltip: this.tooltip,
            items: this.items,
            hidden: this.hidden,
            disabled: this.disabled || !this.meetsRecordRequirement(params.selection.length)
        };

        if (this.displayConfigFn) {
            return this.displayConfigFn({action: this, defaultConfig, ...params});
        }

        return defaultConfig;
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
 * @callback DisplayConfigFn - called prior to rendering the action's UI element.
 * @param {Object} p
 * @param {RecordAction} p.action - the action itself.
 * @param {Object} p.defaultConfig - default display config for the action
 * @param {Object} [p.record] - row data object (entire row, if any).
 * @param {Object[]} [p.selection] - all currently selected records (if any).
 * @param {*} ...rest - additional data provided by the context where this action presides
 */
