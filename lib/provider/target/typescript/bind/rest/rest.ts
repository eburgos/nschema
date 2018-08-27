/**
 * Created by eburgos on 6/13/14.
 */

"use strict";
import { TemplateFunction } from "ejs";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import {
  Definition,
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService,
  NSchemaService,
  Target,
  TargetBind
} from "../../../../../model";
import { TypeScript, TypeScriptConfig } from "../../typescript";

export interface TypeScriptRestTarget extends Target {
  $typeScriptRest?: {
    requestModule: string;
  };
}

export function checkAndFixTarget(
  target: Target,
  namespaceMapping: { [name: string]: string }
): TypeScriptRestTarget {
  const r: TypeScriptRestTarget = {
    $typeScriptRest: { requestModule: "axios" },
    ...target
  };
  if (!r.$typeScriptRest) {
    throw new Error("Invalid target for TypeScript Rest");
  }
  if (!r.$typeScriptRest.requestModule) {
    throw new Error("Invalid target requestModule for TypeScript Rest");
  }
  if (namespaceMapping) {
    if (!namespaceMapping[r.$typeScriptRest.requestModule]) {
      //If there is no mapping already set for request module then leave it as it is to avoid a local relative reference
      namespaceMapping[r.$typeScriptRest.requestModule] =
        r.$typeScriptRest.requestModule;
    }
  }
  return r;
}

function baseGenerate(
  config: Definition,
  nschema: NSchemaInterface,
  target: TypeScriptRestTarget,
  template: TemplateFunction,
  typescript: TypeScript
) {
  return typescript.generate(nschema, config, template, target);
}

const templates: { [name: string]: TemplateFunction } = {};

function computeImportMatrix(
  localNamespace: string,
  namespaceMapping: { [name: string]: string },
  $context: any
) {
  const rootContext: any = {
    imports: {}
  };

  Object.keys($context.imports).forEach(p => {
    if (!rootContext.imports[p]) {
      rootContext.imports[p] = {};

      const ns = $context.imports[p];
      Object.keys(ns).forEach(name => {
        rootContext.imports[p][name] = true;
      });
    }
  });
  return Object.keys(rootContext.imports)
    .filter(p => {
      return p !== localNamespace;
    })
    .map(p => {
      return `import { ${Object.keys(rootContext.imports[p]).join(
        ", "
      )} } from '${namespaceMapping[p] || `./${p}`}';`;
    })
    .join("\n");
}

