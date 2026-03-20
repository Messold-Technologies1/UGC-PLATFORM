"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "JwtAuthGuard", {
    enumerable: true,
    get: function() {
        return JwtAuthGuard;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _jwt = require("@nestjs/jwt");
const _authservice = require("../auth.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let JwtAuthGuard = class JwtAuthGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);
        if (!token) {
            throw new _common.UnauthorizedException('Missing or invalid token');
        }
        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: this.config.get('JWT_ACCESS_SECRET')
            });
            const user = await this.authService.getUserById(payload.sub);
            if (!user) {
                throw new _common.UnauthorizedException('User not found or inactive');
            }
            request.user = user;
            return true;
        } catch  {
            throw new _common.UnauthorizedException('Invalid or expired token');
        }
    }
    extractToken(request) {
        const cookieToken = request.cookies?.[_authservice.AUTH_COOKIE_NAMES.accessToken];
        if (cookieToken) return cookieToken;
        const auth = request.headers.authorization;
        if (auth?.startsWith('Bearer ')) return auth.slice(7);
        return null;
    }
    constructor(jwt, authService, config){
        this.jwt = jwt;
        this.authService = authService;
        this.config = config;
    }
};
JwtAuthGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService,
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], JwtAuthGuard);

//# sourceMappingURL=jwt-auth.guard.js.map