/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

import {elemFactory} from 'hoist';
import {
    Button,
    Dialog,
    Icon,
    InputGroup,
    Label,
    MenuItem,
    NumberInput,
    Popover,
    Overlay,
    Spinner,
    Tab,
    Tabs
} from '@blueprintjs/core';
import {Suggest, Select} from '@blueprintjs/select';
export {Classes} from '@blueprintjs/core';

export const button = elemFactory(Button),
    dialog = elemFactory(Dialog),
    icon = elemFactory(Icon),
    inputGroup = elemFactory(InputGroup),
    label = elemFactory(Label),
    menuItem = elemFactory(MenuItem),
    numberInput = elemFactory(NumberInput),
    popover = elemFactory(Popover),
    overlay = elemFactory(Overlay),
    select = elemFactory(Select),
    spinner = elemFactory(Spinner),
    suggest = elemFactory(Suggest),
    tab = elemFactory(Tab),
    tabs = elemFactory(Tabs);