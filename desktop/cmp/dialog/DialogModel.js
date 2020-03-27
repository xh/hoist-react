/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty, isNil, isNumber, isPlainObject, isString} from 'lodash';

import {HoistModel, managed} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {withDefault, throwIf} from '@xh/hoist/utils/js';

import {DialogStateModel} from './DialogStateModel';


/**
 * Main backing Model for Dialog Component.
 *
 * Provides the API for configuration and run-time manipulation of the Dialog's positioning
 * and other state.
 */
@HoistModel
export class DialogModel {

    //-----------------------
    // Private Properties
    //-----------------------
    containerElement = null;
    portalContainer = null;
    dialogPortalId = 'xh-dialog-portal';
    dialogWrapperDivRef = createObservableRef();
    clickCaptureCompRef = createObservableRef();
    rndRef = null;
    unMaximizedSize = {};

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
    /** @member {number} */
    initialWidth;
    /** @member {number} */
    initialHeight;

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

        // set observables
        this.setContent(content);
        this.initialWidth = width;
        this.initialHeight = height;
        this.setSize({width, height});
        this.initialX = x;
        this.initialY = y;
        this.setPosition({x, y});
        this.setIsMaximized(isMaximized);
        this.setIsOpen(isOpen);
        this.setCloseOnOutsideClick(closeOnOutsideClick);
        this.setCloseOnEscape(closeOnEscape);
        this.setShowBackgroundMask(showBackgroundMask);
        this.setShowCloseButton(showCloseButton);

        this.addReaction({
            track: () => [this.controlledX, this.controlledY, this.controlledWidth, this.controlledHeight],
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

    // todo: allow x,y width,height params passed here?
    @action
    open() {
        this.setIsOpen(true);
    }

    @action
    close() {
        this.rndRef = null;
        this.setIsOpen(false);
        this.isMaximized = false; // deliberately skip setter here to avoid changing state
        this.x = undefined;
        this.y = undefined;
        this.width = undefined;
        this.height = undefined;
    }

    @action
    setSize({width, height}) {
        if (isNil(width) && isNil(height)) return;

        this.width = width;
        this.height = height;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setSizeState();
            }
        }
    }

    get size() {
        if (!this.rndRef) return {};
        return this.dialogSize;
    }

    @action
    setPosition({x, y}) {
        if (isNil(x) && isNil(y)) return;

        throwIf(
            isNil(x) || isNil(x),
            'The DialogModel.setPosition method requires both "x" and "y" properties in the position {x: Number, y: Number} argument.'
        );
        this.x = x;
        this.y = y;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setPositionState();
            }
        }
    }

    get position() {
        if (!this.rndRef) return {};
        return this.rndRef.getDraggablePosition();
    }

    @action
    setIsMaximized(v) {
        this.isMaximized = v;
        if (this.rndRef) {
            if (this.stateModel) {
                this.setIsMaximizedState();
            }
        }
    }

    @computed
    get currentIsMaximized() {
        return withDefault(this.isMaximizedState, this.isMaximized);
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
        this.isMaximizedState = this.isMaximized;
    }

    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------
    @computed
    get controlledWidth() {
        return withDefault(this.sizeState.width, this.width, this.initialWidth);
    }

    @computed
    get controlledHeight() {
        return withDefault(this.sizeState.height, this.height, this.initialHeight);
    }

    @computed
    get controlledX() {
        return withDefault(this.positionState.x, this.x, this.initialX);
    }

    @computed
    get controlledY() {
        return withDefault(this.positionState.y, this.y, this.initialY);
    }

    @action
    setIsOpen(v) {
        this.isOpen = v;
    }

    @action
    maximize() {
        if (!this.rndRef) return;

        if (!isNumber(this.controlledWidth) || !isNumber(this.controlledWidth)) {
            this.unMaximizedSize = this.dialogSize;
        }
        const size = this.inPortal ? this.windowSize : this.parentSize;
        this.rndRef.updatePosition({x: 0, y: 0});
        this.rndRef.updateSize(size);
    }

    @action
    unMaximize() {
        if (!this.rndRef) return;
        this.positionDialog();
        this.unMaximizedSize = {};
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

        const {controlledX: x, controlledY: y, controlledWidth: width, controlledHeight: height} = this;

        if (!isEmpty(this.unMaximizedSize)) {
            this.applySizeChanges(this.unMaximizedSize);
        } else if (isNumber(width) || isNumber(height)) {
            this.applySizeChanges({width, height});
        }

        // animation frame lets any new width/height be considered by positioning calcs
        window.requestAnimationFrame(() => {
            if (!isNumber(x) || !isNumber(y)) {
                this.centerDialog();
            } else {
                this.applyPositionChanges({x, y});
            }
        });
    }

    onParentResize() {
        if (!this.rndRef) return;
        if (this.isMaximized) {
            this.maximize();
            return;
        }
        if (isNil(this.controlledX) || isNil(this.controlledY)) {
            this.centerDialog();
        }
    }

    centerDialog() {
        const coords = this.calcCenteredPos(this.dialogSize);
        this.rndRef.updatePosition(coords);
    }

    applySizeChanges({width, height}) {
        const {windowSize: wSize} = this;

        width = Math.min(wSize.width - 20, width);
        height = Math.min(wSize.height - 20, height);
        this.rndRef.updateSize({
            width: isNumber(width) ? width : undefined,
            height: isNumber(height) ? height : undefined
        });
    }

    applyPositionChanges({x, y}) {
        const {windowSize: wSize, dialogSize: dSize} = this;
        x = Math.min(x, wSize.width - dSize.width),
        y = Math.min(y, wSize.height - dSize.height);
        this.rndRef.updatePosition({x, y});
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
        if (!this.dialogWrapperDivRef.current) return {};

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