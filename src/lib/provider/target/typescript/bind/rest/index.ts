/**
 * Created by eburgos on 6/13/14.
 */

"use strict";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import {
  buildTypeScriptContext,
  RestClientStrategy,
  TypeScript,
  TypeScriptContext
} from "../..";
import { LogLevel, writeDebugLog, writeLog } from "../../../../../logging";
import {
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService,
  Target,
  TemplateFunction
} from "../../../../../model";
import { deepClone } from "../../../../../utils";
import { ServiceTask } from "../../../../type/service";
import { computeImportMatrix } from "../../helpers";
import { TypeScriptMessage, TypeScriptObject } from "../object";
import { render as renderConsumer } from "./serviceConsumer";
import { render as renderServerlessConsumer } from "./serviceConsumer-serverless";
import { render as renderServerlessConsumerBase } from "./serviceConsumerBase-serverless";
import { render as renderProducer } from "./serviceProducer";

export interface TypeScriptRestTarget extends Target {
  $restClientStrategy?: RestClientStrategy;
  $typeScriptRest?: {
    requestModule: string;
  };
  bind: "rest";
}

export interface TypeScriptServerlessRestTarget extends Target {
  $serverless: {
    implementation: string;
    yamlPath: string;
  };
  bind: "rest-serverless";
  serviceType: "consumer";
}

/**
 * returns a TypeScriptRestTarget
 *
 * @export
 * @param {Target} target
 * @param {{ [name: string]: string }} namespaceMapping
 * @returns {TypeScriptRestTarget}
 */
export function checkAndFixTarget(
  target: Target,
  namespaceMapping: { [name: string]: string }
): TypeScriptRestTarget {
  const restTarget: TypeScriptRestTarget = {
    $typeScriptRest: { requestModule: "axios" },
    ...target,
    bind: "rest"
  };
  if (!restTarget.$typeScriptRest) {
    throw new Error("Invalid target for TypeScript Rest");
  }
  if (!restTarget.$typeScriptRest.requestModule) {
    throw new Error("Invalid target requestModule for TypeScript Rest");
  }
  if (namespaceMapping) {
    if (!namespaceMapping[restTarget.$typeScriptRest.requestModule]) {
      //If there is no mapping already set for request module then leave it as it is to avoid a local relative reference
      namespaceMapping[restTarget.$typeScriptRest.requestModule] =
        restTarget.$typeScriptRest.requestModule;
    }
  }
  return restTarget;
}

async function baseGenerate(
  config: ServiceTask,
  nschema: NSchemaInterface,
  target: TypeScriptRestTarget,
  template: TemplateFunction<
    ServiceTask | TypeScriptObject | TypeScriptMessage,
    TypeScriptContext
  >,
  typescript: TypeScript,
  context: any
) {
  return typescript.generate(nschema, config, template, target, context);
}

const templates: {
  [name: string]: TemplateFunction<
    ServiceTask | TypeScriptObject | TypeScriptMessage,
    TypeScriptContext
  >;
} = {};

templates.consumer = (data, nschema, context) => {
  if (data.type === "message" || data.type === "object") {
    throw new Error("Invalid Argument");
  }
  return renderConsumer(nschema, context, data);
};
templates["consumer-serverless"] = (data, nschema, context) => {
  if (data.type === "message" || data.type === "object") {
    throw new Error("Invalid Argument");
  }
  return renderServerlessConsumerBase(nschema, context, data);
};
templates["consumer-serverless-exports"] = (data, nschema, context, target) => {
  if (data.type === "message" || data.type === "object") {
    throw new Error("Invalid Argument");
  }
  return renderServerlessConsumer(nschema, context, data, target);
};
templates.producer = (data, nschema, context, target) => {
  if (data.type === "message" || data.type === "object") {
    throw new Error("Invalid Argument");
  }
  return renderProducer(nschema, context, data, target);
};

async function serverlessPostGen(
  result: { config: ServiceTask; generated: any } | any,
  nschema: NSchemaInterface,
  target: TypeScriptRestTarget,
  config: NSchemaRestService,
  typescript: TypeScript,
  context: TypeScriptContext
): Promise<{ config: ServiceTask; context: any; generated: any }> {
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
  const functions = serverlessYml.functions;
  for (const functionName in functions) {
    if (Object.prototype.hasOwnProperty.call(functions, functionName)) {
      delete functions[functionName];
    }
  }

  const operations = config.operations;
  Object.keys(operations).forEach((operationName: string) => {
    const operation: NSchemaRestOperation = operations[
      operationName
    ] as NSchemaRestOperation;
    functions[operationName] = {
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
      }/${config.name}.${operationName}`
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
  const tempConfig: any = deepClone(config);
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
  public async init(nschema: NSchemaInterface) {
    if (!this.typescript) {
      throw new Error("Argument exception");
    }
    const typescript: TypeScript = this.typescript as TypeScript;

    return Promise.all(
      [
        {
          bind: "rest",
          description: "REST server in typescript",
          name: "typescript/rest-server",
          postGen: undefined,
          template: "consumer",
          type: "consumer"
        },
        {
          bind: "rest-serverless",
          description: "REST server (with serverless) in typescript",
          name: "typescript/rest-serverless",
          postGen: serverlessPostGen,
          template: "consumer-serverless-exports",
          type: "consumer"
        },
        {
          bind: "rest",
          description: "REST client in typescript",
          name: "typescript/rest-client",
          postGen: undefined,
          template: "producer",
          type: "producer"
        }
      ].map(async (serviceType) => {
        writeDebugLog(
          `Registering target: type =>"service", bind => ${
            serviceType.bind
          }, language => ${"typescript"}`
        );
        return nschema.registerTarget({
          bind: serviceType.bind,
          description: serviceType.description,
          language: "typescript",
          name: serviceType.name,
          serviceType: serviceType.type,
          type: "service",
          async generate(
            config: ServiceTask,
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
            writeDebugLog(
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

export function isServerlessTarget(
  target: Target
): target is TypeScriptServerlessRestTarget {
  const rawTarget: any = target;
  return !!rawTarget.$serverless;
}

export function isRestTarget(target: Target): target is TypeScriptRestTarget {
  const rawTarget: any = target;
  return rawTarget.bind === "rest";
}
