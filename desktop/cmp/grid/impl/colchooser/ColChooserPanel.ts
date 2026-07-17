/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {ColChooserPanelModel} from './ColChooserPanelModel';
import {columnChooser} from './ColumnChooser';

/**
 * Docked, non-modal side-panel column chooser, rendered alongside the grid. Returns a fragment that
 * pairs the resizable, header-less chooser dock (shown only while open) with a persistent grid-edge
 * toggle rail, ordered by dock side. The rail is dropped when `showRail` is false - e.g. when the
 * app drives open/close from its own control (a `ColChooserButton` with `target: 'panel'`, or
 * `GridModel.showColChooserPanel()`). Desktop only - Grid mounts this within an `hframe` when a
 * {@link ColChooserPanelModel} is configured.
 * @internal
 */
export const colChooserPanel = hoistCmp.factory({
    displayName: 'ColChooserPanel',
    model: uses(ColChooserPanelModel),

    render({model}) {
        const dock = model.isOpen
            ? panel({
                  className: 'xh-col-chooser-panel',
                  model: model.panelModel,
                  item: columnChooser({model})
              })
            : null;
        const rail = model.showRail ? colChooserRail({model}) : null;
        return model.side === 'left' ? fragment(rail, dock) : fragment(dock, rail);
    }
});

/**
 * Persistent, compact vertical toggle rail docked at the grid's edge - the open/close affordance for
 * the chooser dock. Reads as grid chrome, so future grid-tool toggles (e.g. Filters, Styling) can
 * slot in here as additional buttons.
 */
const colChooserRail = hoistCmp.factory({
    displayName: 'ColChooserRail',
    model: uses(ColChooserPanelModel),
    className: 'xh-column-chooser__rail',

    render({model, className}) {
        return toolbar({
            className: classNames(className, `xh-column-chooser__rail--${model.side}`),
            vertical: true,
            compact: true,
            items: [
                button({
                    className: classNames('xh-column-chooser__rail__btn', {
                        'xh-column-chooser__rail__btn--closed': !model.isOpen
                    }),
                    icon: Icon.gridPanel(),
                    text: 'Columns',
                    tooltip: 'Toggle column chooser',
                    onClick: () => model.toggle()
                })
            ]
        });
    }
});
