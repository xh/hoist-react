/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action} from '@xh/hoist/mobx';

/**
 * Shorthand object for creating an observable ref.
 *
 * This allows easy re-rendering/monitoring of a child element.
 */

export class Ref {

    @observable
    value = null;

    @action
    ref = (v) => this.value = v;
}