/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, span} from '@xh/hoist/cmp/layout';
import {
    creates,
    hoistCmp,
    HoistModel,
    LoadSpec,
    lookup,
    RefreshContextModel,
    refreshContextView,
    useContextModel,
    useLocalModel,
    uses,
    XH
} from '@xh/hoist/core';
import {bindable, bindableRef} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render} from '@testing-library/react';
import {createRef} from 'react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The hooks that tie models to components. Linked models - those a component creates and owns via
 * `creates()`, `useLocalModel()` or a `modelConfig` prop - rely on them to initialize, load and
 * refresh, and to be destroyed on unmount rather than leak.
 */
beforeAll(() => initTestAppAsync());

describe('useModelLinker', () => {
    it('calls onLinked during the first render, then afterLinked and a load after mount', () => {
        const tradesRef = createRef<TradesModel>(),
            {rerender} = render(
                dashboardPanel(tradesPanel({title: 'Trades', modelRef: tradesRef}))
            );
        rerender(dashboardPanel(tradesPanel({title: 'Open trades', modelRef: tradesRef})));

        // Once each - a re-render only renders.
        expect(tradesRef.current.log).toEqual([
            'onLinked',
            'render',
            'afterLinked',
            'load',
            'render'
        ]);
    });

    it('gives onLinked access to props and ancestor models', () => {
        const dashboardRef = createRef<DashboardModel>(),
            tradesRef = createRef<TradesModel>();

        render(
            dashboardPanel({
                modelRef: dashboardRef,
                item: tradesPanel({title: 'Trades', modelRef: tradesRef})
            })
        );

        const dashboard = dashboardRef.current,
            {linkedWith} = tradesRef.current;
        expect(linkedWith.title).toBe('Trades');
        expect(linkedWith.lookedUp).toBe(dashboard);
        // v88 (e213e2ce9) - field decorators such as @lookup were not reliably applied.
        expect(linkedWith.injected).toBe(dashboard);
    });

    it('registers owned models with the nearest refresh context until unmount', async () => {
        const context = new RefreshContextModel(),
            passedIn = new TradesModel(),
            ownedRef = createRef<TradesModel>();
        onTestFinished(() => XH.safeDestroy(context, passedIn));

        const {unmount} = render(
            refreshContextView({
                model: context,
                item: dashboardPanel(
                    tradesPanel({modelRef: ownedRef}),
                    tradesView({model: passedIn})
                )
            })
        );
        const owned = ownedRef.current;

        await context.refreshAsync();
        expect(owned.loadSpecs.map(it => it.isRefresh)).toEqual([false, true]);
        // A model passed in props is loaded and refreshed by whoever created it.
        expect(passedIn.loadSpecs).toEqual([]);

        unmount();
        await context.refreshAsync();
        expect(owned.loadSpecs).toHaveLength(2);
        expect(owned.isDestroyed).toBe(true);
    });

    it('updates componentProps only when a prop changes', () => {
        // v71 (9ebd5a406) - every re-render notified componentProps observers, causing render loops.
        const tradesRef = createRef<TradesModel>(),
            {container, rerender} = render(
                dashboardPanel(tradesPanel({title: 'Trades', modelRef: tradesRef}))
            ),
            trades = tradesRef.current,
            titles: string[] = [];
        trades.addReaction({
            track: () => trades.componentProps,
            run: props => titles.push(props.title)
        });

        act(() => {
            trades.status = 'Loaded';
        });
        expect(container.textContent).toBe('Trades: Loaded');
        expect(titles).toEqual([]);

        rerender(dashboardPanel(tradesPanel({title: 'Open trades', modelRef: tradesRef})));
        expect(titles).toEqual(['Open trades']);
    });
});

describe('useLocalModel', () => {
    it('creates a model for the life of the component, linked beneath its model', () => {
        const dashboardRef = createRef<DashboardModel>(),
            localModels: TradesModel[] = [],
            dashboardView = hoistCmp.factory<DashboardModel>({
                model: creates(DashboardModel),
                render({title}) {
                    localModels.push(useLocalModel(TradesModel));
                    return span(title);
                }
            });

        const {rerender, unmount} = render(
            dashboardView({title: 'Positions', modelRef: dashboardRef})
        );
        rerender(dashboardView({title: 'Orders', modelRef: dashboardRef}));

        const [trades] = localModels;
        expect(localModels).toHaveLength(2);
        expect(localModels[1]).toBe(trades);
        expect(trades.dashboardModel).toBe(dashboardRef.current);
        expect(trades.loadSpecs).toHaveLength(1);

        unmount();
        expect(trades.isDestroyed).toBe(true);
    });
});

describe('useContextModel', () => {
    it('returns the current model when an observable reference in context changes', () => {
        // v75 (38185e1d4) - the model found on first render was cached, so a replacement was missed.
        const chartTitle = hoistCmp.factory({
                model: false,
                render() {
                    const chartModel = useContextModel(ChartModel);
                    return span(chartModel?.title ?? 'None');
                }
            }),
            report = new ReportModel(),
            chart = new ChartModel();
        onTestFinished(() => XH.safeDestroy(report, chart));

        const {container} = render(reportPanel({model: report, item: chartTitle()}));
        expect(container.textContent).toBe('None');

        act(() => {
            report.chartModel = chart;
        });
        expect(container.textContent).toBe('Positions');
    });
});

//------------------
// Helpers
//------------------
class DashboardModel extends HoistModel {}

class TradesModel extends HoistModel {
    @lookup(DashboardModel) dashboardModel: DashboardModel;
    @bindable accessor status = 'Pending';

    /** Lifecycle calls and renders, in order. */
    log: string[] = [];
    linkedWith: {title: string; lookedUp: HoistModel; injected: HoistModel} = null;
    loadSpecs: LoadSpec[] = [];

    override onLinked() {
        this.log.push('onLinked');
        this.linkedWith = {
            title: this.componentProps.title,
            lookedUp: this.lookupModel(DashboardModel),
            injected: this.dashboardModel
        };
    }

    override afterLinked() {
        this.log.push('afterLinked');
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        this.log.push('load');
        this.loadSpecs.push(loadSpec);
    }
}

class ChartModel extends HoistModel {
    title = 'Positions';
}

class ReportModel extends HoistModel {
    @bindableRef accessor chartModel: ChartModel = null;
}

const dashboardPanel = hoistCmp.factory<DashboardModel>({
    model: creates(DashboardModel),
    render: ({children}) => div({items: children})
});

const tradesPanel = hoistCmp.factory<TradesModel>({
    model: creates(TradesModel),
    render({model, title}) {
        model.log.push('render');
        return span(`${title}: ${model.status}`);
    }
});

const tradesView = hoistCmp.factory<TradesModel>({
    model: uses(TradesModel),
    render: ({model}) => span(model.status)
});

const reportPanel = hoistCmp.factory<ReportModel>({
    model: uses(ReportModel),
    render: ({children}) => div({items: children})
});
