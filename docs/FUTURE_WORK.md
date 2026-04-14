# Future Work

这份文件只记录当前仓库扫描后仍明确属于未来工作的事项。

当前优先级：

1. 编辑器旧视图模型收口
2. Cycles 交互与高级策略
3. Knowledge Base 收尾与增强
4. Memory 正式能力建设
5. 人类在环前端与审计闭环
6. LangGraph Python 导出前端入口

## 1. 编辑器旧视图模型收口

当前代码现状：

- 后端协议、模板、图、预设、保存、校验和运行都已经切到正式 `node_system`
- 前端接口兼容层已删除
- 但编辑器内部仍保留一层旧视图模型壳子：
  - `NodePresetDefinition`
  - `PortDefinition`
  - `StateField`
  - `SkillAttachment`
  - `outputBinding`

后续要做：

- 删除 `outputBinding`
- 技能面板直接围绕 `string[]` 工作
- 端口名不再保留副本，直接读取 `state.name`
- State Panel 直接读取 canonical `state_schema`
- NodeCard 直接围绕 canonical node 渲染
- 预设视图层只保留最薄的 UI 投影

详细拆分见：

- [editor_view_model_cleanup_plan.md](/home/abyss/GraphiteUI/docs/editor_view_model_cleanup_plan.md)

## 2. Cycles 交互与高级策略

当前代码现状：

- LangGraph runtime 已支持条件边和 cycles 执行
- 运行结果会返回 `cycle_summary / cycle_iterations`
- 当前循环停止条件只覆盖：
  - 显式退出分支
  - 命中最大轮次保护

后续要做：

- 增加更完整的停止策略：
  - 无变化停止
  - 空轮次停止
  - 按 state 或输出变化量停止
- 给 editor 增加正式的循环配置入口：
  - `cycle_max_iterations`
  - 终止策略
  - 循环回边高亮
- 在 editor 和 run detail 中进一步可视化：
  - 每轮执行路径
  - 回边
  - 终止原因
- 明确 cycles 和 interrupt 的衔接方式：
  - 是否允许在循环中暂停
  - 恢复后从哪一轮、哪个节点继续

## 3. Knowledge Base 收尾与增强

当前代码现状：

- knowledge base 已经有正式资源层：
  - graph 内绑定稳定 `kb_id`
  - `/api/knowledge/bases` 返回 label / version / 文档数 / chunk 数
  - editor 会显示正式知识库选项
- 已经有离线导入与本地索引：
  - Python 官方文档库
  - LangGraph 官方文档库
  - SQLite FTS 检索主链
- `search_knowledge_base` 已经是正式 skill：
  - agent 接入 knowledge base 后显式挂载
  - skill 返回 `context / results / citations`
  - run detail 已返回 `knowledge_summary`

后续要做：

- 增加知识库导入、更新、删除、重建索引和状态查看能力
- 增强检索质量：
  - query 归一化
  - rerank
  - 向量检索或混合检索
- 扩展知识库使用方式：
  - 多 knowledge base
  - 更细的 query mapping
  - 更清晰的 citation 展示
- 明确知识库管理边界：
  - 本地缓存
  - 版本刷新
  - 导入失败恢复
  - 重新导入后的兼容策略

## 4. Memory 正式能力建设

当前代码现状：

- `/memories` 页面和 `/api/memories` 只保留只读占位与示例数据
- 当前没有正式的 memory 写入链路、召回策略、生命周期管理和运行时集成
- run detail 虽然预留了 memory 展示位，但还没有真实的 runtime memory contract

后续要做：

- 定义 memory 的写入时机、读取时机和淘汰策略
- 明确 memory schema、来源、作用域和权限边界
- 决定 memory 是挂在 run、graph、workspace 还是 project 维度
- 明确 memory 和 runtime 的正式契约：
  - 哪些节点可以写 memory
  - 哪些节点可以读 memory
  - run detail 返回哪些 memory 相关结构化字段
- 决定是否保留独立 memory 页面；如果保留，至少要支持真实记录、检索、来源追踪和详情查看

## 5. 人类在环前端与审计闭环

当前代码现状：

- 后端已经有：
  - `paused / awaiting_human / resuming`
  - checkpoint / resume
  - interrupt before / after
  - `POST /api/runs/{run_id}/resume`
- 前端还没有正式的人类在环入口和审计闭环

后续要做：

- 在 run detail 中展示等待人工输入的结构化信息
- 增加最小恢复面板：
  - approve / reject / edit-and-continue / skip
- 给 editor 增加断点配置入口
- 记录人工介入审计轨迹，保证每次恢复都可回溯

## 6. LangGraph Python 导出前端入口

当前代码现状：

- 后端已经支持导出可执行 Python：
  - `POST /api/graphs/export/langgraph-python`
- 前端还没有导出入口和下载交互

后续要做：

- 在 editor 中增加“导出 LangGraph Python”入口
- 提供源码预览和下载
- 明确导出时的图校验和错误提示
