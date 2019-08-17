import { default as deepCloneHelper } from "immutability-helper";
import { isArray } from "util";
import { NSchemaTask } from "./model";

declare const require: (name: string) => { default: NSchemaTask } | NSchemaTask;
function hasDefault(
  t: { default: NSchemaTask } | NSchemaTask
): t is { default: NSchemaTask } {
  const x: any = t;
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
  return (a: T, b: T) =>
    mapper(a)
      .toLowerCase()
      .localeCompare(mapper(b).toLowerCase());
}

export function isRelativePath(p: string) {
  return p[0] === "." || p[0] === "/";
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

export function initialCaps(n: string) {
  if (!n) {
    return n;
  }
  return n[0].toUpperCase() + n.substr(1);
}

/**
 * if $target is available then return a config such that target is the concat of [...target, ...$target] and $target is undefined
 *
 * @export
 * @param {NSchemaTask} config
 * @returns {NSchemaTask}
 */
export function appendTarget(config: NSchemaTask): NSchemaTask {
  return config.$type !== "clean" &&
    config.$type !== "import" &&
    config.$type !== "nschemaConfig" &&
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
    config.$type !== "import" &&
    config.$type !== "nschemaConfig" &&
    parentConfig.$type !== "import" &&
    parentConfig.$type !== "nschemaConfig" &&
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
  let r = "";
  for (let cnt = 0; cnt < (amount || 0); cnt += 1) {
    r += seed;
  }
  return r;
}
