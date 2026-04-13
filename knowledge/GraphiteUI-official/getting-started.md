# 如何开始使用 GraphiteUI

第一次使用 GraphiteUI，推荐按下面的顺序走：

1. 运行 `./scripts/start.sh`，确保前后端都启动。
2. 打开 `/editor/new`，从模板创建一张图，例如 `Hello World`。
3. 先看清节点链路：`input -> agent -> output`。
4. 在问题输入里改一个你关心的问题。
5. 在知识库输入里选择要测试的库，例如：
   - `graphiteui-official`
   - `python-official-3.14`
   - `langgraph-official-v1`
6. 把知识库 input 连到 agent 后，确认 agent 节点上已经显式出现 `search_knowledge_base`。
7. 点击 `Validate`，确认图结构合法。
8. 点击 `Run`，然后去 output 节点和 run detail 看结果。

如果你想快速理解 GraphiteUI 自己的产品形态，建议先问这些问题：

- GraphiteUI 是什么？
- GraphiteUI 现在已经做到了什么程度？
- State Panel 是怎么工作的？
- knowledge base 是怎么接入 agent 的？

如果你想验证知识库能力，推荐切换不同库来对比：

- 用 `graphiteui-official` 问项目本身
- 用 `python-official-3.14` 问 Python API
- 用 `langgraph-official-v1` 问 LangGraph 概念和机制
