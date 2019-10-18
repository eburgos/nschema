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
import chalk from "chalk";
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
  mixedInto: any,
  from: any,
  filter?: (o: any, t: any, p: string) => boolean
) {
  for (const p in from) {
    if (from.hasOwnProperty(p)) {
      if (!filter || !filter(mixedInto, from, p)) {
        if (
          !isArray(mixedInto[p]) &&
          !isArray(from[p]) &&
          typeof mixedInto[p] === "object" &&
          typeof from[p] === "object"
        ) {
          mixinRecursive(mixedInto[p], from[p]);
        } else {
          mixedInto[p] = from[p];
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

    mixinRecursive(newConfigCloned, parentConfig, (_a, _b, prop) => {
      return !allowedParentToChildrenMixin[prop];
    });

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

        for (const p in obj) {
          if (obj.hasOwnProperty(p) && isValidCriteriaProperty(p)) {
            if (typeof tgt[p] === "function") {
              if (!tgt[p](obj[p])) {
                return false;
              }
            } else if (tgt[p] !== obj[p] && tgt[p] !== "*") {
              return false;
            }
          }
        }
        return true;
      }
    );
    return customPlugins;
  }

  public getMessage(ns: string, name: string): MessageTask | undefined {
    const r = this.context.messages.filter(t => {
      return (
        (t.namespace || "") === (ns || "") && (t.name || "") === (name || "")
      );
    });
    if (r.length) {
      return r[0];
    }
    return undefined;
  }

  public getObject(ns: string, name: string) {
    const r = this.context.objects.filter(t => {
      return (
        (t.namespace || "") === (ns || "") && (t.name || "") === (name || "")
      );
    });
    if (r.length) {
      return r[0];
    }
    return undefined;
  }
  public getService(ns: string, name: string) {
    const r = this.context.services.filter(t => {
      return (t.namespace || "") === ns && (t.name || "") === name;
    });
    if (r.length) {
      return r[0];
    }
    return undefined;
  }
  public getTarget(obj: any): TargetBind[] {
    const targets = this.targets.filter((target: TargetBind) => {
      const tgt: any = target;
      for (const p in obj) {
        if (obj.hasOwnProperty(p) && isValidCriteriaProperty(p)) {
          if (tgt[p] !== obj[p]) {
            return false;
          }
        }
      }
      return true;
    });
    return targets;
  }

  public async init(loadPath?: string) {
    const self: NSchema = this;
    const providerPath: string = !!loadPath
      ? loadPath
      : pathResolve(__dirname, "provider");

    if (this.loadDefer) {
      await this.loadDefer;
      return self;
    } else {
      this.loadDefer = Promise.all(
        fs
          .readdirSync(providerPath)
          .filter((item: string) => {
            return fs.statSync(pathResolve(providerPath, item)).isDirectory();
          })
          .map((d: string) => {
            return fs
              .readdirSync(pathResolve(providerPath, d))
              .map((i: string) => {
                return pathResolve(providerPath, d, i);
              });
          })
          .reduce((a: string[], b: string[]) => {
            return a.concat(b);
          })
          .filter((d: string) => {
            const dir = pathResolve(providerPath, d);
            const basename = "index"; // pathBasename(dir);
            return fs.existsSync(pathResolve(dir, `${basename}.js`));
          })
          .map((d: string) => {
            const dir = pathResolve(providerPath, d);
            const basename = "index";
            return pathResolve(dir, basename);
          })
          .map(require)
          .map(m => {
            if (m.default) {
              m = m.default;
            }
            return m.init(self);
          })
      );
      try {
        await this.loadDefer;
        return self;
      } catch (err) {
        throw err;
      }
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
    const t = this.getMessage(
      typeConfig.namespace || "",
      typeConfig.name || ""
    );
    if (!t) {
      this.context.messages.push(typeConfig);
    }
  }

  public registerObject(typeConfig: ObjectTask) {
    const t = this.getObject(typeConfig.namespace || "", typeConfig.name);
    if (!t) {
      this.context.objects.push(typeConfig);
    }
  }

  public registerService(serviceConfig: ServiceTask) {
    const t = this.getService(
      serviceConfig.namespace || "",
      serviceConfig.name
    );
    if (!t) {
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
    const self = this;
    fs.readdir(dir, (err: NodeJS.ErrnoException | null, list: string[]) => {
      if (err) {
        return done(err);
      }
      let i = 0;
      (function next() {
        let file = list[i];
        i += 1;
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
            self.walk(file, (err3, res) => {
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
      })();
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
  const n = new NSchema();

  const nschema: NSchemaInterface | undefined = await (async () => {
    try {
      return await n.init();
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
  const n = new NSchema();
  try {
    const nschema = await n.init();
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
              type: target.type,
              language: target.language,
              name: target.name,
              description: target.description
            };
          } else {
            return {
              type: target.type,
              language: target.language,
              serviceType: target.serviceType || null,
              bind: target.bind || null,
              name: target.name,
              description: target.description
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
