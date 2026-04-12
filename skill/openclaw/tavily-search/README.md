# Tavily Search Skill for OpenClaw 🍬✨

基于 Tavily API 的智能联网搜索和内容提取技能。

## 📦 安装依赖

```bash
pip install tavily-python
# 或
pip3 install tavily-python
```

## 🔑 配置 API Key

1. 在 https://app.tavily.com 获取免费 API Key
2. 编辑 `~/.openclaw/.env` 文件（如果不存在会提示创建）
3. 添加 Tavily API Key:

```bash
# ~/.openclaw/.env
env: {
  TAVILY_API_KEY: "tvly-your-actual-key-here",
}
```

或者放在 `vars` 部分也可以：

```bash
vars: {
  TAVILY_API_KEY: "tvly-your-actual-key-here",
}
```

## 🚀 使用方法

### 1. 搜索网页

```bash
# 基础搜索
python3 tavily-search.py search "人工智能发展趋势 2024"

# 深度搜索（更全面，约 30 秒）
python3 tavily-search.py search "机器学习框架对比" --depth=advanced --max-results=15

# 不包含 AI 总结
python3 tavily-search.py search "Python 教程" --no-answer
```

### 2. 抓取网页内容

```bash
# 抓取单个页面（深度提取）
python3 tavily-search.py crawl "https://example.com/article"

# 基础抓取（不跟随链接）
python3 tavily-search.py crawl "https://example.com" --depth=basic
```

### 3. 提取内容

```bash
# 提取干净内容
python3 tavily-search.py extract "https://example.com/blog-post"

# 保留 Markdown 格式
python3 tavily-search.py extract "https://example.com/docs" --markdown
```

## 📊 功能对比

| 功能 | Tavily Search | DDG Lite (原有) |
|------|---------------|-----------------|
| API Key | 需要（免费额度充足） | 不需要 |
| 结果质量 | ⭐⭐⭐⭐⭐ AI 增强 | ⭐⭐⭐ 标准 |
| 内容提取 | 内置一键完成 | 需手动 web_fetch |
| 搜索深度 | basic/advanced 可选 | 单一深度 |
| 免费额度 | 1000 次/月 | 无限制 |
| 速度 | 快（3-30 秒） | 较慢 |

## 💡 使用场景

### 快速查询
```bash
python3 tavily-search.py search "天气 API 推荐" --depth=basic
```

### 深度研究
```bash
# Step 1: 搜索相关资源
python3 tavily-search.py search "LLM 应用开发最佳实践" --depth=advanced --max-results=20

# Step 2: 从结果中选取 URL，抓取详细内容
python3 tavily-search.py crawl "https://.../best-practices"
```

### 内容聚合
```bash
# 搜索 → 提取多个页面 → 综合分析
for url in "url1" "url2" "url3"; do
  python3 tavily-search.py extract "$url" --markdown
done
```

## 🎯 在 OpenClaw 中使用

技能已自动集成到 OpenClaw。可以直接调用：

```python
# 搜索
tavily_search(query="量子计算入门", search_depth="advanced")

# 抓取
tavily_crawl(url="https://example.com/quantum-computing")

# 提取
tavily_extract(url="https://example.com/quantum-basics")
```

## ⚙️ 参数说明

### 搜索 (search)
- `query`: 搜索关键词（必需）
- `--depth`: basic(快) 或 advanced(全面，约 30 秒)
- `--max-results`: 结果数量 (1-20，默认 10)
- `--no-answer`: 不包含 AI 生成的总结答案
- `--raw-content`: 包含原始页面内容

### 抓取 (crawl)
- `url`: 目标网址（必需）
- `--depth`: basic(单页) 或 advanced(跟随链接，深度提取)

### 提取 (extract)
- `url`: 目标网址（必需）
- `--markdown`: 保留 Markdown 格式

## 🆓 免费额度

Tavily 免费版：
- ✅ 1000 次查询/月
- ✅ 3 次请求/分钟
- ✅ 5000 字符/响应
- ✅ 适合个人使用和测试

对于大多数日常使用完全够用！如果需要更高额度，可升级付费版。

## 📝 输出格式

搜索结果包含：
- `query`: 原始查询
- `answer`: AI 生成的答案摘要（如启用）
- `results`: 结果数组
  - `title`: 页面标题
  - `url`: 链接地址
  - `content`: 提取的内容
  - `score`: 相关性评分 (0-1)
- `follow_up_questions`: 建议的后续问题
- `images`: 相关图片（可选）

## 🔧 故障排除

### 错误：ModuleNotFoundError: No module named 'tavily'
```bash
pip install tavily-python
# 或
python3 -m pip install tavily-python --user
```

### 错误：Invalid API Key
- 检查 `config.json` 中的 API Key 是否正确
- 确保没有多余的空格或引号
- 在 https://app.tavily.com 验证密钥状态

### 错误：Rate limit exceeded
- 免费版限制 3 次/分钟，请等待后重试
- 考虑升级 Tavily 付费计划
- 优化代码减少重复请求

## 📚 更多资源

- Tavily 官方文档：https://docs.tavily.com
- API 控制台：https://app.tavily.com
- 价格页面：https://tavily.com/pricing

---

**冰糖为你服务** 🍬✨  
如有问题，随时告诉我！
