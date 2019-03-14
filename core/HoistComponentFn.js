/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core/elem';
import {observer} from '@xh/hoist/mobx';


/**
 * Create Functional Component in Hoist.
 */
export function hoistComponent(f) {
    const component = observer(f);

    return [component, elemFactory(component)];
}


