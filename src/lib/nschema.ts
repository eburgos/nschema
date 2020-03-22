/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import * as fs from "fs";
import {
  dirname as pathDirname,
  resolve as pathResolve,
  sep as pathSep
} from "path";
import { LogLevel, writeDebugLog, writeError, writeLog } from "./logging";
import {
  NSchemaContext,
  NSchemaInterface,
  NSchemaPlugin,
  NSchemaTask,
  SourceBind,
  TargetBind
} from "./model";
import { MessageTask } from "./provider/type/message";
import { ObjectTask } from "./provider/type/object";
import { ServiceTask } from "./provider/type/service";
import {
  appendTarget,
  deepClone,
  initialCaps,
  isValidCriteriaProperty,
  propagateTarget
} from "./utils";
import * as chalk from "chalk";
export { CleanTask } from "./provider/type/clean";

declare let require: (name: string) => any;

function createDirectorySync(dirpath: string) {
  const seps = dirpath.split(pathSep);
  const tried: string[] = [];
  seps.forEach(item => {
    tried.push(item);
    const tryDir = tried.join(pathSep);
    if (tryDir) {
      if (!fs.existsSync(tryDir)) {
        fs.mkdirSync(tryDir);
      }
    }
  });
}
function isArray(obj: any): obj is any[] {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

/**
 *
 *
 * @param {*} mixedInto
 * @param {*} from
 * @param {(o: any, t: any, p: string) => boolean} [filter] is this function returns false then the property p will be mixed in
 */
function mixinRecursive(
  mixedInto: { [k: string]: any },
  from: { [k: string]: any },
  filter?: (o: any, t: any, p: string) => boolean
) {
  for (const property in from) {
    if (Object.prototype.hasOwnProperty.call(from, property)) {
      if (!filter || !filter(mixedInto, from, property)) {
        if (
          !isArray(mixedInto[property]) &&
          !isArray(from[property]) &&
          typeof mixedInto[property] === "object" &&
          typeof from[property] === "object"
        ) {
          mixinRecursive(mixedInto[property], from[property]);
        } else {
          mixedInto[property] = from[property];
        }
      }
    }
  }
}

function registerBasicTypes(nschema: NSchema) {
  const basics: ObjectTask[] = [
    {
      name: "int",
      namespace: "",
      type: "object"
    },
    {
      name: "float",
      namespace: "",
      type: "object"
    },
    {
      name: "string",
      namespace: "",
      type: "object"
    },
    {
      name: "boolean",
      namespace: "",
      type: "object"
    }
  ];
  basics.forEach(item => nschema.registerObject(item));
}

const allowedParentToChildrenMixin: { [name: string]: any } = {
  importLocation: true,
  namespace: true,
  nschemaLocation: true
};

export default class NSchema implements NSchemaInterface {
  public readonly context: NSchemaContext = {
    messages: [],
    objects: [],
    services: []
  };

  public ejsSettings = {
    client: true,
    close: "%>",
    debug: false,
    open: "<%"
  };
  public isArray: (obj: any) => obj is any[] = isArray;

  public mixinRecursive: (
    obj: any,
    target: any,
    filter?: (o: any, t: any, p: string) => boolean
  ) => void = mixinRecursive;
  // public path = path;

  public require: ((name: string) => any) | undefined = undefined;

  public targets: TargetBind[] = [];
  public utils = {
    initialCaps
  };

  constructor() {
    this.mixinRecursive(this.dotSettings, this.ejsSettings);
    this.mixinRecursive(this.dotSettings, {});
    registerBasicTypes(this);
  }

  private readonly customPlugins: { [name: string]: NSchemaPlugin[] } = {};
  private readonly dotSettings: any = {};
  private loadDefer: Promise<any> | undefined = undefined;

  private readonly mTypes: { [name: string]: NSchemaPlugin } = {};
  private readonly sources: { [name: string]: SourceBind } = {};

  public async generate(
    parentConfig: NSchemaTask,
    config: NSchemaTask,
    context: any | undefined
  ): Promise<any> {
    const type = config.type;

    const typeProvider = this.types()[type];

    if (!typeProvider) {
      throw new Error(`Unknown nschema type provider: ${type}`);
    }
    const newConfigCloned = deepClone(config);

    mixinRecursive(
      newConfigCloned,
      parentConfig,
      (_intoProperty, _fromProperty, propertyName) => {
        return !allowedParentToChildrenMixin[propertyName];
      }
    );

    const newConfig = appendTarget(
      propagateTarget(newConfigCloned, parentConfig)
    );

    if (typeProvider.execute) {
      writeDebugLog(
        `executing ${(newConfig as any).namespace || ""} :: ${(newConfig as any)
          .name || ""} with provider ${typeProvider.name}`
      );
      return await typeProvider.execute(newConfig, this, context);
    } else {
      return await Promise.resolve();
    }
  }
  public getCustomPlugin(name: string, obj: any): NSchemaPlugin[] {
    const customPlugins = (this.customPlugins[name] || []).filter(
      (target: NSchemaPlugin) => {
        const tgt: any = target;

        for (const property in obj) {
          if (
            Object.prototype.hasOwnProperty.call(obj, property) &&
            isValidCriteriaProperty(property)
          ) {
            if (typeof tgt[property] === "function") {
              if (!tgt[property](obj[property])) {
                return false;
              }
            } else if (
              tgt[property] !== obj[property] &&
              tgt[property] !== "*"
            ) {
              return false;
            }
          }
        }
        return true;
      }
    );
    return customPlugins;
  }

  public getMessage(namespace: string, name: string): MessageTask | undefined {
    const message = this.context.messages.find(message => {
      return (
        (message.namespace || "") === (namespace || "") &&
        (message.name || "") === (name || "")
      );
    });
    return message;
  }

  public getObject(namespace: string, name: string) {
    const obj = this.context.objects.find(currentObject => {
      return (
        (currentObject.namespace || "") === (namespace || "") &&
        (currentObject.name || "") === (name || "")
      );
    });
    return obj;
  }
  public getService(namespace: string, name: string) {
    const service = this.context.services.find(currentService => {
      return (
        (currentService.namespace || "") === namespace &&
        (currentService.name || "") === name
      );
    });
    return service;
  }
  public getTarget(obj: { [key: string]: any }): TargetBind[] {
    const targets = this.targets.filter((target: TargetBind) => {
      const tgt: any = target;
      for (const property in obj) {
        if (
          Object.prototype.hasOwnProperty.call(obj, property) &&
          isValidCriteriaProperty(property)
        ) {
          if (tgt[property] !== obj[property]) {
            return false;
          }
        }
      }
      return true;
    });
    return targets;
  }

  public async init(loadPath?: string) {
    const providerPath: string = loadPath
      ? loadPath
      : pathResolve(__dirname, "provider");

    if (this.loadDefer) {
      await this.loadDefer;
      return this;
    } else {
      this.loadDefer = Promise.all(
        fs
          .readdirSync(providerPath)
          .filter((item: string) => {
            return fs.statSync(pathResolve(providerPath, item)).isDirectory();
          })
          .map((directoryPath: string) => {
            return fs
              .readdirSync(pathResolve(providerPath, directoryPath))
              .map((item: string) => {
                return pathResolve(providerPath, directoryPath, item);
              });
          })
          .reduce((accumulated: string[], next: string[]) => {
            return accumulated.concat(next);
          })
          .filter((directoryPath: string) => {
            const dir = pathResolve(providerPath, directoryPath);
            const basename = "index"; // pathBasename(dir);
            return fs.existsSync(pathResolve(dir, `${basename}.js`));
          })
          .map((directoryPath: string) => {
            const dir = pathResolve(providerPath, directoryPath);
            const basename = "index";
            return pathResolve(dir, basename);
          })
          .map(require)
          .map(requiredModule => {
            if (requiredModule.default) {
              requiredModule = requiredModule.default;
            }
            return requiredModule.init(this);
          })
      );
      await this.loadDefer;
      return this;
    }
  }

  public async register(type: string, obj: NSchemaPlugin) {
    switch (type) {
      case "source":
        throw new Error(
          "Cannot register source. Call registerSource() directly"
        );
      case "target":
        throw new Error(
          "Cannot register target. Call registerTarget() directly"
        );
      case "service":
      case "message":
      case "object":
        throw new Error(`Cannot register ${type}.`);
      case "type":
        this.types()[obj.name] = obj;
        break;
      default:
        if (!this.customPlugins[type]) {
          this.customPlugins[type] = [];
        }
        this.customPlugins[type].push(obj);
        break;
    }
    return await Promise.resolve(null);
  }
  public registerMessage(typeConfig: MessageTask) {
    const message = this.getMessage(
      typeConfig.namespace || "",
      typeConfig.name || ""
    );
    if (!message) {
      this.context.messages.push(typeConfig);
    }
  }

  public registerObject(typeConfig: ObjectTask) {
    const obj = this.getObject(typeConfig.namespace || "", typeConfig.name);
    if (!obj) {
      this.context.objects.push(typeConfig);
    }
  }

  public registerService(serviceConfig: ServiceTask) {
    const service = this.getService(
      serviceConfig.namespace || "",
      serviceConfig.name
    );
    if (!service) {
      this.context.services.push(serviceConfig);
    }
  }

  public async registerSource(obj: SourceBind) {
    this.sources[obj.name] = obj;
    return await Promise.resolve(null);
  }

  public async registerTarget(obj: TargetBind) {
    this.targets.push(obj);
    return await Promise.resolve(null);
  }

  // Implementing NSchemaInterface

  public types() {
    return this.mTypes;
  }
  public walk(
    dir: string,
    done: (err: Error | undefined, data?: string[]) => void
  ) {
    let results: string[] = [];
    fs.readdir(dir, (err: NodeJS.ErrnoException | null, list: string[]) => {
      if (err) {
        return done(err);
      }
      let index = 0;
      const next = () => {
        let file = list[index];
        index += 1;
        if (!file) {
          return done(undefined, results);
        }
        file = `${dir}/${file}`;
        fs.stat(file, (err2: NodeJS.ErrnoException | null, stat) => {
          if (err2) {
            writeError(err2);
            throw err2;
          }
          /* jshint unused: true */
          if (stat && stat.isDirectory()) {
            this.walk(file, (err3, res) => {
              if (err3) {
                writeError(err3);
                throw err3;
              }
              if (res) {
                results = results.concat(res);
              }
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      };
      next();
    });
  }
  // NSchemaInterface ends

  // tslint:disable-next-line:prefer-function-over-method
  public async writeFile(filename: string, content: string): Promise<void> {
    const dirname = pathDirname(filename);
    createDirectorySync(dirname);
    return await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        filename,
        content,
        null,
        (err: NodeJS.ErrnoException | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}

export async function generate(parentConfig: NSchemaTask, config: NSchemaTask) {
  const nschemaInstance = new NSchema();

  const nschema: NSchemaInterface | undefined = await (async () => {
    try {
      return await nschemaInstance.init();
    } catch (err) {
      return undefined;
    }
  })();

  if (!nschema) {
    writeError("failed to load NSchema");
  } else {
    try {
      return await nschema.generate(parentConfig, config, {});
    } catch (err) {
      writeError("NSchema failed to generate");
      writeError(err);
      throw err;
    }
  }
}

function groupBy<T>(
  keyGrouper: (item: T) => string,
  lst: T[]
): Map<string, T[]> {
  return lst.reduce((acc, next) => {
    const key = keyGrouper(next);
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    const groupList = acc.get(key);
    if (groupList) {
      groupList.push(next);
    }

    return acc;
  }, new Map<string, T[]>());
}

export async function features() {
  const nschemaInstance = new NSchema();
  try {
    const nschema = await nschemaInstance.init();
    const version: string = require("../package.json").version;
    writeLog(LogLevel.Default, `NineSchema version ${version}`);
    writeLog(LogLevel.Default, "");
    writeLog(LogLevel.Default, "Available targets:");
    writeLog(LogLevel.Default, "");

    const typeGroups = groupBy(item => item.type, nschema.targets);
    typeGroups.forEach((list, type) => {
      writeLog(LogLevel.Default, `type: ${chalk.blue(type)}`);
      console.table(
        list.map(target => {
          if (type === "object") {
            return {
              description: target.description,
              language: target.language,
              name: target.name,
              type: target.type
            };
          } else {
            return {
              bind: target.bind || null,
              description: target.description,
              language: target.language,
              name: target.name,
              serviceType: target.serviceType || null,
              type: target.type
            };
          }
        })
      );
      writeLog(LogLevel.Default, "");
    });
  } catch (err) {
    writeError("failed to load NSchema");
    writeError(err);
    throw err;
  }
}

export function getConfig(nschemaLocation: string): NSchemaTask {
  return {
    list: [],
    nschemaLocation,
    type: "bundle"
  };
}
