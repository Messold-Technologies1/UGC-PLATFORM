"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreatorPackageService", {
    enumerable: true,
    get: function() {
        return CreatorPackageService;
    }
});
const _common = require("@nestjs/common");
const _client = require("@prisma/client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let CreatorPackageService = class CreatorPackageService {
    /**
   * Creates `CreatorPackage` rows and nested `deliverables` JSON arrays.
   * This method is meant to be used inside the caller's Prisma transaction.
   */ async createPackages(tx, creatorId, packages) {
        if (packages.length === 0) return;
        await tx.creatorPackage.createMany({
            data: packages.map((pkg)=>({
                    creatorId,
                    name: pkg.name,
                    deliverables: pkg.deliverables,
                    priceAmount: new _client.Prisma.Decimal(pkg.priceAmount),
                    deliveryDays: pkg.deliveryDays
                }))
        });
    }
};
CreatorPackageService = _ts_decorate([
    (0, _common.Injectable)()
], CreatorPackageService);

//# sourceMappingURL=creator-package.service.js.map