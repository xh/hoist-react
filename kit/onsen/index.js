/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import ons from '@xh/onsenui';
import '@xh/onsenui/css/onsen-css-components.css';
import '@xh/onsenui/css/onsenui.css';
import {
    BottomToolbar,
    Button,
    Checkbox,
    Dialog,
    Input,
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
    Toolbar
} from '@xh/react-onsenui';
import './styles.scss';
import './theme.scss';

ons.disableAutoStyling();

export {
    BottomToolbar,
    Button,
    Checkbox,
    Dialog,
    Input,
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
    Toolbar
};


export const
    bottomToolbar = elemFactory(BottomToolbar),
    button = elemFactory(Button),
    checkbox = elemFactory(Checkbox),
    dialog = elemFactory(Dialog),
    input = elemFactory(Input),
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
    toolbar = elemFactory(Toolbar);