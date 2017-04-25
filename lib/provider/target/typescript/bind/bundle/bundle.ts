import { all } from 'ninejs/core/deferredUtils'
import {Definition, NSchemaCustomPlugin, NSchemaInterface, NSchemaPlugin} from "../../../../../model";
import {TypeScriptConfig, TypeScriptContext} from "../../typescript";
import path = require('path')

let excludedConfigNames = ['$type', '$namespace', 'list'];


function computeImportMatrix(arr: TypeScriptConfig[], localNamespace: string, namespaceMapping: { [name:string]: string }) {
    let rootContext: TypeScriptContext = {
        imports: {}
    };
    arr.forEach(item => {
        Object.keys(item.$context.imports).forEach(p => {
           if (!rootContext.imports[p]) {
               rootContext.imports[p] = {};
           }
           let ns = item.$context.imports[p];
           Object.keys(ns).forEach(name => {
               rootContext.imports[p][name] = true;
           });
        });
    });
    return Object.keys(rootContext.imports)
            .filter(p => !!p && (p !== localNamespace))
            .map(p => {
                return 'import { ' + Object.keys(rootContext.imports[p]).join(', ') + ` } from '${ namespaceMapping[p] || ('./' + p)}'`;
    }).join ('\n') + '\n';
}

function execute (parentConfig: Definition, nschema: NSchemaInterface) {
    // According from how this bundle is implemented I will always get 1 target here
    let config: any = parentConfig;
    let target = config.$target[0];
    let namespaceMapping = (target.$namespaceMapping || {});
    var arr = parentConfig.list || [];
    let r = arr.map(function (cur: TypeScriptConfig) {
        let t = cur.$skipWrite;
        cur.$skipWrite = true;
        return nschema.generate(parentConfig, cur).then(function (result) {
            cur.$skipWrite = t;
            return result;
        });
    });
    return all(r).then(dblarr => {
        let arr: any[] = dblarr.reduce((acc, next: any[]) => {
            if (nschema.isArray(next)) {
                return acc.concat(next.filter(item => {
                    return item && item.generated;
                }));
            }
            else {
                return acc;
            }
        }, []);
        let results = (arr || [])
            .map(item => {
                return item.generated;
            });
        if (!results.length) {
            return Promise.resolve(false);
        }
        let result = results.join('\n');

        let imports = computeImportMatrix(arr.map(item => item.config), config.namespace, namespaceMapping);

        result = imports + '\n' + result;

        let filepath,
            location = target.location;
        if (location.indexOf('.') === 0) {
            filepath = path.resolve(process.cwd(), location, (target.$fileName || (config.namespace + '.ts')));
        }
        else {
            filepath = path.resolve(location, (config.$fileName || (config.namespace + '.ts')));
        }
        console.log('writing to file: ' + filepath);
        return nschema.writeFile(filepath, result).then(null, function (err) {
            console.log('error: ');
            console.log(err);
        });
    });
}

let bundle: NSchemaCustomPlugin = {
    type: '*',
    serviceType: '*',
    bind: '*',
    name: 'bundle-typescript-objects',
    language: 'typescript',
    description: 'Handles the concept of namespacing (TypeScript only) in the generation process',
    execute: execute
};


let exportable = {
    init: function (nschema: NSchemaInterface) {
        return nschema.register('customBundle', bundle);
    }
};

export default exportable;