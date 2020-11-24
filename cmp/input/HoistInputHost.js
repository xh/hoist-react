/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useLocalModel} from '@xh/hoist/core';
import composeRefs from '@seznam/compose-react-refs';
import {runInAction} from '@xh/hoist/mobx';

import './HoistInput.scss';

/**
 * @private
 *
 * Inner container for HoistInputs.
 *
 * Puts and maintains appropriate HoistInputModel in to context.
 * Renders content component in that context.
 */
export const hoistInputHost = hoistCmp.factory({
    displayName: 'HoistInputHost',

    render({modelSpec, cmpSpec, ...props}, ref) {
        const inputModel = useLocalModel(() => new modelSpec(props));
        runInAction(() => {
            inputModel.props = props;
        });
        ref = composeRefs(ref, inputModel.ref);

        return cmpSpec({...props, ref, model: inputModel});
    }
});