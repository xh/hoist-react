import {HoistService, managed, persist, XH} from '@xh/hoist/core';
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
 * with the Hoist model registry on a configurable interval, as well as a Store of model count
 * and memory usage snapshots, also updated periodically in the background.
 *
 * When running in a Desktop application, activating this service will trigger the display of the
 * Hoist Inspector UI - {@see inspectorPanel}. Built-in controls to activate/deactivate this service
 * are provided within the Desktop appMenuButton and versionBar components and are visible to
 * Hoist Admins only by default, although this service can be activated by non-admin users to
 * support interactive troubleshooting within a running app.
 *
 * This service may be completely disabled via an optional `xhInspectorConfig` appConfig, although
 * note that this config does *not* disable the backing model registry within XH.
 */
export class InspectorService extends HoistService {
    persistWith = {localStorageKey: 'xhInspector'};

    /**
     * @return {boolean} - true if Inspector is generally enabled via config.
     *      If enabled but !active, this service won't do any work, but can be activated on demand.
     */
    get enabled() {
        return !!this.conf.enabled;
    }

    /** @member {boolean} - true to start processing model stats and show the Inspector UI. */
    @observable @persist active = false;

    /** @member {Store} */
    @managed modelInstanceStore;
    /** @member {Store} */
    @managed statsStore;
    /** @member {Timer} **/
    @managed syncTimer;

    constructor() {
        super();
        makeObservable(this);
    }

    initAsync() {
        this.modelInstanceStore = new Store({
            fields: [
                {name: 'className', type: STRING},
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

        if (!this.enabled) {
            // Ensure deactivated if not enabled - active could be persisted to true.
            this.deactivate();
        } else if (this.active) {
            // Activate (fully) if enabled and active was persisted to true.
            this.activate();
        }
    }

    toggleActive() {
        this.active ? this.deactivate() : this.activate();
    }

    @action
    activate() {
        if (!this.enabled) {
            XH.alert({
                title: 'Cannot activate Inspector',
                message: 'InspectorService disabled via xhInspectorConfig.'
            });
            return;
        }

        this.active = true;

        if (!this.syncTimer) {
            this.syncTimer = Timer.create({
                runFn: () => this.sync(),
                interval: () => this.conf.syncInterval,
                // Delay 1s to allow more time for initial model setup to complete across app.
                delay: 1000
            });
        }
    }

    @action
    deactivate() {
        this.active = false;

        this.modelInstanceStore.clear();
        this.statsStore.clear();

        const {syncTimer} = this;
        this.syncTimer = null;
        XH.safeDestroy(syncTimer);
    }

    clearStats() {
        this.statsStore.clear();
    }

    _prevModelCount = 0;
    _lastStatsUpdate = 0;

    sync() {
        if (!this.active) return;

        const modelData = XH.getActiveModels().map(model => {
            return {
                id: model.xhId,
                className: model.constructor.name,
                created: model._created,
                isLinked: model.isLinked,
                hasLoadSupport: model.loadSupport != null,
                lastLoadCompleted: model.lastLoadCompleted,
                lastLoadException: model.lastLoadException
            };
        });

        this.modelInstanceStore.loadData(modelData);

        const {totalJSHeapSize, usedJSHeapSize} = (window.performance?.memory ?? {}),
            modelCount = modelData.length,
            prevModelCount = this._prevModelCount,
            now = Date.now();

        if (modelCount !== prevModelCount || now - this._lastStatsUpdate > 30*SECONDS) {
            this.statsStore.addRecords({
                id: now,
                timestamp: now,
                modelCount,
                modelCountChange: modelCount - prevModelCount,
                totalJSHeapSize,
                usedJSHeapSize
            });
            this._prevModelCount = modelCount;
            this._lastStatsUpdate = now;
        }
    }

    get conf() {
        return XH.getConf('xhInspectorConfig', {enabled: true, syncInterval: 2000});
    }

}
