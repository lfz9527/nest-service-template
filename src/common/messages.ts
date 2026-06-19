export const MSG = {
  AUTH: {
    NEED_CAPTCHA: '请先获取验证码',
    CAPTCHA_WRONG: '验证码错误',
    LOGIN_FAILED: '用户名或密码错误',
    LOGIN_REQUIRED: '请先登录',
    LOGOUT_SUCCESS: '已退出',
  },
  PERMISSION: {
    FORBIDDEN: '无权限',
  },
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: '请求过于频繁，请稍后再试',
  },
  USER: {
    NOT_FOUND: '用户不存在',
    USERNAME_EXISTS: '用户名已存在',
    MISSING_ID: '缺少用户ID',
    DELETE_SUCCESS: '删除成功',
    ASSIGN_ROLE_SUCCESS: '分配成功',
  },
  ROLE: {
    NOT_FOUND: '角色不存在',
    NAME_OR_CODE_EXISTS: '角色名或编码已存在',
    MISSING_ID: '缺少角色ID',
    ROLE_EXISTS: '角色已存在',
    DELETE_SUCCESS: '删除成功',
    ASSIGN_MENU_SUCCESS: '分配成功',
  },
  MENU: {
    NOT_FOUND: '菜单不存在',
    CODE_EXISTS: '菜单编码已存在',
    MISSING_ID: '缺少菜单ID',
    HAS_CHILDREN: '请先删除子菜单',
    DELETE_SUCCESS: '删除成功',
  },
  COMMON: {
    SUCCESS: '操作成功',
    BAD_REQUEST: '请求参数有误',
    INTERNAL_ERROR: '服务器内部错误',
    MISSING_ENV_VARS: '缺少必需的环境变量: ',
  },
} as const;
