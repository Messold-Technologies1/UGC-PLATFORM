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
const _terminus = require("@nestjs/terminus");
let PrismaHealthIndicator = class PrismaHealthIndicator extends _terminus.HealthIndicator {
    async isHealthy(key) {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return this.getStatus(key, true);
        } catch (error) {
            throw new _terminus.HealthCheckError('Prisma check failed', error);
        }
    }
    constructor(prisma){
        super(), this.prisma = prisma;
    }
};

//# sourceMappingURL=prisma.health.js.map