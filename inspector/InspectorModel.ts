/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Manages where the Inspector UI renders. By default the Inspector renders as a resizable panel
 * docked to the bottom of the app viewport. Alternately, it can be popped out into a separate
 * browser window, which can be moved to a second monitor and leaves the app's viewport entirely
 * to the app - including any masks and modal dialogs that would cover a docked Inspector. The
 * Inspector remains part of the main app's component tree (via a cross-document React portal),
 * so it retains direct, live access to all app state.
 *
 * Popped-out state is not persisted - browsers require a user gesture to open a window, so the
 * Inspector always returns docked on app load.
 *
 * Created internally by {@link inspectorPanel} - not for direct application use.
 *
 * @internal
 */
export class InspectorModel extends HoistModel {
    override xhImpl = true;

    /** Container within the popped-out window - portal target when popped out, null when docked. */
    @observable.ref
    windowContainer: HTMLElement = null;

    /** True when the Inspector is popped out into its own window. */
    get isWindowed(): boolean {
        return this.windowContainer != null;
    }

    /**
     * Container to which any popups spawned by Inspector components (grid menus, tooltips,
     * dropdowns) should be re-parented, or null to use their default document-level parent.
     * Required when popped out - popups portaled to the main `document.body` would otherwise
     * render within the wrong window entirely.
     */
    get popupContainer(): HTMLElement {
        return this.windowContainer;
    }

    private childWindow: Window = null;
    private headObserver: MutationObserver = null;
    private bodyClassObserver: MutationObserver = null;

    constructor() {
        super();
        makeObservable(this);

        // Close the popped-out window if the Inspector is deactivated.
        this.addReaction({
            track: () => XH.inspectorService.active,
            run: active => {
                if (!active) this.dock();
            }
        });
    }

    /**
     * Pop the Inspector out into a separate browser window. Must be called from a user
     * interaction (e.g. button click) to avoid popup blocking.
     */
    openWindow() {
        const {childWindow} = this;
        if (childWindow && !childWindow.closed) {
            childWindow.focus();
            return;
        }

        const win = window.open(
            '',
            `xhInspector_${XH.clientAppCode}`,
            'popup=yes,width=1400,height=500'
        );
        if (!win) {
            XH.dangerToast('Unable to open Inspector window - check for a popup blocker.');
            return;
        }

        this.childWindow = win;
        this.initChildWindow(win);
        win.focus();
    }

    /** Return the Inspector to its docked position, closing any popped-out window. */
    dock() {
        const {childWindow} = this;
        if (!childWindow) return;

        this.headObserver?.disconnect();
        this.bodyClassObserver?.disconnect();
        this.headObserver = this.bodyClassObserver = null;
        window.removeEventListener('pagehide', this.onMainWindowPagehide);
        if (!childWindow.closed) {
            // Remove listener first, so our own close does not re-enter via pagehide.
            childWindow.removeEventListener('pagehide', this.onChildWindowPagehide);
            childWindow.close();
        }

        this.childWindow = null;
        this.setWindowContainer(null);
    }

    //------------------
    // Implementation
    //------------------
    private initChildWindow(win: Window) {
        const doc = win.document;

        // Reset any stale content from a previously-opened window reused via its name.
        doc.head.innerHTML = '';
        doc.body.innerHTML = '';
        doc.title = `${XH.appName} - Hoist Inspector`;

        this.syncChildStyles();
        this.syncChildBodyClass();

        const container = doc.createElement('div');
        container.classList.add('xh-inspector-window-host');
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

    private onChildWindowPagehide = () => this.dock();

    private onMainWindowPagehide = () => this.childWindow?.close();

    override destroy() {
        this.dock();
        super.destroy();
    }
}
