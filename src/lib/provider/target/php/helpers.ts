import { isArray } from "util";
import { PHPContext } from ".";
import { writeError } from "../../../logging";
import {
  AppendableMixin,
  NSchemaInterface,
  NSchemaMessageArgument,
  NSchemaModifier,
  NSchemaPrimitiveType,
  NSchemaType
} from "../../../model";
import {
  caseInsensitiveSorter,
  isRelativePath,
  wrap,
  typeMap,
  isPrimitiveType,
  isUnions,
  findTypeMap
} from "../../../utils";
import { MessageTask } from "../../type/message";

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
const quotesWrap = wrap(`"`, `"`);

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
    return `require_once "${modulePath}"`;
  }

  const tryImport = `require_once /*${wrapFn(
    importNames.join(", ")
  )}*/ "${modulePath}";`;
  if (tryImport.length < 82) {
    return tryImport;
  } else {
    return `require_once /*
  ${importNames.join(`,
  `)}
*/ "${modulePath}";`;
  }
}

export function computeImportMatrix(
  localNamespace: string,
  namespaceMapping: { [name: string]: string },
  $context: PHPContext
) {
  const rootContext = {
    imports: {} as { [name: string]: { [name: string]: string | boolean } }
  };
  Object.keys($context.imports).forEach(p => {
    if (!rootContext.imports[p]) {
      rootContext.imports[p] = {};
    }
    const ns = $context.imports[p];
    Object.keys(ns).forEach(name => {
      rootContext.imports[p][name] = $context.imports[p][name];
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
  if (!lines.length) {
    return "";
  }
  return `${lines.join("\n")}
`;
}

const unQuotedPropertyRegex = /^[a-zA-Z\_\$][a-zA-Z0-9\$\_]*$/;
export function renderPropertyAccessor(property: string) {
  if (unQuotedPropertyRegex.test(property)) {
    return `.${property}`;
  } else {
    return `["${property}"]`;
  }
}

export function renderFileHeader(
  obj: AppendableMixin & {
    description?: string;
    name: string;
    subType?: "enumeration" | "";
  }
) {
  if (obj.append) {
    return "";
  } else {
    return `/**
 * ${
   typeof obj.description === "string"
     ? obj.description.replace(/\n/g, "\n * ")
     : ""
 }
 *
 * @export
 * @${obj.subType === "enumeration" ? "enum" : "interface"} ${obj.name}
 */`;
  }
}

function modifierMap(
  modifier: NSchemaModifier,
  nschema: NSchemaInterface,
  namespace: string | undefined,
  name: string,
  context: PHPContext
): string {
  switch (modifier) {
    case "list":
      return "[]";
    case "array":
      return "[]";
    case "option":
      return " | undefined";
    default:
      return typeName(
        modifier,
        nschema,
        namespace,
        name,
        context,
        false,
        false,
        false
      );
  }
}

/**
 * Returns a typescript type definition name given a TypeScriptType
 *
 * @export
 * @param {TypeScriptType} nschemaType
 * @param {NSchemaInterface} nschema
 * @param {(string | undefined)} namespace
 * @param {string} name
 * @param {PHPContext} context
 * @param {boolean} addFlowComment
 * @param {boolean} isParameter
 * @param {boolean} isRootTypeCall true if this function is not being called from within itself
 * @returns
 */
export function typeName(
  nschemaType: NSchemaType,
  nschema: NSchemaInterface,
  namespace: string | undefined,
  name: string,
  context: PHPContext,
  addFlowComment: boolean,
  isParameter: boolean,
  isRootTypeCall: boolean
) {
  let result: string;
  if (typeof nschemaType === "string") {
    result = typeMap(nschemaType, isParameter);
  } else if (typeof nschemaType === "object") {
    let ns = nschemaType.namespace;
    if (typeof ns === "undefined") {
      ns = namespace || "";
    }
    if (ns !== namespace && !isPrimitiveType(nschemaType) && context) {
      if (!context.imports[ns]) {
        context.imports[ns] = {};
      }
      context.imports[ns][nschemaType.name] = true;
    }
    if (isUnions(nschemaType)) {
      result = nschemaType.literals.map(quotesWrap).join(" | ");
    } else {
      if (
        typeof findTypeMap(
          nschemaType.name as NSchemaPrimitiveType,
          true,
          true
        ) === "string"
      ) {
        result = typeMap(nschemaType.name as NSchemaPrimitiveType, isParameter);
      } else {
        result = nschemaType.name;
      }
    }
  } else {
    result = typeMap("string", isParameter);
  }
  if (nschemaType && typeof nschemaType === "object" && nschemaType.modifier) {
    const $modifier = nschemaType.modifier;
    const modifierArr: NSchemaModifier[] = !isArray($modifier)
      ? [$modifier]
      : $modifier;

    modifierArr.forEach((item, i, arr) => {
      result = `${result}${modifierMap(
        item,
        nschema,
        namespace,
        name,
        context
      )}`;
      if (!isRootTypeCall || i + 1 < arr.length) {
        result = `(${result})`;
      }
    });
  }
  if (addFlowComment) {
    return `${result} /* :${result} */`;
  } else {
    return result;
  }
}

function getDataItems(nsMessage: MessageTask, $nschema: NSchemaInterface) {
  const r: NSchemaMessageArgument[] = [];
  if (nsMessage.extends) {
    const parent = $nschema.getMessage(
      nsMessage.extends.namespace || "",
      nsMessage.extends.name
    );
    if (parent) {
      getDataItems(parent, $nschema).forEach(i => {
        r.push(i);
      });
    } else {
      writeError(
        `could not find parent: ns=${nsMessage.extends.namespace || ""} name=${
          nsMessage.extends.name
        }`
      );
      throw new Error("Could not find parent message");
    }
  }
  (nsMessage.data || []).forEach(item => {
    r.push(item);
  });
  return r;
}

export function messageType(
  nschema: NSchemaInterface,
  nschemaMessage: MessageTask,
  nschemaMessageDirection: "in" | "out",
  context: PHPContext
) {
  const $_typeSeparator =
    nschemaMessageDirection === "in"
      ? ", "
      : nschemaMessageDirection === "out"
      ? ", "
      : "";

  const $_dataItems = getDataItems(nschemaMessage, nschema);
  const result =
    $_dataItems.length === 0
      ? ["void"]
      : $_dataItems.length === 1
      ? [
          typeName(
            $_dataItems[0].type,
            nschema,
            nschemaMessage.namespace,
            nschemaMessage.name,
            context,
            true,
            false,
            true
          )
        ]
      : $_dataItems.map((item, $i) => {
          return `${item.name || `item${$i}`}: ${typeName(
            item.type,
            nschema,
            nschemaMessage.namespace,
            nschemaMessage.name,
            context,
            true,
            false,
            true
          )}`;
        });

  return result.length === 1
    ? result[0]
    : `{ ${result.join($_typeSeparator)} }`;
}
