/**
 * @module nschema/provider/target/javascript/javascript
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import chalk from "chalk";
import { existsSync, readdirSync, statSync } from "fs";
import { extname, resolve as pathResolve } from "path";
import { LogLevel, writeDebugLog, writeLog } from "../../../logging";
import {
  HasFilenameMixin,
  NSchemaInterface,
  NSchemaMessageArgument,
  Target,
  TemplateFunction
} from "../../../model";
import { deepClone } from "../../../utils";
import { BundleTask } from "../../type/bundle";
import { AnonymousMessage } from "../../type/message";
import { ServiceTask } from "../../type/service";
import { TypeScriptMessage, TypeScriptObject } from "./bind/object";
import { typeName } from "./helpers";

const { blue, green, yellow } = chalk;

export { TypeScriptObject, TypeScriptMessage };

declare let require: (name: string) => any;

export interface TypeScriptContext {
  hasTypeScript: true;
  id: number;
  imports: {
    [name: string]: {
      [name: string]: string | boolean;
    };
  };

  skipWrite?: boolean;

  /*
   *  Reference to typescript class. This is internal to TypeScript generation.
   */
  typescript: TypeScript;
}

export interface TypeScriptBundle extends BundleTask, HasFilenameMixin {}

export enum RestClientStrategy {
  Default = "Default",
  Angular2 = "Angular2"
}

export class TypeScript {
  // tslint:disable-next-line:prefer-function-over-method
  public async generate(
    nschema: NSchemaInterface,
    $nsconfig: TypeScriptObject | TypeScriptMessage | ServiceTask,
    template: TemplateFunction<
      TypeScriptObject | TypeScriptMessage | ServiceTask,
      TypeScriptContext
    >,
    target: Target,
    providedContext: any | undefined
  ) {
    const config = deepClone($nsconfig);

    const context: TypeScriptContext = {
      ...buildTypeScriptContext(),
      ...providedContext,
      imports: {}
    };
    const result = template(config, nschema, context, target);

    if (context.skipWrite) {
      writeDebugLog(
        `${yellow("typescript")}: skipped write on ${
          target.location
        } - ${target.$fileName || target.name || ""} due to context`
      );
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
              target.$fileName || `${config.name}.ts`
            )
          : pathResolve(
              location,
              config.namespace || "",
              config.$fileName || `${config.name}.ts`
            );

      writeLog(
        LogLevel.Default,
        `${blue("typescript")}: writing to file: ${green(filepath)}`
      );
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
          return readdirSync(pathResolve(providerPath, d)).map(i => {
            return pathResolve(providerPath, d, i);
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
    ).then(undefined, err => {
      throw new Error(err);
    });
  }
}

const typescript = new TypeScript();

function getDataItems(
  nschema: NSchemaInterface,
  nsMessage: AnonymousMessage
): NSchemaMessageArgument[] {
  const r: NSchemaMessageArgument[] = [];
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
  context: TypeScriptContext,
  addFlowComment: boolean,
  message: AnonymousMessage
): string {
  const typeSeparator = ", ";

  const dataItems = getDataItems(nschema, message);
  if (dataItems.length === 0) {
    return "void";
  } else if (dataItems.length === 1) {
    const item = dataItems[0];
    return `${typeName(
      item.type,
      nschema,
      "",
      "",
      context,
      addFlowComment,
      false
    )}`;
  } else {
    return (
      `{ ${dataItems
        .map((item, $i) => {
          return `${item.name || `item${$i}`}: ${typeName(
            item.type,
            nschema,
            "",
            "",
            context,
            addFlowComment,
            false
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
