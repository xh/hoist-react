/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import '@blueprintjs/core/dist/blueprint.css';

import {elemFactory} from 'hoist/hyperscript';
import {Button, Icon, MenuItem, Tab2, Tabs2, Overlay, Spinner, InputGroup, Label} from '@blueprintjs/core';
import {Select, Suggest, Popover2} from '@blueprintjs/labs';

export {Classes} from '@blueprintjs/core';

export const button = elemFactory(Button),
    select = elemFactory(Select),
    suggest = elemFactory(Suggest),
    icon = elemFactory(Icon),
    popover2 = elemFactory(Popover2),
    menuItem = elemFactory(MenuItem),
    tabs2 = elemFactory(Tabs2),
    tab2 = elemFactory(Tab2),
    overlay = elemFactory(Overlay),
    spinner = elemFactory(Spinner),
    inputGroup = elemFactory(InputGroup),
    label = elemFactory(Label);
    

