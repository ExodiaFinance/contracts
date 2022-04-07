"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvidersRegistry =
    exports.providers =
    exports.externalAddressRegistry =
    exports.contractFactory =
        void 0;
const contracts_1 = require("./contracts");
Object.defineProperty(exports, "contractFactory", {
    enumerable: true,
    get: function () {
        return contracts_1.contractFactory;
    },
});
Object.defineProperty(exports, "externalAddressRegistry", {
    enumerable: true,
    get: function () {
        return contracts_1.externalAddressRegistry;
    },
});
const providers_1 = require("./contracts/providers");
Object.defineProperty(exports, "providers", {
    enumerable: true,
    get: function () {
        return providers_1.providers;
    },
});
const providersRegistry_1 = require("./contracts/providersRegistry");
Object.defineProperty(exports, "ProvidersRegistry", {
    enumerable: true,
    get: function () {
        return providersRegistry_1.ProvidersRegistry;
    },
});
