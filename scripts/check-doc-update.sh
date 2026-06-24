#!/bin/bash
# Stop hook: 检测代码变更，注入 CLAUDE.md 更新提醒到下次会话
changed=$( (git diff --cached --name-only; git diff --name-only) 2>/dev/null | grep -v 'openapi-dump.json' | grep -v 'generated/' | grep -E '\.(ts|json|prisma|md)$' | wc -l)
if [ "$changed" -gt 0 ]; then
  echo '{"systemMessage":"检测到代码变更，已标记文档更新","hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"[Auto-doc] 上次会话修改了源文件。请检查 CLAUDE.md 是否需要更新（新模块、新命令、新 DTO、架构变更等）。"}}'
else
  echo '{}'
fi
