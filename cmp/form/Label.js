/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {div} from 'hoist/layout';

import {HoistField} from './HoistField';
/**
 * A simple label for a form.
 *
 * @prop children, text to display // how do I doc this?
 * @prop style
 * @prop className
 * @prop width, width of field, in pixels
 */
@hoistComponent()
export class Label extends HoistField { // why extend here?
    //
    // static propTypes = {
    //     /** width of field, in pixels */
    //     width: PT.number,
    //     /** height of field, in pixels */
    //     height: PT.number,
    //     /** Whether field should scroll or wrap for long lines. */
    //     lineWrapping: PT.bool
    // };


    delegateProps = ['className'];
    
    render() {
        const {children, style, width} = this.props;
        console.log(this.props); // no item or value prop here???!!??
        console.log(children);
        return div({
            cls: 'pt-label pt-inline',
            style: {...style, whiteSpace: 'nowrap', width},
            items: children, // why?  Why not an items prop? In RestControl this is passed in as value or item, when does this get changed to children?
            ...this.getDelegateProps()
        });
    }
}
export const label = elemFactory(Label);