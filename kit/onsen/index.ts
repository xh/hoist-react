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
import {composeRefs} from '@xh/hoist/utils/react';
import {createElement, forwardRef, FunctionComponent, useLayoutEffect, useRef} from 'react';
import * as ons from 'react-onsenui';
import {mapKeys, omitBy, pickBy} from 'lodash';
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
// Onsen's deprecated boolean prop aliases - react-onsenui remaps these to the real custom-element
// property names before assigning. We replicate it here since we bypass that step for booleans.
const ONSEN_BOOL_ALIASES = {isOpen: 'visible', isCancelable: 'cancelable', isDisabled: 'disabled'};

/**
 * Wrapper around ElementFactory that adapts an Onsen component for use within Hoist.
 *
 * Strips HoistModel props before passing them on. Onsen serializes props to JSON internally, and a
 * an Onsen component never needs a HoistModel prop.
 *
 * Applies boolean props imperatively as real booleans via a ref. react-onsenui encodes boolean
 * props as the string `''` (or `null`), which React 19 assigns as a *property* on the underlying
 * custom element rather than as an *attribute* (as React 18 and earlier did). Onsen's boolean property
 * setters treat `''` as falsy, so props such as `checked`, `disabled`, and `visible` silently fail
 * to apply. Setting the real boolean on the element after commit routes through Onsen's own setters.
 */
function wrappedCmp(rawCmp): [ElementFactory, FunctionComponent] {
    const cmp = forwardRef((props, ref) => {
        // 1) Gather the boolean props, accounting for aliased keys.
        // We'll apply these values directly on underlying onsen component after render.
        const elemRef = useRef(null);
        const boolProps = mapKeys(
            pickBy(props, it => typeof it === 'boolean'),
            (_v, key) => ONSEN_BOOL_ALIASES[key] ?? key
        );
        useLayoutEffect(() => {
            if (elemRef.current) Object.assign(elemRef.current, boolProps);
        });

        // 2) Set remaining props on the underlying component, including our ref.
        const childProps = {
            ...omitBy(props, it => it instanceof HoistModel || typeof it === 'boolean'),
            ref: composeRefs(elemRef, ref)
        };
        return createElement(rawCmp, childProps);
    });
    return [elementFactory(cmp), cmp];
}
