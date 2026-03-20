"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PrismaHealthIndicator", {
    enumerable: true,
    get: function() {
        return PrismaHealthIndicator;
    }
});
const _common = require("@nestjs/common");
const _terminus = require("@nestjs/terminus");
const _prismaservice = require("../prisma/prisma.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let PrismaHealthIndicator = class PrismaHealthIndicator extends _terminus.HealthIndicator {
    async isHealthy(key) {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return this.getStatus(key, true);
        } catch (error) {
            console.error('Prisma check failed:', error);
            throw new _terminus.HealthCheckError('Prisma check failed', error);
        }
    }
    constructor(prisma){
        super(), this.prisma = prisma;
    }
};
PrismaHealthIndicator = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], PrismaHealthIndicator);

//# sourceMappingURL=prisma.health.js.map