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
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import AsyncSelect from 'react-select/async';
import AsyncCreatable from 'react-select/async-creatable';

const WindowedAsyncSelect = makeAsyncSelect(WindowedSelect);
const WindowedCreatableSelect = makeCreatableSelect(WindowedSelect);
const WindowedAsyncCreatable = makeAsyncSelect(WindowedCreatableSelect);

export {
    Select,
    AsyncSelect,
    AsyncCreatable,
    CreatableSelect,
    WindowedSelect,
    WindowedAsyncSelect,
    WindowedCreatableSelect,
    WindowedAsyncCreatable
};

export const
    reactSelect = elemFactory(Select),
    reactCreatableSelect = elemFactory(CreatableSelect),
    reactAsyncSelect = elemFactory(AsyncSelect),
    reactAsyncCreatableSelect = elemFactory(AsyncCreatable),
    reactWindowedSelect = elemFactory(WindowedSelect),
    reactWindowedCreatableSelect = elemFactory(WindowedCreatableSelect),
    reactWindowedAsyncSelect = elemFactory(WindowedAsyncSelect),
    reactWindowedAsyncCreatableSelect = elemFactory(WindowedAsyncCreatable);
