"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logging_1 = require("../../../../../logging");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
function baseGenerate(config, nschema, target, template, typescript, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return typescript.generate(nschema, config, template, target, context);
    });
}
const wrapDoubleQuotes = utils_1.wrap(`"`, `"`);
function renderEnum(data) {
    return `enum ${data.name} {
${Object.keys(data.properties || {}).map((prop, cnt) => {
        if (!data.properties) {
            throw new Error(`Invalid properties`);
        }
        const property = data.properties[prop];
        const currentVal = typeof property.typescriptValue !== "undefined"
            ? property.type === "string"
                ? `"${property.typescriptValue}"`
                : property.typescriptValue
            : cnt;
        return `  /*
   * ${(property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${property.typescriptName || utils_1.initialCaps(prop)} = ${currentVal}`;
    }).join(`,

`)}
}

/*::
 export type ${data.name} = ${Object.keys(data.properties || {})
        .map(wrapDoubleQuotes)
        .join(" | ")};
*/
`;
}
function renderClass(data, nschema, context) {
    return `interface ${data.name}${data.implements && data.implements.length
        ? ` extends ${data.implements
            .map(impl => helpers_1.typeName(impl, nschema, data.namespace || "", data.name, context, false, false, true))
            .join(", ")}`
        : ""} {
${Object.keys(data.properties || {})
        .map(prop => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const property = data.properties[prop];
        const nschemaType = property.type;
        const canOmitProperty = utils_1.isOptional(property) && property.canOmit;
        return `  /**
   * ${(property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${property.typescriptName || prop}${canOmitProperty ? "?" : ""}: ${helpers_1.typeName(canOmitProperty ? utils_1.removeOptional(nschemaType) : nschemaType, nschema, data.namespace, data.name, context, false, false, true)};
`;
    })
        .join("\n")}}
`;
}
const templates = {
    object(data, nschema, context) {
        if (data.type === "message" || data.type === "service") {
            throw new Error("Invalid argument");
        }
        return `${helpers_1.renderFileHeader(data)}
export ${data.subType === "enumeration"
            ? renderEnum(data)
            : renderClass(data, nschema, context)}`;
    }
};
class NObject {
    constructor() {
        this.typescript = undefined;
    }
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.typescript) {
                throw new Error("Argument exception");
            }
            const typescript = this.typescript;
            nschema.registerTarget({
                description: "Generate typescript models for your nineschema definitions",
                language: "typescript",
                name: "typescript/object",
                type: "object",
                generate(config, thisNschema, target, context) {
                    return tslib_1.__awaiter(this, void 0, void 0, function* () {
                        logging_1.writeDebugLog(`generating contents for ${config.namespace} - ${config.name}`);
                        return baseGenerate(config, thisNschema, target, templates.object, typescript, context);
                    });
                }
            });
            return Promise.resolve(true);
        });
    }
}
exports.NObject = NObject;
const obj = new NObject();
exports.default = obj;
