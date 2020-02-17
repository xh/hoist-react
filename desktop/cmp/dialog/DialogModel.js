/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isEmpty, isNumber, isPlainObject, isString, isUndefined} from 'lodash';

import {HoistModel, LoadSupport} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

import {DialogStateModel} from './DialogStateModel';


/**
 * DialogModel supports configuration and state-management for user-driven Dialog resizing and
 * repositioning (dragging) functionality,
 * including the option to persist such state into local storage.
 */
@HoistModel
@LoadSupport
export class DialogModel {

    /**
     * The base zIndex that will be used for all dialogs;
     */
    static DIALOG_ZINDEX_BASE= 1; // go too high and your dialog covers datepicker and select popups

    /**
     * Set the base zIndex to a custom value for all dialogs in your app.
     * You would set this early in app life cycle.
     *
     * @param {number} zIndex - the base zIndex to use for all dialogs in an app.
     */
    static setZindexBase(zIndex) {
        DialogModel.DIALOG_ZINDEX_BASE = zIndex;
    }

    //-----------------------
    // Private Properties
    //-----------------------
    containerElement = null;
    portalContainer = null;
    dialogRootId = 'xh-dialog-root';
    dialogWrapperDivRef = createObservableRef();
    clickCaptureCompRef = createObservableRef();
    rndRef = null;

    //-----------------------
    // Immutable Properties
    //-----------------------
    /** @member {boolean} */
    resizable;
    /** @member {boolean} */
    draggable;
    /** @member {boolean} */
    closeOnEscape;
    /** @member {DialogStateModel} */
    stateModel;

    //---------------------
    // Observable State
    //---------------------
    /** Is the Dialog mounted into React's virtual DOM? */
    /** @member {boolean} */
    @observable hasMounted = false;
    /** @member {boolean} */
    @observable isOpen = false;
    /** @member {object} */
    @observable.ref sizeState = {};
    /** @member {object} */
    @observable.ref positionState = {};
    /** @member {boolean} */
    @observable isMaximizedState = false;

    /**
     * @param {Object} config
     * @param {boolean} [config.resizable] - Can dialog be resized?
     * @param {boolean} [config.draggable] - Can dialog be dragged?
     * @param {(Object|string)} [c.stateModel] - config or string `dialogId` for a DialogStateModel.
     */
    constructor({
        resizable = false,
        draggable = false,
        stateModel = null,
        closeOnEscape = true
    } = {}) {

        // Set immutables
        this.resizable = resizable;
        this.draggable = draggable;
        this.closeOnEscape = closeOnEscape;
        this.stateModel = this.parseStateModel(stateModel);
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
        if (this.stateModel) return;

        this.setSizeState({});
        this.setPositionState({});
        this.setIsMaximizedState(false);
    }

    @action
    toggleIsMaximized() {
        this.isMaximizedState = !this.isMaximizedState;
        if (this.isMaximizedState) {
            this.maximize();
        } else {
            this.unMaximize();
        }
    }

    @action
    setSizeState(v) {
        this.sizeState = v;
    }

    @action
    setPositionState(v) {
        if (isUndefined(v.x) && isUndefined(v.y)) v = {};
        this.positionState = v;
    }

    @action
    setIsMaximizedState(v) {
        this.isMaximizedState = v;
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

    handleOutsideClick(evt) {
        if (evt.target != this.clickCaptureCompRef.current) return;
        this.hide();
    }

    positionDialogOnRender({width, height, x, y}) {
        if (!this.rndRef) return;

        this.setState({width, height, x, y});

        if (this.isMaximizedState) {
            this.maximize();
            return;
        }

        width = this.sizeState.width;
        height = this.sizeState.height;
        if (isNumber(width) && isNumber(height)) {
            this.applySizeStateChanges({width, height});
        }

        x = this.positionState.x;
        y = this.positionState.y;
        if (!isNumber(x) || !isNumber(y)) {
            this.centerDialog();
        } else {
            this.applyPositionStateChanges({x, y});
        }
    }

    setState({width, height, x, y}) {
        if (this.stateModel) {
            this.stateModel.initializeState();
        }

        const {width: stateWidth, height: stateHeight} = this.sizeState;
        width = isNumber(stateWidth) ? stateWidth : width;
        height = isNumber(stateHeight) ? stateHeight : height;
        this.setSizeState({width, height});

        const {x: stateX, y: stateY} = this.positionState;
        x = isNumber(stateX) ? stateX : x;
        y = isNumber(stateY) ? stateY :y;
        this.setPositionState({x, y});

    }

    centerDialog() {
        window.requestAnimationFrame(() => this.rndRef.updatePosition(this.calcCenteredPos(this.dialogSize)));
    }

    applySizeStateChanges({width, height}) {
        const {windowSize: wSize} = this;

        width = Math.min(wSize.width - 20, width);
        height = Math.min(wSize.height - 20, height);
        this.rndRef.updateSize({width, height});
    }

    applyPositionStateChanges({x, y}) {
        // delay so that correct dialog size can be calculated from DOM
        window.requestAnimationFrame(() => {
            const {windowSize: wSize, dialogSize: dSize} = this;
            x = Math.min(x, wSize.width - dSize.width);
            y = Math.min(y, wSize.height - dSize.height);
            this.rndRef.updatePosition({x, y});
        });
    }

    calcCenteredPos({width, height}) {
        const wSize = this.windowSize;
        return {
            x: Math.max((wSize.width - width) / 2, 0),
            y: Math.max((wSize.height - height) / 2, 0)
        };
    }

    maximize() {
        if (!this.rndRef) return;

        this.rndRef.updatePosition({x: 0, y: 0});
        this.rndRef.updateSize(this.windowSize);
    }

    unMaximize() {
        if (!this.rndRef) return;

        this.rndRef.updateSize(this.sizeState);
        if (isEmpty(this.positionState)) {
            this.centerDialog();
        } else {
            this.rndRef.updatePosition(this.positionState);
        }
    }

    parseStateModel(stateModel) {
        let ret = null;
        if (isPlainObject(stateModel)) {
            ret = new DialogStateModel(stateModel);
        } else if (isString(stateModel)) {
            ret = new DialogStateModel({dialogId: stateModel});
        }
        if (ret) {
            ret.init(this);
            this.markManaged(ret);
        }
        return ret;
    }

    get windowSize() {
        const w = window, d = document, e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        return {
            width: w.innerWidth || e.clientWidth || g.clientWidth,
            height: w.innerHeight || e.clientHeight || g.clientHeight
        };
    }

    get dialogSize() {
        const {
            offsetWidth: width,
            offsetHeight: height
        } = this.dialogWrapperDivRef.current;
        return {width, height};
    }
}