/// <reference types="ejs" />
import ejs = require('ejs');
import { Definition, NineSchemaConfig, NSchemaInterface, SourceBind, TargetBind, NSchemaPlugin } from './model';
export default class NSchema implements NSchemaInterface {
    dirname: string;
    register(type: string, obj: NSchemaPlugin): Promise<any>;
    registerSource(obj: SourceBind): Promise<any>;
    registerTarget(obj: TargetBind): Promise<any>;
    registerService(serviceConfig: Definition): void;
    registerObject(typeConfig: Definition): void;
    getObject(ns: string, name: string): any;
    getMessage(ns: string, name: string): any;
    registerMessage(typeConfig: Definition): void;
    getService(ns: string, name: string): any;
    getTarget(obj: any): TargetBind;
    sources: {
        [name: string]: SourceBind;
    };
    targets: TargetBind[];
    types: any;
    context: any;
    dotSettings: any;
    loadDefer: Promise<any>;
    globalConfig: NineSchemaConfig;
    verbose: boolean;
    constructor();
    require: (name: string) => any;
    path: any;
    isArray: (obj: any) => obj is any[];
    objClone: any;
    mixinRecursive: any;
    writeFile(filename: string, content: string): Promise<any>;
    appendFile: any;
    ejs: any;
    ejsSettings: any;
    utils: any;
    init(loadPath?: string): Promise<any>;
    buildTemplate(filename: string): ejs.TemplateFunction;
    generate(parentConfig: NineSchemaConfig, config: Definition): any;
    walk(dir: string, done: (err: Error, data?: string[]) => void): void;
}
export declare function generate(parentConfig: NineSchemaConfig, config: Definition): Promise<any>;
export declare function features(): Promise<any>;
