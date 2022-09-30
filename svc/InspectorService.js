import {HoistModel, HoistService, managed, persist, XH} from '@xh/hoist/core';
import {FieldType, Store} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';

const {STRING, DATE, NUMBER, BOOL} = FieldType;

/**
 * Developer/Admin focused service to provide additional processing and stats related to the
 * running application, specifically its active models as returned by `XH.getActiveModels()`.
 *
 * Activating this service will cause it to maintain a Store of active model instances, synced
 * (with a minimal throttle) on each change to the Hoist model registry, as well as a Store of model
 * counts + heap usage snapshots, also updated on model changes and periodically in the background.
 *
 * When running in a Desktop application, activating this service will trigger the display of the
 * Hoist Inspector UI - {@see inspectorPanel}. A built-in control to activate/deactivate this
 * service is provided within the Desktop versionBar component.
 *
 * This service may be completely disabled via an optional `xhInspectorConfig` appConfig, although
 * note that this config does *not* disable the backing model registry within XH. Access to
 * Inspector can also be limited to users with a particular app role, using the same config.
 */
export class InspectorService extends HoistService {
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

    /** @member {Store} - when active, holds lightly processed records for all active models. */
    @managed modelInstanceStore;
    /** @member {Store} - when active, holds timestamped stats on model count and memory usage. */
    @managed statsStore;
    /** @member {Timer} **/
    @managed statsUpdateTimer;

    constructor() {
        super();
        makeObservable(this);
    }

    initAsync() {
        this.modelInstanceStore = new Store({
            fields: [
                {name: 'className', type: STRING},
                {name: 'displayGroup', type: STRING},
                {name: 'created', type: DATE},
                {name: 'isLinked', type: BOOL},
                {name: 'hasLoadSupport', type: BOOL},
                {name: 'lastLoadCompleted', type: DATE},
                {name: 'lastLoadException', type: STRING}
            ]
        });

        this.statsStore = new Store({
            fields: [
                {name: 'timestamp', type: NUMBER},
                {name: 'modelCount', type: NUMBER},
                {name: 'modelCountChange', type: NUMBER},
                {name: 'totalJSHeapSize', type: NUMBER},
                {name: 'usedJSHeapSize', type: NUMBER}
            ]
        });

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

        // Stats are synced on model changes - this Timer also ensures regular updates to stats
        // when models themselves might not be changing.
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
        this.modelInstanceStore.clear();
        this.clearStats();
    }

    clearStats() {
        this.statsStore.clear();
    }

    sync() {
        if (!this.active) return;

        // Explicit access to keys() here ensure we trigger this autorun on set composition change.
        HoistModel._activeModels.keys();

        const models = [
            ...XH.getActiveModels(),
            ...XH.getServices()
        ];

        const modelData = models.map(model => {
            const className = model.constructor.name;
            return {
                id: model.xhId,
                className,
                displayGroup: model.isHoistModel ? className : 'Services',
                created: model._created,
                isLinked: model.isLinked,
                hasLoadSupport: model.loadSupport != null,
                lastLoadCompleted: model.lastLoadCompleted,
                lastLoadException: model.lastLoadException
            };
        });

        this.modelInstanceStore.loadData(modelData);
        this.updateStats();
    }

    _prevModelCount = 0;

    updateStats() {
        if (!this.active) return;

        const {totalJSHeapSize, usedJSHeapSize} = (window.performance?.memory ?? {}),
            modelCount = HoistModel._activeModels.size,
            prevModelCount = this._prevModelCount,
            now = Date.now();

        this.statsStore.addRecords({
            id: now,
            timestamp: now,
            modelCount,
            modelCountChange: modelCount - prevModelCount,
            totalJSHeapSize,
            usedJSHeapSize
        });

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
