import { TemplateFunction } from "ejs";
export interface Utils {
  relativePath(from: string, to: string): string;
  resolvePath(...args: string[]): string;
  i(amount: number, seed: string): string;
  clone(obj: any): any;
}

export interface NineSchemaConfig {
  /*
	file path location
	 */
  $nschemaLocation?: string;
  /*
	Indentation size
	 */
  i: number;
  /*
	Utilities to help you templating
	 */
  $u: Utils;
  /*
	reference to NSchema itself. Useful in templates.
	 */
  $nschema?: NSchemaInterface;
  /*
	Reference to current generation target
	 */
  $target?: Target;
  /*
	Target (if applies)
	 */
  target?: Target[];
  /*
	List of children (if applies)
	 */
  list?: Definition[];

  /*

  */
  $importLocation?: string;
}

export interface NSchemaInterface {
  context(): NSchemaContext;
  types(): { [name: string]: NSchemaPlugin };

  registerTarget(obj: TargetBind): Promise<any>;
  registerSource(obj: SourceBind): Promise<any>;
  register(type: string, obj: NSchemaPlugin): Promise<any>;

  generate(parentConfig: NineSchemaConfig, config: Definition): Promise<any>;

  registerService(serviceConfig: Definition): void;
  registerObject(typeConfig: Definition): void;
  registerMessage(typeConfig: Definition): void;
  getObject(ns: string, name: string): Definition | undefined;
  getMessage(ns: string, name: string): Definition | undefined;
  getService(ns: string, name: string): Definition | undefined;
  getTarget(obj: any): TargetBind | undefined;
  getCustomPlugin(name: string, obj: any): NSchemaPlugin | undefined;

  buildTemplate(filename: string): TemplateFunction;

  writeFile(filename: string, content: string): Promise<any>;
  isArray(obj: any): obj is any[];
  mixinRecursive(
    obj: any,
    target: any,
    filter?: (o: any, t: any, p: string) => boolean
  ): void;
  objClone(obj: any): any;
}
export interface Initializable {
  init?(nschema: NSchemaInterface): Promise<any>;
}
export interface NSchemaPlugin extends Initializable {
  type: string;
  name: string;
  description: string;
  language?: string;
  execute?(config: Definition, nschema: NSchemaInterface): Promise<any>;
}
export interface NSchemaCustomPlugin extends NSchemaPlugin {
  [name: string]: any;
}
export interface SourceBind extends NSchemaPlugin {
  getData(payload: string): Promise<any>;
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
  operations: { [name: string]: NSchemaOperation };
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
  /*
	 current generation namespace
	*/
  namespace?: string;
  /*
	 append namespace. Part of the namespace that has to be appended to the parent's
	 */
  $namespace?: string;
  name: string;

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
