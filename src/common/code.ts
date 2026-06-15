/**
 * 业务状态码常量
 * 系统码（HTTP 状态码）与业务码分离，
 * 前端通过业务码区分具体业务场景
 */

/** 通用成功 */
export const SUCCESS = 0;

/** 参数校验失败 */
export const BAD_REQUEST = 40000;

// ──── 认证相关 40001~40099 ────

/** 未登录 */
export const UNAUTHORIZED = 40001;
/** 验证码错误 */
export const CAPTCHA_ERROR = 40002;
/** 用户名或密码错误 */
export const LOGIN_FAILED = 40003;
/** 请先获取验证码 */
export const CAPTCHA_REQUIRED = 40004;

// ──── 权限相关 40100~40199 ────

/** 无权限 */
export const FORBIDDEN = 40100;

// ──── 用户相关 40200~40299 ────

/** 用户不存在 */
export const USER_NOT_FOUND = 40200;
/** 用户名已存在 */
export const USER_EXISTS = 40201;

// ──── 角色相关 40300~40399 ────

/** 角色不存在 */
export const ROLE_NOT_FOUND = 40300;
/** 角色名或编码已存在 */
export const ROLE_EXISTS = 40301;

// ──── 菜单相关 40400~40499 ────

/** 菜单不存在 */
export const MENU_NOT_FOUND = 40400;
/** 菜单编码已存在 */
export const MENU_CODE_EXISTS = 40401;
/** 存在子菜单，无法删除 */
export const MENU_HAS_CHILDREN = 40402;
