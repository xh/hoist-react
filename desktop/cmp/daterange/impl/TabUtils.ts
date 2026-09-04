/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import type {KeyboardEvent} from 'react';

export const sectionHeader = (text: string) =>
    div({className: 'xh-date-range-picker-popover__section-hdr', item: text});

/** Props making a styled div act as a keyboard-accessible button. Pass null to disable. */
export const clickable = (onClick: () => void) =>
    onClick
        ? {
              role: 'button',
              tabIndex: 0,
              onClick,
              onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onClick();
                  }
              }
          }
        : {role: 'button', 'aria-disabled': true};

/** Data attributes for a plain element spec - React's HTML attribute types omit them. */
export const dataAttrs = (attrs: Record<string, string>) => attrs as object;
