/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {h2} from 'hoist/layout';

@observer
export class MonitorEditorPanel extends Component {

    render() {
        return h2('Monitor Editor Here');
    }
}
