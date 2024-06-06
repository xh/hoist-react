/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {DataViewModel} from '@xh/hoist/cmp/dataview';
import {GridModel} from '@xh/hoist/cmp/grid';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {errorIf} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export interface PrintGridButtonProps extends ButtonProps {
    gridModel?: GridModel | ZoneGridModel | DataViewModel;
}

/**
 * Convenience Button preconfigured for use as a trigger for printing data/content.
 *
 * Must be provided either an onClick handler *or* a printSupport enabled `gridModel`.  The model may be provided
 * in props, or otherwise will be looked up from context.
 *
 * If a model is provided, this button will call print() on the model class,
 * and it requires the `printSupport` config option on the model to be not falsy.
 */
export const [PrintGridButton, printGridButton] = hoistCmp.withFactory<PrintGridButtonProps>({
    displayName: 'PrintGridButton',
    model: false,

    render({icon = Icon.print(), title = 'Print Grid', onClick, gridModel, ...rest}, ref) {
        if (!onClick) {
            gridModel =
                gridModel ??
                useContextModel(model => {
                    return (
                        model instanceof GridModel ||
                        model instanceof ZoneGridModel ||
                        model instanceof DataViewModel
                    );
                });

            errorIf(
                !gridModel,
                'PrintGridButton must be bound to GridModel, ZoneGridModel, or DataViewModel, otherwise printing will not work.'
            );
            onClick = () => gridModel.print();
        }

        return button({
            icon,
            title,
            onClick,
            ref,
            ...rest
        });
    }
});

export interface PrintPanelButtonProps extends ButtonProps {
    panelModel?: PanelModel;
}

/**
 * Convenience Button preconfigured for use as a trigger for printing content.
 *
 * Must be provided either an onClick handler *or* a printSupport enabled `panelModel`.  The model may be provided
 * in props, or otherwise will be looked up from context.
 *
 * If a model is provided, this button will call print() on the model class,
 * and it requires the `printSupport` config option on the model to be not falsy.
 */
export const [PrintPanelButton, printPanelButton] = hoistCmp.withFactory<PrintPanelButtonProps>({
    displayName: 'PrintPanelButton',
    model: false,

    render(
        {icon = Icon.print(), title = 'Print Panel Content', onClick, panelModel, ...rest},
        ref
    ) {
        if (!onClick) {
            panelModel = panelModel ?? useContextModel(model => model instanceof PanelModel);

            errorIf(
                !panelModel,
                'PrintPanelButton must be bound to a PanelModel, otherwise printing will not work.'
            );
            onClick = () => panelModel.print();
        }

        return button({
            icon,
            title,
            onClick,
            ref,
            ...rest
        });
    }
});
