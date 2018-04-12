/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {fileColFactory} from './Utils.js';
import {Icon} from 'hoist/icon';

const colFactory = fileColFactory({
    field: null
});

export const baseCol = colFactory();

export const boolCheckCol = colFactory({
    width: 34,
    align: 'center',
    cellRendererFramework: (
        class extends Component {
            render() {return this.props.value ? Icon.check({prefix: 'fas', cls: 'xh-green'}) : ''}
        }
    )
});
