"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _core = require("@nestjs/core");
const _swagger = require("@nestjs/swagger");
const _cookieparser = /*#__PURE__*/ _interop_require_default(require("cookie-parser"));
const _helmet = /*#__PURE__*/ _interop_require_default(require("helmet"));
const _appmodule = require("./app.module");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule);
    const configService = app.get(_config.ConfigService);
    app.use((0, _helmet.default)());
    app.use((0, _cookieparser.default)());
    app.enableCors({
        origin: configService.get('CORS_ORIGIN', '*'),
        credentials: true
    });
    app.useGlobalPipes(new _common.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    app.setGlobalPrefix('api');
    const swaggerEnabled = configService.get('SWAGGER_ENABLED') === 'true' || configService.get('NODE_ENV') !== 'production';
    if (swaggerEnabled) {
        const config = new _swagger.DocumentBuilder().setTitle('UGC Platform API').setDescription('API documentation for UGC Platform').setVersion('1.0').addBearerAuth().build();
        const document = _swagger.SwaggerModule.createDocument(app, config);
        _swagger.SwaggerModule.setup('docs', app, document);
    }
    const port = configService.get('PORT', 3000);
    await app.listen(port);
}
bootstrap();

//# sourceMappingURL=main.js.map