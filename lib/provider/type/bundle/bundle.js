"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const excludedConfigNames = ["$type", "$namespace", "list"];
function execute(parentConfig, nschema) {
    const arr = parentConfig.list || [];
    const len = arr.length;
    const newConfig = nschema.objClone(parentConfig);
    nschema.mixinRecursive(newConfig, parentConfig, (_1, _2, p) => {
        return excludedConfigNames.indexOf(p) < 0;
    });
    if (parentConfig.$namespace) {
        newConfig.namespace += `.${parentConfig.$namespace}`;
    }
    const tempTargets = newConfig.$target;
    let resultPromise = Promise.resolve(true);
    const toRemove = [];
    (tempTargets || []).forEach((tgt, i) => {
        const customBundle = nschema.getCustomPlugin("customBundle", tgt);
        if (customBundle) {
            resultPromise = resultPromise.then(() => {
                newConfig.$target = [tgt];
                if (customBundle) {
                    if (customBundle.execute) {
                        return customBundle.execute(newConfig, nschema).then(() => {
                            newConfig.$target = tempTargets;
                        });
                    }
                    else {
                        throw new Error("custom bundle without execute");
                    }
                }
                else {
                    throw new Error("Not possible");
                }
            });
            toRemove.push(i);
        }
    });
    toRemove.reverse().forEach(i => {
        newConfig.$target.splice(i, 1);
    });
    return arr.reduce((acc, next) => {
        return acc.then(() => {
            return nschema.generate(newConfig, next);
        });
    }, resultPromise);
}
const bundle = {
    description: "Handles the concept of namespacing in the generation process",
    execute,
    name: "bundle",
    init(nschema) {
        return nschema.register("type", this);
    },
    type: "type"
};
exports.default = bundle;
//# sourceMappingURL=bundle.js.map