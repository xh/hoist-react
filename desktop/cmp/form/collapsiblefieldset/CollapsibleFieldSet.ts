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
import {CollapsibleFieldSetModel} from '@xh/hoist/desktop/cmp/form/collapsiblefieldset/CollapsibleFieldSetModel';
import {type FieldsetHTMLAttributes, ReactElement, type ReactNode, useEffect} from 'react';
import './CollapsibleFieldSet.scss';

export interface CollapsibleFieldSetProps
    extends
        HoistProps<CollapsibleFieldSetModel>,
        FieldsetHTMLAttributes<HTMLFieldSetElement>,
        TestSupportProps,
        LayoutProps {
    icon?: ReactElement;
    label: ReactNode;
    clickHandler?: () => void;
    collapsed?: boolean;
    hideItemCount?: boolean;
}

export const [CollapsibleFieldSet, collapsibleFieldSet] =
    hoistCmp.withFactory<CollapsibleFieldSetProps>({
        displayName: 'CollapsibleFieldSet',
        model: creates(CollapsibleFieldSetModel, {publishMode: 'limited'}),
        render({model, ...props}) {
            // Handle nested CollapsibleFieldSets
            const collapsibleFieldSetModel = useContextModel(CollapsibleFieldSetModel);
            useEffect(() => {
                if (collapsibleFieldSetModel) {
                    collapsibleFieldSetModel.addCollapsibleFieldSetModel(model);
                    return () => collapsibleFieldSetModel.removeCollapsibleFieldSetModel(model);
                }
            }, [collapsibleFieldSetModel, model]);

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
