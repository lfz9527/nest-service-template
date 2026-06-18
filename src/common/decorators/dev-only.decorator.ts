import { SetMetadata } from '@nestjs/common';

export const DEV_ONLY_KEY = 'devOnly';

/**
 * 开发环境专用接口标记
 * 标记后仅非 production 环境可访问，生产环境返回 404
 */
export const DevOnly = () => SetMetadata(DEV_ONLY_KEY, true);
