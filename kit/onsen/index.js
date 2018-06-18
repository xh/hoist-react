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

import {elemFactory} from '@xh/hoist/core';
import {
    BottomToolbar,
    Button,
    List,
    ListHeader,
    ListItem,
    Navigator,
    Page,
    ProgressCircular,
    Toolbar,
    ToolbarButton
} from 'react-onsenui';

export const
    bottomToolbar = elemFactory(BottomToolbar),
    button = elemFactory(Button),
    list = elemFactory(List),
    listHeader = elemFactory(ListHeader),
    listItem = elemFactory(ListItem),
    navigator = elemFactory(Navigator),
    page = elemFactory(Page),
    progressCircular = elemFactory(ProgressCircular),
    toolbar = elemFactory(Toolbar),
    toolbarButton = elemFactory(ToolbarButton);