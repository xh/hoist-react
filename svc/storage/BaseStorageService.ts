/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';

/**
 * Service to provide simple key/value access to browser local/session storage, appropriately
 * namespaced by application code and username.
 *
 * In the unexpected case that the core apis are not available, will provide a transient in-memory
 * storage to support its operations and API.
 */
export abstract class BaseStorageService extends HoistService {
    /** Browser storage, accessed as a plain key/value object, or an in-memory stand-in. */
    private readonly area: Record<string, string>;

    constructor() {
        super();
        this.area = this.probeBrowserStorage() ?? {};
        if (this.isFake) {
            XH.handleException(
                XH.exception(
                    'Requested Storage is not supported in this browser. Transient in-memory storage ' +
                        'will be used as a fallback.  All data stored will be lost when page is closed.'
                ),
                {showAlert: false}
            );
        }
    }

    /** Returns the stored value, or the default (else null) if missing or not valid JSON. */
    get(key: string, defaultValue?: any): any {
        try {
            return JSON.parse(this.area[this.prefix + key]) ?? defaultValue ?? null;
        } catch {
            return defaultValue ?? null;
        }
    }

    set(key: string, value: any) {
        this.area[this.prefix + key] = JSON.stringify(value);
    }

    apply(key: string, newProps: object) {
        this.set(key, Object.assign(this.get(key, {}), newProps));
    }

    remove(key: string) {
        delete this.area[this.prefix + key];
    }

    removeIf(predicateFn: (s: string) => boolean) {
        this.keys().forEach(key => {
            if (predicateFn(key)) this.remove(key);
        });
    }

    clear() {
        this.keys().forEach(key => this.remove(key));
    }

    keys(): string[] {
        const {prefix} = this;
        return Object.keys(this.area)
            .filter(it => it.startsWith(prefix))
            .map(it => it.substring(prefix.length));
    }

    /** True if browser storage is unavailable and values are held in memory for this page only. */
    get isFake(): boolean {
        return !(this.area instanceof Storage);
    }

    //------------------
    //  Implementation
    //------------------
    /** The browser storage area to use. Access can throw when storage is disabled. */
    protected abstract get browserStorage(): Storage;

    /** The browser storage area, confirmed to accept writes, or null if unavailable. */
    private probeBrowserStorage(): Storage {
        try {
            const ret = this.browserStorage,
                testKey = '_xhStorageProbe';
            ret.setItem(testKey, 'ok');
            ret.removeItem(testKey);
            return ret;
        } catch {
            return null;
        }
    }

    private get prefix(): string {
        return `${XH.appCode}.${XH.getUsername()}.`;
    }
}
