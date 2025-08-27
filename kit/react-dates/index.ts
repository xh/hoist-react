/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {SingleDatePicker} from 'react-dates';
import 'react-dates/initialize';
import './datepicker.css'; // See comment at top of file - this is a copy of the library's (problematic) CSS

export {SingleDatePicker};

export const singleDatePicker = elementFactory(SingleDatePicker);
