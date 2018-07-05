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

    /**
     * Component or element of interest.
     *
     * Will be set to a reference when the associated component is mounted and
     * back to null when it is is unmounted.
     */
    @observable
    value = null;

    /**
     * Callback for React's 'ref' property.
     *
     * Used to wire-up a component to this object.  Set the 'ref' property for
     * the component to this property.
     */
    @action
    ref = (v) => this.value = v;
}