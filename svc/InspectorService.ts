/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, managed, persist, XH} from '@xh/hoist/core';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';

/**
 * Developer/Admin focused service to provide additional processing and stats related to the
 * running application, specifically its current HoistModel, HoistService, and Store instances.
 *
 * Activating this service will cause it to maintain an observable array of summary data synced
 * (with a minimal throttle) on each change to the Hoist registry, as well as an array of model
 * count / memory usage stats, also updated on model changes and periodically in the background.
 *
 * When running in a Desktop application, activating this service will trigger the display of the
 * Hoist Inspector UI - {@link inspectorPanel}. A built-in control to activate/deactivate this
 * service is provided within the Desktop versionBar component.
 *
 * This service may be completely disabled via an optional `xhInspectorConfig` appConfig, although
 * note that this config does *not* disable the backing registry within XH. Access to Inspector can
 * also be limited to users with a particular app role, using the same config.
 */
export class InspectorService extends HoistService {
    override xhImpl = true;

    static instance: InspectorService;

    override persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}`};

    /**
     * True if Inspector is generally enabled via config.
     * If enabled but !active, this service won't do any work, but can be activated on demand.
     */
    get enabled(): boolean {
        const {conf} = this;
        return conf.enabled && (!conf.requiresRole || XH.getUser().hasRole(conf.requiresRole));
    }

    /** True to start processing model stats and show the Inspector UI. */
    @observable
    @persist
    active: boolean = false;

    /** Info on current services/models/stores (when active). */
    @bindable.ref
    activeInstances: InspectorInstanceData[] = [];

    /** Timestamped model counts w/memory usage (when active). */
    @observable.ref
    stats: InspectorStat[] = [];

    @managed
    statsUpdateTimer: Timer;

    private _syncRun = 0;
    private _idToSyncRun = new Map();

    constructor() {
        super();
        makeObservable(this);
    }

    override async initAsync() {
        // Ensure deactivated if not enabled - active could be persisted to true.
        if (!this.enabled) {
            this.deactivate();
        }

        // Update stats whenever activeInstances change. Note this cannot be called directly within
        // the autorun above as it reads + replaces the observable stats array (and would loop).
        this.addReaction({
            track: () => this.activeInstances,
            run: () => this.updateStats()
        });

        // Timer continues to update memory stats when instances themselves are not changing.
        this.statsUpdateTimer = Timer.create({
            runFn: () => this.updateStats(),
            interval: () => this.conf.statsUpdateInterval,
            delay: true // model update reaction will eagerly populate on startup
        });

        // Using an autorun here to trigger re-run when any active model's observable
        // lastLoadCompleted/lastLoadException properties change, in addition to changes to the
        // set composition itself. Throttled via mobx-provided delay option.
        // Initial wait allows app init to settle before we start syncing more eagerly.
        wait(1000).then(() => {
            this.addAutorun({
                run: () => this.sync(),
                delay: 300
            });
        });
    }

    toggleActive() {
        this.active ? this.deactivate() : this.activate();
    }

    @action
    activate() {
        if (!this.enabled) {
            throw XH.exception(
                'InspectorService disabled or not accessible to current user - review xhInspectorConfig.'
            );
        }

        this.active = true;
    }

    @action
    deactivate() {
        this.active = false;
        this.activeInstances = [];
        this.clearStats();
    }

    @action
    updateStats() {
        if (!this.active) return;

        const {totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit} =
                (window.performance as NonStandardPerformance)?.memory ?? {},
            modelCount = instanceManager.models.size,
            prevModelCount = this._prevModelCount,
            now = Date.now();

        this.stats = [
            ...this.stats,
            {
                id: now,
                timestamp: now,
                modelCount,
                modelCountChange: modelCount - prevModelCount,
                totalJSHeapSize,
                usedJSHeapSize,
                jsHeapSizeLimit,
                syncRun: this._syncRun
            }
        ];

        this._prevModelCount = modelCount;
    }

    @action
    clearStats() {
        this.stats = [];
    }

    async restoreDefaultsAsync() {
        if (
            !(await XH.confirm({
                message: "Reset Inspector's layout and options to their defaults?"
            }))
        )
            return;

        XH.localStorageService.removeIf(it => it.startsWith(`xhInspector.${XH.clientAppCode}`));
        this.deactivate();
        await wait();
        this.activate();
    }

    //------------------
    // Implementation
    //------------------
    private sync() {
        if (!this.active) return;

        const instances = [...XH.getModels(), ...XH.getServices(), ...XH.getStores()];

        const {_idToSyncRun, _syncRun} = this,
            newSyncRun = _syncRun + 1;

        let hadNewInstances = false;
        this.setActiveInstances(
            instances.map((inst: any) => {
                const {xhId} = inst;
                let syncRun = _idToSyncRun.get(xhId);

                if (!syncRun) {
                    syncRun = newSyncRun;
                    _idToSyncRun.set(xhId, syncRun);
                    hadNewInstances = true;
                }

                return {
                    id: xhId,
                    className: inst.constructor.name,
                    created: inst._created,
                    isHoistService: inst.isHoistService,
                    isHoistModel: inst.isHoistModel,
                    isStore: inst.isStore,
                    isLinked: inst.isLinked,
                    isXhImpl: inst.xhImpl,
                    hasLoadSupport: inst.loadSupport != null,
                    lastLoadCompleted: inst.lastLoadCompleted,
                    lastLoadException: inst.lastLoadException,
                    syncRun
                };
            })
        );

        if (hadNewInstances) this._syncRun = newSyncRun;
    }

    @action
    setActiveInstances(ai) {
        this.activeInstances = ai;
    }

    _prevModelCount = 0;

    get conf() {
        return {
            enabled: true,
            statsUpdateInterval: 30 * SECONDS,
            requiresRole: null,
            ...XH.getConf('xhInspectorConfig', {})
        };
    }
}

interface InspectorInstanceData {
    className: string;
    created: Date;
    isHoistModel: boolean;
    isHoistService: boolean;
    isStore: boolean;
    isLinked: boolean;
    isXhImpl: boolean;
    hasLoadSupport: boolean;
    lastLoadCompleted: Date;
    lastLoadException: any;
    syncRun: number;
}

interface InspectorStat {
    id: number;
    timestamp: number;
    modelCount: number;
    modelCountChange: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
    syncRun: number;
}

// Augment the global window object with a non-standard performance.memory property that's specific to Chromium browsers.
interface NonStandardPerformance extends Performance {
    memory?: {
        totalJSHeapSize: number;
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
}
