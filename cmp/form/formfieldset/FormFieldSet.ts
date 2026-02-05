/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {li, ul} from '@xh/hoist/cmp/layout';
import {card} from '@xh/hoist/cmp/card/Card';
import {
    BoxProps,
    hoistCmp,
    HoistProps,
    Intent,
    type LayoutProps,
    type TestSupportProps,
    useContextModel,
    uses,
    XH
} from '@xh/hoist/core';
import {ValidationSeverity} from '@xh/hoist/data';
import {FormFieldSetModel} from '@xh/hoist/cmp/form/formfieldset/FormFieldSetModel';
import {runInAction} from 'mobx';
import {ReactElement, type ReactNode, useEffect} from 'react';
import './FormFieldSet.scss';

export interface FormFieldSetProps
    extends HoistProps<FormFieldSetModel>, TestSupportProps, LayoutProps {
    /** An icon placed left of the title. */
    icon?: ReactElement;
    /** The title to display. */
    title?: ReactNode;
    /** Additional props to pass to the inner content box. */
    innerBoxProps?: BoxProps;
}

export const [FormFieldSet, formFieldSet] = hoistCmp.withFactory<FormFieldSetProps>({
    displayName: 'FormFieldSet',
    model: uses(FormFieldSetModel, {
        fromContext: false,
        publishMode: 'limited',
        createDefault: true
    }),
    render({model, ...props}) {
        // Handle if nested within another FormFieldSet
        const parentModel = useContextModel(FormFieldSetModel);
        useEffect(() => {
            if (parentModel) {
                runInAction(() => {
                    parentModel.registerChildFormFieldSetModel(model);
                    model.parent = parentModel;
                });
                return () =>
                    runInAction(() => {
                        parentModel.unregisterChildFormFieldSetModel(model);
                        model.parent = null;
                    });
            }
        }, [parentModel, model]);

        const {displayedSeverity, displayedValidationMessages} = model;

        // Construct tooltip if on desktop and there are validation messages to show
        let tooltip: ReactElement | string;
        if (!XH.isMobileApp && displayedSeverity) {
            tooltip =
                displayedValidationMessages.length === 1
                    ? displayedValidationMessages[0]
                    : ul({
                          className: 'xh-form-field-set-tooltip',
                          items: displayedValidationMessages.map((it, idx) =>
                              li({key: idx, item: it})
                          )
                      });
        }

        return card({
            intent: intentForSeverity(displayedSeverity),
            tooltip,
            model,
            ...props
        });
    }
});

function intentForSeverity(severity: ValidationSeverity): Intent {
    switch (severity) {
        case 'error':
            return 'danger';
        case 'warning':
            return 'warning';
        case 'info':
            return 'primary';
        default:
            return null;
    }
}
