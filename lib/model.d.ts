import NSchema from "./nschema";
export interface Utils {
    clone(obj: any): any;
    i(amount: number, seed: string): string;
    relativePath(from: string, to: string): string;
    resolvePath(...args: string[]): string;
}
export interface NineSchemaConfig {
    $importLocation?: string;
    $nschema?: NSchemaInterface;
    $nschemaLocation?: string;
    $target?: Target;
    $u: Utils;
    i: number;
    list?: Definition[];
    target?: Target[];
}
export interface NSchemaInterface {
    buildTemplate(filename: string): TemplateFunction;
    context(): NSchemaContext;
    generate(parentConfig: NineSchemaConfig, config: Definition, context: object): Promise<any>;
    getCustomPlugin(name: string, obj: any): NSchemaPlugin | undefined;
    getMessage(ns: string, name: string): NSchemaMessage | undefined;
    getObject(ns: string, name: string): NSchemaObject | undefined;
    getService(ns: string, name: string): NSchemaService | undefined;
    getTarget(obj: any): TargetBind | undefined;
    isArray(obj: any): obj is any[];
    mixinRecursive(obj: any, target: any, filter?: (o: any, t: any, p: string) => boolean): void;
    objClone(obj: any): any;
    register(type: string, obj: NSchemaPlugin): Promise<any>;
    registerMessage(typeConfig: NSchemaMessage): void;
    registerObject(typeConfig: Definition): void;
    registerService(serviceConfig: NSchemaService): void;
    registerSource(obj: SourceBind): Promise<any>;
    registerTarget(obj: TargetBind): Promise<any>;
    types(): {
        [name: string]: NSchemaPlugin;
    };
    writeFile(filename: string, content: string): Promise<any>;
}
export interface Initializable {
    init?(nschema: NSchemaInterface): Promise<any>;
}
export interface NSchemaPlugin extends Initializable {
    description: string;
    language?: string;
    name: string;
    type: string;
    execute?(config: Definition, nschema: NSchemaInterface, context: any | undefined): Promise<any>;
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
    generate(config: any, nschema: NSchemaInterface, target: Target, context: any | undefined): Promise<any>;
}
export interface Identifier {
    name: string;
    namespace: string;
}
export interface NSchemaObject extends Registerable {
    $extends?: Identifier;
    name: string;
    namespace?: string;
}
export interface NSchemaMessageArgument {
    description?: string;
    name: string;
    type: NSchemaType;
}
interface Registerable {
    $nschemaRegistered?: boolean;
}
export interface NSchemaMessage extends Registerable {
    $extends?: Identifier;
    data: NSchemaMessageArgument[];
    description?: string;
    name?: string;
    namespace?: string;
}
export interface NSchemaOperation {
    description?: string;
    inMessage: NSchemaMessage;
    name: string;
    outMessage: NSchemaMessage;
}
export interface NSchemaRestOperation extends NSchemaOperation {
    method: string;
    route: string;
}
export interface NSchemaService extends Registerable {
    $fileName?: string;
    description?: string;
    name: string;
    namespace?: string;
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
    messages: NSchemaMessage[];
    objects: NSchemaObject[];
    services: NSchemaService[];
}
export interface NSchemaTypeDefinition {
    modifier?: NSchemaModifier | NSchemaModifier[];
    name: string;
    namespace: string;
}
export declare type NSchemaModifier = "list" | "array" | "option" | NSchemaTypeDefinition;
export declare type NSchemaPrimitiveType = "string" | "int" | "float" | "bool" | "date";
export declare type NSchemaType = NSchemaTypeDefinition | NSchemaPrimitiveType;
export interface Definition extends NineSchemaConfig {
    $fileName?: string;
    $namespace?: string;
    $nschemaRegistered?: boolean;
    $type?: string;
    name: string;
    namespace?: string;
}
export interface Target {
    $fileName?: string;
    $namespaceMapping?: {
        [name: string]: string;
    };
    description: string;
    location: string;
    name: string;
    type?: string;
}
interface DataContext {
    $context: NSchemaContext;
    $i: Utils;
    $nschema: NSchema;
    $nschemaLocation?: string;
    $nschemaRegistered?: boolean;
    $target?: any[];
    $type?: string | any;
    $u: any;
    description: string;
    list?: any[];
    location: string;
    name: string;
    namespace?: string;
    operations: NSchemaOperation[];
    schema: any;
    [name: string]: any;
}
export declare type TemplateFunction = (data: DataContext | {
    [name: string]: any;
}) => string;
export declare function shouldNever(t: never): void;
export {};
