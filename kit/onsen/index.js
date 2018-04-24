/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import 'onsenui/css/onsenui.css';
import 'onsenui/css/dark-onsen-css-components.css';
import './styles.scss';

import {elemFactory} from 'hoist/core';
import {
    List,
    ListItem,
    Page,
    Toolbar
} from 'react-onsenui';

export const
    list = elemFactory(List),
    listItem = elemFactory(ListItem),
    page = elemFactory(Page),
    toolbar = elemFactory(Toolbar);