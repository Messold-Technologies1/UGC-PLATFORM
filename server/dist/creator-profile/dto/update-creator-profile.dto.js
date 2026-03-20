"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateCreatorProfileDto", {
    enumerable: true,
    get: function() {
        return UpdateCreatorProfileDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _classtransformer = require("class-transformer");
const _classvalidator = require("class-validator");
const _createcreatorprofiledto = require("./create-creator-profile.dto");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let UpdateCreatorProfileDto = class UpdateCreatorProfileDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Jane Doe'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateCreatorProfileDto.prototype, "displayName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Bengaluru'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateCreatorProfileDto.prototype, "city", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'I make short-form UGC for brands.'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateCreatorProfileDto.prototype, "bio", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Female'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateCreatorProfileDto.prototype, "gender", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '18-24'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateCreatorProfileDto.prototype, "ageRange", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 15
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], UpdateCreatorProfileDto.prototype, "travelRadius", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        type: [
            String
        ],
        example: [
            'English',
            'Hindi'
        ]
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ArrayUnique)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdateCreatorProfileDto.prototype, "languages", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        type: [
            String
        ],
        example: [
            'Video Editing',
            'Photo Shoot'
        ]
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ArrayUnique)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdateCreatorProfileDto.prototype, "serviceTypeNames", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        type: [
            _createcreatorprofiledto.CreatorPackageCreateDto
        ]
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>_createcreatorprofiledto.CreatorPackageCreateDto),
    _ts_metadata("design:type", Array)
], UpdateCreatorProfileDto.prototype, "packages", void 0);

//# sourceMappingURL=update-creator-profile.dto.js.map