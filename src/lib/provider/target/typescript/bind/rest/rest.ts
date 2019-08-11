/**
 * Created by eburgos on 6/13/14.
 */

"use strict";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import { LogLevel, writeLog } from "../../../../../logging";
import {
  Definition,
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService,
  Target,
  NSchemaMessageArgument,
  NSchemaType,
  NSchemaService
} from "../../../../../model";
import { computeImportMatrix } from "../../helpers";
import {
  buildTypeScriptContext,
  RestClientStrategy,
  TypeScript,
  TypeScriptContext
} from "../../typescript";
import { render as renderConsumer } from "./serviceConsumer";
import { render as renderServerlessConsumer } from "./serviceConsumer-serverless";
import { render as renderServerlessConsumerBase } from "./serviceConsumerBase-serverless";
import { render as renderProducer } from "./serviceProducer";
import { clone } from "../../../../../utils";

export interface TypeScriptRestTarget extends Target {
  $restClientStrategy?: RestClientStrategy;
  $typeScriptRest?: {
    requestModule: string;
  };
}

export interface TypeScriptServerlessRest extends TypeScriptRestTarget {
  $serverless: {
    implementation: string;
    yamlPath: string;
  };
}

export interface RestMessageArgument extends NSchemaMessageArgument {
  headerName?: string;
  paramType?: "header" | "query";
  realType?: NSchemaType;
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

type TemplateFunction = (data: any | undefined) => string;

function baseGenerate(
  config: NSchemaService,
  nschema: NSchemaInterface,
  target: TypeScriptRestTarget,
  template: TemplateFunction,
  typescript: TypeScript,
  context: any
) {
  return typescript.generate(nschema, config, template, target, context);
}

const templates: { [name: string]: TemplateFunction } = {};

async function serverlessPostGen(
  result: { generated: any; config: Definition } | any,
  nschema: NSchemaInterface,
  target: TypeScriptRestTarget,
  config: NSchemaRestService,
  template: TemplateFunction,
  typescript: TypeScript,
  context: TypeScriptContext
): Promise<{ generated: any; config: Definition; context: any }> {
  const tgt: any = target;
  const serverless = tgt.$serverless;
  if (!serverless) {
    throw new Error(`target requires a '$serverless' property`);
  }
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
  writeLog(
    LogLevel.Default,
    `rest-serverless: updating serverless yml specification at: ${filePath}`
  );
  fs.writeFileSync(filePath, yaml.safeDump(serverlessYml));

  const imports = computeImportMatrix(
    config.namespace || "",
    target.$namespaceMapping || {},
    result.context
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

  writeLog(
    LogLevel.Default,
    `rest-serverless: updating import info to file: ${filepath}`
  );
  await nschema.writeFile(filepath, result.generated);

  const thisTemplate = templates["consumer-serverless"];
  const tempConfig: any = clone(config);
  context.skipWrite = true;
  const exportsResult: any = await baseGenerate(
    tempConfig,
    nschema,
    checkAndFixTarget(target, target.$namespaceMapping || {}),
    thisTemplate,
    typescript,
    context
  );
  const thisImports = computeImportMatrix(
    config.namespace || "",
    target.$namespaceMapping || {},
    exportsResult.context
  );
  exportsResult.generated = `${thisImports}${"\n"}${exportsResult.generated}`;
  const newFilePath = path.resolve(
    path.dirname(filepath),
    `${path.basename(`${filepath}`, path.extname(filepath))}Base${path.extname(
      filepath
    )}`
  );

  writeLog(
    LogLevel.Default,
    `rest-serverless: writing base service interface to file: ${newFilePath}`
  );
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

    templates.consumer = (data: any) => {
      return renderConsumer(nschema, data.$context, data, data.$target);
    };
    // nschema.buildTemplate(
    //   path.resolve(__dirname, "serviceConsumer.ejs")
    // );
    templates["consumer-serverless"] = (data: any) => {
      return renderServerlessConsumerBase(
        nschema,
        data.$context,
        data,
        data.$target
      );
    };
    templates["consumer-serverless-exports"] = (data: any) => {
      return renderServerlessConsumer(
        nschema,
        data.$context,
        data,
        data.$target
      );
    };
    templates.producer = (data: any) => {
      return renderProducer(nschema, data.$context, data, data.$target);
    };
    // nschema.buildTemplate(
    //   path.resolve(__dirname, "serviceProducer.ejs")
    // );
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
        writeLog(
          LogLevel.Debug,
          `Registering target: type =>"service", bind => ${
            serviceType.bind
          }, language => ${"typescript"}`
        );
        return nschema.registerTarget({
          bind: serviceType.bind,
          description: "Rest services in typescript",
          language: "typescript",
          name: "typescript/rest",
          serviceType: serviceType.type,
          type: "service",
          async generate(
            config: NSchemaService,
            thisNschema: NSchemaInterface,
            target: Target,
            providedContext: TypeScriptContext | undefined
          ) {
            const context: TypeScriptContext = (() => {
              const tempContext: TypeScriptContext =
                providedContext || buildTypeScriptContext();

              if (!tempContext.hasTypeScript) {
                return { ...buildTypeScriptContext(), ...tempContext };
              } else {
                return tempContext as TypeScriptContext;
              }
            })();
            const newTarget = checkAndFixTarget(
              target,
              target.$namespaceMapping || {}
            );
            writeLog(
              LogLevel.Debug,
              `Writing ${serviceType.bind} ${
                serviceType.type
              } template contents for "${config.namespace || ""}::${
                config.name
              }" to "${newTarget.location}"`
            );
            const result = await baseGenerate(
              config,
              thisNschema,
              newTarget,
              templates[serviceType.template],
              typescript,
              context
            );
            if (serviceType.postGen) {
              await serviceType.postGen(
                result,
                thisNschema,
                newTarget,
                config as NSchemaRestService,
                templates[serviceType.template],
                typescript,
                context
              );
            }
            return result;
          }
        });
      })
    );
  }
}

const rest = new NRest();

export default rest;
