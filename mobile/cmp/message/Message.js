/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';

/**
 * A modal dialog that supports imperative alert/confirm.
 *
 * @see MessageModel for supported configuration options - and an important note on built-in support
 * for showing one-off messages via convenience methods on XH (vs. needing to instantiate this
 * component directly).
 */
@HoistComponent()
class Message extends Component {

    render() {
        return null
    }
}
export const message = elemFactory(Message);
