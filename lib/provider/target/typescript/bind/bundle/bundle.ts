import * as path from "path";
import {
  Definition,
  NSchemaCustomPlugin,
  NSchemaInterface,
  NSchemaPlugin
} from "../../../../../model";
import { TypeScriptConfig, TypeScriptContext } from "../../typescript";
import { checkAndFixTarget } from "../rest/rest";

const excludedConfigNames = ["$type", "$namespace", "list"];

function computeImportMatrix(
  arr: TypeScriptConfig[],
  localNamespace: string,
  namespaceMapping: { [name: string]: string }
) {
  const rootContext: TypeScriptContext = {
    imports: {}
  };
  arr.forEach(item => {
    Object.keys(item.$context.imports).forEach(p => {
      if (!rootContext.imports[p]) {
        rootContext.imports[p] = {};
      }
      const ns = item.$context.imports[p];
      Object.keys(ns).forEach(name => {
        rootContext.imports[p][name] = true;
      });
    });
  });
  const result = Object.keys(rootContext.imports)
    .filter(p => !!p && p !== localNamespace)
    .map(p => {
      return `import { ${Object.keys(rootContext.imports[p]).join(
        ", "
      )} } from '${namespaceMapping[p] || `./${p}`}'`;
    });
  return `${result.join("\n")}${"\n"}${result
    .map(r => `/*:: ${r} */`)
    .join("\n")}${"\n"}`;
}

async function execute(parentConfig: Definition, nschema: NSchemaInterface) {
  // According from how this bundle is implemented I will always get 1 target here
  const config: any = parentConfig;
  const target = config.$target[0];

  const namespaceMapping = target.$namespaceMapping || {};
  const newTarget = checkAndFixTarget(target, namespaceMapping);

  const arr = parentConfig.list || [];

  const r = arr.map((cur: Definition) => {
    const tsDefinition = cur as TypeScriptConfig;
    const t = tsDefinition.$skipWrite;
    tsDefinition.$skipWrite = true;
    return nschema.generate(parentConfig, cur).then(result => {
      tsDefinition.$skipWrite = t;
      return result;
    });
  });
  const dblarr: Array<any | any[]> = await Promise.all(r);

  const reducedArr: any[] = dblarr.reduce(
    (acc: any | any[], next: any | any[]) => {
      if (nschema.isArray(next)) {
        return acc.concat(
          next.filter(item => {
            return item && item.generated;
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
    return Promise.resolve(false);
  }
  let result = results.join("\n");

  const imports = computeImportMatrix(
    reducedArr.map(item => item.config),
    config.namespace,
    namespaceMapping
  );

  result = `/* @flow */

${imports}${"\n"}${result}`;

  const location = newTarget.location;
  const filepath =
    location.indexOf(".") === 0
      ? path.resolve(
          process.cwd(),
          location,
          newTarget.$fileName || `${config.namespace}.ts`
        )
      : path.resolve(location, config.$fileName || `${config.namespace}.ts`);

  console.log(`bundle: writing to file: ${filepath}`);
  return nschema.writeFile(filepath, result).then(null, err => {
    console.log("error: ");
    console.log(err);
  });
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
  init(nschema: NSchemaInterface) {
    return nschema.register("customBundle", bundle);
  }
};

export default exportable;
