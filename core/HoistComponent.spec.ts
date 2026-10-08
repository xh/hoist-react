/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, input, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistModel, type HoistProps, managed, uses, XH} from '@xh/hoist/core';
import {bindable, bindableRef} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render, screen} from '@testing-library/react';
import {createRef, useState} from 'react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The contract of the component layer: how `hoistCmp` element factories pass props and children
 * to a component, and how components create, find and publish their models. Every Hoist component
 * and app view is built on it.
 */
describe('hoistCmp', () => {
    beforeAll(() => initTestAppAsync());

    describe('factory', () => {
        it('passes props to render, with item or items arriving as children', () => {
            render(
                div(
                    card({title: 'Trades', items: [span('Open'), span('Closed')]}),
                    card({title: 'Orders', item: span('Pending')})
                )
            );

            expect(screen.getByTitle('Trades').textContent).toBe('OpenClosed');
            expect(screen.getByTitle('Orders').textContent).toBe('Pending');
        });

        it('accepts children as arguments in its shortcut form', () => {
            // A single element argument is a child, not a config object.
            render(div(card(span('Open'), span('Closed')), card(span('Pending'))));

            expect(texts('.test-card')).toEqual(['OpenClosed', 'Pending']);
        });

        it('omits the element when omit is true or returns true', () => {
            render(
                div(
                    card({title: 'Shown', omit: false}),
                    card({title: 'Omitted', omit: true}),
                    card({title: 'Shown by function', omit: () => false}),
                    card({title: 'Omitted by function', omit: () => true})
                )
            );

            const titles = Array.from(
                document.querySelectorAll<HTMLElement>('.test-card'),
                it => it.title
            );
            expect(titles).toEqual(['Shown', 'Shown by function']);
        });

        it('passes $items through as a regular prop', () => {
            // For components with an `items` prop of their own, e.g. Blueprint's OverflowList.
            render(tagList({$items: ['Equities', 'Rates']}));

            expect(texts('.test-tag')).toEqual(['Equities', 'Rates']);
        });
    });

    describe('className', () => {
        it('combines its base className with one passed in props', () => {
            render(card({className: 'trades-card'}));

            expect(document.querySelector('.test-card').className).toBe('test-card trades-card');
        });
    });

    describe('ref', () => {
        it('forwards a ref to a render function that accepts one', () => {
            const ref = createRef<HTMLInputElement>();

            render(textField({ref}));

            expect(ref.current).toBeInstanceOf(HTMLInputElement);
        });
    });

    describe('creates', () => {
        it('creates one model for the life of the component and destroys it on unmount', () => {
            const models: DashboardModel[] = [],
                dashboardView = hoistCmp.factory<DashboardModel>({
                    model: creates(DashboardModel),
                    render({model, title}) {
                        models.push(model);
                        return span(title);
                    }
                });

            const {rerender, unmount} = render(dashboardView({title: 'Positions'}));
            rerender(dashboardView({title: 'Orders'}));

            const [model] = models;
            expect(models).toHaveLength(2);
            expect(models[1]).toBe(model);
            expect(model.isDestroyed).toBe(false);

            unmount();
            expect(model.isDestroyed).toBe(true);
        });

        it('does not re-render the components below it when only it re-renders', () => {
            // v60 (d6ab183ea) - each render published a new context, re-rendering every view below.
            let chartRenders = 0;
            const chartLabel = hoistCmp.factory<ChartModel>({
                    model: uses(ChartModel),
                    render({model}) {
                        chartRenders++;
                        return span({className: 'chart', item: model.title});
                    }
                }),
                dashboardView = hoistCmp.factory<DashboardModel>({
                    model: creates(DashboardModel),
                    render: ({model}) =>
                        div(span({className: 'title', item: model.title}), chartLabel())
                }),
                dashboardRef = createRef<DashboardModel>();

            render(dashboardView({modelRef: dashboardRef}));
            act(() => {
                dashboardRef.current.title = 'Risk';
            });

            expect(texts('.title')).toEqual(['Risk']);
            expect(chartRenders).toBe(1);
        });
    });

    describe('uses', () => {
        it('resolves its model from props, then context, then a default', () => {
            const chartOrDefault = hoistCmp.factory<ChartModel>({
                    model: uses(ChartModel, {createDefault: true}),
                    render: ({model}) => span({className: 'chart', item: model.title})
                }),
                orders = new ChartModel({title: 'Orders'});
            onTestFinished(() => orders.destroy());

            render(
                div(
                    dashboardPanel(chartOrDefault({model: orders}), chartOrDefault()),
                    chartOrDefault()
                )
            );

            // From context, the chart model held by the published DashboardModel.
            expect(texts('.chart')).toEqual(['Orders', 'Positions', 'Chart']);
        });

        it('destroys a model it creates from modelConfig, but not one passed in props', () => {
            const passed = new ChartModel({title: 'Orders'}),
                createdRef = createRef<ChartModel>();
            onTestFinished(() => passed.destroy());

            const {unmount} = render(
                div(
                    chartView({model: passed}),
                    chartView({modelConfig: {title: 'Trades'}, modelRef: createdRef})
                )
            );
            const created = createdRef.current;
            expect(texts('.chart')).toEqual(['Orders', 'Trades']);

            unmount();
            expect(created.isDestroyed).toBe(true);
            expect(passed.isDestroyed).toBe(false);
        });

        it('hides a model published in limited mode from wildcard lookups', () => {
            // Panel and other containers publish their own models this way, so the views they
            // wrap still find the app model they belong to.
            const frame = hoistCmp.factory<FrameModel>({
                    model: uses(FrameModel, {
                        fromContext: false,
                        publishMode: 'limited',
                        createDefault: true
                    }),
                    render: ({children}) => div({items: children})
                }),
                frameTitle = hoistCmp.factory<FrameModel>({
                    model: uses(FrameModel),
                    render: ({model}) => span({className: 'frame', item: model.title})
                });

            render(dashboardPanel(frame(dashboardTitle(), frameTitle())));

            expect(texts('.title')).toEqual(['Dashboard']);
            expect(texts('.frame')).toEqual(['Frame']);
        });

        it('re-resolves its model when an observable reference in context changes', () => {
            // E.g. a grid() rebinding when its app model swaps in a new GridModel.
            const optionalChart = hoistCmp.factory<ChartModel>({
                    model: uses(ChartModel, {optional: true}),
                    render: ({model}) => span({className: 'chart', item: model?.title ?? 'None'})
                }),
                report = new ReportModel(),
                positions = new ChartModel({title: 'Positions'}),
                orders = new ChartModel({title: 'Orders'});
            onTestFinished(() => XH.safeDestroy(report, positions, orders));

            render(container({model: report, item: optionalChart()}));
            expect(texts('.chart')).toEqual(['None']);

            act(() => {
                report.chartModel = positions;
            });
            expect(texts('.chart')).toEqual(['Positions']);

            act(() => {
                report.chartModel = orders;
            });
            expect(texts('.chart')).toEqual(['Orders']);
        });

        it('remounts its content when given a different model', () => {
            // Views such as Grid keep local state bound to the model they render, which must not
            // carry over to the next one.
            const chartHeader = hoistCmp.factory<ChartModel>({
                    model: uses(ChartModel),
                    render({model}) {
                        const [initialTitle] = useState(model.title);
                        return span({className: 'chart', item: initialTitle});
                    }
                }),
                positions = new ChartModel({title: 'Positions'}),
                orders = new ChartModel({title: 'Orders'});
            onTestFinished(() => XH.safeDestroy(positions, orders));

            const {rerender} = render(chartHeader({model: positions}));
            rerender(chartHeader({model: orders}));

            expect(texts('.chart')).toEqual(['Orders']);
        });
    });

    describe('observer', () => {
        it('re-renders when observable state read during render changes', () => {
            const chart = new ChartModel({title: 'Positions'});
            onTestFinished(() => chart.destroy());
            render(chartView({model: chart}));

            act(() => {
                chart.title = 'Orders';
            });

            expect(texts('.chart')).toEqual(['Orders']);
        });
    });
});

