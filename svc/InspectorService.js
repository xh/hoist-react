import {HoistService, managed, persist, XH} from '@xh/hoist/core';
import {FieldType, Store} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';

const {STRING, DATE, NUMBER, BOOL} = FieldType;

export class InspectorService extends HoistService {
    persistWith = {localStorageKey: 'xhInspectorService'};

    /** @member {boolean} */
    @observable @persist enabled = false;

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
                {name: 'hasLoadSupport', type: BOOL},
                {name: 'lastLoadCompleted', type: DATE},
                {name: 'lastLoadException', type: STRING}
            ]
        });

        this.statsStore = new Store({
            fields: [
                {name: 'timestamp', type: NUMBER},
                {name: 'modelCount', type: NUMBER},
                {name: 'totalJSHeapSize', type: NUMBER},
                {name: 'usedJSHeapSize', type: NUMBER}
            ]
        });

        if (this.enabled) this.enable();
    }

    toggleEnabled() {
        this.enabled ? this.disable() : this.enable();
    }

    @action
    enable() {
        this.enabled = true;

        if (!this.syncTimer) {
            this.syncTimer = Timer.create({
                runFn: () => this.sync(),
                interval: 5000
            });
        }
    }

    @action
    disable() {
        this.enabled = false;

        this.modelInstanceStore.clear();
        this.statsStore.clear();

        const {syncTimer} = this;
        this.syncTimer = null;
        XH.safeDestroy(syncTimer);
    }

    _prevModelCount;
    _lastStatsUpdate;

    sync() {
        if (!this.enabled) return;

        const modelData = XH.getActiveModels().map(model => {
            return {
                id: model.xhId,
                className: model.constructor.name,
                created: model._created,
                hasLoadSupport: model.loadSupport != null,
                lastLoadCompleted: model.lastLoadCompleted,
                lastLoadException: model.lastLoadException
            };
        });

        this.modelInstanceStore.loadData(modelData);

        const {totalJSHeapSize, usedJSHeapSize} = (window.performance?.memory ?? {}),
            modelCount = modelData.length,
            now = Date.now();

        if (modelCount !== this._prevModelCount || now - this._lastStatsUpdate > 30*SECONDS) {
            this.statsStore.addRecords({
                id: now,
                timestamp: now,
                modelCount: modelData.length,
                totalJSHeapSize: totalJSHeapSize ? totalJSHeapSize/1000 : null,
                usedJSHeapSize: usedJSHeapSize ? usedJSHeapSize/1000 : null
            });
            this._prevModelCount = modelCount;
            this._lastStatsUpdate = now;
        }
    }

}
