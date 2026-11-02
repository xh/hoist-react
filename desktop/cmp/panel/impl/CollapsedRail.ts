/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import classNames from 'classnames';
import {PanelModel} from '../PanelModel';
import {collapseToggleIcon} from './CollapseToggleIcon';
import './CollapsedRail.scss';

/**
 * Thin clickable strip shown in place of the header when a collapsed panel has nothing else to
 * show, so the panel stays easy to find and expand.
 * @internal
 */
export const collapsedRail = hoistCmp.factory({
    displayName: 'CollapsedRail',
    model: false,
    className: 'xh-panel-collapsed-rail',

    render({className}) {
        const panelModel = useContextModel(PanelModel);
        return box({
            className: classNames(
                className,
                `xh-panel-collapsed-rail--${panelModel.vertical ? 'ns' : 'ew'}`
            ),
            title: 'Expand',
            item: collapseToggleIcon(panelModel),
            onClick: () => panelModel.toggleCollapsed()
        });
    }
});
