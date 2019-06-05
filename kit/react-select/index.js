/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import Select from 'react-select';
import AsyncSelect from 'react-select/lib/Async';
import AsyncCreatable from 'react-select/lib/AsyncCreatable';
import Creatable from 'react-select/lib/Creatable';

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
