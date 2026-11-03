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
 * If browser storage is unavailable, values are held in memory for the life of the page.
 */
export abstract class BaseStorageService extends HoistService {
    /** Browser storage, accessed as a plain key/value object, or an in-memory stand-in. */
    private readonly area: Record<string, string>;

    constructor() {
        super();
        this.area = this.loadStorageArea();
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

    //------------------
    //  Implementation
    //------------------
    /** The browser storage area to use. Access can throw when storage is disabled. */
    protected abstract get browserStorage(): Storage;

    /** The browser storage area, confirmed to accept writes, or an in-memory object if not. */
    private loadStorageArea(): Record<string, string> {
        try {
            const ret = this.browserStorage,
                testKey = '_xhStorageProbe';
            ret.setItem(testKey, 'ok');
            ret.removeItem(testKey);
            return ret;
        } catch {
            this.logWarn(
                'Browser storage is unavailable - values will be held in memory and lost when the page closes.'
            );
            return {};
        }
    }

    private get prefix(): string {
        return `${XH.appCode}.${XH.getUsername()}.`;
    }
}
