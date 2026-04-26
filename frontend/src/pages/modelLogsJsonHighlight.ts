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

function renderLineBreak() {
  return '<span class="model-logs-page__json-line-break" aria-hidden="true">↵</span><br>';
}

function renderJsonStringToken(token: string) {
  let html = "";
  let chunkStart = 0;

  for (let index = 0; index < token.length - 1; index += 1) {
    if (!isUnescapedBackslash(token, index)) {
      continue;
    }

    const escapeKind = token[index + 1];
    let skipLength = 0;
    if (escapeKind === "n") {
      skipLength = 2;
    } else if (escapeKind === "r") {
      skipLength = isUnescapedBackslash(token, index + 2) && token[index + 3] === "n" ? 4 : 2;
    }

    if (skipLength === 0) {
      continue;
    }

    html += escapeHtml(token.slice(chunkStart, index));
    html += renderLineBreak();
    index += skipLength - 1;
    chunkStart = index + 1;
  }

  return html + escapeHtml(token.slice(chunkStart));
}

export function highlightJson(jsonText: string) {
  return jsonText.replace(JSON_TOKEN_PATTERN, (token) => {
    let tokenClass = "model-logs-page__json-number";
    let tokenHtml = escapeHtml(token);
    if (token.startsWith('"')) {
      tokenClass = /:\s*$/.test(token) ? "model-logs-page__json-key" : "model-logs-page__json-string";
      tokenHtml = renderJsonStringToken(token);
    } else if (token === "true" || token === "false") {
      tokenClass = "model-logs-page__json-boolean";
    } else if (token === "null") {
      tokenClass = "model-logs-page__json-null";
    }
    return `<span class="${tokenClass}">${tokenHtml}</span>`;
  });
}
