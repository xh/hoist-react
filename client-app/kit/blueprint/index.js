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
    NumericInput,
    Overlay,
    Popover,
    Spinner,
    Tab,
    Tabs,
    TextArea
} from '@blueprintjs/core';
import {Suggest, Select} from '@blueprintjs/select';
export {Classes} from '@blueprintjs/core';

export const button = elemFactory(Button),
    dialog = elemFactory(Dialog),
    icon = elemFactory(Icon),
    inputGroup = elemFactory(InputGroup),
    label = elemFactory(Label),
    menuItem = elemFactory(MenuItem),
    numericInput = elemFactory(NumericInput),
    overlay = elemFactory(Overlay),
    popover = elemFactory(Popover),
    select = elemFactory(Select),
    suggest = elemFactory(Suggest),
    spinner = elemFactory(Spinner),
    tabs = elemFactory(Tabs),
    tab = elemFactory(Tab),
    textArea = elemFactory(TextArea);