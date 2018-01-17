/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */

import {observable, action} from 'mobx';

export class Ref {

    @observable
    value = null;

    @action
    callback = (v) => this.value = v;
}