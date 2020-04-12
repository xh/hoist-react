/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {createObservableRef} from '@xh/hoist/utils/react';
import {runInAction} from '@xh/hoist/mobx';
import {observeResize} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * @private
 *
 * Implementation Model
 *
 * For Portal info:
 * see https://reactjs.org/docs/portals.html#event-bubbling-through-portals}
 * see https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx}
 */
@HoistModel
export class RndModel {

    dialogModel;

    contentRef = createObservableRef();
    rndRef = createObservableRef();
    portalEl;
    resizeObserver;

    constructor(dialogModel) {
        const dm = this.dialogModel = dialogModel;

        if (this.inPortal) {
            this.portalEl = this.portalRoot.appendChild(document.createElement('div'));
        }

        this.addReaction({
            track: () => [dm.size, dm.position, dm.isMaximized, this.rnd],
            run: () => this.positionRnd()
        });

        this.addReaction({
            when: () => [this.rnd, this.contentRef.current],
            run: () => {
                this.maybeSetFocus();
                this.resizeObserver = observeResize(
                    () => this.positionRnd(),
                    this.inPortal ? document.body : this.parentElement
                );
            }
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
    get portalRoot()    {return document.getElementById('xh-dialog-root')}
    get parentElement() {return this.rnd?.getParent()?.parentElement}

    //------------------
    // Positioning
    //------------------
    positionRnd() {
        const {dm, rnd} = this;

        if (!rnd) return;

        if (this.isMaximized) {
            rnd.updateSize(this.containerSize);
            rnd.updatePosition({x: 0, y: 0});
            this.noteRendered();
        } else {
            // Set size then position after delay -- allow position calcs to be based on size
            this.updateSizeBounded(dm.size);
            window.requestAnimationFrame(() => {
                const centered = this.calcCenteredPos();
                this.updatePositionBounded({
                    x: dm.position.x ?? centered.x,
                    y: dm.position.y ?? centered.y
                });
                this.noteRendered();
            });
        }
    }

    noteRendered() {
        window.requestAnimationFrame(() => {
            this.dm.noteRendered(this.renderedSize, this.renderedPosition);
        });
    }

    updateSizeBounded(size) {
        const {containerSize, contentSize, rnd} = this;
        size = {
            width: max(0, min(containerSize.width - 10, contentSize.width)),
            height: max(0, min(containerSize.height - 10, contentSize.height))
        };
        rnd.updateSize(size);
    }

    updatePositionBounded(pos) {
        const {containerSize, contentSize, rnd} = this;
        pos = {
            x: max(0, min(pos.x, containerSize.width - contentSize.width)),
            y: max(0, min(pos.y, containerSize.height - contentSize.height))
        };
        rnd.updatePosition(pos);
    }

    //-----------------------
    // Size calculations
    //------------------------
    calcCenteredPos() {
        const {containerSize, renderedSize} = this;
        return {
            x: max((containerSize.width - renderedSize.width) / 2, 0),
            y: max((containerSize.height - renderedSize.height) / 2, 0)
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
        const p = this.parentElement;
        return p ? {width: p.offsetWidth, height: p.offsetHeight} : {};
    }

    get renderedSize() {
        const el = this.rnd?.getSelfElement();
        return el ? {width: el.offsetWidth, height: el.offsetHeight} : {};
    }

    get contentSize() {
        const curr = this.contentRef.current;
        return curr ? {width: curr.offsetWidth, height: curr.offsetHeight} : {};
    }

    get renderedPosition() {
        return this.rnd?.getDraggablePosition() ?? {};
    }

    //----------
    // Handlers
    //----------
    onDragStop = (evt, data) => {
        if (this.isMaximized) return;
        if (evt.target.closest('button')) return; // ignore drags on buttons
        this.dm.setPosition({x: data.x, y: data.y});
    };

    onResizeStop = (evt, resizeDirection, domEl, delta, domPosition) => {
        if (this.isMaximized) return;
        runInAction(()=> {
            const {dm} = this,
                {position} = dm;

            dm.setSize({width: domEl.offsetWidth, height: domEl.offsetHeight});
            // also reposition for when resized left or up -- but don't overwrite if 'centered'.
            dm.setPosition({
                x: !isNil(position.x) ? domPosition.x : undefined,
                y: !isNil(position.y) ? domPosition.y : undefined
            });
        });
    };

    onKeyDown = (evt) => {
        if (evt.key === 'Escape' && this.dm.closeOnEscape) {
            this.dm.close();
        }
    };

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
            const {isOpen, portalEl} = this,
                {activeElement} = document;

            if (isOpen && portalEl && activeElement && !portalEl.contains(activeElement)) {
                const wrapperEl = portalEl.querySelector('[tabindex]');
                wrapperEl?.focus();
            }
        });
    }

    destroy() {
        if (this.portalEl) {
            this.portalRoot.removeChild(this.portalEl);
        }
        this.resizeObserver?.disconnect();
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
