/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/layout';
import {message} from '../Message';

/**
 *  Support for hosting multiple global Messages in an application.
 *  Automatically created and installed into the layout by AppContainer.
 *  @private
 */
@HoistComponent()
export class MessageSource extends Component {
    render() {
        const children = this.model.msgModels.map(model => message({model}));
        return children.length ? fragment(...children) : null;
    }
}
export const messageSource = elemFactory(MessageSource);
