/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import 'onsenui/css/onsenui.css';
import 'onsenui/css/onsen-css-components.css';
import './styles.scss';

import ons from 'onsenui';
ons.disableAutoStyling();

import {elemFactory} from 'hoist/core';
import {
    List,
    ListHeader,
    ListItem,
    Page,
    Toolbar,
    ToolbarButton
} from 'react-onsenui';

export const
    list = elemFactory(List),
    listHeader = elemFactory(ListHeader),
    listItem = elemFactory(ListItem),
    page = elemFactory(Page),
    toolbar = elemFactory(Toolbar),
    toolbarButton = elemFactory(ToolbarButton);