import * as path from "path";
import {
  Definition,
  NSchemaCustomPlugin,
  NSchemaInterface
} from "../../../../../model";
import { buildgRPCContext, gRPCContext } from "../../gRPC";
import { computeImportMatrix } from "../../helpers";

const excludedConfigNames = ["$type", "$namespace", "list"];

function computeBundleImportMatrix(
  arr: gRPCContext[],
  localNamespace: string,
  namespaceMapping: { [name: string]: string }
) {
  const rootContext: gRPCContext = {
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

async function execute(parentConfig: Definition, nschema: NSchemaInterface) {
  // According from how this bundle is implemented I will always get 1 target here
  const config: any = parentConfig;
  const target = config.$target[0];

  const namespaceMapping = target.$namespaceMapping || {};
  const newTarget = target;

  const arr = parentConfig.list || [];

  const r = arr.map((cur: Definition) => {
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
    config.namespace,
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
      ? path.resolve(
          process.cwd(),
          location,
          newTarget.$fileName || `${config.namespace}.proto`
        )
      : path.resolve(location, config.$fileName || `${config.namespace}.proto`);

  console.log(`bundle: writing to file: ${filepath}`);
  return nschema.writeFile(filepath, result).then(null, err => {
    console.log("error: ");
    console.log(err);
  });
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
  init(nschema: NSchemaInterface) {
    return nschema.register("customBundle", bundle);
  }
};

export default exportable;
