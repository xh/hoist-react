/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

export function getReactElementName(obj) {
    return obj.type.name || obj.type.displayName;  // Support for class-based and functional cmps, respectively
}