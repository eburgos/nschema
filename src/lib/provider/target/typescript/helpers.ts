/* eslint-disable @typescript-eslint/no-use-before-define */

import { isArray } from "util";
import { TypeScriptContext } from ".";
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
import { TypeScriptMessage } from "./bind/object";

const moduleSort = (
  source: { modulePath: string },
  target: { modulePath: string }
) => {
  const sourceLowerCase = source.modulePath.toLocaleLowerCase();
  const targetLowerCase = target.modulePath.toLocaleLowerCase();
  for (let cnt = 0; cnt < sourceLowerCase.length; cnt += 1) {
    if (sourceLowerCase[cnt] !== targetLowerCase[cnt]) {
      if (sourceLowerCase[cnt] === ".") {
        return -1;
      }
      return sourceLowerCase[cnt].localeCompare(targetLowerCase[cnt]);
    }
  }
  return 0;
};

const importsSort = caseInsensitiveSorter((item: string) => item);
const noWrap = wrap("", "");
const curlyWrap = wrap("{ ", " }");
const quotesWrap = wrap(`"`, `"`);

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
  const starred = importNames.filter((name) => name[0] === "*");
  const normalExports = importNames.filter((name) => name[0] !== "*");

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
  $context: TypeScriptContext
) {
  const rootContext = {
    imports: {} as { [name: string]: { [name: string]: string | boolean } }
  };
  Object.keys($context.imports).forEach((contextImport) => {
    if (!rootContext.imports[contextImport]) {
      rootContext.imports[contextImport] = {};
    }
    const namespace = $context.imports[contextImport];
    Object.keys(namespace).forEach((name) => {
      rootContext.imports[contextImport][name] =
        $context.imports[contextImport][name];
    });
  });

  const sortedImports = Object.keys(rootContext.imports)
    .filter((contextImport) => {
      return contextImport !== localNamespace;
    })
    .map((contextImport) => {
      return {
        imports: rootContext.imports[contextImport],
        modulePath:
          contextImport.indexOf("{") === 0 &&
          contextImport.lastIndexOf("}") === contextImport.length - 1
            ? contextImport.slice(1, contextImport.length - 1)
            : namespaceMapping[contextImport] ||
              (isRelativePath(contextImport)
                ? contextImport
                : `./${contextImport}`),
        name: contextImport
      };
    });

  sortedImports.sort(moduleSort);

  const lines = sortedImports.map((sortedImport) => {
    const sorted = Object.keys(sortedImport.imports);
    sorted.sort(importsSort);
    const importNames = sorted.map((importName) =>
      typeof sortedImport.imports[importName] === "string"
        ? `${importName} as ${sortedImport.imports[importName]}`
        : importName
    );
    return renderImport(importNames, sortedImport.modulePath);
  });
  if (!lines.length) {
    return "";
  }
  return `${lines.join("\n")}
${lines.map(surroundWithFlow).join("\n")}
`;
}

const unQuotedPropertyRegex = /^[a-zA-Z_$][a-zA-Z0-9$_]*$/;
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
  context: TypeScriptContext
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
 * @param {TypeScriptContext} context
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
  context: TypeScriptContext,
  addFlowComment: boolean,
  isParameter: boolean,
  isRootTypeCall: boolean
) {
  let result: string;
  if (typeof nschemaType === "string") {
    result = typeMap(nschemaType, isParameter);
  } else if (typeof nschemaType === "object") {
    let namespace = nschemaType.namespace;
    if (typeof namespace === "undefined") {
      namespace = namespace || "";
    }
    if (namespace !== namespace && !isPrimitiveType(nschemaType) && context) {
      if (!context.imports[namespace]) {
        context.imports[namespace] = {};
      }
      context.imports[namespace][nschemaType.name] = true;
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

    modifierArr.forEach((item, itemIndex, arr) => {
      result = `${result}${modifierMap(
        item,
        nschema,
        namespace,
        name,
        context
      )}`;
      if (!isRootTypeCall || itemIndex + 1 < arr.length) {
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

function getDataItems(
  nsMessage: TypeScriptMessage,
  $nschema: NSchemaInterface
) {
  const dataItems: NSchemaMessageArgument[] = [];
  if (nsMessage.extends) {
    const parent = $nschema.getMessage(
      nsMessage.extends.namespace || "",
      nsMessage.extends.name
    );
    if (parent) {
      getDataItems(parent, $nschema).forEach((dataItem) => {
        dataItems.push(dataItem);
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
  (nsMessage.data || []).forEach((item) => {
    dataItems.push(item);
  });
  return dataItems;
}

export function messageType(
  nschema: NSchemaInterface,
  nschemaMessage: TypeScriptMessage,
  nschemaMessageDirection: "in" | "out",
  context: TypeScriptContext
) {
  const typeSeparator =
    nschemaMessageDirection === "in"
      ? ", "
      : nschemaMessageDirection === "out"
      ? ", "
      : "";

  const dataItems = getDataItems(nschemaMessage, nschema);
  const result =
    dataItems.length === 0
      ? ["void"]
      : dataItems.length === 1
      ? [
          typeName(
            dataItems[0].type,
            nschema,
            nschemaMessage.namespace,
            nschemaMessage.name,
            context,
            true,
            false,
            true
          )
        ]
      : dataItems.map((item, itemIndex) => {
          return `${item.name || `item${itemIndex}`}: ${typeName(
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

  return result.length === 1 ? result[0] : `{ ${result.join(typeSeparator)} }`;
}
