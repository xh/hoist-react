/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from 'hoist/core';

/**
 * Box is just a very thin wrapper around a div with 'flex' layout.
 *
 * It essentially just promotes flexbox layout related properties in
 * the 'style' property to be top-level properties for convenience.
 *
 * Box also
 *  + Allows use of raw numbers for pixel values of dimensions,
 *  + Allows flex, flexGrow, and flexShrink to be specified as integers.
 *
 * See also VBox, HBox. 
 */

@HoistComponent()
export class Box extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv( ...rest);
    }
}

@HoistComponent()
export class VBox extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flexDirection: 'column'});
    }

}

@HoistComponent()
export class HBox extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flexDirection: 'row'});
    }
}

/**
 * A Box class that flexes to grow and stretch within its *own* parent.
 *
 * This class is useful for creating nested layouts.  See also VFrame, and HFrame.
 */
@HoistComponent()
export class Frame extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto'});
    }
}

@HoistComponent()
export class VFrame extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto', flexDirection: 'column'});
    }
}

@HoistComponent()
export class HFrame extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto', flexDirection: 'row'});
    }
}

/**
 * A component useful for inserting fixed spacing along the main axis of its
 * parent container.
 */
@HoistComponent()
export class Spacer extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'none'});
    }
}

/**
 * A component useful for stretching to soak up space along the main axis of its
 * parent container.
 */
@HoistComponent()
export class Filler extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {flex: 'auto'});
    }
}

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser
 */
@HoistComponent()
export class Viewport extends Component {
    render() {
        const {isCollapsed, ...rest} = this.props;
        return createDiv(...rest, {
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            position: 'fixed'
        });
    }
}

//-----------------------
// Implementation
//-----------------------
const div = elemFactory('div');

function createDiv(appProps, defaultProps = {}) {
    const props = Object.assign(
        {display: 'flex', overflow: 'hidden', position: 'relative'},
        defaultProps,
        appProps
    );

    return div(props);
}