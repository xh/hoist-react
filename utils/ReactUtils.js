/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

export function isReactElement(obj) {
    return obj.$$typeof;
}

export function hocDisplayName(name, wrappedComponent) {
    return `${name}(${wrappedComponent.displayName || wrappedComponent.name || 'Anon'})`;
}