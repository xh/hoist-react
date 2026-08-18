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
 *  - 'window' - popped out into a separate, dedicated browser window.
 */
export type InspectorRenderMode = 'dock' | 'overlay' | 'window';

/**
 * Manages where the Inspector UI renders. The default 'dock' mode renders the Inspector as a
 * resizable panel docked to the bottom of the app viewport, where (as a standard part of the
 * app's component tree) it can be covered and blocked by app-level masks and modal dialogs.
 *
 * Two alternate modes detach the Inspector from the app's component tree:
 *  - 'overlay' relocates the Inspector into a `popover` element in the browser's top layer, which
 *    always paints above any z-index within the app - keeping the Inspector fully visible and
 *    interactive while masks or modals are showing.
 *  - 'window' pops the Inspector out into a separate browser window, which can be moved to a
 *    second monitor and leaves the app's viewport entirely to the app. The Inspector remains part
 *    of the main app's component tree (via a cross-document React portal), so it retains direct,
 *    live access to all app state.
 *
 * Both detached modes portal the same component tree rendered when docked, and re-parent any
 * Inspector-spawned popups (grid menus, tooltips) into the detached host.
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

    /** Container within the popped-out window - portal target when in 'window' mode. */
    @observable.ref
    windowContainer: HTMLElement = null;

    /** True if the browser supports the Popover API required for 'overlay' mode. */
    get overlaySupported(): boolean {
        return typeof HTMLElement.prototype.showPopover === 'function';
    }

    /**
     * Container to which any popups spawned by Inspector components (grid menus, tooltips,
     * dropdowns) should be re-parented, or null to use their default document-level parent.
     * Required when detached - popups portaled to the main `document.body` would otherwise render
     * beneath the browser's top layer, or within the wrong window entirely.
     */
    get popupContainer(): HTMLElement {
        const {renderMode} = this;
        return renderMode === 'overlay'
            ? this.overlayEl
            : renderMode === 'window'
              ? this.windowContainer
              : null;
    }

    private childWindow: Window = null;
    private closingChildWindow = false;
    private headObserver: MutationObserver = null;
    private bodyClassObserver: MutationObserver = null;

    constructor() {
        super();
        makeObservable(this);

        // Window mode requires a user gesture to (re)open and cannot be restored on app load.
        if (
            this.renderMode === 'window' ||
            (this.renderMode === 'overlay' && !this.overlaySupported)
        ) {
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

    /**
     * Pop the Inspector out into a separate browser window. Must be called from a user
     * interaction (e.g. button click) to avoid popup blocking.
     */
    @action
    openWindow() {
        let {childWindow} = this;
        if (childWindow && !childWindow.closed) {
            childWindow.focus();
            this.renderMode = 'window';
            return;
        }

        childWindow = window.open(
            '',
            `xhInspector_${XH.clientAppCode}`,
            'popup=yes,width=1400,height=500'
        );
        if (!childWindow) {
            XH.dangerToast('Unable to open Inspector window - check for a popup blocker.');
            return;
        }

        this.childWindow = childWindow;
        this.initChildWindow(childWindow);
        childWindow.focus();
        this.renderMode = 'window';
    }

    //------------------
    // Implementation
    //------------------
    private syncHosting() {
        const {active} = XH.inspectorService,
            {renderMode} = this;

        if (active && renderMode === 'overlay') {
            this.showOverlay();
        } else {
            this.hideOverlay();
        }

        if (!(active && renderMode === 'window')) {
            this.closeWindow();
        }
    }

    //------------------
    // Overlay mode
    //------------------
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

    //------------------
    // Window mode
    //------------------
    private initChildWindow(win: Window) {
        const doc = win.document;

        // Reset any stale content from a previously-opened window reused via its name.
        doc.head.innerHTML = '';
        doc.body.innerHTML = '';
        doc.title = `${XH.appName} - Hoist Inspector`;
        doc.body.style.cssText = 'margin:0;height:100vh;display:flex;flex-direction:column;';

        this.syncChildStyles();
        this.syncChildBodyClass();

        const container = doc.createElement('div');
        container.classList.add('xh-inspector-window-host');
        container.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
        doc.body.appendChild(container);

        // Return to docked mode if the user closes the popped-out window directly.
        win.addEventListener('pagehide', this.onChildWindowPagehide);

        // Close the popped-out window if the main app window unloads.
        window.addEventListener('pagehide', this.onMainWindowPagehide);

        // Keep styles synced across stylesheet changes (dev-time hot reloads, lazily-loaded
        // chunks) and theme changes (light/dark theme classes on the main document body).
        this.headObserver = new MutationObserver(() => this.syncChildStyles());
        this.headObserver.observe(document.head, {childList: true});
        this.bodyClassObserver = new MutationObserver(() => this.syncChildBodyClass());
        this.bodyClassObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        this.setWindowContainer(container);
    }

    @action
    private setWindowContainer(container: HTMLElement) {
        this.windowContainer = container;
    }

    private closeWindow() {
        const {childWindow} = this;
        if (!childWindow) return;

        this.closingChildWindow = true;
        try {
            this.headObserver?.disconnect();
            this.bodyClassObserver?.disconnect();
            this.headObserver = this.bodyClassObserver = null;
            window.removeEventListener('pagehide', this.onMainWindowPagehide);
            if (!childWindow.closed) {
                childWindow.removeEventListener('pagehide', this.onChildWindowPagehide);
                childWindow.close();
            }
        } finally {
            this.closingChildWindow = false;
        }

        this.childWindow = null;
        this.setWindowContainer(null);
    }

    /** Clone the main document's stylesheets into the popped-out window. */
    private syncChildStyles() {
        const win = this.childWindow;
        if (!win || win.closed) return;

        const childDoc = win.document,
            childHead = childDoc.head;

        // Full re-sync on any change - infrequent + cheap at this scale.
        childHead.querySelectorAll('[data-xh-inspector-synced]').forEach(node => node.remove());
        document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
            let clone: HTMLElement;
            if (node.tagName === 'LINK') {
                clone = childDoc.createElement('link');
                clone.setAttribute('rel', 'stylesheet');
                // Use resolved (absolute) href - childDoc has no base URL of its own.
                clone.setAttribute('href', (node as HTMLLinkElement).href);
            } else {
                clone = childDoc.importNode(node, true) as HTMLElement;
            }
            clone.setAttribute('data-xh-inspector-synced', 'true');
            childHead.appendChild(clone);
        });
    }

    /** Mirror theme + app classes from the main document body onto the popped-out window. */
    private syncChildBodyClass() {
        const win = this.childWindow;
        if (!win || win.closed) return;
        win.document.body.className = `${document.body.className} xh-inspector-window`;
    }

    private onChildWindowPagehide = () => {
        if (!this.closingChildWindow && this.renderMode === 'window') {
            this.setRenderMode('dock');
        }
    };

    private onMainWindowPagehide = () => {
        this.childWindow?.close();
    };

    override destroy() {
        this.hideOverlay();
        this.closeWindow();
        super.destroy();
    }
}
