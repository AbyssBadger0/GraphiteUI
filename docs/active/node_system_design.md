# Node System Design

## 1. Purpose

本文档是 GraphiteUI 当前节点系统讨论的统一结论文档。

后续如果继续开发节点协议、节点创建器、preset 系统、skill 挂载、前后端自动派生，都应优先以本文档为准。

本文档聚焦的问题：

- GraphiteUI 节点系统到底要长成什么样
- 为什么不直接照搬 ComfyUI
- 节点、preset、skill 三者的正确关系是什么
- 后续开发时真正应该收敛的唯一心智是什么

---

## 2. Core Positioning

GraphiteUI 的目标不是单纯做一个“节点长得像 ComfyUI”的编辑器。

GraphiteUI 的目标是：

**一个可视化、状态驱动、可扩展的 Agent Workflow Framework。**

它要承接 LangGraph 能表达的核心能力：

- state 驱动的数据流
- 节点之间的编排关系
- 条件路由
- 多阶段处理
- 产物输出
- 可复用能力调用

但它不应该直接依赖 demo 单文件本身运行。

正确方向是：

- demo 是模板样板
- GraphiteUI 承接它表达的能力
- framework 层抽象出通用节点、preset、skill、state、template

---

## 3. Product Mental Model

当前讨论已经收敛出一个核心判断：

### 3.1 用户看到的主节点不是 skill

skill 不应该成为用户的一等节点类型。

用户主要看到的节点应是：

- `Input Boundary`
- `Empty Agent Node`
- `Preset Agent Node`
- `Condition Node`
- `Output Boundary`

### 3.2 skill 是 agent node 的能力插件

skill 的正确位置是：

- agent node 的可挂载能力
- 用于提供原子动作或外部能力

而不是：

- 用户需要单独理解的一类节点

### 3.3 preset 是节点体验的核心层

用户常用的“新闻抓取节点”“图片理解节点”“视频理解节点”不应被理解为新的底层节点类型。

它们更准确地说是：

**预配置好的 agent node。**

也就是：

- 一个 agent node
- 挂好了默认 skill
- 配好了默认输入输出
- 配好了 system/task 指令
- 配好了默认输出约束

---

## 4. Why Not A Separate Skill Node

曾经讨论过是否需要 `Skill Node`。

当前结论是不推荐单独暴露这一层。

原因：

1. 用户会困惑
   - 是该新建 skill node 还是 agent node
   - skill 到底是节点还是插件

2. 抽象层级会混乱
   - 节点与能力插件处于同一层会破坏心智一致性

3. 与“每个节点视为一个子 agent”的方向不一致

因此当前决定：

**skill 只作为 agent node 的挂载能力，不作为单独节点原型。**

---

## 5. Four Core Node Primitives

当前建议长期稳定的核心节点原型只有四类：

1. `Input Boundary`
2. `Agent Node`
3. `Condition Node`
4. `Output Boundary`

这四类已经足够覆盖大多数 LangGraph 风格工作流。

---

## 6. Input Boundary

### 6.1 Responsibility

`Input Boundary` 的职责是：

- 给工作流提供显式输入入口
- 提供本地默认值
- 把这个值作为输出口暴露给下游节点

不负责：

- 调 skill
- 调模型
- 复杂处理
- 正式保存产物

### 6.2 Current UI Direction

当前阶段先聚焦文本输入：

- 文本输入时，节点本体显示文本框
- 如果未来输入的是路径或外部引用，再根据后缀名决定显示方式
- 这与 output boundary 的自动展示思路保持一致

### 6.3 Minimal Fields

```json
{
  "preset_id": "preset.input.empty.v0",
  "label": "Input",
  "description": "",
  "value_type": "text",
  "output": {
    "key": "value",
    "label": "Value",
    "value_type": "text"
  },
  "default_value": "",
  "input_mode": "inline",
  "placeholder": ""
}
```

---

## 7. Agent Node

### 7.1 Responsibility

`Agent Node` 是系统中最核心的处理节点。

职责：

1. 读取输入 state
2. 根据 `system_instruction` 和 `task_instruction` 组织任务
3. 必要时调用挂载的 skill
4. 生成结构化响应
5. 将结果绑定到自身 outputs

不负责：

- 正式文件保存
- 最终导出产物

最多只应允许：

- 临时文件
- 临时 artifact 引用

正式持久化应交给 `Output Boundary`。

### 7.2 Empty vs Preset

`Empty Agent Node` 与 `Preset Agent Node` 的底层类型应保持统一。

