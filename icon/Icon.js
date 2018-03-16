/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist/core';

import fontawesome from '@fortawesome/fontawesome';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import solid from '@fortawesome/fontawesome-pro-solid';

// TODO - check if this is necessary and what exactly it does...
fontawesome.library.add(solid);

/**
 * Singleton class to provide factories for enumerated icons, each returning a FontAwesome SVG element.
 *
 * Currently importing the licensed "pro" library with additional icons - note this requires fetching
 * the FA npm package via a registry URL w/license token. See https://fontawesome.com/pro#license.
 */
export const Icon = {
    add(p)           {return fa(p, 'plus-circle')},
    addressCard(p)   {return fa(p, 'address-card')},
    angleLeft(p)     {return fa(p, 'angle-left')},
    angleRight(p)    {return fa(p, 'angle-right')},
    arrowToRight(p)  {return fa(p, 'arrow-to-right')},
    arrowUp(p)       {return fa(p, 'arrow-up')},
    arrowDown(p)     {return fa(p, 'arrow-down')},
    balanceScale(p)  {return fa(p, 'balance-scale')},
    book(p)          {return fa(p, 'book')},
    bookmark(p)      {return fa(p, 'bookmark')},
    caretLeft(p)     {return fa(p, 'caret-left')},
    caretRight(p)    {return fa(p, 'caret-right')},
    check(p)         {return fa(p, 'check')},
    chess(p)         {return fa(p, 'chess')},
    chessKnight(p)   {return fa(p, 'chess-knight-alt')},
    clipboard(p)     {return fa(p, 'clipboard')},
    close(p)         {return fa(p, 'times')},
    contact(p)       {return fa(p, 'address-card')},
    cross(p)         {return fa(p, 'times')},
    delete(p)        {return fa(p, 'minus-circle')},
    download(p)      {return fa(p, 'download')},
    edit(p)          {return fa(p, 'edit')},
    eye(p)           {return fa(p, 'eye')},
    gear(p)          {return fa(p, 'cog')},
    gears(p)         {return fa(p, 'cogs')},
    hand(p)          {return fa(p, 'hand-paper')},
    home(p)          {return fa(p, 'home')},
    info(p)          {return fa(p, 'info-circle')},
    logout(p)        {return fa(p, 'sign-out')},
    mail(p)          {return fa(p, 'envelope')},
    moon(p)          {return fa(p, 'moon')},
    office(p)        {return fa(p, 'building')},
    portfolio(p)     {return fa(p, 'briefcase')},
    refresh(p)       {return fa(p, 'sync')},
    search(p)        {return fa(p, 'search')},
    sun(p)           {return fa(p, 'sun')},
    sync(p)          {return fa(p, 'sync')},
    thumbsDown(p)    {return fa(p, 'thumbs-down')},
    thumbsUp(p)      {return fa(p, 'thumbs-up')},
    user(p)          {return fa(p, 'user-circle')},
    users(p)         {return fa(p, 'users')},
    wrench(p)        {return fa(p, 'wrench')}
};

//-----------------------------
// Implementation
//-----------------------------
const faIcon = elemFactory(FontAwesomeIcon);
const fa = function(props, name) {
    return faIcon({icon: name, ...props});
};
