function execute(parentConfig, nschema) {
    nschema.registerObject(parentConfig);
    return new Promise((resolve, reject) => {
        process.nextTick(() => {
            const newConfig = nschema.objClone(parentConfig);
            newConfig.$subType = newConfig.$subType || "";
            const target = newConfig.$target;
            let targetArr;
            if (target) {
                if (!nschema.isArray(target)) {
                    targetArr = [target];
                }
                else {
                    targetArr = target;
                }
                const result = targetArr.map(item => {
                    item.type = "object";
                    const foundTarget = nschema.getTarget(item);
                    if (foundTarget) {
                        return foundTarget.generate(newConfig, nschema, item);
                    }
                    else {
                        console.error("Target not found: ", item);
                        throw new Error("Target not found");
                    }
                });
                Promise.all(result).then(arr => {
                    resolve(arr);
                }, reject);
            }
            else {
                resolve(false);
            }
        });
    });
}
const obj = {
    description: "Generates classes and objects",
    execute,
    name: "object",
    type: "type",
    init(nschema) {
        return nschema.register("type", this);
    }
};
export default obj;
//# sourceMappingURL=object.js.map