"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HealthController", {
    enumerable: true,
    get: function() {
        return HealthController;
    }
});
const _common = require("@nestjs/common");
const _terminus = require("@nestjs/terminus");
const _throttler = require("@nestjs/throttler");
const _swagger = require("@nestjs/swagger");
const _prismahealth = require("./prisma.health");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let HealthController = class HealthController {
    check() {
        return this.health.check([
            ()=>this.prismaHealth.isHealthy('database')
        ]);
    }
    constructor(health, prismaHealth){
        this.health = health;
        this.prismaHealth = prismaHealth;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _terminus.HealthCheck)(),
    (0, _swagger.ApiOperation)({
        summary: 'Liveness and readiness check'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", typeof Promise === "undefined" ? Object : Promise)
], HealthController.prototype, "check", null);
HealthController = _ts_decorate([
    (0, _throttler.SkipThrottle)(),
    (0, _swagger.ApiTags)('Health'),
    (0, _common.Controller)('health'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _terminus.HealthCheckService === "undefined" ? Object : _terminus.HealthCheckService,
        typeof _prismahealth.PrismaHealthIndicator === "undefined" ? Object : _prismahealth.PrismaHealthIndicator
    ])
], HealthController);

//# sourceMappingURL=health.controller.js.map