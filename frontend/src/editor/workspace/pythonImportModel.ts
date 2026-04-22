export function isGraphiteUiPythonExportFile(file: File) {
  return file.name.toLowerCase().endsWith(".py");
}

export function isGraphiteUiPythonExportSource(source: string) {
  return source.includes("GRAPHITEUI_EXPORT_VERSION = 1") && source.includes("GRAPHITEUI_EDITOR_GRAPH");
}
