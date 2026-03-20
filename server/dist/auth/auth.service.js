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
    get AUTH_COOKIE_NAMES () {
        return AUTH_COOKIE_NAMES;
    },
    get AuthService () {
        return AuthService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _jwt = require("@nestjs/jwt");
const _client = require("@prisma/client");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
const _crypto = require("crypto");
const _prismaservice = require("../prisma/prisma.service");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const SALT_ROUNDS = 10;
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
let AuthService = class AuthService {
    hashRefreshToken(token) {
        return (0, _crypto.createHash)('sha256').update(token).digest('hex');
    }
    getAccessExpiry() {
        return this.config.get('JWT_ACCESS_EXPIRY', '15m');
    }
    getRefreshExpiry() {
        return this.config.get('JWT_REFRESH_EXPIRY', '7d');
    }
    asJwtExpiresIn(expiresIn) {
        // `jsonwebtoken` types are stricter than our env config (e.g. `StringValue | number`),
        // but at runtime values like `15m` / `7d` are valid.
        return expiresIn;
    }
    async register(dto, meta) {
        const existing = await this.prisma.user.findUnique({
            where: {
                email: dto.email.toLowerCase()
            }
        });
        if (existing) {
            throw new _common.ConflictException('User with this email already exists');
        }
        const passwordHash = await _bcrypt.hash(dto.password, SALT_ROUNDS);
        const defaultRole = await this.prisma.role.findUnique({
            where: {
                name: 'BRAND'
            }
        });
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                name: dto.name ?? null,
                passwordHash,
                primaryRoleId: defaultRole?.id ?? undefined
            }
        });
        if (defaultRole) {
            await this.prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: defaultRole.id
                }
            });
        }
        const { accessToken, refreshToken, expiresIn } = await this.createSessionAndTokens(user.id, meta);
        const safeUser = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        return {
            user: safeUser,
            accessToken,
            refreshToken,
            expiresIn
        };
    }
    async login(dto, meta) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email.toLowerCase()
            }
        });
        if (!user?.passwordHash) {
            throw new _common.UnauthorizedException('Invalid email or password');
        }
        const valid = await _bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            throw new _common.UnauthorizedException('Invalid email or password');
        }
        if (user.status !== 'ACTIVE') {
            throw new _common.UnauthorizedException('Account is not active');
        }
        const { accessToken, refreshToken, expiresIn } = await this.createSessionAndTokens(user.id, meta);
        const safeUser = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        return {
            user: safeUser,
            accessToken,
            refreshToken,
            expiresIn
        };
    }
    async refresh(refreshToken) {
        const payload = await this.verifyRefreshToken(refreshToken);
        const hash = this.hashRefreshToken(refreshToken);
        const session = await this.prisma.session.findFirst({
            where: {
                refreshTokenHash: hash,
                userId: payload.sub
            },
            include: {
                user: true
            }
        });
        if (!session || session.expiresAt < new Date()) {
            if (session) await this.prisma.session.delete({
                where: {
                    id: session.id
                }
            }).catch(()=>{});
            throw new _common.UnauthorizedException('Invalid or expired refresh token');
        }
        const expiresIn = this.getAccessExpiry();
        const accessToken = this.jwt.sign({
            sub: session.userId
        }, {
            secret: this.config.get('JWT_ACCESS_SECRET'),
            expiresIn: this.asJwtExpiresIn(expiresIn)
        });
        return {
            accessToken,
            refreshToken,
            expiresIn
        };
    }
    async logout(refreshToken) {
        try {
            const payload = await this.verifyRefreshToken(refreshToken);
            const hash = this.hashRefreshToken(refreshToken);
            await this.prisma.session.deleteMany({
                where: {
                    userId: payload.sub,
                    refreshTokenHash: hash
                }
            });
        } catch  {
        // ignore invalid token on logout
        }
    }
    getGoogleAuthUrl(state) {
        const clientId = this.config.get('GOOGLE_CLIENT_ID');
        const redirectUri = encodeURIComponent(this.config.get('GOOGLE_CALLBACK_URL'));
        const scope = encodeURIComponent('email profile');
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
    }
    async handleGoogleCallback(code, state, storedState, meta) {
        if (!storedState || state !== storedState) {
            throw new _common.UnauthorizedException('Invalid state');
        }
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code,
                client_id: this.config.get('GOOGLE_CLIENT_ID'),
                client_secret: this.config.get('GOOGLE_CLIENT_SECRET'),
                redirect_uri: this.config.get('GOOGLE_CALLBACK_URL'),
                grant_type: 'authorization_code'
            })
        });
        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new _common.UnauthorizedException(`Google token exchange failed: ${err}`);
        }
        const tokenData = await tokenRes.json();
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });
        if (!userInfoRes.ok) {
            throw new _common.UnauthorizedException('Failed to fetch Google user info');
        }
        const profile = await userInfoRes.json();
        const user = await this.findOrCreateGoogleUser(profile, tokenData.refresh_token);
        const { accessToken, refreshToken, expiresIn } = await this.createSessionAndTokens(user.id, meta);
        const safeUser = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        return {
            user: safeUser,
            accessToken,
            refreshToken,
            expiresIn
        };
    }
    async findOrCreateGoogleUser(profile, googleRefreshToken) {
        const providerUserId = profile.id;
        const email = profile.email?.toLowerCase();
        if (!email) {
            throw new _common.UnauthorizedException('Google account has no email');
        }
        const authAccount = await this.prisma.authAccount.findUnique({
            where: {
                provider_providerUserId: {
                    provider: _client.AuthProvider.GOOGLE,
                    providerUserId
                }
            },
            include: {
                user: true
            }
        });
        if (authAccount) {
            if (googleRefreshToken) {
                await this.prisma.authAccount.update({
                    where: {
                        id: authAccount.id
                    },
                    data: {
                        refreshToken: googleRefreshToken
                    }
                });
            }
            return authAccount.user;
        }
        let user = await this.prisma.user.findUnique({
            where: {
                email
            }
        });
        if (user) {
            await this.prisma.authAccount.create({
                data: {
                    userId: user.id,
                    provider: _client.AuthProvider.GOOGLE,
                    providerUserId,
                    refreshToken: googleRefreshToken ?? null
                }
            });
            return user;
        }
        const defaultRole = await this.prisma.role.findUnique({
            where: {
                name: 'BRAND'
            }
        });
        user = await this.prisma.user.create({
            data: {
                email,
                name: profile.name ?? null,
                passwordHash: null,
                emailVerified: true,
                primaryRoleId: defaultRole?.id ?? undefined
            }
        });
        if (defaultRole) {
            await this.prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: defaultRole.id
                }
            });
        }
        await this.prisma.authAccount.create({
            data: {
                userId: user.id,
                provider: _client.AuthProvider.GOOGLE,
                providerUserId,
                refreshToken: googleRefreshToken ?? null
            }
        });
        return user;
    }
    async createSessionAndTokens(userId, meta) {
        const refreshExpiry = this.getRefreshExpiry();
        const refreshToken = this.jwt.sign({
            sub: userId
        }, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: this.asJwtExpiresIn(refreshExpiry)
        });
        const hash = this.hashRefreshToken(refreshToken);
        const expiresAt = this.expiryToDate(refreshExpiry);
        await this.prisma.session.create({
            data: {
                userId,
                refreshTokenHash: hash,
                expiresAt,
                ipAddress: meta?.ipAddress ?? null,
                userAgent: meta?.userAgent ?? null
            }
        });
        const accessExpiry = this.getAccessExpiry();
        const accessToken = this.jwt.sign({
            sub: userId
        }, {
            secret: this.config.get('JWT_ACCESS_SECRET'),
            expiresIn: this.asJwtExpiresIn(accessExpiry)
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: accessExpiry
        };
    }
    expiryToDate(expiry) {
        const match = expiry.match(/^(\d+)(m|h|d|s)$/);
        const date = new Date();
        if (!match) {
            date.setDate(date.getDate() + 7);
            return date;
        }
        const n = parseInt(match[1], 10);
        switch(match[2]){
            case 's':
                date.setSeconds(date.getSeconds() + n);
                break;
            case 'm':
                date.setMinutes(date.getMinutes() + n);
                break;
            case 'h':
                date.setHours(date.getHours() + n);
                break;
            case 'd':
                date.setDate(date.getDate() + n);
                break;
            default:
                date.setDate(date.getDate() + 7);
        }
        return date;
    }
    async verifyRefreshToken(token) {
        return this.jwt.verifyAsync(token, {
            secret: this.config.get('JWT_REFRESH_SECRET')
        });
    }
    async getUserById(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                email: true,
                name: true,
                status: true
            }
        });
        if (!user || user.status !== 'ACTIVE') return null;
        return {
            id: user.id,
            email: user.email,
            name: user.name
        };
    }
    constructor(prisma, jwt, config){
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
};
AuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], AuthService);
const AUTH_COOKIE_NAMES = {
    accessToken: ACCESS_TOKEN_COOKIE_NAME,
    refreshToken: REFRESH_TOKEN_COOKIE_NAME
};

//# sourceMappingURL=auth.service.js.map