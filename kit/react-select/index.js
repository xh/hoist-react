/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {makeAsyncSelect} from 'react-select/async';
import {makeCreatableSelect} from 'react-select/creatable';
// import manageState from 'react-select/src/stateManager';
import WindowedSelect from 'react-windowed-select';

const Select = WindowedSelect;
const AsyncSelect = (makeAsyncSelect(Select));
const AsyncCreatable = (makeCreatableSelect(AsyncSelect));
const Creatable = (makeCreatableSelect(Select));

export {
    Select,
    AsyncSelect,
    AsyncCreatable,
    Creatable
};

export const
    reactSelect = elemFactory(Select),
    reactCreatableSelect = elemFactory(Creatable),
    reactAsyncSelect = elemFactory(AsyncSelect),
    reactAsyncCreatableSelect = elemFactory(AsyncCreatable);
