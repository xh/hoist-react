/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    ContainerElementFactory,
    containerElementFactory,
    ElementFactory,
    elementFactory,
    HoistModel
} from '@xh/hoist/core';
import onsen from 'onsenui';
import 'onsenui/css/onsen-css-components.css';
import 'onsenui/css/onsenui.css';
import {createElement, forwardRef, FunctionComponent} from 'react';
import {isForwardRef} from 'react-is';
import * as ons from 'react-onsenui';
import {omitBy} from 'lodash';
import './styles.scss';
import './theme.scss';

onsen.disableAutoStyling();

//-----------------
// Leaf Components
//-----------------
export const
    [button, Button] = wrappedCmp(ons.Button),
    [checkbox, Checkbox] = wrappedCmp(ons.Checkbox),
    [gestureDetector, GestureDetector] = wrappedCmp(ons.GestureDetector),
    [input, Input] = wrappedCmp(ons.Input),
    [navigator, Navigator] = wrappedCmp(ons.Navigator),
    [searchInput, SearchInput] = wrappedCmp(ons.SearchInput),
    [select, Select] = wrappedCmp(ons.Select),
    [switchControl, SwitchControl] = wrappedCmp(ons.Switch);

//---------------------
// Container Components
//----------------------
export const
    [dialog, Dialog] = wrappedContainerCmp(ons.Dialog),
    [listItem, ListItem] = wrappedContainerCmp(ons.ListItem),
    [page, Page] = wrappedContainerCmp(ons.Page),
    [tab, Tab] = wrappedContainerCmp(ons.Tab),
    [tabbar, Tabbar] = wrappedContainerCmp(ons.Tabbar),
    [toast, Toast] = wrappedContainerCmp(ons.Toast),
    [toolbar, Toolbar] = wrappedContainerCmp(ons.Toolbar),
    [bottomToolbar, BottomToolbar] = wrappedContainerCmp(ons.BottomToolbar);

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
function safeCmp(rawCmp): FunctionComponent {
    return isForwardRef(rawCmp) ?
        forwardRef((props, ref) => {
            const safeProps = omitBy(props, it => it instanceof HoistModel);
            safeProps.ref = ref;
            return createElement(rawCmp, safeProps);
        }) :
        (props) => {
            const safeProps = omitBy(props, it => it instanceof HoistModel);
            return createElement(rawCmp, safeProps);
        };
}

function wrappedContainerCmp(rawCmp): [ContainerElementFactory, FunctionComponent] {
    const cmp = safeCmp(rawCmp);
    return [containerElementFactory(cmp), cmp];
}

function wrappedCmp(rawCmp): [ElementFactory, FunctionComponent] {
    const cmp = safeCmp(rawCmp);
    return [elementFactory(cmp), cmp];
}