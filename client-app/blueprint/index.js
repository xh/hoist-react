/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import '@blueprintjs/core/dist/blueprint.css';

import {elemFactory} from 'hoist/hyperscript';
import {Button, Dialog, Icon, MenuItem, Overlay, Spinner, Tab2, Tabs2} from '@blueprintjs/core';
import {Select, Suggest, Popover2} from '@blueprintjs/labs';

export {Classes} from '@blueprintjs/core';

export const
    button = elemFactory(Button),
    dialog = elemFactory(Dialog),
    icon = elemFactory(Icon),
    menuItem = elemFactory(MenuItem),
    overlay = elemFactory(Overlay),
    popover2 = elemFactory(Popover2),
    select = elemFactory(Select),
    spinner = elemFactory(Spinner),
    suggest = elemFactory(Suggest),
    tab2 = elemFactory(Tab2),
    tabs2 = elemFactory(Tabs2);
    

