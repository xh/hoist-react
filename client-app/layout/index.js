/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist/hyperscript/index';
import {Box, HBox, VBox, Filler, Spacer} from './Box';

//------------------------------
// Flex box based utilities
//-------------------------------
export const box = elemFactory(Box);
export const hbox = elemFactory(HBox);
export const vbox = elemFactory(VBox);
export const spacer = elemFactory(Spacer);
export const filler = elemFactory(Filler);

//--------------------------------
// Standard HTML
//--------------------------------
export const div = elemFactory('div');
export const span = elemFactory('span');
export const nav = elemFactory('nav');