差异不在节点原型本身，而在配置来源：

- `Empty Agent Node`
  - 继承自零号 preset
  - 不预装具体业务能力

- `Preset Agent Node`
  - 继承自某个具体 preset
  - 预装 skill、输入输出、默认指令和输出绑定

### 7.3 Minimal Fields

```json
{
  "preset_id": "preset.agent.empty.v0",
  "label": "Untitled Agent",
  "description": "",
  "inputs": [],
  "outputs": [],
  "system_instruction": "",
  "task_instruction": "",
  "skills": [],
  "response_mode": "json",
  "output_binding": {}
}
```

---

## 8. Condition Node

### 8.1 Responsibility

`Condition Node` 的职责是：

- 读取输入
- 根据条件规则判断
- 决定走哪条 branch

它不是大模型生成节点，而是路由节点。

### 8.2 First Version Scope

第一版建议先支持：

- 单规则
- 二分支

不要一开始就扩展成复杂表达式系统。

### 8.3 Minimal Fields

```json
{
  "preset_id": "preset.condition.empty.v0",
  "label": "Condition",
  "description": "",
  "inputs": [],
  "branches": [],
  "condition_mode": "rule",
  "rule": {},
  "branch_mapping": {}
}
```

---

## 9. Output Boundary

### 9.1 Responsibility

`Output Boundary` 的职责是：

- 接收一个上游输出项
- 根据类型进行展示
- 根据配置进行正式保存

它是 graph 的显式导出边界。

### 9.2 Key Principle

节点输出是否“可见 / 可保存”，**不由 agent node 自己决定**，主要由它是否接到了 `Output Boundary` 决定。

也就是说：

1. 输出接到下一个 agent 节点
   - 这是内部工作流数据
   - 默认不强调展示和保存

2. 输出接到 output boundary
   - 这是显式导出结果
   - 需要展示
   - 需要支持保存

3. 同时接到 agent 和 output
   - 既参与运行
   - 又展示和保存

### 9.3 Minimal Fields

```json
{
  "preset_id": "preset.output.empty.v0",
  "label": "Output",
  "description": "",
  "input": {
    "key": "value",
    "label": "Value",
    "value_type": "any",
    "required": true
  },
  "display_mode": "auto",
  "persist_enabled": false,
  "persist_format": "txt",
  "file_name_template": "result"
}
```

### 9.4 Current UI Direction

当前阶段先重点支持文本：

- 普通文本
- Markdown
- JSON

未来再扩展：

- image
- audio
- video

---

## 10. Value Types

第一版建议稳定支持以下 `value_type`：

```ts
type ValueType =
  | "text"
  | "json"
  | "image"
  | "audio"
  | "video"
  | "any";
```

### 10.1 Why These Types

- `text`
  - 最常见的语言输入输出

- `json`
  - 统一承载结构化对象、列表、评分结果、素材清单等

- `image` / `audio` / `video`
  - 多模态主类型
  - 直接影响拖线推荐与展示器选择

- `any`
  - 兜底
  - 过渡期兼容

### 10.2 Types Not In First Version

第一版暂不建议单独拆出：

- `number`
- `boolean`
- `markdown`
- `file`
- `file_list`
- `table`

如有需要，未来再通过 `semantic_type` 等机制补充更细语义。

### 10.3 Compatibility Rules

第一版建议：

1. 同类型可直接连接
2. `any` 可与任意类型连接
3. 不同主类型默认不直连

例如：

- `image -> text` 默认不直连
- 应通过中间 agent 节点显式转换

---

## 11. Skill Attachments

### 11.1 Role

skill 是 agent node 的能力插件。

它更适合承载这些原子能力：

- 下载
- 抓取
- 理解
- 调 API
- 调模型

当前不建议优先把这些做成独立原子能力：

- 泛化解析
- 正式文件保存

原因：

- 解析很多时候可以依赖模型能力
- 正式文件保存应属于 `Output Boundary`

### 11.2 Minimal Structure

```json
{
  "name": "fetch_news",
  "skill_key": "fetch_news_feed",
  "input_mapping": {},
  "context_binding": {},
  "usage": "required"
}
```

字段说明：

- `name`
  - 当前 skill 在节点内部的引用名

- `skill_key`
  - 挂载哪个 skill

- `input_mapping`
  - skill 入参映射

- `context_binding`
  - skill 结果绑定到节点内部上下文

- `usage`
  - `"required"` 或 `"optional"`

