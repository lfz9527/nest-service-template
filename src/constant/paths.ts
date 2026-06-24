export const API_PATH = {
  AUTH: {
    CAPTCHA: 'getCaptcha',
    LOGIN: 'login',
    LOGOUT: 'logout',
    USER_INFO: 'getUserInfo',
  },
  USER: {
    LIST: 'getUserList',
    BY_ID: 'getUserById',
    ADD: 'addUser',
    UPDATE: 'updateUser',
    DELETE: 'delUser',
    ASSIGN_ROLES: 'assignRoles',
  },
  ROLE: {
    LIST: 'getRoleList',
    BY_ID: 'getRoleById',
    ADD: 'addRole',
    UPDATE: 'updateRole',
    DELETE: 'delRole',
    ASSIGN_MENUS: 'assignMenus',
  },
  MENU: {
    TREE: 'getMenuTree',
    BY_ID: 'getMenuById',
    ADD: 'addMenu',
    UPDATE: 'updateMenu',
    DELETE: 'delMenu',
  },
  /** 公开路径前缀 — AuthGuard 中以 /public/ 开头的路径无需登录 */
  PUBLIC_PREFIX: '/public/',
  /** 精确匹配的公开路径 — AuthGuard 中对这些路径直接放行 */
  PUBLIC_EXACT: ['/health'],
} as const;
