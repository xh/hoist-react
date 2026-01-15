/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {li, ul} from '@xh/hoist/cmp/layout';
import {collapsibleSet} from '@xh/hoist/cmp/collapsibleset/CollapsibleSet';
import {
    hoistCmp,
    HoistProps,
    Intent,
    type LayoutProps,
    type TestSupportProps,
    useContextModel,
    uses
} from '@xh/hoist/core';
import {ValidationSeverity} from '@xh/hoist/data';
import {CollapsibleFieldSetModel} from '@xh/hoist/desktop/cmp/form/collapsiblefieldset/CollapsibleFieldSetModel';
import {runInAction} from 'mobx';
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
}

export const [CollapsibleFieldSet, collapsibleFieldSet] =
    hoistCmp.withFactory<CollapsibleFieldSetProps>({
        displayName: 'CollapsibleFieldSet',
        model: uses(CollapsibleFieldSetModel, {
            fromContext: false,
            publishMode: 'limited',
            createDefault: true
        }),
        render({model, ...props}) {
            // Handle nested CollapsibleFieldSets
            const collapsibleFieldSetModel = useContextModel(CollapsibleFieldSetModel);
            useEffect(() => {
                if (collapsibleFieldSetModel) {
                    runInAction(() => {
                        collapsibleFieldSetModel.registerChildCollapsibleFieldSetModel(model);
                        model.parent = collapsibleFieldSetModel;
                    });
                    return () =>
                        runInAction(() => {
                            collapsibleFieldSetModel.unregisterChildCollapsibleFieldSetModel(model);
                            model.parent = null;
                        });
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
                hideItemCount: true,
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
