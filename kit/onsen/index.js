/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {elem, normalizeArgs} from '@xh/hoist/core';
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
import {omitBy} from 'lodash';
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

/**
 * A custom implementation of elemFactory, that strips HoistModel props before passing onto
 * the Onsen component.
 *
 * Onsen component props are internally serialized to JSON. If it receives a HoistModel as a prop,
 * it can easily cause a circular structure error due to the complexity of the model. For example,
 * any HoistModel that implements LoadSupport will create a 'target' reference to itself.
 * Apps can readily introduce other structures incompatible with JSON serialization.
 *
 * There is no reason for an Onsen Component to ever receive a HoistModel prop, so we can safely
 * strip them out here.
 */
function onsenElemFactory(type) {
    const ret = function(...args) {
        const config = normalizeArgs(args);
        return elem(type, omitBy(config, it => it?.isHoistModel));
    };
    ret.isElemFactory = true;
    return ret;
}

export const
    bottomToolbar = onsenElemFactory(BottomToolbar),
    button = onsenElemFactory(Button),
    checkbox = onsenElemFactory(Checkbox),
    dialog = onsenElemFactory(Dialog),
    gestureDetector = onsenElemFactory(GestureDetector),
    input = onsenElemFactory(Input),
    listItem = onsenElemFactory(ListItem),
    navigator = onsenElemFactory(Navigator),
    page = onsenElemFactory(Page),
    searchInput = onsenElemFactory(SearchInput),
    select = onsenElemFactory(Select),
    switchControl = onsenElemFactory(Switch),
    tab = onsenElemFactory(Tab),
    tabbar = onsenElemFactory(Tabbar),
    toast = onsenElemFactory(Toast),
    toolbar = onsenElemFactory(Toolbar);
