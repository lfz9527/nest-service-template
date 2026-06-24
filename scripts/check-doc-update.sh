#!/bin/bash
# 检测代码变更（未提交 + 最近一次提交），注入 CLAUDE.md 更新提醒
# 用于 Stop hook（未提交变更）和 PostToolUse hook（git commit 后）

# 收集变更文件：未提交 + 最近一次提交
files=$( (
  git diff --cached --name-only
  git diff --name-only
  git show --name-only --format='' HEAD
) 2>/dev/null | sort -u)

# 排除自动生成 + 纯文档变更（仅 CLAUDE.md/README.md 的提交不触发）
meaningful=$(echo "$files" | grep -v 'openapi-dump.json' | grep -v 'generated/' | grep -v '^CLAUDE.md$' | grep -v '^README.md$' | grep -E '\.(ts|json|prisma|md)$' | wc -l)

if [ "$meaningful" -gt 0 ]; then
  echo '{"systemMessage":"检测到代码变更，已标记文档更新","hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"[Auto-doc] 检测到源文件变更。请检查 CLAUDE.md 是否需要更新（新模块、新命令、新 DTO、架构变更等）。用 git log --oneline -1 看最近提交。"}}'
else
  echo '{}'
fi
