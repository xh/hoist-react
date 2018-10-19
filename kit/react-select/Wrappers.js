/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {elemFactory} from '@xh/hoist/core';

import Select from 'react-select';
import AsyncSelect from 'react-select/lib/Async';

export {
    Select,
    AsyncSelect
};

export const
    reactSelect = elemFactory(Select),
    reactAsyncSelect = elemFactory(AsyncSelect);
