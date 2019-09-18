/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {span} from '@xh/hoist/cmp/layout';
import {elemFactory} from '@xh/hoist/core';
import {hotkey, hotkeys, HotkeysTarget} from '@xh/hoist/kit/blueprint';
import {isReactElement} from '@xh/hoist/utils/react';
import {isPlainObject} from 'lodash';
import PT from 'prop-types';
import React, {Component} from 'react';

/**
 * Component supporting Keypress support for its contents.
 *
 * See also Panel's 'hotkeys' prop, which will delegate to this component and offers the most
 * convenient interface for many application use cases.
 *
 * The implementation of this component is based on BlueprintJS.
 * See their docs {@link https://blueprintjs.com/docs/#core/components/hotkeys} for more info.
 */
export const HotkeysHost = HotkeysTarget(
    class extends Component {
        render() {
            const {children} = this.props;
            return children ? React.Children.only(children) : span();
        }

        renderHotkeys() {
            let spec = this.props.hotkeys;
            if (!spec) return null;
            if (isReactElement(spec)) return spec;

            return hotkeys(
                spec.map(it => isPlainObject(it) ? hotkey(it) : it)
            );
        }
    }
);
HotkeysHost.propTypes = {
    /**
     * An array of hotkeys, or configs for hotkeys, as prescribed by blueprint.
     * A value of null will result in no keys being registered.
     */
    hotkeys: PT.oneOfType([PT.func, PT.array, PT.node])
};
export const hotkeysHost = elemFactory(HotkeysHost);

