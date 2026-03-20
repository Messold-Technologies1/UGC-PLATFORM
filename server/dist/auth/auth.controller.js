"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthController", {
    enumerable: true,
    get: function() {
        return AuthController;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _swagger = require("@nestjs/swagger");
const _crypto = require("crypto");
const _cookiehelper = require("./cookie-helper");
const _logindto = require("./dto/login.dto");
const _registerdto = require("./dto/register.dto");
const _userresponsedto = require("./dto/user-response.dto");
const _jwtauthguard = require("./guards/jwt-auth.guard");
const _authservice = require("./auth.service");
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
let AuthController = class AuthController {
    async register(dto, req, res) {
        const meta = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        };
        const result = await this.authService.register(dto, meta);
        (0, _cookiehelper.setAuthCookies)(res, result.accessToken, result.refreshToken, result.expiresIn, this.config.get('JWT_REFRESH_EXPIRY', '7d'));
        return {
            user: result.user
        };
    }
    async login(dto, req, res) {
        const meta = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        };
        const result = await this.authService.login(dto, meta);
        (0, _cookiehelper.setAuthCookies)(res, result.accessToken, result.refreshToken, result.expiresIn, this.config.get('JWT_REFRESH_EXPIRY', '7d'));
        return {
            user: result.user
        };
    }
    google(res) {
        const state = (0, _crypto.randomBytes)(32).toString('hex');
        (0, _cookiehelper.setOAuthStateCookie)(res, state);
        const url = this.authService.getGoogleAuthUrl(state);
        res.redirect(url);
    }
    async googleCallback(req, res) {
        const code = req.query.code;
        const state = req.query.state;
        const storedState = req.cookies?.[_cookiehelper.OAUTH_STATE_COOKIE];
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
        (0, _cookiehelper.clearOAuthStateCookie)(res);
        if (!code || !state) {
            res.redirect(`${frontendUrl}/auth/callback?error=missing_code_or_state`);
            return;
        }
        try {
            const meta = {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            };
            const result = await this.authService.handleGoogleCallback(code, state, storedState, meta);
            (0, _cookiehelper.setAuthCookies)(res, result.accessToken, result.refreshToken, result.expiresIn, this.config.get('JWT_REFRESH_EXPIRY', '7d'));
            res.redirect(`${frontendUrl}/auth/callback`);
        } catch  {
            res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
        }
    }
    async refresh(req, res) {
        const refreshToken = req.cookies?.[_authservice.AUTH_COOKIE_NAMES.refreshToken];
        if (!refreshToken) {
            throw new _common.UnauthorizedException('Refresh token required');
        }
        const tokens = await this.authService.refresh(refreshToken);
        (0, _cookiehelper.setAuthCookies)(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn, this.config.get('JWT_REFRESH_EXPIRY', '7d'));
    }
    async logout(req, res) {
        const refreshToken = req.cookies?.[_authservice.AUTH_COOKIE_NAMES.refreshToken];
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }
        (0, _cookiehelper.clearAuthCookies)(res);
    }
    me(req) {
        return {
            user: req.user
        };
    }
    constructor(authService, config){
        this.authService = authService;
        this.config = config;
    }
};
_ts_decorate([
    (0, _common.Post)('register'),
    (0, _swagger.ApiOperation)({
        summary: 'Register with name, email, password'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Registered; tokens set in HttpOnly cookies; body returns user only'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'User with this email already exists'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _registerdto.RegisterDto === "undefined" ? Object : _registerdto.RegisterDto,
        typeof Request === "undefined" ? Object : Request,
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
_ts_decorate([
    (0, _common.Post)('login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Login with email and password'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Tokens set in HttpOnly cookies; body returns user only'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Invalid email or password'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto,
        typeof Request === "undefined" ? Object : Request,
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
_ts_decorate([
    (0, _common.Get)('google'),
    (0, _swagger.ApiOperation)({
        summary: 'Redirect to Google OAuth'
    }),
    (0, _swagger.ApiResponse)({
        status: 302,
        description: 'Redirect to Google sign-in'
    }),
    _ts_param(0, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "google", null);
_ts_decorate([
    (0, _common.Get)('google/callback'),
    (0, _swagger.ApiOperation)({
        summary: 'Google OAuth callback'
    }),
    (0, _swagger.ApiResponse)({
        status: 302,
        description: 'Redirect to FRONTEND_URL/auth/callback with cookies set'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Invalid state or Google error'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Request === "undefined" ? Object : Request,
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
_ts_decorate([
    (0, _common.Post)('refresh'),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    (0, _swagger.ApiOperation)({
        summary: 'Refresh access token using refresh token from cookie'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'New tokens set in cookies'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Invalid or expired refresh token'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Request === "undefined" ? Object : Request,
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
_ts_decorate([
    (0, _common.Post)('logout'),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    (0, _swagger.ApiOperation)({
        summary: 'Logout; invalidate session and clear auth cookies'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Logged out'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Request === "undefined" ? Object : Request,
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
_ts_decorate([
    (0, _common.Get)('me'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _swagger.ApiOperation)({
        summary: 'Get current user'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Current user'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Unauthorized'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
AuthController = _ts_decorate([
    (0, _swagger.ApiTags)('auth'),
    (0, _swagger.ApiExtraModels)(_userresponsedto.UserResponseDto),
    (0, _common.Controller)('auth'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], AuthController);

//# sourceMappingURL=auth.controller.js.map