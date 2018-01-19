/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import {XH} from 'hoist';
import {observer, observable, action, toJS} from 'hoist/mobx';

import {adminTab} from '../AdminTab';


@adminTab('Readme')
@observer
export class ReadmePanel extends Component {

    @observable rows = null;
    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return <h2>Readme Here</h2>;
    }

    @action
    loadAsync() {
    }

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
        this.lastLoaded = Date.now();
        this.isLoading = false;
    }
}
