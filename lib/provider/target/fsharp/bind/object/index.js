"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
function baseGenerate(config, nschema, target, template) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return __1.default.generate(nschema, config, template, target);
    });
}
function enumTemplate(data) {
    return `[<DataContract>]
  type ${data.name} =
      ${Object.keys(data.properties || {})
        .map((prop, cnt) => {
        if (!data.properties) {
            throw new Error("Invalid parameter");
        }
        const property = data.properties[prop];
        const $currentVal = typeof property.fsharpValue !== "undefined"
            ? property.fsharpValue
            : cnt;
        return `  // ${property.description || ""}
        | [<EnumMember>][<JsonProperty("${prop}")>] ${property.fsharpName ||
            utils_1.initialCaps(prop)} = ${$currentVal}`;
    })
        .join("\n")}`;
}
function classTemplate(data, nschema) {
    const i = data.append ? 1 : 0;
    return `${data.append ? " and " : ""}${utils_1.indent(i, "  ")}[<System.CLSCompliant (true)>]
  ${utils_1.indent(i, "  ")}[<System.Serializable ()>]
  ${utils_1.indent(i, "  ")}[<DataContract>]
  ${utils_1.indent(i, "  ")}[<AllowNullLiteral>]
  ${utils_1.indent(i, "  ")}${data.append ? "" : "type "}${data.name}() =
  ${!data.implements
        ? ""
        : `${data.implements
            .map(imp => {
            return `${utils_1.indent(i, "  ")}  implements ${__1.default.typeName(imp, nschema, data.namespace || "")}`;
        })
            .join("\n")}`}
  ${Object.keys(data.properties || {})
        .map(prop => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const property = data.properties[prop];
        const $nschemaType = property.type;
        const $registeredType = typeof $nschemaType === "string"
            ? undefined
            : nschema.getObject($nschemaType.namespace || data.namespace || "", $nschemaType.name);
        return `${utils_1.indent(i, "  ")}  /// <summary>${data.description ||
            ""}</summary>
      ${utils_1.indent(i, "  ")}  ${$registeredType && $registeredType.$subType === "enumeration"
            ? `[<JsonConverter(typeof<StringEnumConverter>)>]
${utils_1.indent(i, "  ")}  `
            : ""}${property.options && property.options.ignoreSerialization
            ? "[<System.Runtime.Serialization.IgnoreDataMember>][<System.Xml.Serialization.XmlIgnore()>][<JsonIgnore()>]"
            : `[<DataMember>][<JsonProperty("${prop}")>]`} member val ${property.fsharpName ||
            utils_1.initialCaps(prop)}: ${__1.default.typeName($nschemaType, nschema, data.namespace || "")} = ${__1.typeDefaultValue($nschemaType, property, __1.default, nschema, data.namespace || "")} with get, set`;
    })
        .join("\n")}
`;
}
const objectTemplate = (data, nschema) => {
    if (data.$type === "service" || data.$type === "message") {
        throw new Error("Invalid argument");
    }
    return `${__1.classHeader(data)}
  ${data.$subType === "enumeration"
        ? enumTemplate(data)
        : classTemplate(data, nschema)}
`;
};
const obj = {
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            nschema.registerTarget({
                description: "Generate fsharp models for your nineschema definitions",
                language: "fsharp",
                name: "fsharp/object",
                type: "object",
                generate(config, thisNschema, target) {
                    return tslib_1.__awaiter(this, void 0, void 0, function* () {
                        return baseGenerate(config, thisNschema, target, objectTemplate);
                    });
                }
            });
            return Promise.resolve(true);
        });
    }
};
exports.default = obj;
