# 多模型供应商配置设计说明

日期：2026-04-26

## 1. 背景

GraphiteUI 当前已经支持一个 OpenAI-compatible 本地 provider，并且会在运行图和展开节点模型列表时自动刷新 `/models`。用户希望进一步对齐 Hermes Agent 和 OpenClaw 的模型供应商配置方式，让设置页可以配置主流云厂商、本地网关和自定义兼容端点。

参考来源：

- Hermes Agent providers：<https://hermes-agent.nousresearch.com/docs/integrations/providers>
- Hermes Agent config example：<https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example>
- OpenClaw model providers：<https://docs.openclaw.ai/concepts/model-providers>

## 2. 设计目标

1. 设置页可以添加、启用、禁用和编辑多个模型供应商。
2. 节点模型列表使用稳定的 `provider/model` 引用，避免不同厂商模型同名冲突。
3. 运行图前和展开节点模型列表时自动刷新可用模型，不要求用户每次手动发现并保存。
4. 第一阶段直接接通 OpenAI、OpenRouter、Anthropic、Gemini、Local / Custom OpenAI-compatible。
5. 对齐 Hermes 和 OpenClaw 的供应商面，为其他厂商提供模板和兼容接入方式。
6. 用户只有 OpenAI 账号时，OpenAI 做真实连通性测试，其他厂商通过 mock、请求结构检查和解析测试保证代码路径正确。

## 3. 非目标

1. 第一阶段不实现 OAuth 登录流，例如 Copilot、OpenAI Codex OAuth、Qwen OAuth、Google Gemini CLI OAuth。
2. 第一阶段不直接集成 Bedrock、Vertex AI 这类需要云 SDK、ADC、IAM 或区域资源配置的复杂后端。
3. 第一阶段不实现多账号轮换、价格路由、熔断降级、OpenRouter provider routing 等高级调度能力。
4. 本次范围只做模型供应商，不扩展 Hermes/OpenClaw 的工具系统。

## 4. 推荐方案

采用 OpenClaw 风格的 provider catalog 数据结构，同时保留 Hermes 风格的易操作设置体验。

核心结构是一个以 provider id 为 key 的 `model_providers` map。每个 provider 包含：

- `label`：设置页显示名称。
- `transport`：调用协议，例如 `openai-compatible`、`anthropic-messages`、`gemini-generate-content`。
- `base_url`：可编辑 API 根地址。
- `api_key`：可选密钥，后端保存，前端只显示是否已配置。
- `enabled`：是否参与模型列表和运行时路由。
- `models`：已知模型列表，支持发现接口刷新，也支持手动添加。
- `capabilities`：可选能力标记，例如 text、vision、reasoning。

## 5. 第一阶段直接接通的供应商

| Provider | Transport | 默认 Base URL | 发现方式 | 运行时 |
| --- | --- | --- | --- | --- |
| `openai` | `openai-compatible` | `https://api.openai.com/v1` | `GET /models` | `POST /chat/completions` |
| `openrouter` | `openai-compatible` | `https://openrouter.ai/api/v1` | `GET /models` | `POST /chat/completions` |
| `anthropic` | `anthropic-messages` | `https://api.anthropic.com/v1` | `GET /models` | `POST /messages` |
| `gemini` | `gemini-generate-content` | `https://generativelanguage.googleapis.com/v1beta` | `GET /models` | `POST /models/{model}:generateContent` |
| `local` | `openai-compatible` | `http://127.0.0.1:8888/v1` | `GET /models` | `POST /chat/completions` |
| `custom-*` | 可选 | 用户输入 | 按 transport | 按 transport |

## 6. 对齐 Hermes/OpenClaw 的模板供应商

设置页提供“添加供应商模板”。模板先分为三类：

1. OpenAI-compatible，可直接运行：DeepSeek、xAI、Groq、Mistral、Cerebras、NVIDIA NIM、Moonshot/Kimi、ZAI/GLM、Alibaba/Qwen、硅基流动、Together、Fireworks、Vercel AI Gateway、KiloCode、LM Studio、vLLM、SGLang、LiteLLM。
2. Anthropic-compatible，可直接运行：Kimi Coding、Synthetic、其他兼容 Anthropic Messages 的网关。
3. 需要专门认证或 SDK 的模板：Bedrock、Google Vertex、Copilot、OpenAI Codex OAuth、Qwen OAuth、Gemini CLI OAuth。这些先作为说明型模板或推荐通过 Custom/OpenAI-compatible 网关接入，不在第一阶段内置 OAuth/SDK。

模板的目标不是锁死厂商列表，而是让用户不用手写常见 base URL、auth header 和 transport。用户仍然可以创建任意 custom provider。

## 7. 设置页体验

设置页新增“模型供应商”区域：

1. 顶部提供“添加供应商”选择器，选择模板后生成一张 provider 配置卡。
2. 每张卡包含启用开关、Provider ID、显示名称、Base URL、Transport、API Key、模型发现按钮、模型列表和手动添加模型输入。
3. API Key 输入后保存到后端；之后前端只显示“已配置”，不会回显完整密钥。
4. 发现模型失败时保留现有模型列表，并展示错误提示；用户可以手动添加模型。
5. 默认文本模型选择器从所有 enabled provider 的模型中选择。

## 8. 数据流

1. 前端加载设置页时调用 `/api/settings`。
2. 后端读取已保存 provider 配置，合并内置模板 catalog。
3. `force_refresh=true` 时，后端对 enabled provider 触发模型发现。
4. 节点卡片展开模型列表时触发 workspace 刷新 settings。
5. 运行图前再次刷新 settings，并解析当前节点保存的 `provider/model`。
6. 运行时根据 provider 的 transport 分发到对应 client。

## 9. 错误处理

1. Provider 未启用或未配置 API Key 时，不参与默认模型候选，但保留在设置页。
2. 模型发现失败不阻断保存，错误只影响该 provider 的 live model list。
3. 运行时如果 provider/model 找不到，优先退回该 provider 当前第一可用模型；仍不可用时返回明确错误。
4. Anthropic/Gemini/OpenAI-compatible 的错误响应统一转换为 GraphiteUI 的运行错误消息。

## 10. 测试策略

1. OpenAI：使用用户已有账号做真实连通性测试，包括模型发现和一次最小 chat 请求。
2. Local：使用已准备好的 `http://127.0.0.1:8888/v1` 做模型发现和运行图测试。
3. OpenRouter、Anthropic、Gemini：使用 mock HTTP 覆盖鉴权头、URL、请求体、响应解析和错误处理。
4. Frontend：覆盖设置页模板添加、保存 payload、API Key 不回显、模型发现按钮和模型列表刷新。
5. Runtime：覆盖 `provider/model` 解析、transport 分发、运行图前刷新模型 catalog。

## 11. 验收标准

1. 设置页能配置并保存多个 provider。
2. 节点模型列表能显示所有 enabled provider 的模型。
3. 打开模型下拉和运行图前都会自动刷新模型列表。
4. `local` provider 继续兼容当前 `http://127.0.0.1:8888/v1` 流程。
5. OpenAI 在真实账号下能完成发现和最小调用。
6. 未真实连通的厂商具备完整 mock 覆盖，代码路径和请求格式可检查。
7. 所有改动提交到 `main`，提交消息使用中文。
