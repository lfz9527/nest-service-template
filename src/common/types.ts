import { Session } from 'express-session';

export type AppSession = Session & { userId?: number; captcha?: string };
