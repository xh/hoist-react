/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {castArray} from 'lodash';
import {elemFactory, HoistComponent} from 'hoist/core';
import {vframe, vbox} from 'hoist/layout';
import {mask} from 'hoist/cmp';
import {panelHeader} from './impl/PanelHeader';
import {castArray} from 'lodash';


/**
 * A Panel container builds on the lower-level layout components to offer a header element
 * w/standardized styling, title, and Icon as well as support for top and bottom toolbars.
 */
@HoistComponent()
export class Panel extends Component {

    static propTypes = {
        /** A title text added to the panel's header. */
        title: PT.string,
        /** An icon placed at the left-side of the panel's header. */
        icon: PT.element,
        /** Items to be added to the right-side of the panel's header. */
        headerItems: PT.node,
        /** A toolbar to be docked at the top of the panel. */
        tbar: PT.element,
        /** A toolbar to be docked at the bottom of the panel. */
        bbar: PT.element
        /** Whether this panel should be rendered with a mask, use to disable interaction with panel*/
        masked: PT.bool
    };

    baseCls = 'xh-panel';

    render() {
        // Note: Padding is destructured here to be discarded because it breaks layout.
        //       Similarly, isCollapsed must not be rendered as a custom attribute in the DOM.
        const {className, tbar, bbar, title, icon, headerItems, padding, isCollapsed, children, ...rest} = this.props,
            wrapper = this.props.width || this.props.height ? vbox : vframe;

        return wrapper({
            cls: className ? `${this.baseCls} ${className}` : this.baseCls,
            ...rest,
            items: [
                panelHeader({title, icon, headerItems}),
                tbar || null,
                ...(castArray(children)),
                bbar || null,
                mask({isDisplayed: masked})
            ]
        });
    }
}
export const panel = elemFactory(Panel);
