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

function modifierMap(modifier: NSchemaModifier): string {
  switch (modifier) {
    case "list":
      return "[]";
    case "array":
      return "[]";
    case "option":
      return "| undefined";
    default:
      return typeName(modifier);
  }
}

// tslint:disable-next-line:no-empty-interface
export interface GRPCOperation extends NSchemaOperation {}

export interface GRPCService extends ServiceTask, HasFilenameMixin {
  $type: "service";
  operations: { [name: string]: GRPCOperation };
}

export interface GRPCMessage extends MessageTask, HasFilenameMixin {
  data: GRPCMessageArgument[];
}

export interface GRPCBundle extends BundleTask, HasFilenameMixin {}

export interface GRPCObject extends ObjectTask, HasFilenameMixin {}

// tslint:disable-next-line:no-empty-interface
export interface GRPCMessageArgument extends NSchemaMessageArgument {}

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
  // tslint:disable-next-line:prefer-function-over-method
  public async generate(
    nschema: NSchemaInterface,
    $nsconfig: GRPCMessage | GRPCObject | GRPCService,
    template: TemplateFunction<GRPCMessage | GRPCObject | GRPCService>,
    target: Target,
    providedContext: any | undefined
  ) {
    const config = deepClone($nsconfig);

    const context: GRPCContext = {
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
      context
    );

    if (context.skipWrite) {
      return Promise.resolve({
        config,
        context,
        generated: result
      });
    } else {
      const location = target.location;
      const filepath =
        location.indexOf(".") === 0
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
      return nschema.writeFile(filepath, result).then(
        _ => {
          return {
            config,
            context,
            generated: result
          };
        },
        err => {
          throw new Error(err);
        }
      );
    }
  }
  public async init(nschema: NSchemaInterface) {
    const providerPath = pathResolve(__dirname, "bind");
    const self = this;
    return Promise.all(
      readdirSync(providerPath)
        .filter(item => {
          return statSync(pathResolve(providerPath, item)).isDirectory();
        })
        .map(d => {
          return readdirSync(pathResolve(providerPath, d)).map(_i => {
            return pathResolve(providerPath, d, "index.js");
          });
        })
        .reduce((a, b) => {
          return a.concat(b);
        })
        .filter(item => {
          return extname(item) === ".js" && existsSync(item);
        })
        .map(require)
        .map(async m => {
          if (m.default) {
            m = m.default;
          }
          m.grpc = self;
          return new Promise<boolean>((resolve, reject) => {
            if (typeof m.init === "function") {
              m.init(nschema).then(
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
    ).then(undefined, err => {
      throw new Error(err);
    });
  }
}

const grpc = new GRPC();

function getDataItems(
  nschema: NSchemaInterface,
  nsMessage: MessageTask
): GRPCMessageArgument[] {
  const r: GRPCMessageArgument[] = [];
  if (nsMessage.$extends) {
    const parent = nschema.getMessage(
      nsMessage.$extends.namespace || "",
      nsMessage.$extends.name
    );
    if (parent) {
      getDataItems(nschema, parent).forEach(i => {
        r.push(i);
      });
    } else {
      throw new Error(
        `could not find parent: ns="${nsMessage.$extends.namespace ||
          ""}" name="${nsMessage.$extends.name}"`
      );
    }
  }
  (nsMessage.data || []).map(item => {
    r.push(item);
  });
  return r;
}

export function messageType(
  nschema: NSchemaInterface,
  $context: GRPCContext,
  addFlowComment: boolean,
  message: MessageTask
): string {
  const typeSeparator = ", ";

  const dataItems = getDataItems(nschema, message);
  if (dataItems.length === 0) {
    return "void";
  } else if (dataItems.length === 1) {
    const item = dataItems[0];
    return `${typeName(item.type, nschema, "", "", $context, addFlowComment)}`;
  } else {
    return (
      `{ ${dataItems
        .map((item, $i) => {
          return `${item.name || `item${$i}`}: ${typeName(
            item.type,
            nschema,
            "",
            "",
            $context,
            addFlowComment
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

export function typeName(
  $nschemaType: NSchemaType,
  _nschema?: NSchemaInterface,
  namespace?: string,
  _name?: string,
  context?: GRPCContext,
  addFlowComment?: boolean
) {
  let result: string;
  const typeMap = (t: NSchemaPrimitiveType) => {
    switch (t) {
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
        shouldNever(t);
    }
    return "string";
  };
  if (typeof $nschemaType === "string") {
    result = typeMap($nschemaType);
  } else if (typeof $nschemaType === "object") {
    let ns = $nschemaType.namespace;
    if (typeof ns === "undefined") {
      ns = namespace || "";
    }
    if (ns !== namespace && context) {
      if (!context.imports[ns]) {
        context.imports[ns] = {};
      }
      context.imports[ns][$nschemaType.name] = true;
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

    modifierArr.forEach(item => {
      result = `(${result} ${modifierMap(item)})`;
    });
  }
  if (addFlowComment) {
    return `${result} /* :${result} */`;
  } else {
    return result;
  }
}
