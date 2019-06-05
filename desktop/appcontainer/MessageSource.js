/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {message} from './Message';

/**
 *  Support for publishing multiple Messages in the DOM.
 *
 *  @private
 */
@HoistComponent
export class MessageSource extends Component {
    render() {
        const models = this.model.msgModels,
            children = models.map(model => message({model, key: model.xhId}));
        return children.length ? fragment(...children) : null;
    }
}
export const messageSource = elemFactory(MessageSource);
