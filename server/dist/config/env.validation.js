"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "envValidationSchema", {
    enumerable: true,
    get: function() {
        return envValidationSchema;
    }
});
const _joi = /*#__PURE__*/ _interop_require_wildcard(require("joi"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
const envValidationSchema = _joi.object({
    NODE_ENV: _joi.string().valid('development', 'production', 'test').default('development'),
    PORT: _joi.number().port().default(3000),
    DATABASE_URL: _joi.string().min(10).required(),
    DIRECT_URL: _joi.string().min(10).required(),
    SWAGGER_ENABLED: _joi.string().valid('true', 'false').optional(),
    CORS_ORIGIN: _joi.string().optional().default('*')
});

//# sourceMappingURL=env.validation.js.map