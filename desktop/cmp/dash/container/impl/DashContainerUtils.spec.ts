/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import type {DashContainerModel} from '@xh/hoist/desktop/cmp/dash';
import type {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {describe, expect, it, vi} from 'vitest';
import {convertGLToState, convertStateToGL} from './DashContainerUtils';

/**
 * Conversion between DashContainer's saved state and GoldenLayout config. The saved state is a
 * user's dashboard, persisted and reloaded across releases, so both directions must keep views,
 * titles, sizes, and container settings intact. GoldenLayout itself is stubbed with plain config.
 */
describe('convertStateToGL', () => {
    it('converts an empty state to a single empty stack', () => {
        expect(convertStateToGL([], dashModel())).toEqual([{type: 'stack'}]);
    });

    it('converts views to components with their spec settings and saved overrides', () => {
        const state = [
            {
                type: 'stack',
                content: [
                    {type: 'view', id: 'chart', viewModelId: 'chart_0'},
                    {
                        type: 'view',
                        id: 'grid',
                        viewModelId: 'grid_0',
                        title: 'Positions',
                        state: {groupBy: 'sector'}
                    }
                ]
            }
        ];

        expect(convertStateToGL(state, dashModel())[0].content).toEqual([
            {
                type: 'react-component',
                component: 'chart',
                viewModelId: 'chart_0',
                title: 'Chart',
                isClosable: true
            },
            {
                type: 'react-component',
                component: 'grid',
                viewModelId: 'grid_0',
                title: 'Positions',
                isClosable: false,
                state: {groupBy: 'sector'}
            }
        ]);
    });

    it('drops views with an unknown spec id', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}),
            state = [{type: 'stack', content: [view('retired'), view('chart')]}];

        expect(convertStateToGL(state, dashModel())[0].content).toMatchObject([
            {component: 'chart'}
        ]);
        expect(warn).toHaveBeenCalled();
    });

    // GoldenLayout sizes items relative to their container. A 1000x500 container is stubbed.
    it('converts pixel sizes to relative sizes within nested rows and columns', () => {
        const state = [
            {
                type: 'row',
                content: [
                    {
                        type: 'column',
                        width: 50,
                        content: [view('chart', {height: '97px'}), view('chart')]
                    },
                    view('grid', {width: '197px'}),
                    view('grid')
                ]
            }
        ];

        const [row] = convertStateToGL(state, dashModel()),
            [column, grid0, grid1] = row.content;

        // Pixel sizes include a 3px border.
        expect([column.width, grid0.width, grid1.width]).toEqual([50, 20, 30]);
        expect(column.content.map(it => it.height)).toEqual([20, 80]);
    });

    // Fixed in 59.2.0 (#3490) - empty containers were pruned even when not removable.
    it('prunes containers left empty only when they are removable', () => {
        const state = [
            {
                type: 'row',
                content: [
                    {type: 'stack', allowRemove: true, content: [view('retired')]},
                    {type: 'stack', allowRemove: false, content: [view('retired')]},
                    {type: 'stack', allowRemove: true, content: [view('chart')]}
                ]
            }
        ];
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const [row] = convertStateToGL(state, dashModel());
        expect(row.content).toMatchObject([
            {type: 'stack', isClosable: false, content: []},
            {type: 'stack', isClosable: true, content: [{component: 'chart'}]}
        ]);
    });

    // Works around GoldenLayout #418, which can export an out-of-bounds activeItemIndex.
    it('clamps an out-of-bounds active item index of a stack to its last item', () => {
        const state = [{type: 'stack', activeItemIndex: 3, content: [view('chart'), view('grid')]}];
        expect(convertStateToGL(state, dashModel())[0].activeItemIndex).toBe(1);
    });
});

describe('convertGLToState', () => {
    it('saves view titles and state only where they differ from the defaults', () => {
        const views = {
                chart_0: {title: 'Chart', viewState: {}},
                chart_1: {title: 'P&L', viewState: {metric: 'pnl'}}
            },
            gl = goldenLayout(
                [
                    {
                        type: 'stack',
                        content: [glView('chart'), glView('chart')],
                        isClosable: true
                    }
                ],
                [{contentItems: [glItem('chart_0'), glItem('chart_1')]}]
            );

        expect(convertGLToState(gl, dashModel(views))[0].content).toEqual([
            {type: 'view', id: 'chart', viewModelId: 'chart_0'},
            {
                type: 'view',
                id: 'chart',
                viewModelId: 'chart_1',
                title: 'P&L',
                state: {metric: 'pnl'}
            }
        ]);
    });

    // Fixed in 59.2.0 (#3490) - allowRemove was dropped on save, making fixed containers closable.
    it('saves container sizes, rounded, along with allowRemove and the active item', () => {
        const views = {chart_0: {title: 'Chart'}, grid_0: {title: 'Grid'}},
            gl = goldenLayout(
                [
                    {
                        type: 'row',
                        isClosable: false,
                        content: [
                            {
                                type: 'stack',
                                width: 33.33333,
                                height: 100,
                                activeItemIndex: 1,
                                isClosable: true,
                                content: [glView('chart'), glView('grid')]
                            }
                        ]
                    }
                ],
                [{contentItems: [{contentItems: [glItem('chart_0'), glItem('grid_0')]}]}]
            );

        expect(convertGLToState(gl, dashModel(views))).toEqual([
            {
                type: 'row',
                allowRemove: false,
                content: [
                    {
                        type: 'stack',
                        allowRemove: true,
                        width: 33.33,
                        height: 100,
                        activeItemIndex: 1,
                        content: [
                            {type: 'view', id: 'chart', viewModelId: 'chart_0'},
                            {type: 'view', id: 'grid', viewModelId: 'grid_0'}
                        ]
                    }
                ]
            }
        ]);
    });
});

//------------------
// Test support
//------------------
const VIEW_SPECS = [
    {id: 'chart', title: 'Chart', allowRemove: true},
    {id: 'grid', title: 'Grid', allowRemove: false}
];

/** A DashContainerModel stub, with a 1000x500 container and the given view models by id. */
function dashModel(viewModels: Record<string, PlainObject> = {}): DashContainerModel {
    return {
        viewSpecs: VIEW_SPECS,
        containerRef: {current: {offsetWidth: 1000, offsetHeight: 500}},
        getViewSpec: (id: string) => VIEW_SPECS.find(it => it.id === id),
        getViewModel: (id: string) => viewModels[id]
    } as unknown as DashContainerModel;
}

function view(id: string, props: PlainObject = {}): PlainObject {
    return {type: 'view', id, ...props};
}

/** A GoldenLayout stub, exporting the given config over the given rendered content items. */
function goldenLayout(content: PlainObject[], contentItems: PlainObject[]): GoldenLayout {
    return {toConfig: () => ({content}), root: {contentItems}} as unknown as GoldenLayout;
}

/** A component as GoldenLayout exports it to config. */
function glView(viewSpecId: string): PlainObject {
    return {type: 'component', component: viewSpecId};
}

/** A rendered GoldenLayout component, hosting the view with the given view model id. */
function glItem(viewModelId: string): PlainObject {
    return {
        isInitialised: true,
        isComponent: true,
        instance: {_reactComponent: {props: {viewModelId}}}
    };
}
