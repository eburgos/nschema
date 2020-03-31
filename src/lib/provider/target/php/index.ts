/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import * as chalk from "chalk";
import { existsSync, readdirSync, statSync } from "fs";
import { extname, resolve as pathResolve } from "path";
import {
  LogLevel,
  writeDebugLog,
  writeLog,
  writeError
} from "../../../logging";
import {
  NSchemaInterface,
  NSchemaMessageArgument,
  Target,
  TemplateFunction,
  NSchemaType,
  shouldNever,
  NSchemaPrimitiveType,
  NSchemaModifier,
  HasFilenameMixin
} from "../../../model";
import { deepClone, isUnions, isPrimitiveType, wrap } from "../../../utils";
import { ObjectTask } from "../../type/object";
import { MessageTask, AnonymousMessage } from "../../type/message";
import { ServiceTask } from "../../type/service";
import { isArray } from "util";
import { BundleTask } from "../../type/bundle";

const { blue, green, yellow } = chalk;

declare let require: (name: string) => any;

export interface PHPContext {
  hasPHP: true;
  id: number;
  imports: {
    [name: string]: {
      [name: string]: string | boolean;
    };
  };

  skipWrite?: boolean;
}

export async function phpGenerate(
  nschema: NSchemaInterface,
  nsconfig: ObjectTask | MessageTask | ServiceTask,
  template: TemplateFunction<
    ObjectTask | MessageTask | ServiceTask,
    PHPContext
  >,
  target: Target,
  providedContext: any | undefined
) {
  const config = deepClone(nsconfig);

  const context: PHPContext = {
    /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
    ...buildPHPContext(),
    ...providedContext,
    imports: {}
  };
  const result = template(config, nschema, context, target);

  if (context.skipWrite) {
    writeDebugLog(
      `${yellow("php")}: skipped write on ${target.location} - ${
        target.$fileName || target.name || ""
      } due to context`
    );
    return Promise.resolve({
      config,
      context,
      generated: result
    });
  } else {
    const location = target.location;
    const filepath = location.startsWith(".")
      ? pathResolve(
          process.cwd(),
          location,
          config.namespace || "",
          target.$fileName || `${config.name}.php`
        )
      : pathResolve(location, config.namespace || "", `${config.name}.php`);

    writeLog(
      LogLevel.Default,
      `${blue("php")}: writing to file: ${green(filepath)}`
    );
    await nschema.writeFile(filepath, result);
    return {
      config,
      context,
      generated: result
    };
  }
}

async function init(nschema: NSchemaInterface) {
  const providerPath = pathResolve(__dirname, "bind");
  return Promise.all(
    readdirSync(providerPath)
      .filter((item) => {
        return statSync(pathResolve(providerPath, item)).isDirectory();
      })
      .map((directoryPath) => {
        return readdirSync(pathResolve(providerPath, directoryPath)).map(
          (item) => {
            return pathResolve(providerPath, directoryPath, item);
          }
        );
      })
      .reduce((accumulated, next) => {
        return accumulated.concat(next);
      })
      .filter((item) => {
        return extname(item) === ".js" && existsSync(item);
      })
      .map(require)
      .map(async (requiredModule) => {
        if (requiredModule.default) {
          requiredModule = requiredModule.default;
        }
        return new Promise<boolean>((resolve, reject) => {
          if (typeof requiredModule.init === "function") {
            requiredModule.init(nschema).then(
              () => {
                resolve(true);
              },
              (err: Error) => {
                reject(err);
              }
            );
          } else {
            resolve(true);
          }
        });
      })
  ).then(undefined, (err) => {
    throw new Error(err);
  });
}

function getDataItems(
  nschema: NSchemaInterface,
  nsMessage: AnonymousMessage
): NSchemaMessageArgument[] {
  const dataItems: NSchemaMessageArgument[] = [];
  if (nsMessage.extends) {
    const parent = nschema.getMessage(
      nsMessage.extends.namespace || "",
      nsMessage.extends.name
    );
    if (parent) {
      getDataItems(nschema, parent).forEach((dataItem) => {
        dataItems.push(dataItem);
      });
    } else {
      throw new Error(
        `could not find parent: ns="${
          nsMessage.extends.namespace || ""
        }" name="${nsMessage.extends.name}"`
      );
    }
  }
  (nsMessage.data || []).map((item) => {
    dataItems.push(item);
  });
  return dataItems;
}

const quotesWrap = wrap(`"`, `"`);

function findTypeMap(
  primitiveType: NSchemaPrimitiveType,
  skipError: boolean,
  isParameter: boolean
) {
  switch (primitiveType) {
    case "int":
      return "number";
    case "float":
      return "number";
    case "string":
      return "string";
    case "bool":
      return "boolean";
    case "date":
      return isParameter ? "Date | number" : "number";
    default:
      shouldNever(primitiveType, skipError);
      return undefined;
  }
}

function typeMap(primitiveType: NSchemaPrimitiveType, isParameter: boolean) {
  const result = findTypeMap(primitiveType, false, isParameter);
  if (typeof result === "undefined") {
    writeError(`Unknown type ${primitiveType}`);
    throw new Error(`Unknown type ${primitiveType}`);
  }
  return result;
}

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
    let typeNamespace = nschemaType.namespace;
    if (typeof typeNamespace === "undefined") {
      typeNamespace = namespace || "";
    }
    if (
      typeNamespace !== namespace &&
      !isPrimitiveType(nschemaType) &&
      context
    ) {
      if (!context.imports[typeNamespace]) {
        context.imports[typeNamespace] = {};
      }
      context.imports[typeNamespace][nschemaType.name] = true;
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
    const modifier = nschemaType.modifier;
    const modifierArr: NSchemaModifier[] = !isArray(modifier)
      ? [modifier]
      : modifier;

    modifierArr.forEach((item, itemIndex, arr) => {
      /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
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

export function messageType(
  nschema: NSchemaInterface,
  context: PHPContext,
  addFlowComment: boolean,
  message: AnonymousMessage
): string {
  const typeSeparator = ", ";

  const dataItems = getDataItems(nschema, message);
  if (dataItems.length === 0) {
    return "void";
  } else if (dataItems.length === 1) {
    const item = dataItems[0];
    return `${typeName(
      item.type,
      nschema,
      "",
      "",
      context,
      addFlowComment,
      false,
      true
    )}`;
  } else {
    return (
      `{ ${dataItems
        .map((item, itemIndex) => {
          return `${item.name || `item${itemIndex}`}: ${typeName(
            item.type,
            nschema,
            "",
            "",
            context,
            addFlowComment,
            false,
            true
          )}`;
        })
        .join(typeSeparator)} }` || "void"
    );
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

let count = 0;

export function buildPHPContext(): PHPContext {
  return {
    hasPHP: true,
    id: count++,
    imports: {},
    skipWrite: false
  };
}

export interface PHPBundle extends BundleTask, HasFilenameMixin {}

export default {
  init
};
