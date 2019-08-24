import { GRPCContext } from ".";
import { caseInsensitiveSorter, isRelativePath, wrap } from "../../../utils";

const moduleSort = (a: { modulePath: string }, b: { modulePath: string }) => {
  const s1 = a.modulePath.toLocaleLowerCase();
  const s2 = b.modulePath.toLocaleLowerCase();
  for (let cnt = 0; cnt < s1.length; cnt += 1) {
    if (s1[cnt] !== s2[cnt]) {
      if (s1[cnt] === ".") {
        return -1;
      }
      return s1[cnt].localeCompare(s2[cnt]);
    }
  }
  return 0;
};

const importsSort = caseInsensitiveSorter((item: string) => item);
const noWrap = wrap("", "");
const curlyWrap = wrap("{ ", " }");

function renderImport(importNames: string[], modulePath: string) {
  const starred = importNames.filter(n => n[0] === "*");
  const normalExports = importNames.filter(n => n[0] !== "*");

  return `${
    starred.length ? renderImportLine(starred, modulePath, noWrap) : ""
  }${
    normalExports.length
      ? `${starred.length ? "\n" : ""}${renderImportLine(
          normalExports,
          modulePath,
          curlyWrap
        )}`
      : ""
  }`;
}

function renderImportLine(
  importNames: string[],
  modulePath: string,
  wrapFn: (s: string) => string
): string {
  if (importNames.length === 0) {
    return `import "${modulePath}"`;
  }

  const tryImport = `import ${wrapFn(
    importNames.join(", ")
  )} from "${modulePath}";`;
  if (tryImport.length < 82) {
    return tryImport;
  } else {
    return `import {
  ${importNames.join(`,
  `)}
} from "${modulePath}";`;
  }
}

const surroundWithFlow = wrap("/*:: ", " */");

export function computeImportMatrix(
  localNamespace: string,
  namespaceMapping: { [name: string]: string },
  context: GRPCContext
) {
  const rootContext = {
    imports: {} as { [name: string]: { [name: string]: string | boolean } }
  };
  Object.keys(context.imports).forEach(p => {
    if (!rootContext.imports[p]) {
      rootContext.imports[p] = {};
    }
    const ns = context.imports[p];
    Object.keys(ns).forEach(name => {
      rootContext.imports[p][name] = context.imports[p][name];
    });
  });

  const sortedImports = Object.keys(rootContext.imports)
    .filter(p => {
      return p !== localNamespace;
    })
    .map(p => {
      return {
        imports: rootContext.imports[p],
        modulePath:
          p.indexOf("{") === 0 && p.lastIndexOf("}") === p.length - 1
            ? p.slice(1, p.length - 1)
            : namespaceMapping[p] || (isRelativePath(p) ? p : `./${p}`),
        name: p
      };
    });

  sortedImports.sort(moduleSort);

  const lines = sortedImports.map(p => {
    const sorted = Object.keys(p.imports);
    sorted.sort(importsSort);
    const importNames = sorted.map(k =>
      typeof p.imports[k] === "string" ? `${k} as ${p.imports[k]}` : k
    );
    return renderImport(importNames, p.modulePath);
  });
  return `${lines.join("\n")}${"\n"}${lines
    .map(surroundWithFlow)
    .join("\n")}${"\n"}`;
}

const unQuotedPropertyRegex = /^[a-zA-Z\_\$][a-zA-Z0-9\$\_]*$/;
export function renderPropertyAccessor(property: string) {
  if (unQuotedPropertyRegex.test(property)) {
    return `.${property}`;
  } else {
    return `["${property}"]`;
  }
}
