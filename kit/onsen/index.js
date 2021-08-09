/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import ons from 'onsenui';
import 'onsenui/css/onsen-css-components.css';
import 'onsenui/css/onsenui.css';
import {
    BottomToolbar,
    Button,
    Checkbox,
    Dialog,
    GestureDetector,
    Input,
    ListItem,
    Navigator,
    Page,
    SearchInput,
    Select,
    Switch,
    Tab,
    Tabbar,
    Toast,
    Toolbar
} from 'react-onsenui';
import './styles.scss';
import './theme.scss';

ons.disableAutoStyling();

export {
    BottomToolbar,
    Button,
    Checkbox,
    Dialog,
    GestureDetector,
    Input,
    ListItem,
    Navigator,
    Page,
    SearchInput,
    Select,
    Switch,
    Tab,
    Tabbar,
    Toast,
    Toolbar
};


export const
    bottomToolbar = elemFactory(BottomToolbar),
    button = elemFactory(Button),
    checkbox = elemFactory(Checkbox),
    dialog = elemFactory(Dialog),
    gestureDetector = elemFactory(GestureDetector),
    input = elemFactory(Input),
    listItem = elemFactory(ListItem),
    navigator = elemFactory(Navigator),
    page = elemFactory(Page),
    searchInput = elemFactory(SearchInput),
    select = elemFactory(Select),
    switchControl = elemFactory(Switch),
    tab = elemFactory(Tab),
    tabbar = elemFactory(Tabbar),
    toast = elemFactory(Toast),
    toolbar = elemFactory(Toolbar);
