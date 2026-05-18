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
const _requiredworkspacedecorator = require("../auth/decorators/required-workspace.decorator");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _workspacepermissionguard = require("../auth/guards/workspace-permission.guard");
const _createcreatorprofiledto = require("./dto/create-creator-profile.dto");
const _listcreatorsquerydto = require("./dto/list-creators-query.dto");
const _updatecreatorprofiledto = require("./dto/update-creator-profile.dto");
const _creatorspubliclistresponsedto = require("./dto/creators-public-list-response.dto");
const _creatorprofileresponsedto = require("./dto/creator-profile-response.dto");
const _creatorprofileservice = require("./creator-profile.service");
const _presignprofileintrovideouploaddto = require("./dto/presign-profile-intro-video-upload.dto");
const _creatorsuggestionitemdto = require("./dto/creator-suggestion-item.dto");
const _creatorfacetoptionsresponsedto = require("./dto/creator-facet-options-response.dto");
const _creatorlanguageoptionsresponsedto = require("./dto/creator-language-options-response.dto");
const _creatoraddonoptionsresponsedto = require("./dto/creator-addon-options-response.dto");
const _addcreatoraddonsdto = require("./dto/add-creator-addons.dto");
const _creatorpayoutdetailsservice = require("./creator-payout-details.service");
const _upsertcreatorpayoutdetailsdto = require("./dto/upsert-creator-payout-details.dto");
const _creatorpayoutdetailsmaskeddto = require("./dto/creator-payout-details-masked.dto");
const _suggestedcreatorsresponsedto = require("./dto/suggested-creators-response.dto");
const _creatorreviewsservice = require("../creator-reviews/creator-reviews.service");
const _listcreatorratingreviewsquerydto = require("../creator-reviews/dto/list-creator-rating-reviews-query.dto");
const _listcreatorratingreviewsresponsedto = require("../creator-reviews/dto/list-creator-rating-reviews-response.dto");
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
    async presignProfileIntroVideoUpload(dto, req) {
        return this.creatorProfileService.presignProfileIntroVideoUpload(req.user.id, dto);
    }
    async listCreators(query) {
        return this.creatorProfileService.listCreators(query);
    }
    async listFacetOptions() {
        return this.creatorProfileService.listFacetOptions();
    }
    async listCreatorLanguageOptions() {
        return this.creatorProfileService.listCreatorLanguageOptions();
    }
    async listAddOnOptions() {
        return this.creatorProfileService.listAddOnOptions();
    }
    async listCategorySuggestions() {
        return this.creatorProfileService.listCategorySuggestions();
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
    async patchMyPayoutDetails(dto, req) {
        return this.creatorPayoutDetailsService.upsertForCurrentCreator(req.user.id, dto);
    }
    async listCreatorRatingReviews(id, query) {
        return this.creatorReviewsService.listForCreator({
            creatorId: id,
            query
        });
    }
    async listSuggestedCreators(id) {
        return this.creatorProfileService.listSuggestedCreators(id);
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
    constructor(creatorProfileService, creatorPayoutDetailsService, creatorReviewsService){
        this.creatorProfileService = creatorProfileService;
        this.creatorPayoutDetailsService = creatorPayoutDetailsService;
        this.creatorReviewsService = creatorReviewsService;
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
    (0, _common.Post)('profile/uploads/presign-intro-video'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.HttpCode)(_common.HttpStatus.CREATED),
    (0, _swagger.ApiOperation)({
        summary: 'Presigned URL for creator intro video upload',
        description: 'Before profile exists: temp key under creator-profile-intro-temp/. After profile exists: key under creator-profile/<id>/intro/. Send returned key as introVideoKey on create or patch.'
    }),
    (0, _swagger.ApiCreatedResponse)({
        type: _presignprofileintrovideouploaddto.PresignUploadResponseDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _presignprofileintrovideouploaddto.PresignProfileIntroVideoUploadDto === "undefined" ? Object : _presignprofileintrovideouploaddto.PresignProfileIntroVideoUploadDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "presignProfileIntroVideoUpload", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List creators (paginated)',
        description: 'Discovery list for brands and guests: does not include phone numbers or Instagram URLs. Use admin pending-approvals or creator detail as admin/owner for those fields.'
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
    (0, _common.Get)('facet-options'),
    (0, _swagger.ApiOperation)({
        summary: 'List predefined creator facet options (catalog)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorfacetoptionsresponsedto.CreatorFacetOptionsResponseDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listFacetOptions", null);
_ts_decorate([
    (0, _common.Get)('facet-options/languages'),
    (0, _swagger.ApiOperation)({
        summary: 'List creator language facet options (catalog)',
        description: 'Returns CreatorFacetOption rows with dimension LANGUAGE (slug, label, sortOrder), for profile language pickers and filters.'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorlanguageoptionsresponsedto.CreatorLanguageOptionsResponseDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listCreatorLanguageOptions", null);
_ts_decorate([
    (0, _common.Get)('add-on-options'),
    (0, _swagger.ApiOperation)({
        summary: 'List predefined creator add-on options (catalog)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatoraddonoptionsresponsedto.CreatorAddOnOptionsResponseDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listAddOnOptions", null);
_ts_decorate([
    (0, _common.Get)('suggestions/categories'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'List category experience facet options (catalog)',
        description: 'Returns CreatorFacetOption rows for dimension CATEGORY_EXPERIENCE (same slugs as facetSelections).'
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
    (0, _requiredworkspacedecorator.RequiredWorkspace)('CREATOR'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _workspacepermissionguard.WorkspacePermissionGuard),
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
    (0, _requiredworkspacedecorator.RequiredWorkspace)('CREATOR'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _workspacepermissionguard.WorkspacePermissionGuard),
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
    (0, _common.Patch)('profile/me/payout-details'),
    (0, _requiredworkspacedecorator.RequiredWorkspace)('CREATOR'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _workspacepermissionguard.WorkspacePermissionGuard),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Partially update bank / UPI details for manual creator payouts (only provided fields are changed)'
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
], CreatorProfileController.prototype, "patchMyPayoutDetails", null);
_ts_decorate([
    (0, _common.Get)(':id/rating-reviews'),
    (0, _swagger.ApiOperation)({
        summary: 'List brand ratings and reviews for a creator (paginated)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _listcreatorratingreviewsresponsedto.ListCreatorRatingReviewsResponseDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseUUIDPipe)),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _listcreatorratingreviewsquerydto.ListCreatorRatingReviewsQueryDto === "undefined" ? Object : _listcreatorratingreviewsquerydto.ListCreatorRatingReviewsQueryDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listCreatorRatingReviews", null);
_ts_decorate([
    (0, _common.Get)(':id/suggested'),
    (0, _swagger.ApiOperation)({
        summary: 'Suggested creators for a profile page (same content category)',
        description: 'Public discovery helper for brand (or guest) creator profile pages: returns up to five other approved creators sharing at least one CONTENT_CATEGORY facet with the anchor. Only available when the anchor creator is approved (404 otherwise). No authentication required.'
    }),
    (0, _swagger.ApiOkResponse)({
        type: ()=>_suggestedcreatorsresponsedto.SuggestedCreatorsResponseDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseUUIDPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listSuggestedCreators", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'Get creator by creator profile id',
        description: 'Phone, verification flag, and Instagram URL are only present for the profile owner and admins; other authenticated users do not receive those properties.'
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
    (0, _requiredworkspacedecorator.RequiredWorkspace)('CREATOR'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _workspacepermissionguard.WorkspacePermissionGuard),
    (0, _swagger.ApiOperation)({
        summary: 'Update creator profile (replace languages/facets/persona/restrictions/packages/addOns if provided)'
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
    (0, _requiredworkspacedecorator.RequiredWorkspace)('CREATOR'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _workspacepermissionguard.WorkspacePermissionGuard),
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
    (0, _requiredworkspacedecorator.RequiredWorkspace)('CREATOR'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _workspacepermissionguard.WorkspacePermissionGuard),
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
        typeof _creatorpayoutdetailsservice.CreatorPayoutDetailsService === "undefined" ? Object : _creatorpayoutdetailsservice.CreatorPayoutDetailsService,
        typeof _creatorreviewsservice.CreatorReviewsService === "undefined" ? Object : _creatorreviewsservice.CreatorReviewsService
    ])
], CreatorProfileController);

//# sourceMappingURL=creator-profile.controller.js.map