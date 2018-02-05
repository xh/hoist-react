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
import {Button, Icon, MenuItem, Tab, Tabs, Overlay, Spinner, InputGroup, Popover, Label, Dialog} from '@blueprintjs/core';
import {Suggest, Select} from '@blueprintjs/select';
export {Classes} from '@blueprintjs/core';

export const button = elemFactory(Button),
    select = elemFactory(Select),
    suggest = elemFactory(Suggest),
    icon = elemFactory(Icon),
    popover = elemFactory(Popover),
    menuItem = elemFactory(MenuItem),
    tabs = elemFactory(Tabs),
    tab = elemFactory(Tab),
    overlay = elemFactory(Overlay),
    spinner = elemFactory(Spinner),
    inputGroup = elemFactory(InputGroup),
    label = elemFactory(Label),
    dialog = elemFactory(Dialog);