/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ElementFactory, elementFactory, HoistModel} from '@xh/hoist/core';
import onsen from 'onsenui';
import 'onsenui/css/onsen-css-components.css';
import 'onsenui/css/onsenui.css';
import {createElement, forwardRef, FunctionComponent, useLayoutEffect, useRef} from 'react';
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
export const [dialog, Dialog] = wrappedOverlayCmp(ons.Dialog),
    [listItem, ListItem] = wrappedCmp(ons.ListItem),
    [page, Page] = wrappedCmp(ons.Page),
    [tab, Tab] = wrappedCmp(ons.Tab),
    [tabbar, Tabbar] = wrappedCmp(ons.Tabbar),
    [toast, Toast] = wrappedOverlayCmp(ons.Toast),
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

// Onsen's deprecated boolean prop aliases - react-onsenui remaps these to the real custom-element
// property names before assigning. We replicate it here since we bypass that step for booleans.
const ONSEN_BOOL_ALIASES = {isOpen: 'visible', isCancelable: 'cancelable', isDisabled: 'disabled'};

/**
 * Variant of {@link wrappedCmp} for Onsen overlay components (Dialog, Toast).
 *
 * react-onsenui encodes boolean props (e.g. `visible`) as `''`, which React 19 assigns as a falsy
 * *property* on the custom element rather than a truthy *attribute* (as in React <=18), leaving
 * overlays hidden. We strip booleans and apply them imperatively as real booleans via a ref.
 */
function wrappedOverlayCmp(rawCmp): [ElementFactory, FunctionComponent] {
    const cmp = forwardRef((props, ref) => {
        const elemRef = useRef(null),
            safeProps = omitBy(props, it => it instanceof HoistModel),
            boolProps = {};

        for (const key of Object.keys(safeProps)) {
            if (typeof safeProps[key] === 'boolean') {
                boolProps[ONSEN_BOOL_ALIASES[key] ?? key] = safeProps[key];
                delete safeProps[key];
            }
        }

        useLayoutEffect(() => {
            const el = elemRef.current;
            if (!el) return;
            Object.assign(el, boolProps);
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
        });

        // Pass an object ref - react-onsenui reads `ref.current` internally.
        safeProps.ref = elemRef;
        return createElement(rawCmp, safeProps);
    });
    return [elementFactory(cmp), cmp];
}
