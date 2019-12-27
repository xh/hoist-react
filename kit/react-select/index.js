/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import Select from 'react-windowed-select';
import AsyncSelect from 'react-windowed-select';
import AsyncCreatable from 'react-windowed-select';
import Creatable from 'react-windowed-select';

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
