"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreatorProfileModule", {
    enumerable: true,
    get: function() {
        return CreatorProfileModule;
    }
});
const _common = require("@nestjs/common");
const _creatorprofilecontroller = require("./creator-profile.controller");
const _creatorprofileservice = require("./creator-profile.service");
const _creatorpackagemodule = require("../creator-package/creator-package.module");
const _authmodule = require("../auth/auth.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let CreatorProfileModule = class CreatorProfileModule {
};
CreatorProfileModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _creatorpackagemodule.CreatorPackageModule,
            _authmodule.AuthModule
        ],
        controllers: [
            _creatorprofilecontroller.CreatorProfileController
        ],
        providers: [
            _creatorprofileservice.CreatorProfileService
        ]
    })
], CreatorProfileModule);

//# sourceMappingURL=creator-profile.module.js.map