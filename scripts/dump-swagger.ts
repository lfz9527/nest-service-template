import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';

async function main() {
  // 只创建 app，不启动监听，不连接 MySQL
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('后台管理服务')
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('openapi-dump.json', JSON.stringify(document, null, 2));
  console.log('Written openapi-dump.json');

  const paths = document.paths as Record<string, any>;
  console.log(`\nTotal paths: ${Object.keys(paths).length}`);

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, any>)) {
      const body = (op as any).requestBody;
      const params = (op as any).parameters || [];
      const bodyRef = body?.content?.['application/json']?.schema?.$ref || '(inline)';
      console.log(`\n${method.toUpperCase()} ${path}`);
      console.log(`  params: ${params.map((p: any) => `${p.name}:${p.schema?.type || '?'}`).join(', ') || '(none)'}`);
      if (body) {
        const schema = body.content?.['application/json']?.schema;
        if (schema?.$ref) {
          console.log(`  body: $ref → ${schema.$ref}`);
        } else if (schema?.allOf) {
          console.log(`  body: allOf [${schema.allOf.map((s: any) => s.$ref || '{inline}').join(', ')}]`);
        } else {
          const props = schema?.properties ? Object.keys(schema.properties).join(', ') : '(none)';
          console.log(`  body: { ${props} }`);
        }
      }
    }
  }
  await app.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
