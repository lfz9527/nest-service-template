export const API_PATH = {
  AUTH: {
    CAPTCHA: '/public/auth/getCaptcha',
    LOGIN: '/public/auth/login',
    LOGOUT: '/public/auth/logout',
    USER_INFO: '/api/auth/getUserInfo',
  },
  USER: {
    LIST: '/api/user/getUserList',
    BY_ID: '/api/user/getUserById',
    ADD: '/api/user/addUser',
    UPDATE: '/api/user/updateUser',
    DELETE: '/api/user/delUser',
    ASSIGN_ROLES: '/api/user/assignRoles',
  },
  ROLE: {
    LIST: '/api/role/getRoleList',
    BY_ID: '/api/role/getRoleById',
    ADD: '/api/role/addRole',
    UPDATE: '/api/role/updateRole',
    DELETE: '/api/role/delRole',
    ASSIGN_MENUS: '/api/role/assignMenus',
  },
  MENU: {
    TREE: '/api/menu/getMenuTree',
    BY_ID: '/api/menu/getMenuById',
    ADD: '/api/menu/addMenu',
    UPDATE: '/api/menu/updateMenu',
    DELETE: '/api/menu/delMenu',
  },
  PUBLIC_PREFIX: '/public/',
  /** 精确匹配的公开路径（不要求登录） */
  PUBLIC_EXACT: ['/health'],
} as const;
