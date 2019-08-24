import { BundleTask } from "./provider/type/bundle";
import { CleanTask } from "./provider/type/clean";
import { ImportTask } from "./provider/type/import";
import { AnonymousMessage, MessageTask } from "./provider/type/message";
import { ObjectTask } from "./provider/type/object";
import { ServiceTask } from "./provider/type/service";

export interface NSchemaInterface {
  context: NSchemaContext;

  generate(
    parentConfig: NSchemaTask,
    config: NSchemaTask,
    context: object
  ): Promise<any>;
  getCustomPlugin(name: string, obj: any): NSchemaPlugin[];
  getMessage(ns: string, name: string): MessageTask | undefined;
  getObject(ns: string, name: string): ObjectTask | undefined;
  getService(ns: string, name: string): ServiceTask | undefined;
  getTarget(obj: any): TargetBind[];

  isArray(obj: any): obj is any[];
  mixinRecursive(
    obj: any,
    target: any,
    filter?: (o: any, t: any, p: string) => boolean
  ): void;
  register(type: string, obj: NSchemaPlugin): Promise<any>;
  registerMessage(typeConfig: MessageTask): void;
  registerObject(typeConfig: ObjectTask): void;
  registerService(serviceConfig: ServiceTask): void;
  registerSource(obj: SourceBind): Promise<any>;
  registerTarget(obj: TargetBind): Promise<any>;
  types(): { [name: string]: NSchemaPlugin };

  writeFile(filename: string, content: string): Promise<any>;
}
export interface Initializable {
  init?(nschema: NSchemaInterface): Promise<any>;
}

export interface NSchemaProperty {
  defaultValue?: string;
  description?: string;
  options?: {
    ignoreSerialization?: boolean;
  };
  type: NSchemaType;
}

export type NSchemaTask =
  | CleanTask
  | BundleTask
  | ImportTask
  | ObjectTask
  | MessageTask
  | ServiceTask;

export interface NSchemaPlugin extends Initializable {
  description: string;
  language?: string;
  name: string;
  type: string;
  execute?(
    config: NSchemaTask,
    nschema: NSchemaInterface,
    context: any | undefined
  ): Promise<any>;
}
export interface NSchemaCustomPlugin extends NSchemaPlugin {
  [name: string]: any;
}
export interface SourceBind extends NSchemaPlugin {
  getData(payload: string): Promise<any>;
}

export interface TargetBind extends NSchemaPlugin {
  bind?: string;
  language: string;
  serviceType?: string;
  generate(
    config: ObjectTask | MessageTask | ServiceTask,
    nschema: NSchemaInterface,
    target: Target,
    context: any | undefined
  ): Promise<any>;
}

export interface Identifier {
  name: string;
  namespace: string;
}

export interface NSchemaMessageArgument {
  description?: string;
  name: string;
  type: NSchemaType;
}

export interface NSchemaOperation {
  description?: string;
  inMessage: AnonymousMessage;
  outMessage: AnonymousMessage;
}

export interface HasFilenameMixin {
  $fileName?: string;
}

export interface HasImplementsMixin {
  implements?: NSchemaTypeDefinition[];
}

export interface HasTargetMixin {
  target?: Target | Target[];
}

export interface AppendableMixin {
  append?: boolean;
}

export interface RestMessageArgument extends NSchemaMessageArgument {
  headerName?: string;
  paramType?: "header" | "query";
  realType?: NSchemaType;
}

export interface RestAnonymousMessage extends AnonymousMessage {
  data?: RestMessageArgument[];
}

export interface NSchemaRestOperation extends NSchemaOperation {
  inMessage: RestAnonymousMessage;
  method?: string;
  outMessage: RestAnonymousMessage;
  route?: string;
}

export interface NSchemaRestService extends ServiceTask, HasFilenameMixin {
  operations: { [name: string]: NSchemaRestOperation };
  routePrefix?: string;
}

export interface NSchemaContext {
  messages: MessageTask[];
  objects: ObjectTask[];
  services: ServiceTask[];
}

export interface NSchemaTypeDefinition {
  modifier?: NSchemaModifier | NSchemaModifier[];
  name: string;
  namespace?: string;
}

export type NSchemaModifier =
  | "list"
  | "array"
  | "option"
  | NSchemaTypeDefinition;

export type NSchemaPrimitiveType = "string" | "int" | "float" | "bool" | "date";

export type NSchemaType = NSchemaTypeDefinition | NSchemaPrimitiveType;

export interface AppendableProperties {
  /*
   * append namespace. Part of the namespace that has to be appended to the parent's
   */
  $namespace?: string;

  /*
   * append target. Part of the target that has to be appended to the parent's
   */
  $target?: Target | Target[];
}

export interface Target extends HasFilenameMixin {
  $namespaceMapping?: {
    [name: string]: string;
  };
  bind?: string;
  description?: string;
  language?: string;

  /**
   * Location MUST be a folder
   *
   * @type {string}
   * @memberof Target
   */
  location: string;
  name?: string;
  serviceType?: string;
  type?: string;
}

export type TemplateFunction<T, X = any> = (
  data: T,
  nschema: NSchemaInterface,
  context: X,
  target: Target
) => string;

export function shouldNever(_t: never, skipError?: boolean) {
  if (!skipError) {
    throw new Error(`Should never ${new Error().stack}`);
  }
}
