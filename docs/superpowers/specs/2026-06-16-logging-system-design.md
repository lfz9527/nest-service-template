# Logging System Design

## Overview

Add structured logging to dashboard-service using `nestjs-pino` (Pino under the hood). Coverage: HTTP requests/responses, business operations, and database queries. Output: console (colorized in dev, JSON in prod) + rotating files.

## Dependencies

| Package | Purpose |
|---|---|
| `nestjs-pino` | NestJS LoggerModule + PinoLogger injection |
| `pino-http` | Automatic HTTP request/response logging (dependency of nestjs-pino) |
| `pino-pretty` | Human-readable console output for development |
| `pino-roll` | File rotation by day/size for production |

## Configuration (.env additions)

```env
LOG_LEVEL=debug                  # trace | debug | info | warn | error | fatal
LOG_FILE_PATH=./logs/app.log     # Log file output path
LOG_PRETTY=true                  # true = human-readable console (dev), false = JSON (prod)
LOG_RETENTION_DAYS=7             # Days to retain log files before auto-cleanup
LOG_MAX_FILE_SIZE=10m            # Max size per log file before rotation
```

## Architecture

### New module: `src/logger/logger.module.ts`

- `@Global()` module so `PinoLogger` is available application-wide without per-module imports.
- Uses `LoggerModule.forRootAsync` with `ConfigService` to read `.env` values.
- Registers `PinoLogger` via `APP_INTERCEPTOR` for zero-invasion HTTP logging.
- Builds pino transports conditionally:
  - **Development** (`LOG_PRETTY=true`): `pino-pretty` target for readable console.
  - **Production** (`LOG_PRETTY=false`): bare `pino/file` target for structured JSON console, plus `pino-roll` target for rotating files.
- `pino-roll` configured with `interval: 'd'`, `maxFiles` from `LOG_RETENTION_DAYS`, `size` from `LOG_MAX_FILE_SIZE`.

### Changes to existing files

| File | Change |
|---|---|
| `src/app.module.ts` | Import `LoggerModule` |
| `src/prisma/prisma.module.ts` | Enable Prisma query logging via `log` option, bridge Prisma events to PinoLogger |

## Coverage Plan

### HTTP layer — zero invasion

`nestjs-pino` interceptor automatically logs every request: method, URL, status code, response time.

### Business layer — PinoLogger injection

Services inject `PinoLogger` and log at key points:

| Module | Event | Level |
|---|---|---|
| AuthService | Login success/failure | info/warn |
| AuthService | Logout | info |
| UserService | Create/update/delete user | info |
| RoleService | Role changes | info |
| All services | Caught exceptions | error (stack + context) |

### Database layer — Prisma event bridge

Prisma client configured with `log: [{ level: 'warn', emit: 'event' }, { level: 'error', emit: 'event' }]` and `['query']` in debug mode. Prisma `$on('error', ...)` events bridged to PinoLogger.

## Error Handling

- Pino defaults to sync writes when async fails; a top-level error event listener outputs write failures to stderr so operations can detect logging outages.
- No business disruption on logging failure — logs fail silently to stderr, requests proceed normally.
