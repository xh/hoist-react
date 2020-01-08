/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * DialogModel supports configuration and state-management for user-driven Dialog resizing and
 * repositioning (dragging) functionality,
 * including the option to persist such state into a Hoist preference.
 */
@HoistModel
export class DialogModel {

    //-----------------------
    // Private Properties
    //-----------------------
    containerElement = null;
    portalContainer = null;
    dialogRootId = 'xh-dialog-root';
    dialogWrapperDivRef = createObservableRef();
    rndRef = null;

    //-----------------------
    // Immutable Properties
    //-----------------------
    resizable;
    draggable;
    showCloseButton;
    prefName;
    width;
    height;
    closeOnMaskClick;
    closeOnEscape;

    //---------------------
    // Observable State
    //---------------------
    /** Is the Dialog mounted into React's virtual DOM? */
    @observable hasMounted = false;
    @observable isOpen = false;

    /**
     * @param {Object} config
     * @param {boolean} [config.resizable] - Can dialog be resized?
     * @param {boolean} [config.draggable] - Can dialog be dragged?
     * @param {boolean} [config.showCloseButton] - Show a close button in dialog header?
     * @param {string} [config.prefName] - preference name to store sizing and positioning state.
     * @param {number} [config.width] - Dialog width. Number that represents px.
     * @param {number} [config.height] - Dialog height. Number that represents px.
     */
    constructor({
        resizable = false,
        draggable = false,
        showCloseButton = true,
        prefName = null,
        width = null,
        height = null,
        closeOnMaskClick = true,
        closeOnEscape = true
    } = {}) {

        // Set immutables
        this.resizable = resizable;
        this.draggable = draggable;
        this.showCloseButton = showCloseButton;
        this.width = width;
        this.height = height;
        this.closeOnMaskClick = closeOnMaskClick;
        this.closeOnEscape = closeOnEscape;

        if (prefName && !XH.prefService.hasKey(prefName)) {
            console.warn(`Unknown preference for storing state of XH Dialog '${prefName}'`);
            prefName = null;
        }
        this.prefName = prefName;

        // Set observable state
    }

    isComponentModel() {
        return true;
    }

    //----------------------
    // Actions
    //----------------------
    @action
    setHasMounted(bool) {
        this.hasMounted = bool;
    }

    @action
    show() {
        this.isOpen = true;
    }

    @action
    hide() {
        this.isOpen = false;
    }

    //---------------------------------------------
    // Implementation (for related private classes)
    //---------------------------------------------


    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------
    handleKeyDown(evt) {
        switch (evt.key) {
            case 'Escape':
                this.handleEscapKey(evt); break;
        }
    }

    handleEscapKey() {
        if (this.closeOnEscape) this.hide();
    }

    handleMaskClick(evt) {
        if (this.closeOnMaskClick == false) return;
        if (evt.target != this.dialogWrapperDivRef.current) return;

        this.hide();
    }

    centerDraggableDialogOnRender() {
        if (!this.rndRef) return;

        const {
                offsetWidth: width,
                offsetHeight: height
            } = this.dialogWrapperDivRef.current,
            w = window, d = document, e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            windowWidth = w.innerWidth || e.clientWidth || g.clientWidth,
            windowHeight = w.innerHeight || e.clientHeight || g.clientHeight;

        this.rndRef.updateSize({width, height});
        this.rndRef.updatePosition({
            x: Math.max((windowWidth - width) / 2, 0),
            y: Math.max((windowHeight - height) / 2, 0)
        });
    }
}