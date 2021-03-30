import composeRefs from '@seznam/compose-react-refs/composeRefs';
import {HoistModel, useLocalModel} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {start} from '@xh/hoist/promise';
import {createObservableRef} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isNil} from 'lodash';
import {useImperativeHandle} from 'react';

import './InlineEditors.scss';

export function useHoistInlineEditorModel(component, props, ref, modelSpec = InlineEditorModel) {
    const {className, inputProps} = props,
        impl = useLocalModel(() => new modelSpec(props));

    useImperativeHandle(ref, () => ({getValue: () => impl.value}));

    return component({
        className: classNames('xh-inline-editor', className),
        width: null,
        model: impl,
        bind: 'value',
        commitOnChange: true,
        ref: composeRefs(ref, impl.ref),
        ...inputProps
    });
}

export class InlineEditorModel extends HoistModel {
    @bindable value;
    ref = createObservableRef();

    /** @returns {HoistInputModel} */
    get inputModel() {
        return this.ref.current;
    }

    get inputEl() {
        return this.inputModel?.inputRef.current;
    }

    constructor({value, charPress}) {
        super();
        makeObservable(this);

        this.value = charPress ?? value;

        const selectOnFocus = isNil(charPress);
        this.addReaction({
            track: () => this.inputEl,
            run: (inputEl) => {
                if (!inputEl) return;

                // Need to wait 1 tick before we can focus
                start(() => {
                    inputEl.focus();
                    if (selectOnFocus) inputEl.select();
                });
            }
        });
    }
}
