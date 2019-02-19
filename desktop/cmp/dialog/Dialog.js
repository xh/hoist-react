/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isArray, omit} from 'lodash';
import PT from 'prop-types';
import {Component} from 'react';

import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {dialog as bpDialog, dialogBody} from '@xh/hoist/kit/blueprint';
import { toolbar } from '@xh/hoist/desktop/cmp/toolbar';

import { DialogModel } from './DialogModel';


/**
 * A wrapper of Blueprint's Dialog component, with:
 *  transition animations turned off by default
 */
@HoistComponent
export class Dialog extends Component {

    static modelClass = DialogModel;

    static propTypes = {

        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(DialogModel), PT.object]),

        /** Primary component model instance. */
        buttonBar: PT.oneOfType([PT.instanceOf(toolbar), PT.array])
    };

    baseClassName = 'xh-dialog';
    
    render() {
        const {props} = this,
            {className, children, model, buttonBar, ...rest} = this.getOverwrittenProps(),
            isAnimated = model.isAnimated;

        return bpDialog({
            className: this.getClassName(),
            isOpen: model.isOpen,
            onClose: (evt) => model.onClose(evt),
            isCloseButtonShown: model.isCloseButtonShown,
            canEscapeKeyClose: model.canEscapeKeyClose,
            transitionDuration: isAnimated ? props.transitionDuration : 0,
            transitionName: isAnimated ? props.transitionName : 'none',

            items: [
                dialogBody(children),
                this.getButtonBar(buttonBar)
            ],
            ...rest
        });
    }

    animationKeys = ['transitionDuration', 'transitionName'];
    closeKeys = ['isCloseButtonShown', 'canEscapeKeyClose', 'onClose'];
    getOverwrittenProps() {
        return omit(this.props, this.animationKeys, 'isOpen', this.closeKeys);
    }

    getButtonBar(buttonBar) {
        if (isArray(buttonBar)) {
            return toolbar(buttonBar);
        } else {
            return buttonBar;
        }
    }
}
export const dialog = elemFactory(Dialog);


