/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {isNumber} from 'lodash';
import {createObservableRef} from '@xh/hoist/utils/react';
import {observable, action, runInAction} from '@xh/hoist/mobx';

/**
 * @private
 *
 * Implementation Model
 */
@HoistModel
export class RndModel {

    dialogModel;

    dialogPortalId = 'xh-dialog-portal';
    baseClass;

    // Refs
    containerElement = null;
    portalContainer = null;
    wrapperDivRef = createObservableRef();
    clickCaptureRef = createObservableRef();
    rndRef = createObservableRef();

    @observable hasPortal = false;

    constructor(dialogModel) {
        this.dialogModel = dialogModel;
        const {dm} = this;

        this.baseClass = dm.inPortal ? 'xh-dialog-portal' : 'xh-dialog-container';

        this.addReaction({
            track: () => [
                dm.x,
                dm.y,
                dm.width,
                dm.height,
                dm.isMaximized,
                this.rndRef.current
            ],
            run: () => this.positionRnd()
        });
    }

    //--------------------
    // Helper Trampolines
    //--------------------
    get dm()            {return this.dialogModel}
    get inPortal()      {return this.dm.inPortal}
    get isMaximized()   {return this.dm.isMaximized}
    get isOpen()        {return this.dm.isOpen}

    //------------------------
    // Portal maintenance
    //------------------------
    togglePortal() {
        if (!this.inPortal) return;
        if (this.isOpen) {
            this.setUpPortal();
        } else {
            this.removePortal();
        }
    }

    @action
    setUpPortal() {
        /**
         * @see {@link{https://reactjs.org/docs/portals.html#event-bubbling-through-portals}
         * @see {@link{https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx}
         */
        if (this.containerElement) return;

        this.portalContainer = document.getElementById(this.dialogPortalId);
        this.portalContainer.appendChild(document.createElement('div'));
        this.containerElement = this.portalContainer.lastChild;
        this.hasPortal = true;
    }

    @action
    removePortal() {
        if (!this.containerElement) return;

        this.portalContainer.removeChild(this.containerElement);
        this.containerElement = null;
        this.hasPortal = false;
    }

    //------------------
    // Positioning
    //------------------
    positionRnd() {
        const {dm, rndRef} = this;

        if (!rndRef.current) return;

        if (this.isMaximized) {
            const size = this.inPortal ? this.windowSize : this.parentSize;
            rndRef.current.updatePosition({x: 0, y: 0});
            rndRef.current.updateSize(size);
        } else {
            this.updateSizeBounded(dm.width, dm.height);
            // Delay to allow calcs to be based on correct size above
            window.requestAnimationFrame(() => {
                const centered = this.calcCenteredPos();
                this.updatePositionBounded(dm.x ?? centered.x, dm.y ?? centered.y);
            });
        }
    }

    // Update the rendered size within the bounds of the window (not parent?)
    updateSizeBounded(width, height) {
        const {windowSize} = this;
        width = Math.min(windowSize.width - 20, width);
        height = Math.min(windowSize.height - 20, height);
        this.rndRef.current.updateSize({
            width: isNumber(width) ? width : undefined,
            height: isNumber(height) ? height : undefined
        });
    }

    updatePositionBounded(x, y) {
        const {windowSize, dialogSize} = this;
        x = Math.min(x, windowSize.width - dialogSize.width);
        y = Math.min(y, windowSize.height - dialogSize.height);
        this.rndRef.current.updatePosition({x, y});
    }

    //-----------------------
    // Size calculations
    //------------------------
    calcCenteredPos() {
        const {width, height} = this.dialogSize;
        const pSize = this.inPortal ? this.windowSize : this.parentSize;
        return {
            x: Math.max((pSize.width - width) / 2, 0),
            y: Math.max((pSize.height - height) / 2, 0)
        };
    }

    get windowSize() {
        const w = window, d = document, e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        return {
            width: w.innerWidth ?? e.clientWidth ?? g.clientWidth,
            height: w.innerHeight ?? e.clientHeight ?? g.clientHeight
        };
    }

    get dialogSize() {
        const curr = this.wrapperDivRef.current;
        return curr ? {width: curr.offsetWidth, height: curr.offsetHeight} : {};
    }

    get parentSize() {
        const p = this.rndRef.current?.getParent().parentElement;
        return p ? {width: p.offsetWidth, height: p.offsetHeight} : {};
    }

    //----------
    // Handlers
    //----------
    onDragStop = (evt, data) => {
        const {dm} = this;

        // ignore drags on buttons or when maximized
        if (dm.isMaximized || evt.target.closest('button')) return;

        dm.setPosition({x: data.x, y: data.y});
    };

    onResizeStop = (
        evt,
        resizeDirection,
        domEl,
        resizableDelta,
        position
    ) => {
        const {dm} = this;
        if (dm.isMaximized) return;

        runInAction(() => {
            dm.setSize({width: domEl.offsetWidth, height: domEl.offsetHeight});
            dm.setPosition(position);
        });
    };

    onKeyDown = (evt) => {
        if (evt.key === 'Escape' && this.dm.closeOnEscape) {
            this.dm.close();
        }
    };

    handleOutsideClick(evt) {
        if (evt.target === this.clickCaptureRef.current) {
            this.dm.close();
        }
    }

    maybeSetFocus()  {

        // always delay focus manipulation to just before repaint to prevent scroll jumping
        window.requestAnimationFrame(() => {
            const {containerElement, isOpen} = this,
                {activeElement} = document;

            // containerElement may be undefined between mounting and portal rendering
            // activeElement may be undefined in some rare cases in IE
            if (containerElement == null || activeElement == null || !isOpen) return;

            if (!containerElement.contains(activeElement)) {
                /**
                 * @see {@link https://github.com/facebook/react/blob/9fe1031244903e442de179821f1d383a9f2a59f2/packages/react-dom/src/shared/DOMProperty.js#L294}
                 * @see {@link https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js#L379}
                 * for why we do not search for autofocus on dom element: TLDR:  it's not there!
                 */
                const wrapperEl = containerElement.querySelector('[tabindex]');
                wrapperEl?.focus();
            }
        });
    }

    destroy() {
        this.removePortal();
    }
}