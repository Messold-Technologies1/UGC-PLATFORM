"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RegisterDto", {
    enumerable: true,
    get: function() {
        return RegisterDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _classvalidator = require("class-validator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let RegisterDto = class RegisterDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Jane Doe'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'jane@example.com'
    }),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'securePassword123',
        minLength: 8
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(8, {
        message: 'Password must be at least 8 characters'
    }),
    _ts_metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);

//# sourceMappingURL=register.dto.js.map