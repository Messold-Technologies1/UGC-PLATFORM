"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreatorsListResponseDto", {
    enumerable: true,
    get: function() {
        return CreatorsListResponseDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _creatorprofileresponsedto = require("./creator-profile-response.dto");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CreatorsListResponseDto = class CreatorsListResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: ()=>[
                _creatorprofileresponsedto.CreatorProfileResponseDto
            ]
    }),
    _ts_metadata("design:type", Array)
], CreatorsListResponseDto.prototype, "items", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 42
    }),
    _ts_metadata("design:type", Number)
], CreatorsListResponseDto.prototype, "total", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1
    }),
    _ts_metadata("design:type", Number)
], CreatorsListResponseDto.prototype, "page", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 20
    }),
    _ts_metadata("design:type", Number)
], CreatorsListResponseDto.prototype, "limit", void 0);

//# sourceMappingURL=creators-list-response.dto.js.map