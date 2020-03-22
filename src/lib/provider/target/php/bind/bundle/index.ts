import * as chalk from "chalk";
import { resolve as pathResolve } from "path";
import { isArray } from "util";
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
import { PHPContext, buildPHPContext, PHPBundle } from "../..";

const { yellow, blue, green } = chalk;

function computeBundleImportMatrix(
  arr: PHPContext[],
  localNamespace: string,
  namespaceMapping: { [name: string]: string }
) {
  const rootContext: PHPContext = {
    ...buildPHPContext(),
    skipWrite: true
  };
  arr.forEach((item) => {
    Object.keys(item.imports).forEach((importName) => {
      if (!rootContext.imports[importName]) {
        rootContext.imports[importName] = {};
      }
      const namespace = item.imports[importName];
      Object.keys(namespace).forEach((name) => {
        rootContext.imports[importName][name] = item.imports[importName][name];
      });
    });
  });
  return computeImportMatrix(localNamespace, namespaceMapping, rootContext);
}

async function execute(
  parentConfig: NSchemaTask | PHPBundle,
  nschema: NSchemaInterface
) {
  if (parentConfig.type !== "bundle") {
    throw new Error("Invalid bundle task");
  }
  // According from how this bundle is implemented I will always get 1 target here
  if (!parentConfig.target) {
    throw new Error("Invalid PHP bundle task");
  }
  const parentConfigAny: any = parentConfig;
  const config: PHPBundle = updateNamespace({
    ...parentConfig,
    $fileName: parentConfigAny.$fileName
  });
  const target = isArray(parentConfig.target)
    ? parentConfig.target[0]
    : parentConfig.target;

  const namespaceMapping = target.$namespaceMapping || {};

  const arr = parentConfig.list || [];

  const waitables = arr.map(async (cur: NSchemaTask) => {
    writeDebugLog(
      `bundle - php - generating ${cur.type} ${
        (cur as any).namespace || ""
      } :: ${(cur as any).name}`
    );
    return await nschema.generate(parentConfig, cur, { skipWrite: true });
  });
  const dblarr: Array<any | any[]> = await Promise.all(waitables);

  const reducedArr: Array<{
    context: PHPContext;
    generated: string;
  }> = dblarr.reduce((acc: any | any[], next: any | any[]) => {
    if (nschema.isArray(next)) {
      return acc.concat(
        next.filter((item) => {
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
  const results = reducedArr.map((item) => {
    return item.generated;
  });
  if (!results.length) {
    return Promise.resolve(false);
  }
  let result = results.join("\n");
  const imports = computeBundleImportMatrix(
    reducedArr.map((item) => item.context),
    config.namespace || "",
    namespaceMapping
  );

  result = `<?php
${
  imports
    ? `
${imports}`
    : ""
}
namespace ${(parentConfig.namespace || "").replace(/\./g, "\\")};
${result}`;

  const location = target.location;
  const filepath =
    location.indexOf(".") === 0
      ? pathResolve(
          process.cwd(),
          location,
          target.$fileName || config.$fileName || `${config.namespace}.php`
        )
      : pathResolve(
          location,
          target.$fileName || config.$fileName || `${config.namespace}.php`
        );

  writeLog(
    LogLevel.Default,
    `${yellow("bundle")}: php - ${blue("writing")} to file: ${green(filepath)}`
  );
  return nschema.writeFile(filepath, result).then(undefined, (err) => {
    writeError("error: ");
    writeError(JSON.stringify(err, null, 2));
  });
}

const bundle: NSchemaCustomPlugin = {
  description:
    "Handles the concept of namespacing (PHP only) in the generation process",
  execute,
  language: "php",
  name: "bundle-php-objects",
  serviceType: "*",
  type: "*",
  bind() {
    return true;
  }
};

const exportable = {
  async init(nschema: NSchemaInterface) {
    return nschema.register("customBundle", bundle);
  }
};

export default exportable;
