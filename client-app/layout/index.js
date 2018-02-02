/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist/hyperscript/index';
import * as Containers from './Containers';

//------------------------------
// Standard container factories
//-------------------------------
export const box = elemFactory(Containers.Box);
export const hbox = elemFactory(Containers.HBox);
export const vbox = elemFactory(Containers.VBox);

export const frame = elemFactory(Containers.Frame);
export const hframe = elemFactory(Containers.HFrame);
export const vframe = elemFactory(Containers.VFrame);

export const viewport = elemFactory(Containers.Viewport);
export const spacer = elemFactory(Containers.Spacer);
export const filler = elemFactory(Containers.Filler);

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

