/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, persist, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Where the active Inspector UI is currently hosted:
 *  - 'dock' - docked panel within the app's viewport (default).
 *  - 'overlay' - pinned over the app in the browser's top layer, above all masks and dialogs.
 */
export type InspectorRenderMode = 'dock' | 'overlay';

/**
 * Manages where the Inspector UI renders. The default 'dock' mode renders the Inspector as a
 * resizable panel docked to the bottom of the app viewport, where (as a standard part of the
 * app's component tree) it can be covered and blocked by app-level masks and modal dialogs.
 *
 * The alternate 'overlay' mode relocates the Inspector into a `popover` element in the browser's
 * top layer, which always paints above any z-index within the app - keeping the Inspector fully
 * visible and interactive while masks or modals are showing.
 *
 * Created internally by {@link inspectorPanel} - not for direct application use.
 *
 * @internal
 */
export class InspectorHostModel extends HoistModel {
    override xhImpl = true;

    override persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}`};

    @observable
    @persist
    renderMode: InspectorRenderMode = 'dock';

    /** Top-layer host element - portal target for the Inspector UI when in 'overlay' mode. */
    @observable.ref
    overlayEl: HTMLElement = null;

    /** True if the browser supports the Popover API required for 'overlay' mode. */
    get overlaySupported(): boolean {
        return typeof HTMLElement.prototype.showPopover === 'function';
    }

    /**
     * Container to which any popups spawned by Inspector components (grid menus, tooltips,
     * dropdowns) should be re-parented, or null to use their default document-level parent.
     * Required when detached - popups portaled to `document.body` would otherwise render beneath
     * the browser's top layer.
     */
    get popupContainer(): HTMLElement {
        return this.renderMode === 'overlay' ? this.overlayEl : null;
    }

    constructor() {
        super();
        makeObservable(this);

        if (this.renderMode === 'overlay' && !this.overlaySupported) {
            this.renderMode = 'dock';
        }

        this.addReaction({
            track: () => [XH.inspectorService.active, this.renderMode],
            run: () => this.syncHosting(),
            fireImmediately: true
        });
    }

    @action
    setRenderMode(mode: InspectorRenderMode) {
        this.renderMode = mode;
    }

    //------------------
    // Implementation
    //------------------
    private syncHosting() {
        const {active} = XH.inspectorService;
        active && this.renderMode === 'overlay' ? this.showOverlay() : this.hideOverlay();
    }

    @action
    private showOverlay() {
        let {overlayEl} = this;
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.classList.add('xh-inspector-overlay-host');
            overlayEl.setAttribute('popover', 'manual');
            this.overlayEl = overlayEl;
        }

        if (!overlayEl.isConnected) document.body.appendChild(overlayEl);
        if (!overlayEl.matches(':popover-open')) overlayEl.showPopover();
    }

    private hideOverlay() {
        const {overlayEl} = this;
        if (!overlayEl?.isConnected) return;

        if (overlayEl.matches(':popover-open')) overlayEl.hidePopover();
        overlayEl.remove();
    }

    override destroy() {
        this.hideOverlay();
        super.destroy();
    }
}
