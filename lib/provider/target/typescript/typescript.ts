/**
 * @module nschema/provider/target/javascript/javascript
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import { TemplateFunction } from "ejs";
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
  Target
} from "../../../model";

declare let require: (name: string) => any;

const modifierMap = (modifier: string) => {
  switch (modifier) {
    case "list":
      return "[]";
    case "array":
      return "[]";
    case "option":
      return "| undefined";
    default:
      return modifier;
  }
};

export interface TypeScriptContext {
  hasTypeScript: true;
  id: number;
  imports: {
    [name: string]: {
      [name: string]: string | boolean;
    };
  };

  /*
	 *  Reference to typescript class. This is internal to TypeScript generation.
	 */
  typescript: TypeScript;

  skipWrite?: boolean;
}

export enum RestClientStrategy {
  Default = "Default",
  Angular2 = "Angular2"
}

export class TypeScript {
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
          m.typescript = self;
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

    const context: TypeScriptContext = {
      ...buildTypeScriptContext(),
      ...providedContext,
      imports: {}
    };
    const result = template({ ...config, $context: context });

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
              target.$fileName || `${config.name}.ts`
            )
          : path.resolve(
              location,
              config.namespace || "",
              config.$fileName || `${config.name}.ts`
            );

      writeLog(LogLevel.Default, `typescript: writing to file: ${filepath}`);
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
  // tslint:disable-next-line:prefer-function-over-method
  public typeName(
    $nschemaType: string | NSchemaType | undefined,
    $nschema: NSchemaInterface,
    namespace: string,
    _name: string,
    context: any,
    addFlowComment?: boolean
  ) {
    let result: string;
    const typeMap = (t: string) => {
      switch (t) {
        case "int":
          return "number";
        case "float":
          return "number";
        case "string":
          return "string";
        case "bool":
          return "boolean";
        case "Date":
          return "Date";
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
      if (ns !== namespace) {
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
      const modifierArr: string[] = !$nschema.isArray($modifier)
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
}

const typescript = new TypeScript();

function getDataItems(
  nschema: NSchemaInterface,
  nsMessage: NSchemaMessage
): NSchemaMessageArgument[] {
  const r: NSchemaMessageArgument = [];
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
  $context: TypeScriptContext,
  addFlowComment: boolean,
  message: NSchemaMessage
): string {
  const typeSeparator = ", ";

  const dataItems = getDataItems(nschema, message);
  if (dataItems.length === 0) {
    return "void";
  } else if (dataItems.length === 1) {
    const item = dataItems[0];
    return `${typescript.typeName(
      item.type,
      nschema,
      "",
      "",
      $context,
      addFlowComment
    )}`;
  } else {
    return (
      `{ ${dataItems
        .map((item, $i) => {
          return `${item.name || `item${$i}`}: ${typescript.typeName(
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

export function buildTypeScriptContext(): TypeScriptContext {
  return {
    hasTypeScript: true,
    id: count++,
    imports: {},
    skipWrite: false,
    typescript
  };
}

export default typescript;
