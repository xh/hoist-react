/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

export class Action {
    /**
     *
     * @param {Object|Function} icon - icon to be displayed, or a function returning an icon to be
     *      displayed.
     * @param {string|Function} text - text to be displayed next to the icon, or a function returning
     *      the text to be displayed.
     * @param {ActionFn} action - called when the action button is clicked
     * @param {*} data - data to be passed through to action when the button is clicked
     * @param {string|Function} tooltip - tooltip to be displayed, or a function returning the tooltip
     * @param {boolean|Function} disabled - disabled state for the action button, or a function
     *      returning the disabled state
     */
    constructor({
        icon,
        text,
        action,
        data,
        tooltip,
        disabled
    }) {
        this.icon = icon;
        this.text = text;
        this.action = action;
        this.data = data;
        this.tooltip = tooltip;
        this.disabled = disabled;
    }
}

/**
 * @callback ActionFn - called when the action button is clicked
 * @param {*} data -
 */