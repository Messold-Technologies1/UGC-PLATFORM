"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreatorProfileController", {
    enumerable: true,
    get: function() {
        return CreatorProfileController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _activeworkspaceguard = require("../auth/guards/active-workspace.guard");
const _createcreatorprofiledto = require("./dto/create-creator-profile.dto");
const _listcreatorsquerydto = require("./dto/list-creators-query.dto");
const _updatecreatorprofiledto = require("./dto/update-creator-profile.dto");
const _creatorspubliclistresponsedto = require("./dto/creators-public-list-response.dto");
const _creatorprofileresponsedto = require("./dto/creator-profile-response.dto");
const _creatorprofileservice = require("./creator-profile.service");
const _presignprofileimageuploaddto = require("./dto/presign-profile-image-upload.dto");
const _creatorsuggestionitemdto = require("./dto/creator-suggestion-item.dto");
const _addcreatoraddonsdto = require("./dto/add-creator-addons.dto");
const _creatorpayoutdetailsservice = require("./creator-payout-details.service");
const _upsertcreatorpayoutdetailsdto = require("./dto/upsert-creator-payout-details.dto");
const _creatorpayoutdetailsmaskeddto = require("./dto/creator-payout-details-masked.dto");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let CreatorProfileController = class CreatorProfileController {
    async createProfile(dto, req) {
        return this.creatorProfileService.createCreatorProfile(req.user.id, dto);
    }
    async presignProfileImageUpload(dto, req) {
        return this.creatorProfileService.presignProfileImageUpload(req.user.id, dto);
    }
    async listCreators(query) {
        return this.creatorProfileService.listCreators(query);
    }
    async listCategorySuggestions() {
        return this.creatorProfileService.listCategorySuggestions();
    }
    async listPersonaTagSuggestions() {
        return this.creatorProfileService.listPersonaTagSuggestions();
    }
    async listRestrictionSuggestions() {
        return this.creatorProfileService.listRestrictionSuggestions();
    }
    async getMyCreatorProfile(req) {
        return this.creatorProfileService.getCreatorProfileForCurrentUser(req.user.id);
    }
    async getMyPayoutDetails(req) {
        return this.creatorPayoutDetailsService.getMaskedForCurrentCreator(req.user.id);
    }
    async upsertMyPayoutDetails(dto, req) {
        return this.creatorPayoutDetailsService.upsertForCurrentCreator(req.user.id, dto);
    }
    async getCreator(id, req) {
        return this.creatorProfileService.getCreatorById(req.user.id, id);
    }
    async updateCreator(id, dto, req) {
        return this.creatorProfileService.updateCreatorProfile(req.user.id, id, dto);
    }
    async addOrUpdateAddOns(id, dto, req) {
        return this.creatorProfileService.addOrUpdateAddOns(req.user.id, id, dto);
    }
    async deleteCreator(id, req) {
        await this.creatorProfileService.deleteCreatorProfile(req.user.id, id);
    }
    constructor(creatorProfileService, creatorPayoutDetailsService){
        this.creatorProfileService = creatorProfileService;
        this.creatorPayoutDetailsService = creatorPayoutDetailsService;
    }
};
_ts_decorate([
    (0, _common.Post)('profile'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.HttpCode)(_common.HttpStatus.CREATED),
    (0, _swagger.ApiOperation)({
        summary: 'Create creator profile for the authenticated user'
    }),
    (0, _swagger.ApiCreatedResponse)({
        type: _creatorprofileresponsedto.CreatorProfileResponseDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createcreatorprofiledto.CreateCreatorProfileDto === "undefined" ? Object : _createcreatorprofiledto.CreateCreatorProfileDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "createProfile", null);
_ts_decorate([
    (0, _common.Post)('profile/uploads/presign'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.HttpCode)(_common.HttpStatus.CREATED),
    (0, _swagger.ApiOperation)({
        summary: 'Create a presigned URL for uploading creator profile image. Creator uploading their own Image'
    }),
    (0, _swagger.ApiCreatedResponse)({
        type: _presignprofileimageuploaddto.PresignUploadResponseDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _presignprofileimageuploaddto.PresignProfileImageUploadDto === "undefined" ? Object : _presignprofileimageuploaddto.PresignProfileImageUploadDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "presignProfileImageUpload", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List creators (paginated)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorspubliclistresponsedto.CreatorsPublicListResponseDto
    }),
    _ts_param(0, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _listcreatorsquerydto.ListCreatorsQueryDto === "undefined" ? Object : _listcreatorsquerydto.ListCreatorsQueryDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listCreators", null);
_ts_decorate([
    (0, _common.Get)('suggestions/categories'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'List creator category suggestions'
    }),
    (0, _swagger.ApiOkResponse)({
        type: ()=>[
                _creatorsuggestionitemdto.CreatorSuggestionItemDto
            ]
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listCategorySuggestions", null);
_ts_decorate([
    (0, _common.Get)('suggestions/persona-tags'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'List creator persona tag suggestions'
    }),
    (0, _swagger.ApiOkResponse)({
        type: ()=>[
                _creatorsuggestionitemdto.CreatorSuggestionItemDto
            ]
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listPersonaTagSuggestions", null);
_ts_decorate([
    (0, _common.Get)('suggestions/restrictions'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'List creator restriction suggestions'
    }),
    (0, _swagger.ApiOkResponse)({
        type: ()=>[
                _creatorsuggestionitemdto.CreatorSuggestionItemDto
            ]
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listRestrictionSuggestions", null);
_ts_decorate([
    (0, _common.Get)('profile/me'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'Get creator profile for the authenticated user'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorprofileresponsedto.CreatorProfileResponseDto
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "getMyCreatorProfile", null);
_ts_decorate([
    (0, _common.Get)('profile/me/payout-details'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, (0, _activeworkspaceguard.ActiveWorkspaceGuard)('CREATOR')),
    (0, _swagger.ApiOperation)({
        summary: 'Get payout details for manual transfers (masked; full account/UPI only visible to admins)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorpayoutdetailsmaskeddto.CreatorPayoutDetailsMaskedDto
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "getMyPayoutDetails", null);
_ts_decorate([
    (0, _common.Put)('profile/me/payout-details'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, (0, _activeworkspaceguard.ActiveWorkspaceGuard)('CREATOR')),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Save or update bank / UPI details for manual creator payouts'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorpayoutdetailsmaskeddto.CreatorPayoutDetailsMaskedDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _upsertcreatorpayoutdetailsdto.UpsertCreatorPayoutDetailsDto === "undefined" ? Object : _upsertcreatorpayoutdetailsdto.UpsertCreatorPayoutDetailsDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "upsertMyPayoutDetails", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'Get creator by creator profile id'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorprofileresponsedto.CreatorProfileResponseDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseUUIDPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "getCreator", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, (0, _activeworkspaceguard.ActiveWorkspaceGuard)('CREATOR')),
    (0, _swagger.ApiOperation)({
        summary: 'Update creator profile (replace languages/categories/persona/restrictions/packages/addOns if provided)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorprofileresponsedto.CreatorProfileResponseDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseUUIDPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _updatecreatorprofiledto.UpdateCreatorProfileDto === "undefined" ? Object : _updatecreatorprofiledto.UpdateCreatorProfileDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "updateCreator", null);
_ts_decorate([
    (0, _common.Patch)(':id/add-ons'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, (0, _activeworkspaceguard.ActiveWorkspaceGuard)('CREATOR')),
    (0, _swagger.ApiOperation)({
        summary: 'Add or update add-ons for a creator profile (by name, append-only)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorprofileresponsedto.CreatorProfileResponseDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseUUIDPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _addcreatoraddonsdto.AddCreatorAddOnsDto === "undefined" ? Object : _addcreatoraddonsdto.AddCreatorAddOnsDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "addOrUpdateAddOns", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, (0, _activeworkspaceguard.ActiveWorkspaceGuard)('CREATOR')),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    (0, _swagger.ApiNoContentResponse)({
        description: 'Deleted'
    }),
    (0, _swagger.ApiOperation)({
        summary: 'Delete creator profile'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseUUIDPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "deleteCreator", null);
CreatorProfileController = _ts_decorate([
    (0, _swagger.ApiTags)('Creators'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.Controller)('creators'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _creatorprofileservice.CreatorProfileService === "undefined" ? Object : _creatorprofileservice.CreatorProfileService,
        typeof _creatorpayoutdetailsservice.CreatorPayoutDetailsService === "undefined" ? Object : _creatorpayoutdetailsservice.CreatorPayoutDetailsService
    ])
], CreatorProfileController);

//# sourceMappingURL=creator-profile.controller.js.map