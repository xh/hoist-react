/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {StandardElementFactory, createElement, normalizeArgs, ContainerElementFactory, ElementSpec} from '@xh/hoist/core';
import ons from 'onsenui';
import 'onsenui/css/onsen-css-components.css';
import 'onsenui/css/onsenui.css';
import {JSXElementConstructor} from 'react';
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


//-----------------
// Leaf Components
//-----------------
export const
    button = onsenElementFactory(Button),
    checkbox = onsenElementFactory(Checkbox),
    gestureDetector = onsenElementFactory(GestureDetector),
    input = onsenElementFactory(Input),
    navigator = onsenElementFactory(Navigator),
    searchInput = onsenElementFactory(SearchInput),
    select = onsenElementFactory(Select),
    switchControl = onsenElementFactory(Switch);


//---------------------
// Container Components
//----------------------
export const
    dialog = onsenContainerElementFactory(Dialog),
    listItem = onsenContainerElementFactory(ListItem),
    page = onsenContainerElementFactory(Page),
    tab = onsenContainerElementFactory(Tab),
    tabbar = onsenContainerElementFactory(Tabbar),
    toast = onsenContainerElementFactory(Toast),
    toolbar = onsenContainerElementFactory(Toolbar),
    bottomToolbar = onsenContainerElementFactory(BottomToolbar);

//-----------------
// Implementation
//-----------------
/**
 * Custom implementations of `elementFactory` and `containerElementFactory`, that strip
 * HoistModel props before passing onto the Onsen component.
 *
 * Onsen component props are internally serialized to JSON. If it receives a HoistModel as a prop,
 * it can easily cause a circular structure error due to the complexity of the model. For example,
 * any HoistModel that implements LoadSupport will create a 'target' reference to itself.
 * Apps can readily introduce other structures incompatible with JSON serialization.
 *
 * There is no reason for an Onsen Component to ever receive a HoistModel prop, so we can safely
 * strip them out here.
 */
function onsenElementFactory<P=any, T extends string|JSXElementConstructor<any>=any>(
    type: T
): StandardElementFactory<P, T> {
    const ret = function(...args) {
        const normalizedArgs = normalizeArgs(args, type, true);
        return createElement<P, T>(type, omitBy(normalizedArgs, it => it?.isHoistModel) as ElementSpec<P>);
    };
    ret.isElementFactory = true;
    return ret;
}

function onsenContainerElementFactory<P=any, T extends string|JSXElementConstructor<any>=any>(
    type: T
): ContainerElementFactory<P, T> {
    const ret = function(...args) {
        const normalizedArgs = normalizeArgs(args, type, false);
        return createElement<P, T>(type, omitBy(normalizedArgs, it => it?.isHoistModel) as ElementSpec<P>);
    };
    ret.isElementFactory = true;
    return ret;
}