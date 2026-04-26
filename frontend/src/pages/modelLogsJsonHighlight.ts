const JSON_TOKEN_PATTERN =
  /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function previousBackslashCount(value: string, index: number) {
  let count = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    count += 1;
  }
  return count;
}

function isUnescapedBackslash(value: string, index: number) {
  return value[index] === "\\" && previousBackslashCount(value, index) % 2 === 0;
}

function splitJsonStringLines(token: string) {
  const innerToken = token.slice(1, -1);
  const lines: string[] = [];
  let chunkStart = 0;

  for (let index = 0; index < innerToken.length - 1; index += 1) {
    if (!isUnescapedBackslash(innerToken, index)) {
      continue;
    }

    const escapeKind = innerToken[index + 1];
    let skipLength = 0;
    if (escapeKind === "n") {
      skipLength = 2;
    } else if (escapeKind === "r") {
      skipLength = isUnescapedBackslash(innerToken, index + 2) && innerToken[index + 3] === "n" ? 4 : 2;
    }

    if (skipLength === 0) {
      continue;
    }

    lines.push(innerToken.slice(chunkStart, index));
    index += skipLength - 1;
    chunkStart = index + 1;
  }

  lines.push(innerToken.slice(chunkStart));
  return lines;
}

function renderJsonStringToken(token: string) {
  const lines = splitJsonStringLines(token);
  if (lines.length <= 1) {
    return escapeHtml(token);
  }

  const renderedLines = lines
    .map((line) => `<span class="model-logs-page__json-string-line">${line ? escapeHtml(line) : "&nbsp;"}</span>`)
    .join("");
  return [
    '<span class="model-logs-page__json-string-quote">&quot;</span>',
    `<span class="model-logs-page__json-string-lines">${renderedLines}</span>`,
    '<span class="model-logs-page__json-string-quote">&quot;</span>',
  ].join("");
}

export function highlightJson(jsonText: string) {
  return jsonText.replace(JSON_TOKEN_PATTERN, (token) => {
    let tokenClass = "model-logs-page__json-number";
    let tokenHtml = escapeHtml(token);
    if (token.startsWith('"')) {
      const isKey = /:\s*$/.test(token);
      tokenClass = isKey ? "model-logs-page__json-key" : "model-logs-page__json-string";
      tokenHtml = isKey ? escapeHtml(token) : renderJsonStringToken(token);
      if (!isKey && tokenHtml !== escapeHtml(token)) {
        tokenClass += " model-logs-page__json-string--multiline";
      }
    } else if (token === "true" || token === "false") {
      tokenClass = "model-logs-page__json-boolean";
    } else if (token === "null") {
      tokenClass = "model-logs-page__json-null";
    }
    return `<span class="${tokenClass}">${tokenHtml}</span>`;
  });
}
