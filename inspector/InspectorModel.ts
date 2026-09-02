/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Manages the separate browser window that hosts the Inspector UI. The window can be moved to a
 * second monitor and leaves the app's viewport entirely to the app - including any masks and modal
 * dialogs that would otherwise cover the Inspector. The Inspector remains part of the main app's
 * component tree (via a cross-document React portal), so it retains direct, live access to all
 * app state.
 *
 * The window opens when {@link InspectorService} is activated and closes when it is deactivated.
 * Closing the window directly deactivates the service. Browsers require a user gesture to open a
 * window, so if the service was persisted as active on app load and the browser blocks the open,
 * the service is deactivated.
 *
 * Created internally by {@link inspectorPanel} - not for direct application use.
 *
 * @internal
 */
export class InspectorModel extends HoistModel {
    override xhImpl = true;

    /**
     * Container within the Inspector window, or null when closed. Portal target for the Inspector
     * UI itself and for any popups its components spawn (grid menus, tooltips, dropdowns) - popups
     * portaled to the main `document.body` would otherwise render within the wrong window entirely.
     */
    @observable.ref
    windowContainer: HTMLElement = null;

    private childWindow: Window = null;
    private headObserver: MutationObserver = null;
    private bodyClassObserver: MutationObserver = null;

    constructor() {
        super();
        makeObservable(this);
    }

    override afterLinked() {
        // Open/close the window as the service is activated/deactivated. Runs after first render
        // so a blocked open on load can safely deactivate the service.
        this.addReaction({
            track: () => XH.inspectorService.active,
            run: active => (active ? this.openWindow() : this.closeWindow()),
            fireImmediately: true
        });
    }

    /**
     * Bring the main app tab/window to the front. Chrome will not switch tabs via `focus()`, but
     * will activate an existing named window targeted by `window.open()` from a user gesture. The
     * app window is named transiently and the call is issued from within the Inspector window's
     * realm, where the user's click is credited.
     */
    focusApp() {
        const win = this.childWindow;
        if (!win || win.closed) return;

        const prevName = window.name,
            name = `xhInspectorApp_${XH.tabId}`;
        window.name = name;
        try {
            new (win as any).Function(`window.open('', '${name}')`)();
        } catch {
            window.focus();
        } finally {
            window.name = prevName;
        }
    }

    //------------------
    // Implementation
    //------------------
    private openWindow() {
        const {childWindow} = this;
        if (childWindow && !childWindow.closed) {
            childWindow.focus();
            return;
        }

        const win = window.open(
            '',
            `xhInspector_${XH.clientAppCode}_${XH.tabId}`,
            'popup=yes,width=1400,height=500'
        );
        if (!win) {
            XH.dangerToast('Unable to open Inspector window - check for a popup blocker.');
            XH.inspectorService.deactivate();
            return;
        }

        this.childWindow = win;
        this.initChildWindow(win);
        win.focus();
    }

    private closeWindow() {
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

    private initChildWindow(win: Window) {
        const doc = win.document;

        // Reset any stale content from a previously-opened window reused via its name.
        doc.head.innerHTML = '';
        doc.body.innerHTML = '';
        doc.title = `${XH.appName} Inspector - Tab ${XH.tabId}`;

        this.syncChildStyles();
        this.syncChildBodyClass();

        const container = doc.createElement('div');
        container.classList.add('xh-inspector-window-host');
        doc.body.appendChild(container);

        // Deactivate the service if the user closes the Inspector window directly.
        win.addEventListener('pagehide', this.onChildWindowPagehide);

        // Close the Inspector window if the main app window unloads.
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

    /** Clone the main document's stylesheets into the Inspector window. */
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

    /** Mirror theme + app classes from the main document body onto the Inspector window. */
    private syncChildBodyClass() {
        const win = this.childWindow;
        if (!win || win.closed) return;
        win.document.body.className = `${document.body.className} xh-inspector-window`;
    }

    private onChildWindowPagehide = () => XH.inspectorService.deactivate();

    private onMainWindowPagehide = () => this.childWindow?.close();

    override destroy() {
        this.closeWindow();
        super.destroy();
    }
}
