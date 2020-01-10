/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {makeAsyncSelect} from 'react-select/async';
import {makeCreatableSelect} from 'react-select/creatable';
import WindowedSelect from 'react-windowed-select';

const Select = WindowedSelect;
const AsyncSelect = makeAsyncSelect(Select);
const CreatableSelect = makeCreatableSelect(Select);
const AsyncCreatable = makeAsyncSelect(CreatableSelect);

export {
    Select,
    AsyncSelect,
    AsyncCreatable,
    CreatableSelect
};

export const
    reactSelect = elemFactory(Select),
    reactCreatableSelect = elemFactory(CreatableSelect),
    reactAsyncSelect = elemFactory(AsyncSelect),
    reactAsyncCreatableSelect = elemFactory(AsyncCreatable);
