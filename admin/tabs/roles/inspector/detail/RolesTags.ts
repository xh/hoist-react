import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';

export const rolesTags = hoistCmp.factory(({roles}) => {
    return roles.length == 0
        ? div({
              item: 'None',
              style: {
                  color: 'var(--xh-text-color-muted)'
              }
          })
        : roles.length < 5
        ? roles.map(role => rolesTag({role, key: role.role}))
        : [
              roles.slice(0, 3).map(role => rolesTag({key: role.role, role})),
              div({
                  key: 'overflow',
                  item: `and ${roles.length - 3} others...`,
                  style: {color: 'var(--xh-text-color-muted)'}
              })
          ];
});

export const rolesTag = hoistCmp.factory(({role}) => {
    return div({
        key: role.role,
        items: [
            div({
                style: {
                    position: 'absolute',
                    borderRadius: '100%',
                    backgroundColor: role.color,
                    width: '0.8em',
                    height: '0.8em',
                    left: '0.4em'
                }
            }),
            role.role
        ],
        style: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.85em',
            paddingBlock: '0.2em',
            paddingInline: '1.6em 0.4em',
            borderRadius: '9999px',
            color: 'var(--xh-appbar-color)',
            backgroundColor: 'var(--xh-appbar-bg)',
            width: 'fit-content'
        }
    });
});
