/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, ModelLookup, type ModelSelector} from '@xh/hoist/core';
import {autorun, bindable, computed, observableRef, runInAction} from '@xh/hoist/mobx';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * Model lookup, which resolves `uses()`, `@lookup`, `lookupModel()` and other context lookups by
 * walking the models that rendered components publish. Element factories rely on it to find their
 * model from context, e.g. a `grid()` placed in a panel whose model holds a `GridModel`.
 */
describe('ModelLookup', () => {
    describe('lookupModel', () => {
        it('returns the nearest model matching a class or superclass', () => {
            const outerPanel = new PositionsPanelModel(),
                dashboard = new DashboardModel(),
                innerPanel = new PositionsPanelModel(),
                lookup = chain(outerPanel, dashboard, innerPanel);

            expect(lookup.lookupModel(PositionsPanelModel)).toBe(innerPanel);
            expect(lookup.lookupModel(PanelModel)).toBe(innerPanel);
            expect(lookup.lookupModel(DashboardModel)).toBe(dashboard);
            expect(lookup.lookupModel(ChartModel)).toBeNull();
        });

        it('matches a model published in limited mode only by an explicit selector', () => {
            // Panel, TabContainer and other containers publish their own models this way, so they
            // never capture lookups meant for models further up.
            const dashboard = new DashboardModel(),
                panel = new TradesPanelModel(),
                lookup = new ModelLookup(panel, chain(dashboard), 'limited');

            expect(lookup.lookupModel(TradesPanelModel)).toBe(panel);
            expect(lookup.lookupModel('*')).toBe(dashboard);
            expect(lookup.lookupModel(TradesModel)).toBe(dashboard.tradesModel);
        });

        it('resolves a predicate selector that returns undefined for other models', () => {
            // v88 (1c170aab1) - a duck-type check against a model lacking the property threw.
            const panel = new TradesPanelModel(),
                lookup = chain(panel, new PositionsPanelModel());

            expect(lookup.lookupModel(model => model['isTradesHost'])).toBe(panel);
        });

        it('finds a child model held in a plain field', () => {
            const dashboard = new DashboardModel(),
                lookup = chain(dashboard, new PositionsPanelModel());

            expect(lookup.lookupModel(TradesModel)).toBe(dashboard.tradesModel);
        });

        it('finds a child model held in an observable accessor', () => {
            // v88 (e213e2ce9) - TC39 accessors live on the prototype, and were missed.
            const panel = new ChartPanelModel(),
                chartModel = new ChartModel(),
                lookup = chain(new DashboardModel(), panel);
            runInAction(() => (panel.chartModel = chartModel));

            expect(lookup.lookupModel(ChartModel)).toBe(chartModel);
        });

        it('does not evaluate computed getters', () => {
            // v88 (e213e2ce9) - every lookup re-ran the computeds of each model it walked.
            const panel = new SummaryPanelModel(),
                lookup = chain(new DashboardModel(), panel);

            lookup.lookupModel(ChartModel);

            expect(panel.summaryRuns).toBe(0);
        });

        it('reruns an observer when a matching model arrives in an empty accessor', () => {
            const panel = new ChartPanelModel(),
                chartModel = new ChartModel(),
                results = observeLookup(chain(new DashboardModel(), panel), ChartModel);
            expect(results).toEqual([null]);

            runInAction(() => (panel.chartModel = chartModel));

            expect(results).toHaveLength(2);
            expect(results[1]).toBe(chartModel);
        });

        it('does not rerun an observer for unrelated state changes', () => {
            // v88 - lookups subscribe only to the slots that can change their result.
            const panel = new ChartPanelModel(),
                results = observeLookup(chain(new DashboardModel(), panel), ChartModel);

            panel.title = 'Trades';
            runInAction(() => (panel.chartModel = new ChartModel()));
            panel.title = 'Orders';

            expect(results).toHaveLength(2);
        });
    });
});

//------------------
// Helpers
//------------------
class ChartModel extends HoistModel {}
class TradesModel extends HoistModel {}

class DashboardModel extends HoistModel {
    @managed tradesModel = new TradesModel();
}

class PanelModel extends HoistModel {}
class PositionsPanelModel extends PanelModel {}

class TradesPanelModel extends PanelModel {
    isTradesHost = true;
    @managed tradesModel = new TradesModel();
}

class ChartPanelModel extends HoistModel {
    @bindable accessor title = 'Positions';
    @observableRef accessor chartModel: ChartModel = null;
}

class SummaryPanelModel extends HoistModel {
    @bindable accessor title = 'Positions';
    summaryRuns = 0;

    @computed
    get summary(): string {
        this.summaryRuns++;
        return `Summary of ${this.title}`;
    }
}

/** Publish models from the outermost in, as nested components do. */
function chain(...models: HoistModel[]): ModelLookup {
    return models.reduce<ModelLookup>(
        (parent, model) => new ModelLookup(model, parent, 'default'),
        null
    );
}

/** Run a lookup in an autorun, as a component render does, and collect each result. */
function observeLookup(lookup: ModelLookup, selector: ModelSelector): HoistModel[] {
    const ret: HoistModel[] = [],
        dispose = autorun(() => ret.push(lookup.lookupModel(selector)));
    onTestFinished(() => dispose());
    return ret;
}
