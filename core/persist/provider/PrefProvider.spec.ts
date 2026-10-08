/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {
    HoistModel,
    PersistableState,
    PersistenceProvider,
    type PersistOptions,
    XH
} from '@xh/hoist/core';
import {bindable, bindableRef, runInAction} from '@xh/hoist/mobx';
import {hoistCore, initTestAppAsync, prefEntry} from '@xh/hoist/test-support';
import {uniq} from 'lodash';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * A JSON user preference as a backing store, round-tripped through the real PrefService and the
 * fake hoist-core. Most apps persist user state this way, so it roams with the user across
 * devices. Several models often share one preference, each under its own path.
 *
 * Models here use the default 250ms write debounce, so writes land from a timer as in an app.
 */
describe('PrefProvider', () => {
    beforeAll(async () => {
        hoistCore.prefs.ordersState = prefEntry('json', {}, {grid: {sortBy: ['date|desc']}});
        hoistCore.prefs.tradesGrid = prefEntry('json', {});
        await initTestAppAsync();
    });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('restores state from the preference and saves changes, keeping the rest of it', async () => {
        XH.setPref('ordersState', {...XH.getPref('ordersState'), groupBy: 'region'});
        const model = createModel();
        expect(model.groupBy).toBe('region');

        model.groupBy = 'desk';
        await debounceWrites();
        vi.useRealTimers(); // A POST stalls under fake timers - see #4798.
        await XH.prefService.pushPendingAsync();

        const [req] = hoistCore.requestsTo('xh/setPrefs');
        expect(req.json.ordersState).toEqual({grid: {sortBy: ['date|desc']}, groupBy: 'desk'});
    });

    it('applies changes made to the preference by other code', () => {
        const model = createModel();

        XH.setPref('ordersState', {...XH.getPref('ordersState'), groupBy: 'trader'});
        expect(model.groupBy).toBe('trader');

        // E.g. an app's "reset to defaults" action.
        XH.prefService.unset('ordersState');
        expect(model.groupBy).toBe('none');
    });

    it('resets a grid persisted to the preference when other code unsets it', async () => {
        // E.g. a "Reset layout" action, which before needed a page reload to take effect.
        const gridModel = createGridModel(['trader', 'pnl']);

        gridModel.setSortBy('pnl|desc');
        gridModel.hideColumn('trader');
        await debounceWrites();
        expect(XH.prefService.isSet('tradesGrid')).toBe(true);

        XH.prefService.unset('tradesGrid');
        expect(gridModel.sortBy.map(String)).toEqual(['trader|asc']);
        expect(gridModel.isColumnVisible('trader')).toBe(true);
    });

    describe('with several models on one preference', () => {
        it('does not push state saved by one model to another', async () => {
            const first = createModel(),
                second = createModel();

            first.groupBy = 'book';
            await debounceWrites();

            expect(XH.getPref('ordersState').groupBy).toBe('book');
            expect(second.groupBy).toBe('none');
        });

        it('settles when the models save the state in different shapes', async () => {
            // As grids with different columns, or choosers with different favorites, do. Pushing
            // saves between them would rewrite the preference forever.
            const set = vi.spyOn(XH.prefService, 'set');
            createTagsModel('desk').tags = ['desk'];
            createTagsModel('book').tags = ['book'];
            await debounceWrites();
            set.mockClear();

            await vi.advanceTimersByTimeAsync(5000);
            expect(set).not.toHaveBeenCalled();
        });
    });

    it('saves a change made soon after its previous save, despite a settleTime', async () => {
        // Dashboards default to a settleTime, ignoring changes for a second after each read.
        const model = createModel({settleTime: 1000});
        await vi.advanceTimersByTimeAsync(1500);

        model.groupBy = 'desk';
        await vi.advanceTimersByTimeAsync(400);
        model.groupBy = 'region';
        await debounceWrites();

        expect(XH.getPref('ordersState').groupBy).toBe('region');
    });
});

class OrdersModel extends HoistModel {
    @bindable accessor groupBy = 'none';

    constructor(persistWith: PersistOptions) {
        super();
        this.markPersist('groupBy', persistWith);
    }
}

function createModel(opts: PersistOptions = {}): OrdersModel {
    const ret = new OrdersModel({prefKey: 'ordersState', ...opts});
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Keeps only its own tag from saved state, as a chooser drops favorites it cannot show. */
class TagsModel extends HoistModel {
    @bindableRef accessor tags: string[] = [];

    constructor(tag: string) {
        super();
        PersistenceProvider.create({
            persistOptions: {prefKey: 'ordersState', path: 'tags'},
            target: {
                getPersistableState: () => new PersistableState(this.tags),
                setPersistableState: ({value}) =>
                    runInAction(() => (this.tags = uniq([...value.filter(it => it === tag), tag])))
            },
            owner: this
        });
    }
}

function createTagsModel(tag: string): TagsModel {
    const ret = new TagsModel(tag);
    onTestFinished(() => ret.destroy());
    return ret;
}

function createGridModel(fields: string[]): GridModel {
    const ret = new GridModel({
        persistWith: {prefKey: 'tradesGrid'},
        columns: fields.map((field): ColumnSpec => ({field})),
        sortBy: fields[0]
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Let the default 250ms persistence debounce write to the preference. */
async function debounceWrites() {
    await vi.advanceTimersByTimeAsync(250);
}
