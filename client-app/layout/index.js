/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist/hyperscript/index';
import {Box, HBox, VBox, Filler, Spacer, Viewport} from './Box';

//------------------------------
// Standard container factories
//-------------------------------
export const box = elemFactory(Box);
export const hbox = elemFactory(HBox);
export const vbox = elemFactory(VBox);
export const spacer = elemFactory(Spacer);
export const filler = elemFactory(Filler);
export const viewport = elemFactory(Viewport);

//--------------------------------
// Standard HTML
//--------------------------------
export const div = elemFactory('div');
export const span = elemFactory('span');
export const nav = elemFactory('nav');
export const h1 = elemFactory('h1');
export const h2 = elemFactory('h2');
export const table = elemFactory('table');
export const tbody = elemFactory('tbody');
export const tr = elemFactory('tr');
export const td = elemFactory('td');
export const th = elemFactory('th');

