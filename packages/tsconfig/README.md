# @med-check/tsconfig

Shared TypeScript configuration presets for all packages in the MedCheck monorepo.

## Configs

| File | Usage |
|---|---|
| `base.json` | Common strict settings inherited by all other configs |
| `react-native.json` | Expo / React Native app (`apps/mobile`) |
| `nestjs.json` | NestJS API — enables decorators and `emitDecoratorMetadata` (`apps/api`) |
| `lambda.json` | AWS Lambda functions — CommonJS output (`lambdas/*`) |

## Usage

In any package's `tsconfig.json`:

```json
{
  "extends": "@med-check/tsconfig/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```
