/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

/**
 * Dialog Body for Blueprint, wrapped as HoistComponent.
 */
@HoistComponent()
export class DialogBody extends Component {
    baseClassName = 'bp3-dialog-body';
    render() {
        return div({...this.props, className: this.getClassName()});
    }
}

/**
 * Dialog Footer for Blueprint, wrapped as HoistComponent.
 */
@HoistComponent()
export class DialogFooter extends Component {
    baseClassName = 'bp3-dialog-footer';
    render() {
        return div({...this.props, className: this.getClassName()});
    }
}

/**
 * Dialog Footer for Blueprint, wrapped as HoistComponent.
 */
@HoistComponent()
export class DialogFooterActions extends Component {
    baseClassName = 'bp3-dialog-footer-actions';
    render() {
        return div({...this.props, className: this.getClassName()});
    }
}

export const dialogBody = elemFactory(DialogBody);
export const dialogFooter = elemFactory(DialogFooter);
export const dialogFooterActions = elemFactory(DialogFooterActions);