### 11.3 Why `context_binding`

skill 结果不应默认直接写到节点 outputs。

更推荐：

- `skill output -> node context`
- `node context -> node outputs`

这样更符合 agent node 作为“子 agent”的角色。

---

## 12. Reference Paths

第一版建议只支持一组很小但稳定的引用路径：

```text
$inputs.<key>
$skills.<name>.<field>
$context.<key>
$response.<field>
$config.<key>
```

### 12.1 Meanings

- `$inputs.<key>`
  - 节点输入口数据

- `$skills.<name>.<field>`
  - 某个 skill 的执行结果

- `$context.<key>`
  - 节点内部中间上下文

- `$response.<field>`
  - agent 最终模型响应结构

- `$config.<key>`
  - 节点自身配置值

### 12.2 First Version Constraint

第一版不建议支持：

- `$state.xxx`
- `$graph.xxx`
- `$env.xxx`
- 任意表达式

路径系统越小，后续越稳。

---

## 13. Preset Design

### 13.1 Current Decision

preset 不是单纯三选一中的某一种。

当前讨论的结论是：

**preset 是模板、类、快照三者的结合。**

### 13.2 Why

它同时具备三种属性：

1. 像模板
   - 用户可以直接从 preset 创建节点

2. 像类
   - 节点实例有来源 lineage
   - 所有节点都继承自某个 preset

3. 像快照
   - 用户可以修改节点
   - 修改后的节点可以另存为新的 preset

### 13.3 Preset Lineage

当前建议：

- 每个节点都必须有 `preset_id`
- 不存在完全无来源的节点
- 最原始的纯净节点继承自零号 preset

这会让后续这些能力都自然成立：

- 节点来源追踪
- preset 派生关系
- 空白节点与预设节点统一建模
- “另存为预设” 的 lineage 继承

---

## 14. Node Creation UX

### 14.1 From Dragged Data Line

如果用户从某条数据线拖到空白画布创建节点：

- 系统应根据该数据线的 `value_type` 推荐对应的 preset agent nodes
- 最下方再提供 `Empty Agent Node`

例如：

- 从 `image` 线拖出
  - 优先推荐图片理解、图片分析、图片描述等 preset

### 14.2 From Double Click On Empty Canvas

如果用户双击空白画布创建节点：

- 优先给出 `Empty Agent Node`
- 同时推荐几个常用 preset
- 未来可加入最近使用、模板常用、上下文推荐

### 14.3 Editable Presets

用户应当可以：

- 插入一个 preset agent node
- 修改它的指令、输入输出、skill 挂载、输出绑定
- 再把它保存成新的 preset

---

## 15. Single Source Direction

当前讨论已经明确：

- 不应再维护多份重复定义
- 节点系统应有唯一源定义

但“唯一源最终是 Python 还是 JSON”仍未最终拍板。

当前阶段更重要的是：

- 先把节点协议与产品心智定清楚
- 再决定单源实现形式

因此，本文档当前回答的是：

**节点系统应该长成什么样。**

而不是：

**唯一源最后到底落在什么文件格式。**

这个问题可以在后续单独继续讨论。

---

## 16. Unified View

当前统一视图如下：

### 16.1 Input Boundary

- 负责提供 graph 输入
- 只负责输入，不负责处理

### 16.2 Agent Node

- 负责读取输入、调用 skill、组织模型、产出候选输出

### 16.3 Condition Node

- 负责路由

### 16.4 Output Boundary

- 负责展示与正式保存

### 16.5 Preset

- 是这几类节点的来源与模板系统

### 16.6 Skill

- 是 agent node 的能力插件
- 不是用户主视角节点类型

---

## 17. What This Means For Future Development

后续开发时，应优先做以下事情：

1. 让这四类节点原型的协议稳定
2. 让 preset 与节点实例的关系稳定
3. 让 skill 挂载协议稳定
4. 让 output boundary 真正承担展示与保存边界
5. 让基于 `value_type` 的创建推荐与连接兼容性成立

不建议再回到这些旧方向：

- 每个业务步骤都做成一种全新的底层节点类型
- 让 skill 成为单独的用户节点类型
- 让 agent 节点负责正式保存文件
- 让展示/保存逻辑分散在中间处理节点里

---

## 18. Current Source Of Truth Statement

就“节点系统设计方向”这一主题而言：

**本文档应作为后续开发的唯一参考文档。**

如果未来继续讨论并修正方向，应优先修改本文档，而不是重新并行新增新的 active 节点方向文档。
