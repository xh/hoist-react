/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isNumber, isPlainObject, isString, isUndefined} from 'lodash';

import {HoistModel, LoadSupport, managed} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {withDefault} from '@xh/hoist/utils/js';

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
     * The base zIndex that will be used for all dialogs
     */
    static Z_INDEX_BASE = 1; // go too high and your dialog covers datepicker and select popups

    /**
     * Set the base zIndex to a custom value for all dialogs in your app.
     * You would set this early in app life cycle.
     *
     * @param {number} zIndex - the base z-index to use for all dialogs in an app.
     */
    static setZIndexBase(zIndex) {
        DialogModel.Z_INDEX_BASE = zIndex;
    }

    //-----------------------
    // Private Properties
    //-----------------------
    containerElement = null;
    portalContainer = null;
    dialogPortalId = 'xh-dialog-portal';
    dialogWrapperDivRef = createObservableRef();
    clickCaptureCompRef = createObservableRef();
    rndRef = null;
    startsCentered = true;
    wasDragged = false;

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
    /** @member {number} */
    initialX;
    /** @member {number} */
    initialY;

    //-------------------
    // Mutable Public State
    //--------------------
    /** @member {number} */
    @observable width;
    /** @member {number} */
    @observable height;
    /** @member {number} */
    @observable x;
    /** @member {number} */
    @observable y;
    /** @member {boolean} */
    @observable isMaximized;
    /** @member {boolean} */
    @observable isOpen;
    /** @member {boolean} */
    @observable closeOnOutsideClick;
    /** @member {boolean} */
    @observable closeOnEscape;
    /** @member {boolean} */
    @observable showBackgroundMask;
    /** @member {boolean} */
    @observable showCloseButton;
    /** @member {(Object|function)} */
    @observable content;


    //---------------------------------
    // Observable Implementation State
    //----------------------------------
    /** Is the Dialog mounted into React's virtual DOM via the React "portal" method? */
    /** @member {boolean} */
    @observable hasPortal = false;
    /** @member {object} */
    @observable.ref sizeState = {};
    /** @member {object} */
    @observable.ref positionState = {};
    /** @member {boolean} */
    @observable isMaximizedState;

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
     * @param {(Object|string)} [c.stateModel] - config or string `dialogId` for a DialogStateModel.
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

        // set observables
        this.setContent(content);
        this.setWidth(width);
        this.setHeight(height);
        this.initialX = x;
        this.setX(x);
        this.initialY = y;
        this.setY(y);
        this.setIsMaximized(isMaximized);
        this.setIsOpen(isOpen);
        this.setCloseOnOutsideClick(closeOnOutsideClick);
        this.setCloseOnEscape(closeOnEscape);
        this.setShowBackgroundMask(showBackgroundMask);
        this.setShowCloseButton(showCloseButton);

        if (isUndefined(x) || isUndefined(y)) this.startsCentered = true;

        this.addReaction({
            track: () => [this.currentX, this.currentY, this.currentWidth, this.currentHeight],
            run: () => this.positionDialog()
        });

        this.addReaction({
            track: () => this.currentIsMaximized,
            run: () => this.currentIsMaximized ? this.maximize() : this.unMaximize()
        });
    }

    //----------------------
    // Actions
    //----------------------
    @action
    setHasPortal(bool) {
        this.hasPortal = bool;
    }

    @action
    setContent(v) {
        this.content = v;
    }

    @action
    open() {
        this.setIsOpen(true);
    }

    @action
    close() {
        this.rndRef = null;
        this.setIsOpen(false);
        this.isMaximized = false; // deliberately skip setter here to avoid changing state
        this.wasDragged = false;
        this.x = undefined;
        this.y = undefined;
    }

    @action
    setWidth(v) {
        this.width = v;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setSizeState();
            }
        }
    }

    @action
    setHeight(v) {
        this.height = v;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setSizeState();
            }
        }
    }

    @action
    setWidthHeight({width, height}) {
        this.width = width;
        this.height = height;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setSizeState();
            }
        }
    }

    @computed
    get currentWidth() {
        return withDefault(this.sizeState.width, this.width);
    }

    @computed
    get currentHeight() {
        return withDefault(this.sizeState.height, this.height);
    }

    @action
    setX(v) {
        this.x = v;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setPositionState();
            }
        }
    }

    @action
    setY(v) {
        this.y = v;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setPositionState();
            }
        }
    }

    @action
    setXY({x, y}) {
        this.x = x;
        this.y = y;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setPositionState();
            }
        }
    }

    @computed
    get currentX() {
        return withDefault(this.positionState.x, this.x, this.initialX);
    }

    @computed
    get currentY() {
        return withDefault(this.positionState.y, this.y, this.initialY);
    }

    @action
    setIsMaximized(v) {
        this.isMaximized = v;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setIsMaximizedState(v);
            }
        }
    }

    @computed
    get currentIsMaximized() {
        return withDefault(this.isMaximizedState, this.isMaximized);
    }

    @action
    setIsOpen(v) {
        this.isOpen = v;
    }

    @action
    setCloseOnOutsideClick(v) {
        this.closeOnOutsideClick = v;
    }

    @action
    setCloseOnEscape(v) {
        this.closeOnEscape = v;
    }

    @action
    setShowBackgroundMask(v) {
        this.showBackgroundMask = v;
    }

    @action
    setShowCloseButton(v) {
        this.showCloseButton = v;
    }

    @action
    maximize() {
        if (!this.rndRef) return;

        this.rndRef.updatePosition({x: 0, y: 0});
        this.rndRef.updateSize(this.windowSize);
    }

    @action
    unMaximize() {
        if (!this.rndRef) return;
        this.positionDialog();
    }

    //---------------------------------------------
    // Implementation (for related private classes)
    //---------------------------------------------
    @action
    setSizeState() {
        this.sizeState = {width: this.width, height: this.height};
    }

    @action
    setPositionState() {
        this.positionState = {x: this.x, y: this.y};
    }

    @action
    setIsMaximizedState(v) {
        this.isMaximizedState = v;
    }


    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------
    handleEscapKey() {
        this.close();
    }

    handleOutsideClick(evt) {
        if (evt.target != this.clickCaptureCompRef.current) return;
        this.close();
    }

    togglePortal() {
        if (!this.inPortal) return;
        if (this.isOpen) {
            this.setUpPortal();
        } else {
            this.removePortal();
        }
    }

    setUpPortal() {
        /**
             * @see {@link{https://reactjs.org/docs/portals.html#event-bubbling-through-portals}
             * @see {@link{https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx}
             */
        if (this.containerElement) return;

        this.portalContainer = document.getElementById(this.dialogPortalId);
        this.portalContainer.appendChild(document.createElement('div'));
        this.containerElement = this.portalContainer.lastChild;
        this.setHasPortal(true);
    }

    removePortal() {
        if (!this.containerElement) return;

        this.portalContainer.removeChild(this.containerElement);
        this.containerElement = null;
        this.setHasPortal(false);
    }

    positionDialogOnRender() {
        if (!this.rndRef) return;

        if (this.stateModel) {
            this.stateModel.initializeState();
        }

        this.currentIsMaximized ? this.maximize() : this.positionDialog();
    }

    positionDialog() {
        if (!this.rndRef || this.currentIsMaximized) return;

        const {currentX: x, currentY: y, currentWidth: width, currentHeight: height} = this;


        if (isNumber(width) && isNumber(height)) {
            this.applySizeChanges({width, height});
        }

        // animation frame lets any new width/height be considered positioning calcs
        window.requestAnimationFrame(() => {
            if (!isNumber(x) || !isNumber(y)) {
                this.centerDialog();
            } else {
                this.applyPositionChanges({x, y});
            }
        });
    }

    centerOnParentResize() {
        if (!this.rndRef) return;
        if (this.startsCentered && !this.wasDragged) {
            this.centerDialog();
        }
    }

    centerDialog() {
        const coords = this.calcCenteredPos(this.dialogSize);
        this.rndRef.updatePosition(coords);
        this.setXY(coords);
    }

    applySizeChanges({width, height}) {
        const {windowSize: wSize} = this;

        width = Math.min(wSize.width - 20, width);
        height = Math.min(wSize.height - 20, height);
        this.rndRef.updateSize({width, height});
    }

    applyPositionChanges({x, y}) {
        const {windowSize: wSize, dialogSize: dSize} = this;
        x = Math.min(x, wSize.width - dSize.width),
        y = Math.min(y, wSize.height - dSize.height);
        this.rndRef.updatePosition({x, y});
        this.setXY({x, y}); // ??? needed?
    }

    calcCenteredPos({width, height}) {
        const pSize = this.inPortal ? this.windowSize : this.parentSize;
        return {
            x: Math.max((pSize.width - width) / 2, 0),
            y: Math.max((pSize.height - height) / 2, 0)
        };
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

    get parentSize() {
        const p = this.rndRef.getParent().parentElement;

        return {
            width: p.offsetWidth,
            height: p.offsetHeight
        };
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

    get baseClass() {
        return this.inPortal ? 'xh-dialog-portal' : 'xh-dialog-container';
    }
}