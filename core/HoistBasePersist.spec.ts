/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    persist,
    persistOptions,
    type PersistOptions,
    type PlainObject
} from '@xh/hoist/core';
import {bindable, observable, observableRef, runInAction} from '@xh/hoist/mobx';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Property persistence on Hoist models, via the `@persist` decorator and `markPersist()`. This is
 * how apps persist most simple model state. The decorator depends on the order in which TC39
 * decorator init hooks run, so these tests also guard against toolchain drift - the v88 migration
 * to TC39 decorators silently stopped fields persisting, with no type error and only a console log.
 */
describe('@persist', () => {
    it('restores a stored value as the field initializes', () => {
        const store = new MemoryStore({showAdvanced: true});
        class FilterPanelModel extends HoistModel {
            override persistWith = store.options;
            @bindable @persist accessor showAdvanced = false;
        }

        const model = create(FilterPanelModel);
        expect(model.showAdvanced).toBe(true);
        expect(store.setData).not.toHaveBeenCalled();
    });

    it('restores the value before later field initializers read it', () => {
        const store = new MemoryStore({recordCount: 5000});
        class GridTestModel extends HoistModel {
            override persistWith = store.options;
            @bindable @persist accessor recordCount = 1000;
            @bindable accessor twiddleCount = this.recordCount / 2;
        }

        expect(create(GridTestModel).twiddleCount).toBe(2500);
    });

    it('restores and writes fields declared with each MobX decorator', () => {
        const store = new MemoryStore({count: 5, tags: ['a', 'b'], label: 'Saved'});
        class TagsModel extends HoistModel {
            override persistWith = store.options;
            @observable @persist accessor count = 0;
            @observableRef @persist accessor tags: string[] = [];
            @bindable @persist accessor label = 'Default';
        }

        const model = create(TagsModel);
        expect(model.count).toBe(5);
        expect(model.tags).toEqual(['a', 'b']);
        expect(model.label).toBe('Saved');

        runInAction(() => {
            model.count = 6;
            model.tags = ['c'];
        });
        model.label = 'Changed';
        expect(store.data).toEqual({count: 6, tags: ['c'], label: 'Changed'});
    });

    it('treats the in-code value, not the restored one, as the default', () => {
        const store = new MemoryStore({showAdvanced: true});
        class FilterPanelModel extends HoistModel {
            override persistWith = store.options;
            @bindable @persist accessor showAdvanced = false;
        }

        const model = create(FilterPanelModel);
        model.showAdvanced = false;
        expect(store.data).toEqual({});

        model.showAdvanced = true;
        expect(store.data).toEqual({showAdvanced: true});
    });

    it('applies @persist.with options over the model persistWith', () => {
        const store = new MemoryStore({grid: {persistType: 'local'}}),
            themeStore = new MemoryStore({theme: 'dark'});
        class SettingsModel extends HoistModel {
            override persistWith = store.options;
            @bindable @persist.with({path: 'grid.persistType'}) accessor persistType = 'none';
            @bindable @persist.with(themeStore.options) accessor theme = 'light';
        }

        const model = create(SettingsModel);
        expect(model.persistType).toBe('local');
        expect(model.theme).toBe('dark');

        model.persistType = 'pref';
        model.theme = 'system';
        expect(store.data).toEqual({grid: {persistType: 'pref'}});
        expect(themeStore.data).toEqual({theme: 'system'});
    });

    it('nests fields under the pathPrefix of a parent persistWith', () => {
        const store = new MemoryStore();
        class DetailModel extends HoistModel {
            @bindable accessor groupBy = 'none';
            constructor(persistWith: PersistOptions) {
                super();
                this.persistWith = persistWith;
                this.markPersist('groupBy');
            }
        }
        class ReportsModel extends HoistModel {
            override persistWith = {...store.options, pathPrefix: 'reports'};
            @bindable @persist accessor showAdvanced = false;
            @managed detailModel = new DetailModel(
                persistOptions(this.persistWith, {pathPrefix: 'detail'})
            );
        }

        const model = create(ReportsModel);
        model.showAdvanced = true;
        model.detailModel.groupBy = 'region';
        expect(store.data).toEqual({reports: {showAdvanced: true, detail: {groupBy: 'region'}}});
    });

    // Reversed order became a hazard with the TC39 decorators in v88 - it must not break the model.
    it('logs an error, rather than throwing, when written before the MobX decorator', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {}),
            store = new MemoryStore();
        class FilterPanelModel extends HoistModel {
            override persistWith = store.options;
            @persist @bindable accessor showAdvanced = false;
        }

        const model = create(FilterPanelModel);
        expect(consoleError).toHaveBeenCalled();
        expect(model.showAdvanced).toBe(false);

        model.showAdvanced = true;
        expect(model.showAdvanced).toBe(true);
    });
});

describe('HoistBase', () => {
    describe('markPersist', () => {
        it('restores a property and writes its changes via the model persistWith', () => {
            const store = new MemoryStore({daysBack: 90});
            class WidgetModel extends HoistModel {
                @bindable accessor daysBack = 30;
                constructor() {
                    super();
                    this.persistWith = store.options;
                    this.markPersist('daysBack');
                }
            }

            const model = create(WidgetModel);
            expect(model.daysBack).toBe(90);

            model.daysBack = 60;
            expect(store.data).toEqual({daysBack: 60});
        });

        it('applies its options over the model persistWith', () => {
            const store = new MemoryStore(),
                viewStore = new MemoryStore({report: {metric: 'revenue'}});
            class ReportModel extends HoistModel {
                override persistWith = store.options;
                @bindable accessor metric = 'hours';
                constructor() {
                    super();
                    this.markPersist('metric', {...viewStore.options, path: 'report.metric'});
                }
            }

            const model = create(ReportModel);
            expect(model.metric).toBe('revenue');

            model.metric = 'count';
            expect(viewStore.data).toEqual({report: {metric: 'count'}});
            expect(store.setData).not.toHaveBeenCalled();
        });
    });
});

//------------------
// Test support
//------------------
function create<T extends HoistModel>(cls: new () => T): T {
    const ret = new cls();
    onTestFinished(() => ret.destroy());
    return ret;
}

/** In-memory backing store, read and written via a CustomProvider with no write debounce. */
class MemoryStore {
    data: PlainObject;
    readonly setData = vi.fn((data: PlainObject) => (this.data = data));

    constructor(data: PlainObject = {}) {
        this.data = data;
    }

    get options(): PersistOptions {
        return {getData: () => this.data, setData: this.setData, debounce: 0};
    }
}