async function serverlessPostGen(
  result: { generated: any; config: TypeScriptConfig } | any,
  nschema: NSchemaInterface,
  target: TypeScriptRestTarget,
  config: NSchemaRestService,
  template: TemplateFunction,
  typescript: TypeScript
): Promise<{ generated: any; config: TypeScriptConfig }> {
  const tgt: any = target;
  const serverless = tgt.$serverless;
  if (!serverless) {
    throw new Error(`target requires a '$serverless' property`);
  }
  const implementation: string = serverless.implementation;
  const yamlPath: string = serverless.yamlPath;
  let routePrefix = config.routePrefix || "";
  if (routePrefix.indexOf("/") === 0) {
    routePrefix = routePrefix.substr(1);
  }
  const realYamlPath = path.resolve(tgt.location, yamlPath);
  const realLocation = path.resolve(tgt.location);
  const serverlessYml = yaml.safeLoad(fs.readFileSync(realYamlPath, "utf8"));
  if (!serverlessYml.functions) {
    serverlessYml.functions = {};
  }
  const fns = serverlessYml.functions;
  for (const p in fns) {
    if (fns.hasOwnProperty(p)) {
      delete fns[p];
    }
  }

  const operations = config.operations;
  Object.keys(operations).forEach((op: string) => {
    const operation: NSchemaRestOperation = operations[
      op
    ] as NSchemaRestOperation;
    fns[op] = {
      events: [
        {
          http: {
            cors: true,
            method: operation.method,
            path: `${routePrefix}${operation.route}`
          }
        }
      ],
      handler: `${path.relative(path.dirname(realYamlPath), realLocation)}/${
        config.namespace
      }/${config.name}.${op}`
    };
  });

  const filePath = path.resolve(tgt.location, yamlPath);
  console.log(`rest-serverless: writing to: ${filePath}`);
  fs.writeFileSync(filePath, yaml.safeDump(serverlessYml));

  const imports = computeImportMatrix(
    config.namespace || "",
    target.$namespaceMapping || {},
    result.config.$context
  );
  result.generated = `${imports}${"\n"}${result.generated}`;

  const location = target.location;
  const filepath =
    location.indexOf(".") === 0
      ? path.resolve(
          process.cwd(),
          location,
          config.namespace || "",
          target.$fileName || `${config.name}.ts`
        )
      : path.resolve(
          location,
          config.namespace || "",
          config.$fileName || `${config.name}.ts`
        );

  console.log(`typescript: writing again to file: ${filepath}`);
  await nschema.writeFile(filepath, result.generated);

  const thisTemplate = templates["consumer-serverless"];
  const tempConfig: any = config.$u.clone(config);
  tempConfig.$skipWrite = true;
  const exportsResult: any = await baseGenerate(
    tempConfig,
    nschema,
    checkAndFixTarget(target, target.$namespaceMapping || {}),
    thisTemplate,
    typescript
  );

  const thisImports = computeImportMatrix(
    config.namespace || "",
    target.$namespaceMapping || {},
    exportsResult.config.$context
  );
  exportsResult.generated = `${thisImports}${"\n"}${exportsResult.generated}`;
  const newFilePath = path.resolve(
    path.dirname(filepath),
    `${path.basename(`${filepath}`, path.extname(filepath))}Base${path.extname(
      filepath
    )}`
  );

  console.log(`typescript: writing again to file: ${newFilePath}`);
  await nschema.writeFile(newFilePath, exportsResult.generated);

  return result;
}

export class NRest {
  public language = "typescript";
  public name = "rest";
  public type = "service";
  public typescript: TypeScript | undefined = undefined;
  public init(nschema: NSchemaInterface) {
    if (!this.typescript) {
      throw new Error("Argument exception");
    }
    const typescript: TypeScript = this.typescript as TypeScript;

    templates.consumer = nschema.buildTemplate(
      path.resolve(__dirname, "serviceConsumer.ejs")
    );
    templates["consumer-serverless"] = nschema.buildTemplate(
      path.resolve(__dirname, "serviceConsumerBase-serverless.ejs")
    );
    templates["consumer-serverless-exports"] = nschema.buildTemplate(
      path.resolve(__dirname, "serviceConsumer-serverless.ejs")
    );
    templates.producer = nschema.buildTemplate(
      path.resolve(__dirname, "serviceProducer.ejs")
    );
    return Promise.all(
      [
        {
          bind: "rest",
          postGen: undefined,
          template: "consumer",
          type: "consumer"
        },
        {
          bind: "rest-serverless",
          postGen: serverlessPostGen,
          template: "consumer-serverless-exports",
          type: "consumer"
        },
        {
          bind: "rest",
          postGen: undefined,
          template: "producer",
          type: "producer"
        }
      ].map(serviceType => {
        return nschema.registerTarget({
          bind: serviceType.bind,
          description: "Rest services in typescript",
          language: "typescript",
          name: "typescript/rest",
          serviceType: serviceType.type,
          type: "service",
          generate(
            config: Definition,
            thisNschema: NSchemaInterface,
            target: Target
          ) {
            const newTarget = checkAndFixTarget(
              target,
              target.$namespaceMapping || {}
            );
            let p = baseGenerate(
              config,
              thisNschema,
              newTarget,
              templates[serviceType.template],
              typescript
            );
            if (serviceType.postGen) {
              p = p.then((result: any) => {
                if (serviceType.postGen) {
                  return serviceType.postGen(
                    result,
                    thisNschema,
                    newTarget,
                    config as NSchemaService,
                    templates[serviceType.template],
                    typescript
                  );
                } else {
                  throw new Error("Not possible");
                }
              });
            }
            return p;
          }
        });
      })
    );
  }
}

const rest = new NRest();

export default rest;
