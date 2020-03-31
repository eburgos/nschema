import { GRPCContext } from ".";
import { caseInsensitiveSorter, isRelativePath, wrap } from "../../../utils";

const moduleSort = (
  source: { modulePath: string },
  target: { modulePath: string }
) => {
  const sourceLowercased = source.modulePath.toLocaleLowerCase();
  const targetLowercased = target.modulePath.toLocaleLowerCase();
  for (let cnt = 0; cnt < sourceLowercased.length; cnt += 1) {
    if (sourceLowercased[cnt] !== targetLowercased[cnt]) {
      if (sourceLowercased[cnt] === ".") {
        return -1;
      }
      return sourceLowercased[cnt].localeCompare(targetLowercased[cnt]);
    }
  }
  return 0;
};

const importsSort = caseInsensitiveSorter((item: string) => item);
const noWrap = wrap("", "");
const curlyWrap = wrap("{ ", " }");

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

function renderImport(importNames: string[], modulePath: string) {
  const starred = importNames.filter((name) => name.startsWith("*"));
  const normalExports = importNames.filter((name) => !name.startsWith("*"));

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

const surroundWithFlow = wrap("/*:: ", " */");

export function computeImportMatrix(
  localNamespace: string,
  namespaceMapping: { [name: string]: string },
  context: GRPCContext
) {
  const rootContext = {
    imports: {} as { [name: string]: { [name: string]: string | boolean } }
  };
  Object.keys(context.imports).forEach((importItem) => {
    if (!rootContext.imports[importItem]) {
      rootContext.imports[importItem] = {};
    }
    const namespace = context.imports[importItem];
    Object.keys(namespace).forEach((name) => {
      rootContext.imports[importItem][name] = context.imports[importItem][name];
    });
  });

  const sortedImports = Object.keys(rootContext.imports)
    .filter((importName) => {
      return importName !== localNamespace;
    })
    .map((importName) => {
      return {
        imports: rootContext.imports[importName],
        modulePath:
          importName.startsWith("{") && importName.endsWith("}")
            ? importName.slice(1, importName.length - 1)
            : namespaceMapping[importName] ||
              (isRelativePath(importName) ? importName : `./${importName}`),
        name: importName
      };
    });

  sortedImports.sort(moduleSort);

  const lines = sortedImports.map((importName) => {
    const sorted = Object.keys(importName.imports);
    sorted.sort(importsSort);
    const importNames = sorted.map((sortedImportName) =>
      typeof importName.imports[sortedImportName] === "string"
        ? `${sortedImportName} as ${importName.imports[sortedImportName]}`
        : sortedImportName
    );
    return renderImport(importNames, importName.modulePath);
  });
  return `${lines.join("\n")}${"\n"}${lines
    .map(surroundWithFlow)
    .join("\n")}${"\n"}`;
}

const unQuotedPropertyRegex = /^[a-zA-Z_$][a-zA-Z0-9$_]*$/;
export function renderPropertyAccessor(property: string) {
  if (unQuotedPropertyRegex.test(property)) {
    return `.${property}`;
  } else {
    return `["${property}"]`;
  }
}
