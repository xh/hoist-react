/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {createObservableRef} from '@xh/hoist/utils/react';
import {observable, action, runInAction} from '@xh/hoist/mobx';

/**
 * @private
 *
 * Implementation Model
 */
@HoistModel
export class RndModel {

    static PORTAL_DOM_ID = 'xh-dialog-portal';

    dialogModel;
    baseClass;

    wrapperDivRef = createObservableRef();
    clickCaptureRef = createObservableRef();
    rndRef = createObservableRef();
    @observable.ref portalEl;

    constructor(dialogModel) {
        const dm = this.dialogModel = dialogModel;

        this.baseClass = dm.inPortal ? 'xh-dialog-portal' : 'xh-dialog-container';

        this.addReaction({
            track: () => [dm.size, dm.position, dm.isMaximized, this.rnd],
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
    get rnd()           {return this.rndRef.current}
    get portalRoot()    {return document.getElementById(RndModel.PORTAL_DOM_ID)}


    //------------------------
    // Portal maintenance
    // see https://reactjs.org/docs/portals.html#event-bubbling-through-portals}
    // see https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx}
    //------------------------
    @action
    maintainPortal() {
        const {inPortal, isOpen, portalEl} = this;

        if (!inPortal) return;

        if (isOpen && !portalEl) {
            this.portalEl = this.portalRoot.appendChild(document.createElement('div'));
        } else if (!isOpen && portalEl) {
            this.portalRoot.removeChild(portalEl);
            this.portalEl = null;
        }
    }

    //------------------
    // Positioning
    //------------------
    positionRnd() {
        const {dm, rnd} = this;

        if (!rnd) return;

        if (this.isMaximized) {
            rnd.updatePosition({x: 0, y: 0});
            rnd.updateSize(this.containerSize);
        } else {
            this.updateSizeBounded(dm.size);
            // Delay to allow calcs to be based on correct size above
            window.requestAnimationFrame(() => {
                const centered = this.calcCenteredPos();
                this.updatePositionBounded({
                    x: dm.position.x ?? centered.x,
                    y: dm.position.y ?? centered.y
                });
            });
        }
    }

    updateSizeBounded(size) {
        const {containerSize} = this;
        size = {
            width: max(0, min(containerSize.width - 10, size.width)),
            height: max(0, min(containerSize.height - 10, size.height))
        };
        this.rnd?.updateSize(size);
    }

    updatePositionBounded(pos) {
        const {containerSize, dialogSize} = this;
        pos = {
            x: max(0, min(pos.x, containerSize.width - dialogSize.width)),
            y: max(0, min(pos.y, containerSize.height - dialogSize.height))
        };
        this.rnd?.updatePosition(pos);
    }

    //-----------------------
    // Size calculations
    //------------------------
    calcCenteredPos() {
        const {containerSize, dialogSize} = this;
        return {
            x: max((containerSize.width - dialogSize.width) / 2, 0),
            y: max((containerSize.height - dialogSize.height) / 2, 0)
        };
    }

    get containerSize() {
        return this.inPortal ? this.windowSize : this.parentSize;
    }

    get windowSize() {
        const w = window, d = document, e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        return {
            width: w.innerWidth ?? e.clientWidth ?? g.clientWidth,
            height: w.innerHeight ?? e.clientHeight ?? g.clientHeight
        };
    }

    get parentSize() {
        const p = this.rnd?.getParent()?.parentElement;
        return p ? {width: p.offsetWidth, height: p.offsetHeight} : {};
    }

    get dialogSize() {
        const curr = this.wrapperDivRef.current;
        return curr ? {width: curr.offsetWidth, height: curr.offsetHeight} : {};
    }

    //----------
    // Handlers
    //----------
    onDragStop = (evt, data) => {
        if (this.isMaximized) return;
        if (evt.target.closest('button')) return; // ignore drags on buttons
        this.dm.setPosition({x: data.x, y: data.y});
    };

    onResizeStop = (
        evt,
        resizeDirection,
        domEl,
        resizableDelta,
        position
    ) => {
        if (this.isMaximized) return;

        const {dm} = this;
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
        // TODO: Do we need this check if the handler is actually on the target below?
        if (evt.target === this.clickCaptureRef.current) {
            this.dm.close();
        }
    }

    //---------
    // Misc
    //----------
    maybeSetFocus()  {
        // always delay focus manipulation to just before repaint to prevent scroll jumping
        // portalEl may be undefined after mount, activeElement may be undefined in IE
        // see https://github.com/facebook/react/blob/9fe1031244903e442de179821f1d383a9f2a59f2/packages/react-dom/src/shared/DOMProperty.js#L294}
        // see https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js#L379}
        // for why we do not search for autofocus on dom element: TLDR:  it's not there!
        window.requestAnimationFrame(() => {
            const {portalEl, isOpen} = this,
                {activeElement} = document;

            if (portalEl == null || activeElement == null || !isOpen) return;

            if (!portalEl.contains(activeElement)) {
                const wrapperEl = portalEl.querySelector('[tabindex]');
                wrapperEl?.focus();
            }
        });
    }

    destroy() {
        if (this.portalEl) {
            this.portalRoot.removeChild(this.portalEl);
        }
    }
}

function max(...args) {
    const ret = Math.max(...args);
    return isFinite(ret) ? ret : undefined;
}

function min(...args) {
    const ret = Math.min(...args);
    return isFinite(ret) ? ret : undefined;
}
