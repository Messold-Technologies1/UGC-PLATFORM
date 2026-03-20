"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get CreateCreatorProfileDto () {
        return CreateCreatorProfileDto;
    },
    get CreatorPackageCreateDto () {
        return CreatorPackageCreateDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _classtransformer = require("class-transformer");
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
let CreatorPackageCreateDto = class CreatorPackageCreateDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Basic'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreatorPackageCreateDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '["1 Video", "Basic editing"]'
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ArrayNotEmpty)(),
    (0, _classvalidator.ArrayUnique)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], CreatorPackageCreateDto.prototype, "deliverables", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '199.99'
    }),
    (0, _classvalidator.IsNumberString)(),
    _ts_metadata("design:type", String)
], CreatorPackageCreateDto.prototype, "priceAmount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 3
    }),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreatorPackageCreateDto.prototype, "deliveryDays", void 0);
let CreateCreatorProfileDto = class CreateCreatorProfileDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Jane Doe'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateCreatorProfileDto.prototype, "displayName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Bengaluru'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateCreatorProfileDto.prototype, "city", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'I make short-form UGC for brands.'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateCreatorProfileDto.prototype, "bio", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Female'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateCreatorProfileDto.prototype, "gender", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '18-24'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateCreatorProfileDto.prototype, "ageRange", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 15
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreateCreatorProfileDto.prototype, "travelRadius", void 0);
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
], CreateCreatorProfileDto.prototype, "languages", void 0);
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
], CreateCreatorProfileDto.prototype, "serviceTypeNames", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        type: [
            CreatorPackageCreateDto
        ],
        example: [
            {
                name: 'Basic',
                deliverables: [
                    '1 Video',
                    'Basic editing'
                ],
                priceAmount: '199.99',
                deliveryDays: 3
            }
        ]
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>CreatorPackageCreateDto),
    _ts_metadata("design:type", Array)
], CreateCreatorProfileDto.prototype, "packages", void 0);

//# sourceMappingURL=create-creator-profile.dto.js.map