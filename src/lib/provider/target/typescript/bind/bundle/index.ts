import chalk from "chalk";
import { resolve as pathResolve } from "path";
import { isArray } from "util";
import {
  buildTypeScriptContext,
  TypeScriptBundle,
  TypeScriptContext
} from "../..";
import {
  LogLevel,
  writeDebugLog,
  writeError,
  writeLog
} from "../../../../../logging";
import {
  NSchemaCustomPlugin,
  NSchemaInterface,
  NSchemaTask
} from "../../../../../model";
import { updateNamespace } from "../../../../../utils";
import { computeImportMatrix } from "../../helpers";
import { checkAndFixTarget } from "../rest";

const { yellow, blue, green } = chalk;

function computeBundleImportMatrix(
  arr: TypeScriptContext[],
  localNamespace: string,
  namespaceMapping: { [name: string]: string }
) {
  const rootContext: TypeScriptContext = {
    ...buildTypeScriptContext(),
    skipWrite: true
  };
  arr.forEach(item => {
    Object.keys(item.imports).forEach(p => {
      if (!rootContext.imports[p]) {
        rootContext.imports[p] = {};
      }
      const ns = item.imports[p];
      Object.keys(ns).forEach(name => {
        rootContext.imports[p][name] = item.imports[p][name];
      });
    });
  });
  return computeImportMatrix(localNamespace, namespaceMapping, rootContext);
}

async function execute(
  parentConfig: NSchemaTask | TypeScriptBundle,
  nschema: NSchemaInterface
) {
  if (parentConfig.$type !== "bundle") {
    throw new Error("Invalid bundle task");
  }
  // According from how this bundle is implemented I will always get 1 target here
  if (!parentConfig.target) {
    throw new Error("Invalid TypeScript bundle task");
  }
  const t: any = parentConfig;
  const config: TypeScriptBundle = updateNamespace({
    ...parentConfig,
    $fileName: t.$fileName
  });
  const target = isArray(parentConfig.target)
    ? parentConfig.target[0]
    : parentConfig.target;

  const namespaceMapping = target.$namespaceMapping || {};

  const newTarget = checkAndFixTarget(target, namespaceMapping);

  const arr = parentConfig.list || [];

  const r = arr.map(async (cur: NSchemaTask) => {
    writeDebugLog(
      `bundle - ts - generating ${cur.$type} ${(cur as any).namespace ||
        ""} :: ${(cur as any).name}`
    );
    return await nschema.generate(parentConfig, cur, { skipWrite: true });
  });
  const dblarr: Array<any | any[]> = await Promise.all(r);

  const reducedArr: Array<{
    context: TypeScriptContext;
    generated: string;
  }> = dblarr.reduce((acc: any | any[], next: any | any[]) => {
    if (nschema.isArray(next)) {
      return acc.concat(
        next.filter(item => {
          return item && item.generated && item.context;
        })
      );
    } else {
      if (next && next.generated) {
        return acc.concat([next]);
      } else {
        return acc;
      }
    }
  }, []);
  const results = reducedArr.map(item => {
    return item.generated;
  });
  if (!results.length) {
    return Promise.resolve(false);
  }
  let result = results.join("\n");
  const imports = computeBundleImportMatrix(
    reducedArr.map(item => item.context),
    config.namespace || "",
    namespaceMapping
  );

  result = `/* @flow */

${
  imports
    ? `
${imports}`
    : ""
}${result}`;

  const location = newTarget.location;
  const filepath =
    location.indexOf(".") === 0
      ? pathResolve(
          process.cwd(),
          location,
          newTarget.$fileName || `${config.namespace}.ts`
        )
      : pathResolve(location, config.$fileName || `${config.namespace}.ts`);

  writeLog(
    LogLevel.Default,
    `${yellow("bundle")}: ts - ${blue("writing")} to file: ${green(filepath)}`
  );
  return nschema.writeFile(filepath, result).then(
    () => {
      writeDebugLog(
        `${yellow(
          "bundle-typescript-objects"
        )}: clearing children list in ${parentConfig.namespace || ""}`
      );
      parentConfig.list = [];
    },
    err => {
      writeError("error: ");
      writeError(JSON.stringify(err, null, 2));
    }
  );
}

const bundle: NSchemaCustomPlugin = {
  description:
    "Handles the concept of namespacing (TypeScript only) in the generation process",
  execute,
  language: "typescript",
  name: "bundle-typescript-objects",
  serviceType: "*",
  type: "*",
  bind(bindName: string) {
    return bindName !== "rest-serverless";
  }
};

const exportable = {
  async init(nschema: NSchemaInterface) {
    return nschema.register("customBundle", bundle);
  }
};

export default exportable;
