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
const _createcreatorprofiledto = require("./dto/create-creator-profile.dto");
const _listcreatorsquerydto = require("./dto/list-creators-query.dto");
const _updatecreatorprofiledto = require("./dto/update-creator-profile.dto");
const _creatorslistresponsedto = require("./dto/creators-list-response.dto");
const _creatorprofileresponsedto = require("./dto/creator-profile-response.dto");
const _creatorprofileservice = require("./creator-profile.service");
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
    async listCreators(query) {
        return this.creatorProfileService.listCreators(query);
    }
    async getCreator(id) {
        return this.creatorProfileService.getCreatorById(id);
    }
    async updateCreator(id, dto, req) {
        return this.creatorProfileService.updateCreatorProfile(req.user.id, id, dto);
    }
    async deleteCreator(id, req) {
        await this.creatorProfileService.deleteCreatorProfile(req.user.id, id);
    }
    constructor(creatorProfileService){
        this.creatorProfileService = creatorProfileService;
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
    (0, _common.Get)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'List creators (paginated)'
    }),
    (0, _swagger.ApiOkResponse)({
        type: _creatorslistresponsedto.CreatorsListResponseDto
    }),
    _ts_param(0, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _listcreatorsquerydto.ListCreatorsQueryDto === "undefined" ? Object : _listcreatorsquerydto.ListCreatorsQueryDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "listCreators", null);
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
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CreatorProfileController.prototype, "getCreator", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiOperation)({
        summary: 'Update creator profile (replace languages/services/packages if provided)'
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
    (0, _common.Delete)(':id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
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
        typeof _creatorprofileservice.CreatorProfileService === "undefined" ? Object : _creatorprofileservice.CreatorProfileService
    ])
], CreatorProfileController);

//# sourceMappingURL=creator-profile.controller.js.map