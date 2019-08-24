import chalk from "chalk";
import { resolve as pathResolve } from "path";
import { isArray } from "util";
import { buildgRPCContext, GRPCBundle, GRPCContext } from "../..";
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

const { yellow, blue, green } = chalk;

function computeBundleImportMatrix(
  arr: GRPCContext[],
  localNamespace: string,
  namespaceMapping: { [name: string]: string }
) {
  const rootContext: GRPCContext = {
    ...buildgRPCContext(),
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
  parentConfig: NSchemaTask | GRPCBundle,
  nschema: NSchemaInterface
) {
  if (parentConfig.type !== "bundle") {
    throw new Error("Invalid bundle task");
  }
  // According from how this bundle is implemented I will always get 1 target here
  if (!parentConfig.target) {
    throw new Error("Invalid gRPC bundle task");
  }
  const t: any = parentConfig;
  const config: GRPCBundle = updateNamespace({
    ...parentConfig,
    $fileName: t.$fileName
  });

  const target = isArray(parentConfig.target)
    ? parentConfig.target[0]
    : parentConfig.target;

  const namespaceMapping = target.$namespaceMapping || {};
  const newTarget = target;

  const arr = parentConfig.list || [];

  const r = arr.map(async (cur: NSchemaTask) => {
    return nschema.generate(parentConfig, cur, { skipWrite: true });
  });
  const dblarr: Array<any | any[]> = await Promise.all(r);

  const reducedArr: any[] = dblarr.reduce(
    (acc: any | any[], next: any | any[]) => {
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
    },
    []
  );
  const results = reducedArr.map(item => {
    return item.generated;
  });
  if (!results.length) {
    return false;
  }
  let result = results.join("\n");
  const imports = computeBundleImportMatrix(
    reducedArr.map(item => item.context),
    config.namespace || "",
    namespaceMapping
  );

  result = `syntax = "proto3";

option java_multiple_files = true;
option java_package = "${config.namespace}";
option java_outer_classname = "${config.namespace}Proto";
option objc_class_prefix = "RTG";

package ${config.namespace};
/* Imports:
${imports}${"\n"}
*/

${result}`;

  const location = newTarget.location;
  const filepath =
    location.indexOf(".") === 0
      ? pathResolve(
          process.cwd(),
          location,
          newTarget.$fileName || `${config.namespace}.proto`
        )
      : pathResolve(location, config.$fileName || `${config.namespace}.proto`);

  writeLog(
    LogLevel.Default,
    `${yellow("bundle")}: gRPC - ${blue("writing")} to file: ${green(filepath)}`
  );
  return nschema.writeFile(filepath, result).then(
    () => {
      writeDebugLog(
        `${yellow(
          "bundle-gRPC-objects"
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
  description: "Handles gRPC bundling",
  execute,
  language: "gRPC",
  name: "bundle-gRPC-objects",
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
