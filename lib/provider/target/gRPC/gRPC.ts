/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import * as fs from "fs";
import * as path from "path";
import { LogLevel, writeLog } from "../../../logging";
import {
  Definition,
  NineSchemaConfig,
  NSchemaInterface,
  NSchemaMessage,
  NSchemaMessageArgument,
  NSchemaType,
  Target,
  TemplateFunction,
  NSchemaService,
  NSchemaOperation,
  NSchemaModifier,
  NSchemaPrimitiveType,
  shouldNever,
  NSchemaObject
} from "../../../model";
import { isArray } from "util";

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

export interface GRPCOperation extends NSchemaOperation {}

export interface GRPCService extends NSchemaService {
  $type: "service";
  operations: { [name: string]: GRPCOperation };
}

export interface GRPCMessage extends NSchemaMessage {
  data: GRPCMessageArgument[];
}

export interface GRPCObject extends NSchemaObject {}

export interface GRPCMessageArgument extends NSchemaMessageArgument {}

export interface gRPCContext {
  id: number;
  imports: {
    [name: string]: {
      [name: string]: string | boolean;
    };
  };

  /*
   *  Reference to gRPC class. This is internal to gRPC generation.
   */
  grpc: gRPC;

  skipWrite?: boolean;
}

export class gRPC {
  public init(nschema: NSchemaInterface) {
    const providerPath = path.resolve(__dirname, "bind");
    const self = this;
    return Promise.all(
      fs
        .readdirSync(providerPath)
        .filter(item => {
          return fs.statSync(path.resolve(providerPath, item)).isDirectory();
        })
        .map(d => {
          return fs.readdirSync(path.resolve(providerPath, d)).map(i => {
            return path.resolve(providerPath, d, i);
          });
        })
        .reduce((a, b) => {
          return a.concat(b);
        })
        .filter(item => {
          return path.extname(item) === ".js" && fs.existsSync(item);
        })
        .map(require)
        .map(m => {
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
    ).then(
      () => {
        return arguments[0];
      },
      err => {
        throw new Error(err);
      }
    );
  }
  // tslint:disable-next-line:prefer-function-over-method
  public generate(
    nschema: NSchemaInterface,
    $nsconfig: NineSchemaConfig,
    template: TemplateFunction,
    target: Target,
    providedContext: any | undefined
  ) {
    const nsconfig: any = $nsconfig.$u.clone($nsconfig);
    const config: Definition = nsconfig as Definition;
    config.$nschema = nschema;
    config.$target = target;

    const context: gRPCContext = {
      ...buildgRPCContext(),
      ...providedContext,
      imports: {}
    };
    const result = template({
      ...config,
      ...{ $nschema: nschema },
      $context: context
    });

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
          ? path.resolve(
              process.cwd(),
              location,
              config.namespace || "",
              target.$fileName || `${config.name}.proto`
            )
          : path.resolve(
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
}

const grpc = new gRPC();

function getDataItems(
  nschema: NSchemaInterface,
  nsMessage: NSchemaMessage
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
  $context: gRPCContext,
  addFlowComment: boolean,
  message: NSchemaMessage
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

export function buildgRPCContext(): gRPCContext {
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
  context?: any,
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