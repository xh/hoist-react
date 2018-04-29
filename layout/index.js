/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {elemFactory} from 'hoist/core';
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
// Convenience Factories
//--------------------------------
export function hspacer(width)  {return spacer({width})}
export function vspacer(height) {return spacer({height})}


//--------------------------------
// React
//--------------------------------
export const fragment = elemFactory(React.Fragment);

//--------------------------------
// Standard HTML
//--------------------------------
export const code = elemFactory('code');
export const div = elemFactory('div');
export const h1 = elemFactory('h1');
export const h2 = elemFactory('h2');
export const h3 = elemFactory('h3');
export const h4 = elemFactory('h4');
export const p = elemFactory('p');
export const nav = elemFactory('nav');
export const pre = elemFactory('pre');
export const span = elemFactory('span');
export const table = elemFactory('table');
export const tbody = elemFactory('tbody');
export const thead = elemFactory('thead');
export const td = elemFactory('td');
export const th = elemFactory('th');
export const tr = elemFactory('tr');
export const ul = elemFactory('ul');
export const ol = elemFactory('ol');
export const li = elemFactory('li');
export const a = elemFactory('a');
