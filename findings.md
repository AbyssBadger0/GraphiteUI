# Findings

## Source of Truth

- 旧 React 前端提交 `87d3d6e` 仍然是当前 Vue 迁移的产品行为参考。
- 真正复杂的编辑器逻辑不只在工作区壳层，很多关键行为深埋在：
  - `frontend/components/editor/node-system-editor.tsx`

## Workspace / Welcome Findings

- `/editor` 必须是欢迎页 / 工作区入口，不能自动进入图。
- `/editor/new` 和 `/editor/:graphId` 才是真正的编辑态路由。
- 关闭最后一个标签页要回到欢迎页，这条逻辑是旧前端的核心心智。

## Editor Body Findings

- 旧前端的 `State` 面板不是简单状态浏览器，而是图内语义面板：
  - state 名称 / 类型 / 默认值
  - reader / writer 列表
  - reader / writer 的新增与移除
  - 绑定节点聚焦
- 旧前端 `PortRow`、`BranchRow`、`StatePanel` 都与 `node-system-editor.tsx` 内部状态流强耦合。
- 当前 Vue 版 `NodeCard` 只是第一阶段 richer display，不等于旧前端编辑器本体已经恢复。

## UI Direction Findings

- 用户迁移前端的根因不是单纯想换 Vue，而是旧 React 编辑器在图编辑器本体层已经难以继续维护。
- 因此 Vue 迁移不能重写产品逻辑，只能重写实现方式。
- 组件库的合适边界：
  - 画布 / 节点 / 连线：继续自定义
  - 工作区 chrome / 面板 / 下拉 / 弹窗：可用 `Reka UI` / `shadcn-vue` 路线

## Current Migration Reality

- Vue 基础骨架、欢迎页、工作区、tabs、关闭确认框已经明显恢复。
- 当前最主要未完成项已经从“外围结构”转移到“编辑器本体”和“状态语义”。
