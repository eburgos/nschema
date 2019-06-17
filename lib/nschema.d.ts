/// <reference types="node" />
import * as ejs from "ejs";
import * as path from "path";
import { Definition, NineSchemaConfig, NSchemaContext, NSchemaInterface, NSchemaMessage, NSchemaObject, NSchemaPlugin, NSchemaService, SourceBind, TargetBind } from "./model";
export default class NSchema implements NSchemaInterface {
    objClone: (obj: any) => any;
    isArray: (obj: any) => obj is any[];
    path: typeof path;
    require: ((name: string) => any) | undefined;
    mixinRecursive: (obj: any, target: any, filter?: (o: any, t: any, p: string) => boolean) => void;
    appendFile: (filename: string, content: string, callback: (err: NodeJS.ErrnoException | null) => void) => void;
    ejs: typeof ejs;
    ejsSettings: {
        client: boolean;
        close: string;
        debug: boolean;
        open: string;
    };
    utils: {
        initialCaps(n: string): string;
    };
    targets: TargetBind[];
    private sources;
    private customPlugins;
    private dotSettings;
    private loadDefer;
    private globalConfig;
    private mTypes;
    private mContext;
    constructor();
    types(): {
        [name: string]: NSchemaPlugin;
    };
    context(): NSchemaContext;
    register(type: string, obj: NSchemaPlugin): Promise<null>;
    registerSource(obj: SourceBind): Promise<null>;
    registerTarget(obj: TargetBind): Promise<null>;
    registerService(serviceConfig: NSchemaService): void;
    registerObject(typeConfig: NSchemaObject): void;
    getObject(ns: string, name: string): NSchemaObject | undefined;
    getMessage(ns: string, name: string): NSchemaMessage | undefined;
    registerMessage(typeConfig: NSchemaMessage): void;
    getService(ns: string, name: string): NSchemaService | undefined;
    getCustomPlugin(name: string, obj: any): NSchemaPlugin | undefined;
    getTarget(obj: any): TargetBind;
    buildTemplate(filename: string): ejs.TemplateFunction;
    writeFile(filename: string, content: string): Promise<void>;
    init(loadPath?: string): Promise<NSchema>;
    generate(parentConfig: NineSchemaConfig, config: Definition, context: any | undefined): Promise<any>;
    walk(dir: string, done: (err: Error | undefined, data?: string[]) => void): void;
}
export declare function generate(parentConfig: NineSchemaConfig, config: Definition): Promise<any>;
export declare function features(): Promise<void>;
export declare function getConfig(nschemaLocation: string): NineSchemaConfig;
