/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import { existsSync, readdirSync, statSync } from "fs";
import { extname, resolve as pathResolve } from "path";
import { isArray } from "util";
import { LogLevel, writeLog } from "../../../logging";
import {
  HasFilenameMixin,
  NSchemaInterface,
  NSchemaMessageArgument,
  NSchemaModifier,
  NSchemaOperation,
  NSchemaPrimitiveType,
  NSchemaType,
  shouldNever,
  Target,
  TemplateFunction
} from "../../../model";
import { deepClone } from "../../../utils";
import { BundleTask } from "../../type/bundle";
import { MessageTask } from "../../type/message";
import { ObjectTask } from "../../type/object";
import { ServiceTask } from "../../type/service";

declare let require: (name: string) => any;

export function typeName(
  $nschemaType: NSchemaType,
  _nschema?: NSchemaInterface,
  namespace?: string,
  _name?: string,
  context?: GRPCContext
) {
  let result: string;
  const typeMap = (primitiveType: NSchemaPrimitiveType) => {
    switch (primitiveType) {
      case "int":
        return "int32";
      case "float":
        return "number";
      case "string":
        return "string";
      case "bool":
        return "boolean";
      case "date":
        return "Date";
      default:
        shouldNever(primitiveType);
    }
    return "string";
  };
  if (typeof $nschemaType === "string") {
    result = typeMap($nschemaType);
  } else if (typeof $nschemaType === "object") {
    let typeNamespace = $nschemaType.namespace;
    if (typeof typeNamespace === "undefined") {
      typeNamespace = namespace || "";
    }
    if (typeNamespace !== namespace && context) {
      if (!context.imports[typeNamespace]) {
        context.imports[typeNamespace] = {};
      }
      context.imports[typeNamespace][$nschemaType.name] = true;
    }
    result = $nschemaType.name;
  } else {
    result = typeMap("string");
  }
  if (
    $nschemaType &&
    typeof $nschemaType === "object" &&
    $nschemaType.modifier
  ) {
    const $modifier = $nschemaType.modifier;
    const modifierArr: NSchemaModifier[] = !isArray($modifier)
      ? [$modifier]
      : $modifier;

    modifierArr.forEach((item) => {
      /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
      result = `(${result} ${modifierMap(item)})`;
    });
  }

  return result;
}

function modifierMap(modifier: NSchemaModifier): string {
  switch (modifier) {
    case "list":
      return "[]";
    case "array":
      return "[]";
    case "option":
      return "| undefined";
    case "map":
      throw new Error("`map` not implemented in gRPC");
    default:
      return typeName(modifier);
  }
}

// tslint:disable-next-line:no-empty-interface
export type GRPCOperation = NSchemaOperation;

export interface GRPCService extends ServiceTask, HasFilenameMixin {
  operations: { [name: string]: GRPCOperation };
  type: "service";
}

export interface GRPCMessage extends MessageTask, HasFilenameMixin {
  data: GRPCMessageArgument[];
}

export interface GRPCBundle extends BundleTask, HasFilenameMixin {}

export interface GRPCObject extends ObjectTask, HasFilenameMixin {}

// tslint:disable-next-line:no-empty-interface
export type GRPCMessageArgument = NSchemaMessageArgument;

export interface GRPCContext {
  /*
   *  Reference to gRPC class. This is internal to gRPC generation.
   */
  grpc: GRPC;
  id: number;
  imports: {
    [name: string]: {
      [name: string]: string | boolean;
    };
  };

  skipWrite?: boolean;
}

export class GRPC {
  public async generate(
    nschema: NSchemaInterface,
    grpcConfig: GRPCMessage | GRPCObject | GRPCService,
    template: TemplateFunction<GRPCMessage | GRPCObject | GRPCService>,
    target: Target,
    providedContext: any | undefined
  ) {
    const config = deepClone(grpcConfig);

    const context: GRPCContext = {
      /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
      ...buildgRPCContext(),
      ...providedContext,
      imports: {}
    };
    const result = template(
      {
        ...config,
        ...{ $nschema: nschema }
      },
      nschema,
      context,
      target
    );

    if (context.skipWrite) {
      return Promise.resolve({
        config,
        context,
        generated: result
      });
    } else {
      const location = target.location;
      const filepath = location.startsWith(".")
        ? pathResolve(
            process.cwd(),
            location,
            config.namespace || "",
            target.$fileName || `${config.name}.proto`
          )
        : pathResolve(
            location,
            config.namespace || "",
            config.$fileName || `${config.name}.proto`
          );

      writeLog(LogLevel.Default, `gRPC: writing to file: ${filepath}`);
      await nschema.writeFile(filepath, result);
      return {
        config,
        context,
        generated: result
      };
    }
  }
  public async init(nschema: NSchemaInterface) {
    const providerPath = pathResolve(__dirname, "bind");

    return Promise.all(
      readdirSync(providerPath)
        .filter((item) => {
          return statSync(pathResolve(providerPath, item)).isDirectory();
        })
        .map((directoryPath) => {
          return readdirSync(pathResolve(providerPath, directoryPath)).map(
            () /* _i */ => {
              return pathResolve(providerPath, directoryPath, "index.js");
            }
          );
        })
        .reduce((accumulated, next) => {
          return accumulated.concat(next);
        })
        .filter((item) => {
          return extname(item) === ".js" && existsSync(item);
        })
        .map(require)
        .map(async (requiredModule) => {
          if (requiredModule.default) {
            requiredModule = requiredModule.default;
          }
          requiredModule.grpc = this;
          return new Promise<boolean>((resolve, reject) => {
            if (typeof requiredModule.init === "function") {
              requiredModule.init(nschema).then(
                () => {
                  resolve(true);
                },
                (err: Error) => {
                  reject(err);
                }
              );
            } else {
              resolve(true);
            }
          });
        })
    ).then(undefined, (err) => {
      throw new Error(err);
    });
  }
}

const grpc = new GRPC();

function getDataItems(
  nschema: NSchemaInterface,
  nsMessage: MessageTask
): GRPCMessageArgument[] {
  const dataItems: GRPCMessageArgument[] = [];
  if (nsMessage.extends) {
    const parent = nschema.getMessage(
      nsMessage.extends.namespace || "",
      nsMessage.extends.name
    );
    if (parent) {
      getDataItems(nschema, parent).forEach((dataItem) => {
        dataItems.push(dataItem);
      });
    } else {
      throw new Error(
        `could not find parent: ns="${
          nsMessage.extends.namespace || ""
        }" name="${nsMessage.extends.name}"`
      );
    }
  }
  (nsMessage.data || []).map((item) => {
    dataItems.push(item);
  });
  return dataItems;
}

export function messageType(
  nschema: NSchemaInterface,
  $context: GRPCContext,
  message: MessageTask
): string {
  const typeSeparator = ", ";

  const dataItems = getDataItems(nschema, message);
  if (dataItems.length === 0) {
    return "void";
  } else if (dataItems.length === 1) {
    const item = dataItems[0];
    return `${typeName(item.type, nschema, "", "", $context)}`;
  } else {
    return (
      `{ ${dataItems
        .map((item, itemIndex) => {
          return `${item.name || `item${itemIndex}`}: ${typeName(
            item.type,
            nschema,
            "",
            "",
            $context
          )}`;
        })
        .join(typeSeparator)} }` || "void"
    );
  }
}

let count = 0;

export function buildgRPCContext(): GRPCContext {
  return {
    grpc,
    id: count++,
    imports: {},
    skipWrite: false
  };
}

export default grpc;
