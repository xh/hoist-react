/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {ComponentType} from 'react';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/style.css';

export {DayPicker};
export type {DayPickerProps, Matcher} from 'react-day-picker';

// DayPicker's props are a discriminated union over its selection modes. Cast to ComponentType to
// keep our element factory ergonomic and produce portable type declarations.
export const dayPicker = elementFactory(DayPicker as ComponentType<any>);
