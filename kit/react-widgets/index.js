/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {DateTimePicker} from 'react-widgets';
import Moment from 'moment';
import momentLocalizer from 'react-widgets-moment';
import 'react-widgets/dist/css/react-widgets.css';

export {DateTimePicker};
export const dateTimePicker = elemFactory(DateTimePicker);

Moment.locale('en');
momentLocalizer();