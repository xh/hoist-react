/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ContainerElementFactory, hoistCmp, containerElementFactory, ElementFactory, elementFactory} from '@xh/hoist/core';
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


//-----------------
// Leaf Components
//-----------------
export const
    button = onsenWrapper(elementFactory(Button)),
    checkbox = onsenWrapper(elementFactory(Checkbox)),
    gestureDetector = onsenWrapper(elementFactory(GestureDetector)),
    input = onsenWrapper(elementFactory(Input)),
    navigator = onsenWrapper(elementFactory(Navigator)),
    searchInput = onsenWrapper(elementFactory(SearchInput)),
    select = onsenWrapper(elementFactory(Select)),
    switchControl = onsenWrapper(elementFactory(Switch));


//---------------------
// Container Components
//----------------------
export const
    dialog = onsenContainerWrapper(containerElementFactory(Dialog)),
    listItem = onsenContainerWrapper(containerElementFactory(ListItem)),
    page = onsenContainerWrapper(containerElementFactory(Page)),
    tab = onsenContainerWrapper(containerElementFactory(Tab)),
    tabbar = onsenContainerWrapper(containerElementFactory(Tabbar)),
    toast = onsenContainerWrapper(containerElementFactory(Toast)),
    toolbar = onsenContainerWrapper(containerElementFactory(Toolbar)),
    bottomToolbar = onsenContainerWrapper(containerElementFactory(BottomToolbar));

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
function onsenWrapper(factory: ElementFactory): ElementFactory {
    return hoistCmp.factory({
        render(props, ref) {
            const safeProps = omitBy(props, it => it?.isHoistModel);
            return factory({...safeProps, ref});
        }
    });
}

function onsenContainerWrapper(factory: ContainerElementFactory): ContainerElementFactory {
    return hoistCmp.containerFactory({
        render(props, ref) {
            const safeProps = omitBy(props, it => it?.isHoistModel);
            return factory({...safeProps, ref});
        }
    });
}