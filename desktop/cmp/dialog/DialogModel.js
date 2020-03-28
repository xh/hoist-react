/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isPlainObject, isString} from 'lodash';
import {DialogStateModel} from './DialogStateModel';


/**
 * Main backing Model for Dialog Component.
 *
 * Provides the API for configuration and run-time manipulation of the Dialog's positioning
 * and other state.
 */
@HoistModel
export class DialogModel {

    /** @member {DialogStateModel} */
    @managed
    stateModel;

    //-----------------------
    // Immutable Properties
    //-----------------------
    /** @member {boolean} */
    resizable;
    /** @member {boolean} */
    draggable;
    /** @member {boolean} */
    inPortal;
    /** @member {boolean} */
    closeOnOutsideClick;
    /** @member {boolean} */
    closeOnEscape;
    /** @member {boolean} */
    showBackgroundMask;
    /** @member {boolean} */
    showCloseButton;

    /** @member {number} */
    initialX;
    /** @member {number} */
    initialY;
    /** @member {number} */
    initialWidth;
    /** @member {number} */
    initialHeight;

    /** @member {(Object|function)} */
    content;

    //---------------------------
    // Observable Public State
    //----------------------------
    /**
     * @member {number} Width of dialog (when not maximized).
     * Undefined will allow dialog to take size of content.
     */
    @observable width;

    /**
     * @member {number} - Height of dialog (when not maximized).
     * Undefined will allow dialog to take size of content.
     */
    @observable height;

    /**
     * @member {number} - x position of top left corner (when not maximized).
     * Undefined will center dialog along the horizontal dimension.
     */
    @observable x;

    /**
     * @member {number} - y position of top left corner (when not maximized).
     * Undefined will center dialog along the horizontal dimension.
     */
    @observable y;

    /** @member {boolean} - is the Dialog maximized within its parent. */
    @observable isMaximized;

    /** @member {boolean} - is the Dialog visible (i.e. rendered) */
    @observable isOpen;


    /**
     * @param {Object} config
     * @param {(Object|function)} [config.content] - content to be rendered by this Dialog.
     * @param {number} [config.width] - Optional initial width of Dialog.
     * @param {number} [config.height] - Optional initial height of Dialog.
     * @param {number} [config.x] - Optional initial x position of Dialog.
     * @param {number} [config.y] - Optional initial y position of Dialog.
     * @param {boolean} [config.isMaximized] - Does Dialog cover entire viewport?
     * @param {boolean} [config.isOpen] - Is Dialog open?
     * @param {boolean} [config.inPortal] - Open in React Portal? (default true) If false, dialog will be bound by parent DOM el.
     * @param {boolean} [config.resizable] - Can Dialog be resized?
     * @param {boolean} [config.draggable] - Can Dialog be dragged?
     * @param {boolean} [config.closeOnOutsideClick] - Can Dialog be closed by clicking outside Dialog?
     * @param {boolean} [config.closeOnEscape] - Can Dialog be closed by pressing escape key?
     * @param {boolean} [config.showBackgroundMask] - Show a background mask between Dialog and app?
     * @param {boolean} [config.showCloseButton] - Show close button in Dialog header?
     * @param {(Object|string)} [config.stateModel] - config or string `dialogId` for a DialogStateModel.
     */
    constructor({
        content,
        width,
        height,
        x,
        y,
        isMaximized = false,
        isOpen = false,
        inPortal = true,
        resizable = false,
        draggable = false,
        closeOnOutsideClick = true,
        closeOnEscape = true,
        showBackgroundMask = true,
        showCloseButton = true,
        stateModel = null
    } = {}) {

        // Set immutables
        this.resizable = resizable;
        this.draggable = draggable;
        this.stateModel = this.parseStateModel(stateModel);
        this.inPortal = inPortal;
        this.closeOnOutsideClick = closeOnOutsideClick;
        this.closeOnEscape = closeOnEscape;
        this.showBackgroundMask = showBackgroundMask;
        this.showCloseButton = showCloseButton;
        this.initialWidth = width;
        this.initialHeight = height;
        this.initialX = x;
        this.initialY = y;
        this.content = content;

        // set observables
        this.isOpen = isOpen;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isMaximized = isMaximized;
    }

    //----------------------
    // Public Methods
    //----------------------
    /**
     * Open the Dialog, if not already open.
     */
    @action
    open() {
        this.isOpen = true;
    }

    /**
     * Close the Dialog, if open.
     */
    @action
    close() {
        this.isOpen = false;
    }

    /**
     * Maximize the dialog to take up the entire size of its parent.
     */
    @action
    maximize() {
        this.isMaximized = true;
    }

    /**
     * Revert a maximized dialog back to its pre-maximized state.
     */
    @action
    unMaximize() {
        this.isMaximized = false;
    }

    /**
     * Maximize or UnMaximize as appropriate.
     */
    @action
    toggleMaximized() {
        this.isMaximized = !this.isMaximized;
    }

    /**
     * Set the (unmaximized) position of the dialog.
     */
    @action
    setPosition({x, y}) {
        this.x = x;
        this.y = y;
    }

    /**
     * Set the (unmaximized) size of the dialog.
     */
    @action
    setSize({width, height}) {
        this.width = width;
        this.height = height;
    }

    //-----------------
    // Implementation
    //-----------------
    parseStateModel(stateModel) {
        let ret = null;
        if (isPlainObject(stateModel)) {
            ret = new DialogStateModel(stateModel);
        } else if (isString(stateModel)) {
            ret = new DialogStateModel({dialogId: stateModel});
        }
        if (ret) {
            ret.init(this);
        }
        return ret;
    }
}