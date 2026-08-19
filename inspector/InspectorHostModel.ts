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
 *  - 'window' - popped out into a separate, dedicated browser window.
 */
export type InspectorRenderMode = 'dock' | 'window';

/**
 * Manages where the Inspector UI renders. The default 'dock' mode renders the Inspector as a
 * resizable panel docked to the bottom of the app viewport. The alternate 'window' mode pops the
 * Inspector out into a separate browser window, which can be moved to a second monitor and leaves
 * the app's viewport entirely to the app - including any masks and modal dialogs that would cover
 * a docked Inspector. The Inspector remains part of the main app's component tree (via a
 * cross-document React portal), so it retains direct, live access to all app state.
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

    /** Container within the popped-out window - portal target when in 'window' mode. */
    @observable.ref
    windowContainer: HTMLElement = null;

    /**
     * Container to which any popups spawned by Inspector components (grid menus, tooltips,
     * dropdowns) should be re-parented, or null to use their default document-level parent.
     * Required when popped out - popups portaled to the main `document.body` would otherwise
     * render within the wrong window entirely.
     */
    get popupContainer(): HTMLElement {
        return this.renderMode === 'window' ? this.windowContainer : null;
    }

    private childWindow: Window = null;
    private closingChildWindow = false;
    private headObserver: MutationObserver = null;
    private bodyClassObserver: MutationObserver = null;

    constructor() {
        super();
        makeObservable(this);

        // Window mode requires a user gesture to (re)open and cannot be restored on app load.
        // Also maps any other unsupported persisted value back to the default.
        if (this.renderMode !== 'dock') {
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
        if (!(XH.inspectorService.active && this.renderMode === 'window')) {
            this.closeWindow();
        }
    }

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
        this.closeWindow();
        super.destroy();
    }
}
