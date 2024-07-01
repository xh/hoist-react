/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {Fragment} from 'react';

//--------------------------------
// React
//--------------------------------
export const fragment = elementFactory(Fragment);

//-------------------------
// Leaf HTML Tags
//-------------------------
export const iframe = elementFactory('iframe');
export const img = elementFactory('img');
export const input = elementFactory('input');
export const svg = elementFactory('svg');
export const textarea = elementFactory('textarea');

//--------------------------------
// Container HTML Tags
//--------------------------------

export const a = elementFactory('a');
export const br = elementFactory('br');
export const code = elementFactory('code');
export const div = elementFactory('div');
export const form = elementFactory('form');
export const hr = elementFactory('hr');
export const h1 = elementFactory('h1');
export const h2 = elementFactory('h2');
export const h3 = elementFactory('h3');
export const h4 = elementFactory('h4');
export const label = elementFactory('label');
export const li = elementFactory('li');
export const nav = elementFactory('nav');
export const ol = elementFactory('ol');
export const option = elementFactory('option');
export const p = elementFactory('p');
export const pre = elementFactory('pre');
export const span = elementFactory('span');
export const strong = elementFactory('strong');
export const table = elementFactory('table');
export const tbody = elementFactory('tbody');
export const td = elementFactory('td');
export const th = elementFactory('th');
export const thead = elementFactory('thead');
export const tr = elementFactory('tr');
export const ul = elementFactory('ul');
