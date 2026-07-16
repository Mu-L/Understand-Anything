// Pure result mapping for extract-structure.mjs.
// Kept separate from the CLI entrypoint so unit tests do not import a shebang script.
function mapCallGraph(callGraph) {
  return callGraph && callGraph.length > 0
    ? callGraph.map(entry => ({
        caller: entry.caller,
        callee: entry.callee,
        lineNumber: entry.lineNumber,
      }))
    : null;
}

export function analyzeFileWithOutcomes(registry, file, content) {
  const wantsCallGraph =
    file.fileCategory === 'code' || file.fileCategory === 'script';
  let analysis = null;
  let callGraph = null;
  let structureOutcome = 'failed';
  let callGraphOutcome = wantsCallGraph ? 'failed' : 'skipped';

  let full = null;
  if (wantsCallGraph && typeof registry.analyzeFileFull === 'function') {
    try {
      full = registry.analyzeFileFull(file.path, content);
    } catch {
      full = null;
    }
  }

  if (full) {
    analysis = full.structure ?? null;
    callGraph = mapCallGraph(full.callGraph);
    structureOutcome = analysis === null ? 'failed' : 'succeeded';
    callGraphOutcome = Array.isArray(full.callGraph) ? 'succeeded' : 'failed';
  } else {
    try {
      analysis = registry.analyzeFile(file.path, content) ?? null;
      structureOutcome = analysis === null ? 'failed' : 'succeeded';
    } catch {
      analysis = null;
      structureOutcome = 'failed';
    }

    if (wantsCallGraph) {
      try {
        const extractedCallGraph = registry.extractCallGraph(file.path, content);
        callGraph = mapCallGraph(extractedCallGraph);
        callGraphOutcome = Array.isArray(extractedCallGraph)
          ? 'succeeded'
          : 'failed';
      } catch {
        callGraph = null;
        callGraphOutcome = 'failed';
      }
    }
  }

  return { analysis, callGraph, structureOutcome, callGraphOutcome };
}

export function buildResult(file, totalLines, nonEmptyLines, analysis, callGraph, batchImportData) {
  const base = {
    path: file.path,
    language: file.language,
    fileCategory: file.fileCategory,
    totalLines,
    nonEmptyLines,
  };

  if (!analysis) {
    base.metrics = {};
    return base;
  }

  if (analysis.functions && analysis.functions.length > 0) {
    base.functions = analysis.functions.map(fn => ({
      name: fn.name,
      startLine: fn.lineRange[0],
      endLine: fn.lineRange[1],
      params: fn.params || [],
    }));
  }

  if (analysis.classes && analysis.classes.length > 0) {
    base.classes = analysis.classes.map(cls => ({
      name: cls.name,
      startLine: cls.lineRange[0],
      endLine: cls.lineRange[1],
      methods: cls.methods || [],
      properties: cls.properties || [],
    }));
  }

  if (analysis.exports && analysis.exports.length > 0) {
    base.exports = analysis.exports.map(exp => ({
      name: exp.name,
      line: exp.lineNumber,
      isDefault: exp.isDefault === true,
    }));
  }

  if (analysis.sections && analysis.sections.length > 0) {
    base.sections = analysis.sections.map(s => ({
      heading: s.name,
      level: s.level,
      line: s.lineRange[0],
    }));
  }

  if (analysis.definitions && analysis.definitions.length > 0) {
    base.definitions = analysis.definitions.map(d => ({
      name: d.name,
      kind: d.kind,
      fields: d.fields || [],
      startLine: d.lineRange[0],
      endLine: d.lineRange[1],
    }));
  }

  if (analysis.services && analysis.services.length > 0) {
    base.services = analysis.services.map(s => ({
      name: s.name,
      image: s.image,
      ports: s.ports || [],
      ...(s.lineRange ? { startLine: s.lineRange[0], endLine: s.lineRange[1] } : {}),
    }));
  }

  if (analysis.endpoints && analysis.endpoints.length > 0) {
    base.endpoints = analysis.endpoints.map(e => ({
      method: e.method,
      path: e.path,
      startLine: e.lineRange[0],
      endLine: e.lineRange[1],
    }));
  }

  if (analysis.steps && analysis.steps.length > 0) {
    base.steps = analysis.steps.map(s => ({
      name: s.name,
      startLine: s.lineRange[0],
      endLine: s.lineRange[1],
    }));
  }

  if (analysis.resources && analysis.resources.length > 0) {
    base.resources = analysis.resources.map(r => ({
      name: r.name,
      kind: r.kind,
      startLine: r.lineRange[0],
      endLine: r.lineRange[1],
    }));
  }

  if (callGraph && callGraph.length > 0) {
    base.callGraph = callGraph;
  }

  const metrics = {};

  const importPaths = batchImportData?.[file.path];
  if (importPaths && importPaths.length > 0) {
    metrics.importCount = importPaths.length;
  } else if (analysis.imports) {
    const internal = analysis.imports.filter(imp => {
      const src = imp?.source ?? '';
      return src.startsWith('.');
    });
    metrics.importCount = internal.length;
  }

  if (analysis.exports) {
    metrics.exportCount = analysis.exports.length;
  }
  if (analysis.functions) {
    metrics.functionCount = analysis.functions.length;
  }
  if (analysis.classes) {
    metrics.classCount = analysis.classes.length;
  }
  if (analysis.sections) {
    metrics.sectionCount = analysis.sections.length;
  }
  if (analysis.definitions) {
    metrics.definitionCount = analysis.definitions.length;
  }
  if (analysis.services) {
    metrics.serviceCount = analysis.services.length;
  }
  if (analysis.endpoints) {
    metrics.endpointCount = analysis.endpoints.length;
  }
  if (analysis.steps) {
    metrics.stepCount = analysis.steps.length;
  }
  if (analysis.resources) {
    metrics.resourceCount = analysis.resources.length;
  }

  base.metrics = metrics;

  return base;
}
