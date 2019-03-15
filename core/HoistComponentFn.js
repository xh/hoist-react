/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core/elem';
import {observer} from '@xh/hoist/mobx';

/**
 * Create a functional component in Hoist.
 *
 * This function will also apply mobx observer behavior to the new component.
 *
 * @param {Object} spec
 * @param {function} spec.render - function defining the component.  May include hooks.
 * @param {Object} [spec.propTypes] - propTypes definition for this component.
 * @returns {Object[]} - Array containing the Component, and an elemFactory for the Component.
 *
 * @see HoistComponent for a ES6 class-based approach to defining a Component in Hoist
 */
export function hoistComponent({render, propTypes}) {
    const component = observer(render);

    if (propTypes) {
        component.propTypes = propTypes;
    }
    
    return [component, elemFactory(component)];
}


