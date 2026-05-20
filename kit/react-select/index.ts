/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {ComponentType} from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import AsyncCreatable from 'react-select/async-creatable';
import Creatable from 'react-select/creatable';
import WindowedSelect from 'react-windowed-select';

export {Select, AsyncSelect, AsyncCreatable, Creatable, WindowedSelect};

// v5 of react-select is generic over Option/IsMulti/Group. Cast to ComponentType to keep our
// element factories ergonomic and produce portable type declarations.
export const reactSelect = elementFactory(Select as ComponentType),
    reactCreatableSelect = elementFactory(Creatable as ComponentType),
    reactAsyncSelect = elementFactory(AsyncSelect as ComponentType),
    reactAsyncCreatableSelect = elementFactory(AsyncCreatable as ComponentType),
    reactWindowedSelect = elementFactory(WindowedSelect as ComponentType);
