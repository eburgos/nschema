/// <reference types="ejs" />
import { TemplateFunction } from "ejs";
export interface Utils {
  relativePath: (from: string, to: string) => string;
  resolvePath: (...args: string[]) => string;
  i: (amount: number, seed: string) => string;
  clone: (obj: any) => any;
}
export interface NineSchemaConfig {
  $nschemaLocation?: string;
  i?: number;
  $u?: Utils;
  $nschema?: NSchemaInterface;
  $target?: Target;
  target?: Target[];
  list?: Definition[];
  $importLocation?: string;
}
export interface NSchemaInterface {
  registerTarget: (obj: TargetBind) => Promise<any>;
  registerSource: (obj: SourceBind) => Promise<any>;
  register: (type: string, obj: NSchemaPlugin) => Promise<any>;
  context: NSchemaContext;
  types: {
    [name: string]: NSchemaPlugin;
  };
  generate: (
    parentConfig: NineSchemaConfig,
    config: Definition
  ) => Promise<any>;
  registerService: (serviceConfig: Definition) => void;
  registerObject: (typeConfig: Definition) => void;
  registerMessage: (typeConfig: Definition) => void;
  getObject: (ns: string, name: string) => Definition;
  getMessage: (ns: string, name: string) => Definition;
  getService: (ns: string, name: string) => Definition;
  getTarget: (obj: any) => TargetBind;
  getCustomPlugin: (name: string, obj: any) => NSchemaPlugin;
  buildTemplate: (filename: string) => TemplateFunction;
  writeFile: (filename: string, content: string) => Promise<any>;
  isArray: (obj: any) => obj is any[];
  mixinRecursive: (
    obj: any,
    target: any,
    filter?: (o: any, t: any, p: string) => boolean
  ) => void;
  objClone: (obj: any) => any;
}
export interface Initializable {
  init?: (nschema: NSchemaInterface) => Promise<any>;
}
export interface NSchemaPlugin extends Initializable {
  type: string;
  name: string;
  description: string;
  language?: string;
  execute?: (config: Definition, nschema: NSchemaInterface) => Promise<any>;
}
export interface NSchemaCustomPlugin extends NSchemaPlugin {
  [name: string]: any;
}
export interface SourceBind extends NSchemaPlugin {
  getData: (payload: string) => Promise<any>;
}
export interface TargetBind extends NSchemaPlugin {
  language: string;
  bind?: string;
  serviceType?: string;
  generate(
    config: NineSchemaConfig,
    nschema: NSchemaInterface,
    target: Target
  ): Promise<any>;
}
export interface Identifier {
  name: string;
  namespace: string;
}
export interface NSchemaObject extends Definition {
  $extends?: Identifier;
}
export interface NSchemaMessage extends Definition {
  $extends?: Identifier;
  data?: any[];
}
export interface NSchemaOperation extends Definition {
  inMessage: NSchemaMessage;
  outMessage: NSchemaMessage;
}
export interface NSchemaRestOperation extends NSchemaOperation {
  route: string;
  method: string;
}
export interface NSchemaService extends Definition {
  operations: {
    [name: string]: NSchemaOperation;
  };
}
export interface NSchemaRestService extends NSchemaService {
  routePrefix?: string;
}
export interface NSchemaContext {
  objects: NSchemaObject[];
  messages: NSchemaMessage[];
  services: NSchemaService[];
}
export interface Definition extends NineSchemaConfig {
  $type?: string;
  namespace?: string;
  $namespace?: string;
  name?: string;
  $fileName?: string;
  $nschemaRegistered?: boolean;
}
export interface Target {
  type?: string;
  name: string;
  description: string;
  location: string;
  $fileName?: string;
  $namespaceMapping?: {
    [name: string]: string;
  };
}
