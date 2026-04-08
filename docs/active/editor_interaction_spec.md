# Editor Interaction Spec

## 1. 文档目的

这份文档定义 GraphiteUI 下一轮 editor 改造的交互目标。

重点不是新增后端能力，而是把当前 editor 从“页面驱动”进一步升级为“画布驱动”的编排体验。

本文档基于当前代码状态和讨论结果整理，不追溯历史方案。

---

## 2. 当前问题

当前 editor 虽然已经具备：

- 画布编辑
- `State Panel`
- 结构化节点配置
- Validate / Save / Run
- 运行轮询
- 节点执行摘要

但交互上仍有几个明显问题：

1. 画布不是绝对主视图
- 左右区域仍然占据较多固定空间
- 节点编排时画布空间不够集中

2. 节点创建路径偏慢
- 当前主路径仍偏向“先找节点库，再拖入画布”
- 从已有节点继续往下扩展时，操作不够顺手

3. 节点运行结果展示不够聚焦
- 当前可以看到执行摘要
- 但还不够强调“这个节点实际改了哪些 state 项”

4. 面板行为还不够编辑器化
- `State Panel`、运行信息、主题配置、节点配置还没有完全转成浮动工作区组件

---

## 3. 改造目标

本轮 editor 改造目标如下：

1. 采用 `canvas-first` 布局
2. `State Panel` 支持折叠
3. 运行、主题、状态、节点配置改为浮动面板
4. 支持从连线动作直接创建新节点
5. 节点库支持搜索
6. 选中节点时，右侧除了配置，还要显示该节点运行结果
7. 运行结果重点显示该节点“非空的修改项”

---

## 4. 布局模型

### 4.1 总体原则

editor 主界面应以画布为中心。

不优先做浏览器原生 fullscreen API，而是先实现视觉上的全屏编排工作区：

- 画布占据主要空间
- 其他信息通过浮动面板覆盖在画布周围

### 4.2 布局区域

建议布局如下：

- 中央：Graph Canvas
- 左侧浮动：`State Panel`
- 右上浮动：`Theme / Graph Actions / Run Status`
- 右侧浮动：`Node Inspector`
- 左上或顶部轻量区域：graph 名称、template、运行 badge

### 4.3 面板要求

所有浮动面板都应满足：

- 不阻断画布的主操作
- 可折叠
- 视觉层级明确
- 在中等分辨率下不压缩画布到不可用

---

## 5. State Panel

### 5.1 行为要求

`State Panel` 需要支持：

- 默认展开
- 手动折叠
- 折叠后保留贴边入口
- 再次点击可恢复展开

### 5.2 状态持久化

建议记住用户选择：

- 使用本地存储保存展开/折叠状态

### 5.3 内容保持

折叠仅影响显示，不影响当前已有能力：

- state 列表查看
- state 新增/编辑
- state 与节点读写绑定联动

---

## 6. Node Inspector

### 6.1 显示规则

右侧 `Node Inspector` 的显示规则明确如下：

- 选中节点时展开
- 没选中节点时自动收起

不要求无节点选中时显示 graph 级配置。

### 6.2 面板结构

`Node Inspector` 分为两个主区：

1. `Config`
2. `Execution`

### 6.3 Config 区

`Config` 区保留当前能力，并继续作为节点配置入口：

- label
- description
- `reads`
- `writes`
- `params`

### 6.4 Execution 区

`Execution` 区用于展示当前节点最近一次运行结果。

至少包括：

- `status`
- `duration`
- `input_summary`
- `output_summary`
- `warnings`
- `errors`
- `artifacts`

### 6.5 非空修改项展示规则

这是本轮的关键要求。

右侧 `Execution` 中需要新增一个重点区块：

- `Changed Outputs`

展示规则：

1. 只考虑当前节点 `writes` 中声明的 state keys
2. 只展示本次运行结果里实际存在且非空的项
3. 不展示空字符串、空数组、空对象、`null`、`undefined`
4. 展示方式按值类型区分：
   - 字符串：展示摘要
   - 数组：展示数量和前几项摘要
   - 对象：展示关键字段或 JSON 摘要
5. 如果没有非空写入，显示：
   - `No non-empty outputs`

目的：

- 让用户一眼看到“这个节点改了什么”
- 避免被整份 run state 淹没

---

## 7. 节点创建体验

### 7.1 当前问题

当前节点创建主要依赖：

- 节点库选择
- 手动放置
- 再连线

这不适合高频扩展流程。

### 7.2 新的主创建路径

新的主创建路径定义为：

1. 从某个节点的输出端口拖出一条线
2. 将线拖到画布空白位置
3. 在落点弹出 `Node Picker`
4. 选择目标节点类型
5. 系统自动：
   - 创建节点
   - 放在落点附近
   - 创建与 source 的连线
   - 选中新节点

### 7.3 拖到已有节点

如果拖线目标是已有节点：

- 按正常连线逻辑处理
- 不弹 `Node Picker`

---

## 8. Node Picker

### 8.1 触发方式

`Node Picker` 的第一优先触发方式：

- 从节点拖线到空白处后自动弹出

后续可扩展为：

- 快捷键打开
- 工具栏按钮打开

### 8.2 功能要求

`Node Picker` 需要支持：

- 搜索
- 分类分组
- 鼠标点击选择
- 键盘回车选择

### 8.3 分组规则

当前先按以下分组：

- `Flow`
  - `start`
  - `end`
  - `condition`
- `Research`
  - `research`
  - `collect_assets`
  - `normalize_assets`
  - `select_assets`
  - `analyze_assets`
  - `extract_patterns`
- `Creative`
  - `build_brief`
  - `generate_variants`
  - `generate_storyboards`
  - `generate_video_prompts`
  - `review_variants`
- `Output`
  - `prepare_image_todo`
  - `prepare_video_todo`
  - `finalize`

### 8.4 第一阶段范围

第一阶段只支持：

- 选择当前已有的标准节点类型

暂不引入：

- 模板片段
- 推荐节点
- 节点宏

---

## 9. 节点库

### 9.1 保留节点库

左侧或辅助入口仍保留节点库，不取消。

原因：

- 首个节点创建仍可能依赖节点库
- 某些用户仍习惯从 palette 开始

### 9.2 节点库增强

节点库应新增：

- 搜索能力
- 分组展示

节点库与 `Node Picker` 的分组口径保持一致。

---

## 10. 实现优先级

建议按下面顺序实现：

### Phase 1

- `State Panel` 折叠
- `Node Inspector` 自动收起
- editor 改成 `canvas-first` 布局
- 运行、主题、状态、节点配置改成浮动面板

### Phase 2

- 节点库搜索
- `Node Picker` 组件
- 拖线到空白处弹出 `Node Picker`
- 选择节点后自动创建并连线

### Phase 3

- `Node Inspector.Execution` 增强
- 节点级运行结果整理
- `Changed Outputs` 非空修改项展示

---

## 11. 非目标

本轮不包含以下内容：

- 浏览器原生 fullscreen API
- 复杂的多窗口拖拽布局系统
- 模板片段插入
- 节点推荐引擎
- 完整 state diff 可视化
- 多人协作

---

## 12. 当前结论

这轮 editor 改造的核心不是新增更多节点类型，而是把现有能力变成更顺手的编排体验。

一句话概括：

**GraphiteUI editor 要从“能编辑 graph”继续升级为“以画布为中心、通过连线自然扩展 graph 的可视化编排器”。**
