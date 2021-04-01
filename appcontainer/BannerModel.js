/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';

/**
 * Model for a single instance of a banner. Immutable.
 * @private
 */
export class BannerModel extends HoistModel {

    // Immutable public properties
    category;
    icon;
    message;
    intent;
    className;
    enableClose;
    onClose;
    actionFn;
    actionButtonProps;
    props;

    constructor({
        category = 'default',
        icon,
        message,
        intent = 'primary',
        className,
        enableClose = true,
        onClose,
        actionFn,
        actionButtonProps,
        ...props
    }) {
        super();

        this.category = category;
        this.icon = icon;
        this.message = message;
        this.intent = intent;
        this.className = className;
        this.enableClose = enableClose;
        this.actionFn = actionFn;
        this.actionButtonProps = actionButtonProps;
        this.props = props;
    }
}
