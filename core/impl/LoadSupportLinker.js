/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from '@xh/hoist/core';
import {RefreshContext} from '../refresh/RefreshContext';

/**
 *
 * This class will serve to wrap the contents of a HoistComponent that
 * has an owned model with LoadSupport.  It provides the neccessary linkage
 * to register the model with the appropriate RefreshContextModel.
 *
 * @private
 */
export class LoadSupportLinker extends Component {

    static contextType = RefreshContext;

    render() {
        return this.props.renderFn();
    }

    componentDidMount() {
        const {context} = this,
            {model} = this.props;

        if (context && model) context.register(model);

        if (model) model.loadAsync();
    }

    componentWillUnmount() {
        const {context} = this,
            {model} = this.props;

        if (context && model) context.unregister(model);
    }
}
export const loadSupportLinker = elemFactory(LoadSupportLinker);