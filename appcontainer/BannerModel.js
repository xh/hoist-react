/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
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
    onClick;
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
        onClick,
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
        this.onClose = onClose;
        this.onClick = onClick;
        this.actionButtonProps = actionButtonProps;
        this.props = props;
    }
}