//------------------
// Helpers
//------------------
interface ChartConfig {
    title?: string;
}

class ChartModel extends HoistModel {
    declare config: ChartConfig;
    @bindable accessor title: string;

    constructor({title = 'Chart'}: ChartConfig = {}) {
        super();
        this.title = title;
    }
}

class DashboardModel extends HoistModel {
    @bindable accessor title = 'Dashboard';
    @managed chartModel = new ChartModel({title: 'Positions'});
}

class FrameModel extends HoistModel {
    title = 'Frame';
}

class ReportModel extends HoistModel {
    @bindableRef accessor chartModel: ChartModel = null;
}

interface CardProps extends HoistProps {
    title?: string;
}

const card = hoistCmp.factory<CardProps>({
    model: false,
    className: 'test-card',
    render: ({title, className, children}) => div({title, className, items: children})
});

const tagList = hoistCmp.factory<HoistProps & {items: string[]}>({
    model: false,
    render: ({items}) => div(items.map(it => span({key: it, className: 'test-tag', item: it})))
});

const textField = hoistCmp.factory<HoistProps>({
    model: false,
    render: (props, ref) => input({ref})
});

/** Publishes the model passed to it in props to its children. */
const container = hoistCmp.factory({
    render: ({children}) => div({items: children})
});

const dashboardPanel = hoistCmp.factory<DashboardModel>({
    model: creates(DashboardModel),
    render: ({children}) => div({items: children})
});

/** A typical app view, with the default `uses('*')` spec - it renders the nearest model. */
const dashboardTitle = hoistCmp.factory<DashboardModel>(({model}) =>
    span({className: 'title', item: model.title})
);

const chartView = hoistCmp.factory<ChartModel>({
    model: uses(ChartModel),
    render: ({model}) => span({className: 'chart', item: model.title})
});

function texts(selector: string): string[] {
    return Array.from(document.querySelectorAll(selector), it => it.textContent);
}
