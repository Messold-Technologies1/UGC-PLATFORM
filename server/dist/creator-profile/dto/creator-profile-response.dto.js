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
    get CreatorLanguageResponseDto () {
        return CreatorLanguageResponseDto;
    },
    get CreatorPackageResponseDto () {
        return CreatorPackageResponseDto;
    },
    get CreatorProfileResponseDto () {
        return CreatorProfileResponseDto;
    },
    get CreatorServiceResponseDto () {
        return CreatorServiceResponseDto;
    },
    get CreatorServiceTypeResponseDto () {
        return CreatorServiceTypeResponseDto;
    }
});
const _swagger = require("@nestjs/swagger");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CreatorLanguageResponseDto = class CreatorLanguageResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorLanguageResponseDto.prototype, "id", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'English'
    }),
    _ts_metadata("design:type", String)
], CreatorLanguageResponseDto.prototype, "language", void 0);
let CreatorServiceTypeResponseDto = class CreatorServiceTypeResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorServiceTypeResponseDto.prototype, "id", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Video Editing'
    }),
    _ts_metadata("design:type", String)
], CreatorServiceTypeResponseDto.prototype, "name", void 0);
let CreatorServiceResponseDto = class CreatorServiceResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorServiceResponseDto.prototype, "id", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorServiceResponseDto.prototype, "serviceTypeId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: ()=>CreatorServiceTypeResponseDto
    }),
    _ts_metadata("design:type", typeof CreatorServiceTypeResponseDto === "undefined" ? Object : CreatorServiceTypeResponseDto)
], CreatorServiceResponseDto.prototype, "serviceType", void 0);
let CreatorPackageResponseDto = class CreatorPackageResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorPackageResponseDto.prototype, "id", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Basic'
    }),
    _ts_metadata("design:type", String)
], CreatorPackageResponseDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: [
            '1 Video',
            'Basic editing'
        ],
        type: [
            String
        ]
    }),
    _ts_metadata("design:type", Array)
], CreatorPackageResponseDto.prototype, "deliverables", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '199.99'
    }),
    _ts_metadata("design:type", String)
], CreatorPackageResponseDto.prototype, "priceAmount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 3
    }),
    _ts_metadata("design:type", Number)
], CreatorPackageResponseDto.prototype, "deliveryDays", void 0);
let CreatorProfileResponseDto = class CreatorProfileResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorProfileResponseDto.prototype, "id", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'uuid'
    }),
    _ts_metadata("design:type", String)
], CreatorProfileResponseDto.prototype, "userId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Jane Doe'
    }),
    _ts_metadata("design:type", String)
], CreatorProfileResponseDto.prototype, "displayName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Bengaluru'
    }),
    _ts_metadata("design:type", Object)
], CreatorProfileResponseDto.prototype, "city", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'I make short-form UGC for brands.'
    }),
    _ts_metadata("design:type", Object)
], CreatorProfileResponseDto.prototype, "bio", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Female'
    }),
    _ts_metadata("design:type", Object)
], CreatorProfileResponseDto.prototype, "gender", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '18-24'
    }),
    _ts_metadata("design:type", Object)
], CreatorProfileResponseDto.prototype, "ageRange", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 15
    }),
    _ts_metadata("design:type", Object)
], CreatorProfileResponseDto.prototype, "travelRadius", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: ()=>[
                CreatorLanguageResponseDto
            ]
    }),
    _ts_metadata("design:type", Array)
], CreatorProfileResponseDto.prototype, "languages", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: ()=>[
                CreatorServiceResponseDto
            ]
    }),
    _ts_metadata("design:type", Array)
], CreatorProfileResponseDto.prototype, "services", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: ()=>[
                CreatorPackageResponseDto
            ]
    }),
    _ts_metadata("design:type", Array)
], CreatorProfileResponseDto.prototype, "packages", void 0);

//# sourceMappingURL=creator-profile-response.dto.js.map