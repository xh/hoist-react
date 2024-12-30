/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {ComponentType} from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import AsyncCreatable from 'react-select/async-creatable';
import Creatable from 'react-select/creatable';
import WindowedSelect from 'react-windowed-select';

export {Select, AsyncSelect, AsyncCreatable, Creatable, WindowedSelect};

export const reactSelect = elementFactory(Select),
    reactCreatableSelect = elementFactory(Creatable),
    reactAsyncSelect = elementFactory(AsyncSelect),
    reactAsyncCreatableSelect = elementFactory(AsyncCreatable),
    reactWindowedSelect = elementFactory(WindowedSelect as ComponentType);
