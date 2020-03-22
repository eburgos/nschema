/* eslint-disable @typescript-eslint/no-var-requires */

import { default as deepCloneHelper } from "immutability-helper";
import { render as renderPrettyJson } from "prettyjson";
import { isArray } from "util";
import { writeError } from "./logging";
import {
  NSchemaTask,
  NSchemaType,
  NSchemaPrimitiveType,
  NSchemaLiteralsUnionType,
  shouldNever
} from "./model";

declare const require: (name: string) => { default: NSchemaTask } | NSchemaTask;
function hasDefault(
  task: { default: NSchemaTask } | NSchemaTask
): task is { default: NSchemaTask } {
  const x: any = task;
  if (x.default) {
    return true;
  }
  return false;
}
export function requireDefaultOrPackage(location: string) {
  const newConfig = require(location);
  if (!newConfig) {
    throw new Error(`Invalid import location: ${location}`);
  }
  const cfg = hasDefault(newConfig) ? newConfig.default : newConfig;
  return cfg;
}

export function caseInsensitiveSorter<T>(mapper: (s: T) => string) {
  return (source: T, target: T) =>
    mapper(source)
      .toLowerCase()
      .localeCompare(mapper(target).toLowerCase());
}

export function isRelativePath(path: string) {
  return path[0] === "." || path[0] === "/";
}

export function wrap(left: string, right: string) {
  return (src: string) => {
    return `${left}${src}${right}`;
  };
}

export function deepClone<T>(obj: T): T {
  return deepCloneHelper<T>(obj, {} as any);
}

export function updateNamespace<
  T extends { $namespace?: string; namespace?: string }
>(obj: T): T {
  if (obj.$namespace) {
    return {
      ...obj,
      $namespace: undefined,
      namespace: `${obj.namespace ? `${obj.namespace}.` : ""}${obj.$namespace}`
    };
  } else {
    return obj;
  }
}

export function initialCaps(srcString: string) {
  if (!srcString) {
    return srcString;
  }
  return srcString[0].toUpperCase() + srcString.substr(1);
}

/**
 * if $target is available then return a config such that target is the concat of [...target, ...$target] and $target is undefined
 *
 * @export
 * @param {NSchemaTask} config
 * @returns {NSchemaTask}
 */
export function appendTarget(config: NSchemaTask): NSchemaTask {
  return config.type !== "clean" &&
    config.type !== "import" &&
    config.$target &&
    config.target
    ? {
        ...config,
        $target: undefined,
        target: [
          ...(isArray(config.target) ? config.target : [config.target]),
          ...(isArray(config.$target) ? config.$target : [config.$target])
        ]
      }
    : config;
}

/**
 * Propagate target from it's parent (if children doesn't provide a target)
 *
 * @export
 * @param {NSchemaTask} config
 * @returns {NSchemaTask}
 */
export function propagateTarget(
  config: NSchemaTask,
  parentConfig: NSchemaTask
): NSchemaTask {
  if (
    config.type !== "import" &&
    parentConfig.type !== "import" &&
    typeof config.target === "undefined" &&
    typeof parentConfig.target !== "undefined"
  ) {
    return {
      ...config,
      target: isArray(parentConfig.target)
        ? parentConfig.target
        : [parentConfig.target]
    };
  } else {
    return config;
  }
}

export function indent(amount: number, seed: string) {
  let result = "";
  for (let cnt = 0; cnt < (amount || 0); cnt += 1) {
    result += seed;
  }
  return result;
}

export function isValidCriteriaProperty(key: string) {
  return key !== "location" && key.indexOf("$") !== 0;
}

export function prettyJson(obj: any) {
  return renderPrettyJson(obj);
}

export function getCriteria(obj: any) {
  const result: any = {};
  Object.keys(obj)
    .filter(isValidCriteriaProperty)
    .forEach(key => {
      result[key] = obj[key];
    });
  return `
${prettyJson(result)}
`;
}

export function exitOrError(err: any) {
  writeError(err);
  writeError("nineschema exited");
  process.exit(1);
}

export function findNonCollidingName(
  desired: string,
  opts: string[],
  filter?: (n: string) => boolean
) {
  let current = desired;
  let cnt = 0;
  while (opts.indexOf(current) >= 0 && (!filter || filter(current))) {
    cnt += 1;
    current = `${desired}${cnt}`;
  }
  return current;
}

export function isOptional(property: {
  realType?: NSchemaType;
  type: NSchemaType;
}): boolean {
  if (property.realType) {
    return isOptional({ type: property.realType });
  }
  if (typeof property.type === "object") {
    if (property.type.modifier) {
      const mods = isArray(property.type.modifier)
        ? property.type.modifier
        : [property.type.modifier];
      return mods.indexOf("option") === mods.length - 1;
    }
  }
  return false;
}

export function removeOptional(type: NSchemaType): NSchemaType {
  if (typeof type === "string") {
    return type;
  }
  const mods = type.modifier
    ? isArray(type.modifier)
      ? type.modifier
      : [type.modifier]
    : [];
  if (mods.length > 0 && mods[mods.length - 1] === "option") {
    return {
      ...type,
      modifier: mods.slice(0, mods.length - 1)
    };
  }
  return type;
}

export function isUnions(type: NSchemaType): type is NSchemaLiteralsUnionType {
  return (
    typeof (type as NSchemaLiteralsUnionType).literals !== "undefined" &&
    (type as NSchemaLiteralsUnionType).name === "string" &&
    (type as NSchemaLiteralsUnionType).namespace === ""
  );
}

export function findTypeMap(
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

export function typeMap(
  primitiveType: NSchemaPrimitiveType,
  isParameter: boolean
) {
  const result = findTypeMap(primitiveType, false, isParameter);
  if (typeof result === "undefined") {
    writeError(`Unknown type ${primitiveType}`);
    throw new Error(`Unknown type ${primitiveType}`);
  }
  return result;
}

export function isPrimitiveTypeString(primitiveType: string) {
  const x = primitiveType as NSchemaPrimitiveType;
  switch (x) {
    case "bool":
    case "date":
    case "string":
    case "int":
    case "float":
      return true;
    default:
      shouldNever(x, true);
      return false;
  }
}

export function isPrimitiveType(nschemaType: NSchemaType): boolean {
  if (typeof nschemaType === "string") {
    return isPrimitiveTypeString(nschemaType);
  } else if (isUnions(nschemaType)) {
    return true;
  } else {
    if (nschemaType.namespace === "") {
      return isPrimitiveType(nschemaType.name as NSchemaPrimitiveType);
    } else {
      return false;
    }
  }
}
