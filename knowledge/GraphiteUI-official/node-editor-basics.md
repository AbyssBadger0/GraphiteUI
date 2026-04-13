# 节点编排基础

GraphiteUI 画布的基本单位是节点和边。当前最重要的几类节点是：

- `input`：把文本、文件或 knowledge base 引入图中。
- `agent`：配置任务说明、端口、skill 和输出绑定。
- `condition`：在规则判断或循环分支之间做选择。
- `output`：显示最终结果，也可以承担保存产物的职责。

当前画布里几个很关键的交互是：

- 双击画布打开创建菜单。
- 从节点 handle 拉线建立连接。
- 从连接点拉到空白处时，直接创建下一个节点。
- 在 agent 上新增输入或输出端口。
- 通过右侧 `State Panel` 编辑 graph state，并同步修改节点上的 `stateReads / stateWrites`。

关于 skill 和知识库，有两个当前实现上的重点：

- skill 是显式挂在 agent 上的，不是隐藏能力。
- 当 knowledge base input 接到 agent 时，编辑器会自动把 `search_knowledge_base` 加到 agent 的 skill 列表里。

关于 cycles，当前已经有基础执行支持：

- `condition` 节点可以切到 `cycle` 模式
- runtime 会记录循环轮次和终止原因
- 但更高级的停止策略和回边可视化还在后续计划里
