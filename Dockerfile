# ═══════════════════════════════════════════
# Stage 1: Build —— 编译 TypeScript
# ═══════════════════════════════════════════
FROM node:22-alpine AS build

WORKDIR /app

# 利用 Docker 层缓存：先拷贝依赖描述文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm 并安装所有依赖（含 devDependencies，编译需要 @nestjs/cli）
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --frozen-lockfile

# 拷贝源码并编译
COPY tsconfig.json nest-cli.json ./
COPY prisma/ prisma/
COPY src/ src/
RUN pnpm db:generate \
    && pnpm build \
    # 清理 devDependencies，仅保留运行时依赖
    && pnpm install --frozen-lockfile --prod

# ═══════════════════════════════════════════
# Stage 2: Production —— 最小运行时镜像
# ═══════════════════════════════════════════
FROM node:22-alpine

WORKDIR /app

# 安装 PM2（全局）用于进程管理
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm add -g pm2

# 从 build 阶段复制产物
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/package.json ./

# 复制国际化资源（运行时加载）
COPY src/i18n/ ./src/i18n/

# 安全：以非 root 用户运行
RUN addgroup -S app && adduser -S app -G app
USER app

# 生产端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD node -e "require('http').get('http://localhost:3000/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["pm2-runtime", "start", "ecosystem.config.js", "--no-daemon"]
