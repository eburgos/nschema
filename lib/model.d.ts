import { TemplateFunction } from "ejs";
export interface Utils {
    relativePath(from: string, to: string): string;
    resolvePath(...args: string[]): string;
    i(amount: number, seed: string): string;
    clone(obj: any): any;
}
export interface NineSchemaConfig {
    $nschemaLocation?: string;
    i: number;
    $u: Utils;
    $nschema?: NSchemaInterface;
    $target?: Target;
    target?: Target[];
    list?: Definition[];
    $importLocation?: string;
}
export interface NSchemaInterface {
    context(): NSchemaContext;
    types(): {
        [name: string]: NSchemaPlugin;
    };
    registerTarget(obj: TargetBind): Promise<any>;
    registerSource(obj: SourceBind): Promise<any>;
    register(type: string, obj: NSchemaPlugin): Promise<any>;
    generate(parentConfig: NineSchemaConfig, config: Definition, context: object): Promise<any>;
    registerService(serviceConfig: Definition): void;
    registerObject(typeConfig: Definition): void;
    registerMessage(typeConfig: Definition): void;
    getObject(ns: string, name: string): Definition | undefined;
    getMessage(ns: string, name: string): NSchemaMessage | undefined;
    getService(ns: string, name: string): Definition | undefined;
    getTarget(obj: any): TargetBind | undefined;
    getCustomPlugin(name: string, obj: any): NSchemaPlugin | undefined;
    buildTemplate(filename: string): TemplateFunction;
    writeFile(filename: string, content: string): Promise<any>;
    isArray(obj: any): obj is any[];
    mixinRecursive(obj: any, target: any, filter?: (o: any, t: any, p: string) => boolean): void;
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
    execute?(config: Definition, nschema: NSchemaInterface, context: any | undefined): Promise<any>;
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
    generate(config: NineSchemaConfig, nschema: NSchemaInterface, target: Target, context: any | undefined): Promise<any>;
}
export interface Identifier {
    name: string;
    namespace: string;
}
export interface NSchemaObject extends Definition {
    $extends?: Identifier;
}
export declare type NSchemaMessageArgument = any;
export interface NSchemaMessage extends Definition {
    $extends?: Identifier;
    data: NSchemaMessageArgument[];
}
export interface NSchemaOperation extends Definition {
    description?: string;
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
    operations: {
        [name: string]: NSchemaRestOperation;
    };
    routePrefix?: string;
}
export interface NSchemaContext {
    objects: NSchemaObject[];
    messages: NSchemaMessage[];
    services: NSchemaService[];
}
export interface NSchemaType {
    name: string;
    namespace: string;
    modifier?: string;
}
export interface Definition extends NineSchemaConfig {
    $type?: string;
    namespace?: string;
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
