/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import '@xh/hoist/desktop/register';
import classNames from 'classnames';
import './Dock.scss';
import {dockView} from './DockView';
import {DockContainerProps} from '../DockContainer';

/**
 * Desktop implementation of DockContainer.
 *
 * @internal
 */
export function dockContainerImpl(
    {model, className, compactHeaders, ...props}: DockContainerProps,
    ref
) {
    return hbox({
        ref,
        className: classNames(className, `xh-dock-container--${model.direction}`),
        items: model.views.map(viewModel => {
            return dockView({
                key: viewModel.xhId,
                model: viewModel,
                compactHeaders
            });
        }),
        ...props
    });
}
