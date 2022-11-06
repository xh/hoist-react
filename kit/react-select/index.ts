/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import AsyncCreatable from 'react-select/async-creatable';
import Creatable from 'react-select/creatable';
import WindowedSelect from 'react-windowed-select';

export {
    Select,
    AsyncSelect,
    AsyncCreatable,
    Creatable,
    WindowedSelect
};

export const
    reactSelect = elemFactory(Select),
    reactCreatableSelect = elemFactory(Creatable),
    reactAsyncSelect = elemFactory(AsyncSelect),
    reactAsyncCreatableSelect = elemFactory(AsyncCreatable),
    reactWindowedSelect = elemFactory(WindowedSelect);
