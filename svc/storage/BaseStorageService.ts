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
    private readonly area: Storage;

    constructor() {
        super();
        this.area = this.probeBrowserStorage() ?? new MemoryStorage();
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

    get(key: string, defaultValue?: any): any {
        const raw = this.area.getItem(this.prefix + key);
        return raw != null ? parseStored(raw) : (defaultValue ?? null);
    }

    set(key: string, value: any) {
        this.area.setItem(this.prefix + key, JSON.stringify(value));
    }

    apply(key: string, newProps: object) {
        const val = this.get(key, {}),
            newVal = Object.assign(val, newProps);

        this.set(key, newVal);
    }

    remove(key: string) {
        this.area.removeItem(this.prefix + key);
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
        const {area, prefix} = this,
            ret = [];
        for (let i = 0; i < area.length; i++) {
            const key = area.key(i);
            if (key.startsWith(prefix)) ret.push(key.substring(prefix.length));
        }
        return ret;
    }

    /** True if browser storage is unavailable and values are held in memory for this page only. */
    get isFake(): boolean {
        return this.area instanceof MemoryStorage;
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

/** Values are stored as JSON. A value that does not parse is returned as the raw string. */
function parseStored(raw: string): any {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

/** In-memory stand-in for a browser Storage area. */
class MemoryStorage implements Storage {
    private items = new Map<string, string>();

    get length() {
        return this.items.size;
    }
    key(i: number) {
        return [...this.items.keys()][i] ?? null;
    }
    getItem(k: string) {
        return this.items.get(k) ?? null;
    }
    setItem(k: string, v: string) {
        this.items.set(k, String(v));
    }
    removeItem(k: string) {
        this.items.delete(k);
    }
    clear() {
        this.items.clear();
    }
}
