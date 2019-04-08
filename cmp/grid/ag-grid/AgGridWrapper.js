/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';

import {HoistComponent, elemFactory, LayoutSupport, XH} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';

import {omit, has} from 'lodash';

import {agGridReact, AgGridWrapperModel} from './index';
import './AgGridWrapper.scss';

/**
 * Wrapper for AgGridReact
 */
@HoistComponent
@LayoutSupport
export class AgGridWrapper extends Component {
    baseClassName = 'xh-ag-grid-wrapper';
    modelClass = AgGridWrapperModel;

    render() {
        const layoutProps = this.getLayoutProps(),
            agGridProps = omit(this.getNonLayoutProps(), ['model', 'key']);

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 'auto';
        }

        throwIf(has(agGridProps, 'onGridReady'), 'Cannot override onGridReady! Add a reaction of AgGridWrapperModel.isReady instead!');

        return box({
            className: this.getClassName(XH.darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham'),
            ...layoutProps,
            item: agGridReact({
                ...agGridProps,
                onGridReady: this.model.onGridReady
            })
        });
    }
}

export const agGridWrapper = elemFactory(AgGridWrapper);