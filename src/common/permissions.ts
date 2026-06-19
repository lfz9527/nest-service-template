export const PERM = {
  USER: {
    LIST: 'user:list',
    ADD: 'user:add',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    ASSIGN_ROLE: 'user:assignRole',
  },
  ROLE: {
    LIST: 'role:list',
    ADD: 'role:add',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
    ASSIGN_MENU: 'role:assignMenu',
  },
  MENU: {
    LIST: 'menu:list',
    ADD: 'menu:add',
    UPDATE: 'menu:update',
    DELETE: 'menu:delete',
  },
} as const;
