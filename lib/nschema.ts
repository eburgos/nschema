/**
 * @module nschema/nschema
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import * as ejs from "ejs";
import * as fs from "fs";
import * as path from "path";
import {
  Definition,
  NineSchemaConfig,
  NSchemaContext,
  NSchemaInterface,
  NSchemaMessage,
  NSchemaObject,
  NSchemaPlugin,
  NSchemaService,
  SourceBind,
  TargetBind,
  Utils
} from "./model";

declare let require: (name: string) => any;

const utils: Utils = {
  relativePath: path.relative,
  resolvePath: path.resolve,
  i(amount: number, seed: string) {
    let r = "";
    for (let cnt = 0; cnt < (amount || 0); cnt += 1) {
      r += seed;
    }
    return r;
  },
  clone(obj: any) {
    if (null == obj || "object" !== typeof obj) {
      return obj;
    }
    const copy: any = {};
    for (const attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj[attr];
      }
    }
    return copy;
  }
};

function createDirectorySync(dirpath: string) {
  const seps = dirpath.split(path.sep);
  const tried: string[] = [];
  seps.forEach(item => {
    tried.push(item);
    const tryDir = tried.join(path.sep);
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
function objClone(obj: any): any {
  let cnt;
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (isArray(obj)) {
    const r = [];
    const len = obj.length;
    for (cnt = 0; cnt < len; cnt += 1) {
      r.push(objClone(obj[cnt]));
    }
    return r;
  } else if (typeof obj === "object") {
    const r: any = {};
    for (const p in obj) {
      if (obj.hasOwnProperty(p)) {
        r[p] = objClone(obj[p]);
      }
    }
    return r;
  } else {
    return obj;
  }
}
function mixinRecursive(
  obj: any,
  target: any,
  filter?: (o: any, t: any, p: string) => boolean
) {
  for (const p in target) {
    if (target.hasOwnProperty(p)) {
      if (!filter || !filter(obj, target, p)) {
        if (
          !isArray(obj[p]) &&
          !isArray(target[p]) &&
          typeof obj[p] === "object" &&
          typeof target[p] === "object"
        ) {
          mixinRecursive(obj[p], target[p]);
        } else {
          obj[p] = target[p];
        }
      }
    }
  }
}

function appendFile(
  filename: string,
  content: string,
  callback: (err: Error, data?: any) => void
) {
  const dirname = path.dirname(filename);
  try {
    createDirectorySync(dirname);
    fs.appendFile(filename, content, callback);
  } catch (err) {
    callback(err);
  }
}

function isValidProperty(k: string) {
  return k !== "location" && k.indexOf("$") !== 0;
}

const getCriteria = (obj: any) => {
  return Object.keys(obj)
    .filter(isValidProperty)
    .map(k => {
      return `${k} = '${obj[k]}'`;
    })
    .join(" AND ");
};

function registerBasicTypes(nschema: NSchema) {
  [
    {
      $type: "object",
      bind: {},
      name: "int",
      namespace: "",
      properties: {}
    },
    {
      $type: "object",
      bind: {},
      name: "float",
      namespace: "",
      properties: {}
    },
    {
      $type: "object",
      bind: {},
      name: "string",
      namespace: "",
      properties: {}
    },
    {
      $type: "object",
      bind: {},
      name: "boolean",
      namespace: "",
      properties: {}
    }
  ].forEach(nschema.registerObject.bind(nschema));
}

export default class NSchema implements NSchemaInterface {
  public path = path;
  public isArray: (obj: any) => obj is any[] = isArray;
  public objClone: (obj: any) => any = objClone;

  public require: ((name: string) => any) | undefined = undefined;

  public mixinRecursive: (
    obj: any,
    target: any,
    filter?: (o: any, t: any, p: string) => boolean
  ) => void = mixinRecursive;

  public appendFile: (
    filename: string,
    content: string,
    callback: (err: Error, data?: any) => void
  ) => void = appendFile;
  public ejs = ejs;
  public ejsSettings = {
    client: true,
    close: "%>",
    debug: false,
    open: "<%"
  };
  public utils = {
    initialCaps(n: string) {
      if (!n) {
        return n;
      }
      return n[0].toUpperCase() + n.substr(1);
    }
  };

  public targets: TargetBind[] = [];
  private sources: { [name: string]: SourceBind } = {};
  private customPlugins: { [name: string]: NSchemaPlugin[] } = {};
  private dotSettings: any = {};
  private loadDefer: Promise<NSchema> | undefined = undefined;
  private globalConfig: NineSchemaConfig | undefined = undefined;
  private verbose: boolean = false;

  private mTypes: { [name: string]: NSchemaPlugin } = {};
  private mContext: NSchemaContext = {
    messages: [],
    objects: [],
    services: []
  };

  constructor() {
    this.mixinRecursive(this.dotSettings, this.ejsSettings);
    this.mixinRecursive(this.dotSettings, {});
    registerBasicTypes(this);
  }

  // Implementing NSchemaInterface

  public types() {
    return this.mTypes;
  }
  public context(): NSchemaContext {
    return this.mContext;
  }

  public register(type: string, obj: NSchemaPlugin) {
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
    return Promise.resolve(null);
  }

  public registerSource(obj: SourceBind) {
    this.sources[obj.name] = obj;
    return Promise.resolve(null);
  }

  public registerTarget(obj: TargetBind) {
    this.targets.push(obj);
    return Promise.resolve(null);
  }

  public registerService(serviceConfig: NSchemaService) {
    const t = this.getService(
      serviceConfig.namespace || "",
      serviceConfig.name
    );
    if (t && !t.$nschemaRegistered) {
      throw new Error(
        `service ${serviceConfig.namespace || ""}::${serviceConfig.name ||
          ""} already exists`
      );
    }
    this.context().services.push(serviceConfig);
    serviceConfig.$nschemaRegistered = true;
  }

  public registerObject(typeConfig: NSchemaObject) {
    const t = this.getObject(typeConfig.namespace || "", typeConfig.name);
    if (t && !t.$nschemaRegistered) {
      throw new Error(
        `type ${typeConfig.namespace || ""}::${typeConfig.name ||
          ""} already exists`
      );
    }
    this.context().objects.push(typeConfig);
    typeConfig.$nschemaRegistered = true;
  }

  public getObject(ns: string, name: string) {
    const r = this.context().objects.filter((t: Definition) => {
      return (
        (t.namespace || "") === (ns || "") && (t.name || "") === (name || "")
      );
    });
    if (r.length) {
      return r[0];
    }
    return undefined;
  }

  public getMessage(ns: string, name: string): NSchemaMessage | undefined {
    const r = this.context().messages.filter((t: Definition) => {
      return (
        (t.namespace || "") === (ns || "") && (t.name || "") === (name || "")
      );
    });
    if (r.length) {
      return r[0];
    }
    return undefined;
  }
  public registerMessage(typeConfig: Definition) {
    const t = this.getMessage(typeConfig.namespace || "", typeConfig.name);
    if (t && !t.$nschemaRegistered) {
      throw new Error(
        `message ${typeConfig.namespace || ""}::${typeConfig.name ||
          ""} already exists`
      );
    }
    this.context().messages.push(typeConfig);
    typeConfig.$nschemaRegistered = true;
  }
  public getService(ns: string, name: string) {
    const r = this.context().services.filter((t: Definition) => {
      return (t.namespace || "") === ns && (t.name || "") === name;
    });
    if (r.length) {
      return r[0];
    }
    return undefined;
  }
  public getCustomPlugin(name: string, obj: any) {
    const customPlugins = (this.customPlugins[name] || []).filter(
      (target: NSchemaPlugin) => {
        const tgt: any = target;

        for (const p in obj) {
          if (obj.hasOwnProperty(p) && isValidProperty(p)) {
            if (typeof tgt[p] === "function") {
              return tgt[p](obj[p]);
            } else if (tgt[p] !== obj[p] && tgt[p] !== "*") {
              return false;
            }
          }
        }
        return true;
      }
    );
    if (customPlugins.length > 1) {
      throw new Error(
        `Warning: multiple plugins found for ${getCriteria(obj)}.`
      );
    } else if (customPlugins.length === 1) {
      return customPlugins[0];
    } else {
      return undefined;
    }
  }
  public getTarget(obj: any): TargetBind {
    const targets = this.targets.filter((target: TargetBind) => {
      const tgt: any = target;
      for (const p in obj) {
        if (obj.hasOwnProperty(p) && isValidProperty(p)) {
          if (tgt[p] !== obj[p]) {
            return false;
          }
        }
      }
      return true;
    });
    if (targets.length > 1) {
      throw new Error(`multiple targets for: ${getCriteria(obj)}`);
    } else if (targets.length === 1) {
      return targets[0];
    } else {
      throw new Error(`Unsupported target: ${getCriteria(obj)}`);
    }
  }

  public buildTemplate(filename: string) {
    const tpl = fs.readFileSync(filename, { encoding: "utf-8" });
    this.dotSettings.filename = filename;

    const compiled = ejs.compile(tpl, this.dotSettings);

    return compiled;
  }
  // NSchemaInterface ends

  // tslint:disable-next-line:prefer-function-over-method
  public writeFile(filename: string, content: string): Promise<void> {
    const dirname = path.dirname(filename);
    createDirectorySync(dirname);
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(filename, content, null, (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public init(loadPath?: string) {
    const self: NSchema = this;
    const providerPath: string = !!loadPath
      ? loadPath
      : path.resolve(__dirname, "provider");

    if (this.loadDefer) {
      return this.loadDefer;
    } else {
      this.loadDefer = Promise.all(
        fs
          .readdirSync(providerPath)
          .filter((item: string) => {
            return fs.statSync(path.resolve(providerPath, item)).isDirectory();
          })
          .map((d: string) => {
            return fs
              .readdirSync(path.resolve(providerPath, d))
              .map((i: string) => {
                return path.resolve(providerPath, d, i);
              });
          })
          .reduce((a: string[], b: string[]) => {
            return a.concat(b);
          })
          .filter((d: string) => {
            const dir = path.resolve(providerPath, d);
            const basename = path.basename(dir);
            return fs.existsSync(path.resolve(dir, `${basename}.js`));
          })
          .map((d: string) => {
            const dir = path.resolve(providerPath, d);
            const basename = path.basename(dir);
            return path.resolve(dir, basename);
          })
          .map(require)
          .map(m => {
            if (m.default) {
              m = m.default;
            }
            return m.init(self);
          })
      )
        .catch(err => {
          console.log(err);
          throw err;
        })
        .then(() => {
          return self;
        });

      return this.loadDefer;
    }
  }

  public generate(
    parentConfig: NineSchemaConfig,
    config: Definition
  ): Promise<any> {
    // TOOD: Remove this when you are sure
    // if (!config) {
    //   config = {...parentConfig};
    //   mixinRecursive(config, parentConfig);
    //   parentConfig = this.globalConfig || {};
    // }
    config.i = 0; //Starts with indent = 0
    config.$u = utils;
    const type = config.$type || "";

    if (this.verbose) {
      console.log(`loading nschema provider: ${type}`);
    }
    const typeProvider = this.types()[type];
    if (!typeProvider) {
      throw new Error(`Unknown nschema type provider: ${type}`);
    }
    const newConfig: Definition = objClone(parentConfig);
    mixinRecursive(newConfig, config);
    if (typeProvider.execute) {
      return typeProvider.execute(newConfig, this);
    } else {
      return Promise.resolve();
    }
  }
  public walk(
    dir: string,
    done: (err: Error | undefined, data?: string[]) => void
  ) {
    let results: string[] = [];
    const self = this;
    fs.readdir(dir, (err: Error, list: string[]) => {
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
        fs.stat(file, ($err: Error, stat) => {
          /* jshint unused: true */
          if (stat && stat.isDirectory()) {
            self.walk(file, ($err2, res) => {
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
}

export async function generate(
  parentConfig: NineSchemaConfig,
  config: Definition
) {
  const n = new NSchema();
  try {
    const nschema = await n.init();

    try {
      return await nschema.generate(parentConfig, config);
    } catch (err) {
      console.log("NSchema failed to generate");
      console.log(err);
      if (err.stack) {
        console.log(err.stack);
      }
      throw err;
    }
  } catch (err) {
    console.log("failed to load NSchema");
    console.log(err);
    throw err;
  }
}

export function features() {
  const n = new NSchema();
  return n
    .init()
    .catch((err: Error) => {
      console.log("failed to load NSchema");
      console.log(err);
      throw err;
    })
    .then((nschema: NSchema) => {
      const version: string = require("../package.json").version;
      console.log(`NineSchema version ${version}`);
      console.log();
      console.log("Available bindings:");
      console.log();
      nschema.targets.forEach(target => {
        console.log(`	serviceType: '${target.serviceType}'`);
        console.log(`	language: '${target.language}'`);
        console.log(`	bind: '${target.bind}'`);
        console.log(
          `	description: ${target.description || "No description provided"}`
        );
        console.log();
      });
    });
}

export function getConfig(nschemaLocation: string): NineSchemaConfig {
  return { $nschemaLocation: nschemaLocation, i: 0, $u: utils };
}
