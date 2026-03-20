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
    get OAUTH_STATE_COOKIE () {
        return OAUTH_STATE_COOKIE;
    },
    get clearAuthCookies () {
        return clearAuthCookies;
    },
    get clearOAuthStateCookie () {
        return clearOAuthStateCookie;
    },
    get expiryToSeconds () {
        return expiryToSeconds;
    },
    get setAuthCookies () {
        return setAuthCookies;
    },
    get setOAuthStateCookie () {
        return setOAuthStateCookie;
    }
});
const _authservice = require("./auth.service");
const isProduction = process.env.NODE_ENV === 'production';
function setAuthCookies(res, accessToken, refreshToken, accessExpiry, refreshExpiry) {
    const baseOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/'
    };
    res.cookie(_authservice.AUTH_COOKIE_NAMES.accessToken, accessToken, {
        ...baseOptions,
        maxAge: expiryToSeconds(accessExpiry) * 1000
    });
    res.cookie(_authservice.AUTH_COOKIE_NAMES.refreshToken, refreshToken, {
        ...baseOptions,
        maxAge: expiryToSeconds(refreshExpiry) * 1000
    });
}
function clearAuthCookies(res) {
    const clearOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 0
    };
    res.cookie(_authservice.AUTH_COOKIE_NAMES.accessToken, '', clearOptions);
    res.cookie(_authservice.AUTH_COOKIE_NAMES.refreshToken, '', clearOptions);
}
function expiryToSeconds(expiry) {
    const match = expiry.match(/^(\d+)(m|h|d|s)$/);
    if (!match) return 15 * 60; // default 15 min
    const n = parseInt(match[1], 10);
    const unit = match[2];
    switch(unit){
        case 's':
            return n;
        case 'm':
            return n * 60;
        case 'h':
            return n * 3600;
        case 'd':
            return n * 86400;
        default:
            return 15 * 60;
    }
}
const OAUTH_STATE_COOKIE = 'oauth_state';
function setOAuthStateCookie(res, state) {
    res.cookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 10 * 60 * 1000
    });
}
function clearOAuthStateCookie(res) {
    res.cookie(OAUTH_STATE_COOKIE, '', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 0
    });
}

//# sourceMappingURL=cookie-helper.js.map