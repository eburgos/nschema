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
function getData(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield Promise.resolve(JSON.parse(payload));
    });
}
const source = {
    description: "Reads config data from json",
    getData,
    name: "json",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            return nschema.registerSource(this);
        });
    },
    type: "source"
};
exports.default = source;
