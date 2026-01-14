/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {li, ul} from '@xh/hoist/cmp/layout';
import {collapsibleSet} from '@xh/hoist/cmp/layout/CollapsibleSet';
import {
    creates,
    hoistCmp,
    HoistProps,
    Intent,
    type LayoutProps,
    type TestSupportProps,
    useContextModel
} from '@xh/hoist/core';
import {ValidationSeverity} from '@xh/hoist/data';
import {FieldSetModel} from '@xh/hoist/desktop/cmp/form/fieldset/FieldSetModel';
import {type FieldsetHTMLAttributes, ReactElement, type ReactNode, useEffect} from 'react';
import './FieldSet.scss';

export interface FieldSetProps
    extends
        HoistProps<FieldSetModel>,
        FieldsetHTMLAttributes<HTMLFieldSetElement>,
        TestSupportProps,
        LayoutProps {
    icon?: ReactElement;
    label: ReactNode;
    clickHandler?: () => void;
    collapsed?: boolean;
    hideItemCount?: boolean;
}

export const [FieldSet, fieldSet] = hoistCmp.withFactory<FieldSetProps>({
    displayName: 'FieldSet',
    model: creates(FieldSetModel, {publishMode: 'limited'}),
    render({model, ...props}) {
        // Handle nested FieldSets
        const fieldSetModel = useContextModel(FieldSetModel);
        useEffect(() => {
            if (fieldSetModel) {
                fieldSetModel.addFieldSetModel(model);
                return () => fieldSetModel.removeFieldSetModel(model);
            }
        }, [fieldSetModel, model]);

        const {displayedSeverity, displayedValidationMessages} = model;

        // Construct tooltip if there are validation messages to show
        let tooltip: ReactElement | string;
        if (displayedSeverity) {
            tooltip =
                displayedValidationMessages.length === 1
                    ? displayedValidationMessages[0]
                    : ul({
                          className: 'xh-field-set-tooltip',
                          items: displayedValidationMessages.map((it, idx) =>
                              li({key: idx, item: it})
                          )
                      });
        }

        return collapsibleSet({
            intent: intentForSeverity(displayedSeverity),
            renderMode: 'always',
            tooltip,
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
