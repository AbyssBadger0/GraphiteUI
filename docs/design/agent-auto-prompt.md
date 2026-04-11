# Agent 节点自动 System Prompt 设计

## 核心理念

用户只写自然语言提示词。系统自动完成其余所有事情。

LLM 的能力已经足够强，给它充分的上下文描述（输入是什么、技能结果是什么、输出要什么格式），它就能自主推理并组装出正确的结果。

## 用户体验

```
用户做的事：
  1. 拖入输入节点、agent 节点、输出节点，连线
  2. 给 agent 挂载需要的技能
  3. 写一句话提示词（或留空）

用户不需要关心的事：
  - system prompt 怎么写
  - 技能的输入参数从哪来
  - 输出字段怎么绑定
```

**零配置场景**：agent 挂了 `search_knowledge_base` 技能，输入端口有 `question` 和 `knowledge_base`，输出端口有 `answer`。提示词留空。系统自动让 LLM 看到所有上下文，自行产出 answer。

**有提示词场景**：用户写"用中文简洁回答，不超过三句话"。这句话成为 user prompt，引导 LLM 的输出风格。

## 执行流程

```
1. 收到输入值（question="什么是 GraphiteUI？", knowledge_base="GraphiteUI-official"）
          ↓
2. 自动推断 skill inputMapping → 按 key 名匹配
   search_knowledge_base(query=question, knowledge_base=knowledge_base)
          ↓
3. 预执行所有 skill，得到 skill_context
          ↓
4. 自动拼装 system prompt：
   - 输入描述 + 实际值
   - 技能执行结果
   - 输出格式约束（JSON 字段名 + 类型）
          ↓
5. 用户提示词 → user prompt
          ↓
6. LLM 根据 system prompt 上下文 + user prompt 指令生成 JSON
          ↓
7. 解析 JSON，按字段名匹配到 output 端口
```

## 自动 System Prompt 拼装

```python
def build_auto_system_prompt(config, input_values, skill_context):
    parts = [
        "你是一个工作流处理节点。根据输入和技能结果完成用户的任务指令。",
        "严格返回一个 JSON 对象，不要加 markdown 围栏或任何前缀。",
    ]

    # 输入（带实际值）
    if input_values:
        parts.append("\n== 输入 ==")
        for key, value in input_values.items():
            display = str(value)[:200] + ("..." if len(str(value)) > 200 else "")
            parts.append(f"- {key}: {display}")

    # 技能结果（已预执行）
    if skill_context:
        parts.append("\n== 技能执行结果 ==")
        for name, result in skill_context.items():
            parts.append(f"[{name}]")
            for k, v in result.items():
                display = str(v)[:300] + ("..." if len(str(v)) > 300 else "")
                parts.append(f"  {k}: {display}")

    # 输出格式约束
    output_keys = [o.key for o in config.outputs]
    if output_keys:
        example = {k: "..." for k in output_keys}
        parts.append(f"\n== 必须返回的 JSON 格式 ==")
        parts.append(json.dumps(example, ensure_ascii=False))

    return "\n".join(parts)
```

关键设计：**输入的实际值和 skill 执行结果直接嵌入 system prompt**，LLM 看到完整上下文后自行推理。

## 自动 Skill InputMapping 推断

```python
def auto_resolve_skill_inputs(skill_input_schema, agent_inputs, input_values):
    resolved = {}
    for param in skill_input_schema:
        # 1. key 精确匹配：skill 参数名和 agent 输入端口名一致
        if param.key in input_values:
            resolved[param.key] = input_values[param.key]
            continue
        # 2. valueType 唯一匹配：该类型只有一个输入端口
        type_matches = [
            k for k in input_values
            if agent_input_type(k) == param.value_type
        ]
        if len(type_matches) == 1:
            resolved[param.key] = input_values[type_matches[0]]
    return resolved
```

规则简单明确：先 key 名匹配，再类型唯一匹配。匹配不到就跳过，让 skill 用自己的默认值。

`inputMapping` 字段保留在数据模型中作为高级 override — 为空时走自动推断，有值时优先使用手动配置。

## Output 自动绑定

不需要显式的 outputBinding 配置。LLM 返回的 JSON 字段名与 output 端口 key 同名匹配。

当前 executor 已有 `config.output_binding.get(output.key, f"$response.{output.key}")` 作为默认行为，天然支持同名匹配。`outputBinding` 字段保留在数据模型中作为高级 override。

## 前端交互

Agent 节点展开后只有一个纯文本 textarea：
- placeholder："描述这个节点应该做什么（可留空）"
- 写自然语言即可，不需要任何特殊语法
- 上方固定区域显示：输入端口 + 挂载的 skill 卡片（含输入输出参数）
- 用户看着这些信息写提示词，或者不写让 LLM 自行推理

## 数据模型

不改动任何已有字段，只改变默认行为：

| 字段 | 空值含义 | 有值含义 |
|------|----------|----------|
| `systemInstruction` | 自动生成 | 作为 override 直接使用 |
| `taskInstruction` | LLM 自行推理 | 作为 user prompt |
| `inputMapping` | 自动推断 | 手动映射 |
| `outputBinding` | 同名匹配 `$response.{key}` | 手动绑定 |

## 实现步骤

### Step 1: 前端精简
- 提示词框改为普通 textarea
- 删除引用编辑器相关组件

### Step 2: 后端自动 system prompt
- `_generate_agent_response` 中，`system_instruction` 为空时调用 `build_auto_system_prompt()`
- 自动 prompt 包含：输入实际值 + skill 执行结果 + 输出 JSON 格式约束

### Step 3: 后端自动 inputMapping
- `_execute_agent_node` 中，`skill.input_mapping` 为空时按 key/type 自动匹配
- 匹配失败的参数跳过

### Step 4: 验证
- hello_world 模板：agent 挂载 search_knowledge_base，提示词留空 → 应能自动检索并回答
- 写"用中文简洁回答" → 应按指令调整风格
- 不挂任何 skill，只有输入输出 → 应按提示词直接生成
