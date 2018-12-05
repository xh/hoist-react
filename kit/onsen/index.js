/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import 'onsenui/css/onsenui.css';
import 'onsenui/css/onsen-css-components.css';
import './theme.scss';
import './styles.scss';

import ons from 'onsenui';
ons.disableAutoStyling();

import {elemFactory} from '@xh/hoist/core';
import {
    BackButton,
    BottomToolbar,
    Button,
    Card,
    Checkbox,
    Dialog,
    Input,
    List,
    ListHeader,
    ListItem,
    Navigator,
    Page,
    ProgressCircular,
    SearchInput,
    Select,
    Switch,
    Tab,
    Tabbar,
    Toast,
    Toolbar,
    ToolbarButton
} from 'react-onsenui';

export {
    BackButton,
    BottomToolbar,
    Button,
    Card,
    Checkbox,
    Dialog,
    Input,
    List,
    ListHeader,
    ListItem,
    Navigator,
    Page,
    ProgressCircular,
    SearchInput,
    Select,
    Switch,
    Tab,
    Tabbar,
    Toast,
    Toolbar,
    ToolbarButton
};


export const
    backButton = elemFactory(BackButton),
    bottomToolbar = elemFactory(BottomToolbar),
    button = elemFactory(Button),
    card = elemFactory(Card),
    checkbox = elemFactory(Checkbox),
    dialog = elemFactory(Dialog),
    input = elemFactory(Input),
    list = elemFactory(List),
    listHeader = elemFactory(ListHeader),
    listItem = elemFactory(ListItem),
    navigator = elemFactory(Navigator),
    page = elemFactory(Page),
    progressCircular = elemFactory(ProgressCircular),
    searchInput = elemFactory(SearchInput),
    select = elemFactory(Select),
    switchControl = elemFactory(Switch),
    tab = elemFactory(Tab),
    tabbar = elemFactory(Tabbar),
    toast = elemFactory(Toast),
    toolbar = elemFactory(Toolbar),
    toolbarButton = elemFactory(ToolbarButton);