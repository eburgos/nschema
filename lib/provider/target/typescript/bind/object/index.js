"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const logging_1 = require("../../../../../logging");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
function baseGenerate(config, nschema, target, template, typescript, context) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const $currentVal = typeof property.typescriptValue !== "undefined"
            ? property.typescriptValue
            : cnt;
        return `/*
          * ${(property.description || "").replace(/\n/g, "\n     * ")}
          */
         ${property.typescriptName || utils_1.initialCaps(prop)} = ${$currentVal}`;
    }).join(`,
        `)}
    }
    /*::
    export type ${data.name} = ${Object.keys(data.properties || {})
        .map(wrapDoubleQuotes)
        .join(" | ")};
    */`;
}
function renderClass(data, $nschema) {
    return `interface ${data.name}${data.implements && data.implements.length
        ? ` extends ${data.implements.map(impl => helpers_1.typeName(impl)).join(", ")}`
        : ""} {
${Object.keys(data.properties || {})
        .map(prop => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const $property = data.properties[prop];
        const $nschemaType = $property.type;
        const $registeredType = $nschema.getObject(typeof $nschemaType !== "string"
            ? $nschemaType.namespace || ""
            : "" || data.namespace || "", typeof $nschemaType !== "string" ? $nschemaType.name : "") || $nschemaType;
        const modifier = $nschemaType.modifier;
        const isOptional = typeof $nschemaType !== "string"
            ? modifier
                ? (util_1.isArray(modifier) ? modifier : [modifier]).indexOf("option") >= 0
                    ? true
                    : false
                : false
            : false;
        return `  /**
   * ${($property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${$property.typescriptName || prop}${isOptional ? "?" : ""}: ${helpers_1.typeName($registeredType, $nschema)};
`;
    })
        .join("\n")}}
`;
}
const templates = {
    object(data, nschema) {
        if (data.$type === "message" || data.$type === "service") {
            throw new Error("Invalid argument");
        }
        return `${helpers_1.renderFileHeader(data)}
export ${data.$subType === "enumeration"
            ? renderEnum(data)
            : renderClass(data, nschema)}`;
    }
};
class NObject {
    constructor() {
        this.typescript = undefined;
    }
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    return __awaiter(this, void 0, void 0, function* () {
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