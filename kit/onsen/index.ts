/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ElementFactory, elementFactory, HoistModel} from '@xh/hoist/core';
import onsen from 'onsenui';
import 'onsenui/css/onsen-css-components.css';
import 'onsenui/css/onsenui.css';
import {createElement, forwardRef, FunctionComponent} from 'react';
import * as ons from 'react-onsenui';
import {omitBy} from 'lodash';
import './styles.scss';
import './theme.scss';

onsen.disableAutoStyling();

//-----------------
// Leaf Components
//-----------------
export const [button, Button] = wrappedCmp(ons.Button),
    [checkbox, Checkbox] = wrappedCmp(ons.Checkbox),
    [gestureDetector, GestureDetector] = wrappedCmp(ons.GestureDetector),
    [input, Input] = wrappedCmp(ons.Input),
    [searchInput, SearchInput] = wrappedCmp(ons.SearchInput),
    [select, Select] = wrappedCmp(ons.Select),
    [switchControl, SwitchControl] = wrappedCmp(ons.Switch);

//---------------------
// Container Components
//----------------------
export const [dialog, Dialog] = wrappedCmp(ons.Dialog),
    [listItem, ListItem] = wrappedCmp(ons.ListItem),
    [page, Page] = wrappedCmp(ons.Page),
    [tab, Tab] = wrappedCmp(ons.Tab),
    [tabbar, Tabbar] = wrappedCmp(ons.Tabbar),
    [toast, Toast] = wrappedCmp(ons.Toast),
    [toolbar, Toolbar] = wrappedCmp(ons.Toolbar),
    [bottomToolbar, BottomToolbar] = wrappedCmp(ons.BottomToolbar);

//-----------------
// Implementation
//-----------------
/**
 * Wrappers around ElementFactory and ContainerElementFactory that strip
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
function wrappedCmp(rawCmp): [ElementFactory, FunctionComponent] {
    const cmp = forwardRef((props, ref) => {
        const safeProps = omitBy(props, it => it instanceof HoistModel);
        if (ref) safeProps.ref = ref;
        return createElement(rawCmp, safeProps);
    });
    return [elementFactory(cmp), cmp];
}
