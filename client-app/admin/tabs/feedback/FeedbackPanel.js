/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer, observable, action} from 'hoist/mobx';
import {h2} from 'hoist/layout';


@observer
export class FeedbackPanel extends Component {

    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return h2('Feedback Here');
    }

    @action
    loadAsync() {
    }
}