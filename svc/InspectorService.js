import {HoistModel, HoistService, managed, persist, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';


/**
 * Developer/Admin focused service to provide additional processing and stats related to the
 * running application, specifically its current HoistModel, HoistService, and Store instances.
 *
 * Activating this service will cause it to maintain an observable array of summary data synced
 * (with a minimal throttle) on each change to the Hoist registry, as well as an array of model
 * count / memory usage stats, also updated on model changes and periodically in the background.
 *
 * When running in a Desktop application, activating this service will trigger the display of the
 * Hoist Inspector UI - {@see inspectorPanel}. A built-in control to activate/deactivate this
 * service is provided within the Desktop versionBar component.
 *
 * This service may be completely disabled via an optional `xhInspectorConfig` appConfig, although
 * note that this config does *not* disable the backing registry within XH. Access to Inspector can
 * also be limited to users with a particular app role, using the same config.
 */
export class InspectorService extends HoistService {
    xhImpl = true;

    persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}`};

    /**
     * @return {boolean} - true if Inspector is generally enabled via config.
     *      If enabled but !active, this service won't do any work, but can be activated on demand.
     */
    get enabled() {
        const {conf} = this;
        return conf.enabled && (!conf.requiresRole || XH.getUser().hasRole(conf.requiresRole));
    }

    /** @member {boolean} - true to start processing model stats and show the Inspector UI. */
    @observable @persist active = false;

    /** @member {InspectorInstanceData[]} - info on current services/models/stores (when active). */
    @observable.ref activeInstances = [];
    /** @member {InspectorStat[]} - timestamped model counts w/memory usage (when active). */
    @observable.ref stats = [];

    /** @member {Timer} **/
    @managed statsUpdateTimer;

    constructor() {
        super();
        makeObservable(this);
    }

    initAsync() {
        // Ensure deactivated if not enabled - active could be persisted to true.
        if (!this.enabled) {
            this.deactivate();
        }

        // Using an autorun here to trigger re-run when any active model's observable
        // lastLoadCompleted/lastLoadException properties change, in addition to changes to the
        // set composition itself. Throttled via mobx-provided delay option.
        this.addAutorun({
            run: () => this.sync(),
            delay: 300,
            fireImmediately: true
        });

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
    }

    toggleActive() {
        this.active ? this.deactivate() : this.activate();
    }

    @action
    activate() {
        if (!this.enabled) {
            throw XH.exception('InspectorService disabled or not accessible to current user - review xhInspectorConfig.');
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
    clearStats() {
        this.stats = [];
    }

    sync() {
        if (!this.active) return;

        const instances = [
            ...XH.getActiveModels(),
            ...XH.getServices(),
            ...XH.getStores()
        ];

        this.setActiveInstances(instances.map(inst => {
            return {
                id: inst.xhId,
                className: inst.constructor.name,
                created: inst._created,
                isHoistService: inst.isHoistService,
                isHoistModel: inst.isHoistModel,
                isStore: inst.isStore,
                isLinked: inst.isLinked,
                isXhImpl: inst.xhImpl,
                hasLoadSupport: inst.loadSupport != null,
                lastLoadCompleted: inst.lastLoadCompleted,
                lastLoadException: inst.lastLoadException
            };
        }));
    }

    @action
    setActiveInstances(ai) {
        this.activeInstances = ai;
    }

    _prevModelCount = 0;

    @action
    updateStats() {
        if (!this.active) return;

        const {totalJSHeapSize, usedJSHeapSize} = (window.performance?.memory ?? {}),
            modelCount = HoistModel._activeModels.size,
            prevModelCount = this._prevModelCount,
            now = Date.now();

        this.stats = [...this.stats, {
            id: now,
            timestamp: now,
            modelCount,
            modelCountChange: modelCount - prevModelCount,
            totalJSHeapSize,
            usedJSHeapSize
        }];

        this._prevModelCount = modelCount;
    }

    get conf() {
        return {
            enabled: true,
            statsUpdateInterval: 30 * SECONDS,
            requiresRole: null,
            ...XH.getConf('xhInspectorConfig', {})
        };
    }

}

/**
 * @typedef {Object} InspectorInstanceData
 * @property {string} className
 * @property {Date} created
 * @property {boolean} isHoistModel
 * @property {boolean} isHoistService
 * @property {boolean} isStore
 * @property {boolean} isLinked
 * @property {boolean} isXhImpl
 * @property {Date} lastLoadCompleted
 * @property {Error} lastLoadException
 */

/**
 * @typedef {Object} InspectorStat
 * @property {number} timestamp
 * @property {number} modelCount
 * @property {number} modelCountChange
 * @property {number} totalJSHeapSize
 * @property {number} usedJSHeapSize
 */
