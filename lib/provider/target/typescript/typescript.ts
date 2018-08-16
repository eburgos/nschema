/**
 * @module nschema/provider/target/javascript/javascript
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import { TemplateFunction } from "ejs";
import * as fs from "fs";
import * as path from "path";
import {
  Definition,
  NineSchemaConfig,
  NSchemaInterface,
  Target
} from "../../../model";

declare let require: (name: string) => any;

const modifierMap = (modifier: string) => {
  switch (modifier) {
    case "list":
      return "[]";
    case "array":
      return "[]";
    default:
      return modifier;
  }
};

export interface TypeScriptContext {
  imports: {
    [name: string]: {
      [name: string]: boolean;
    };
  };
}

export interface TypeScriptConfig extends Definition {
  /*
	Reference to typescript class. This is internal to TypeScript generation.
	 */
  $typescript: TypeScript;
  $context: TypeScriptContext;
  $skipWrite: boolean;
}

export type RestClientStrategy = "Angular2";
//NineJs;

export interface TypeScriptTarget extends Target {
  restClientStrategy?: RestClientStrategy;
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
        console.log(err);
      }
    );
  }
  public generate(
    nschema: NSchemaInterface,
    $nsconfig: NineSchemaConfig,
    template: TemplateFunction,
    target: Target
  ) {
    const nsconfig: any = $nsconfig.$u.clone($nsconfig);
    const config: TypeScriptConfig = nsconfig as TypeScriptConfig;
    config.$nschema = nschema;
    config.$typescript = this;
    config.$target = target;
    if (typeof config.$skipWrite === "undefined") {
      config.$skipWrite = false;
    }
    if (config.$context) {
      throw new Error("must not have a $context variable");
    }
    config.$context = {
      imports: {}
    };
    const result = template(config);

    if (config.$skipWrite) {
      return Promise.resolve({
        config,
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

      console.log(`typescript: writing to file: ${filepath}`);
      return nschema.writeFile(filepath, result).then(
        _ => {
          return {
            config,
            generated: result
          };
        },
        err => {
          console.log("error: ");
          console.log(err);
        }
      );
    }
  }
  // tslint:disable-next-line:prefer-function-over-method
  public typeName(
    $nschemaType: any,
    $nschema: NSchemaInterface,
    namespace: string,
    name: string,
    context: any
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
    if ($nschemaType && $nschemaType.modifier) {
      const $modifier = $nschemaType.modifier;
      const modifierArr: string[] = !$nschema.isArray($modifier)
        ? [$modifier]
        : $modifier;

      modifierArr.forEach(item => {
        result += ` ${modifierMap(item)}`;
      });
    }
    return result;
  }
}

const typescript = new TypeScript();

export default typescript;
