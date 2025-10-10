#!/bin/sh

set -e

echo "🚀 Starting private npm registry publish..."

# 设置私有源地址
PRIVATE_REGISTRY="http://10.1.3.24:4873"
# 保存当前默认源
ORIG_REGISTRY="$(npm config get registry)"

# 1. 安装依赖
echo "📦 Installing dependencies..."
pnpm i --frozen-lockfile

# 2. 更新版本信息
echo "🔢 Updating version..."
pnpm update:version

# 3. 构建项目
echo "🔨 Building project..."
pnpm build

# 4. 设置 npm 源为私有源
npm config set registry $PRIVATE_REGISTRY

# 5. 发布主包
echo "📤 Publishing @creso/element-plus..."
cd dist/element-plus
# 修改 package.json 中的包名
sed -i 's/"name": "element-plus"/"name": "@creso\/element-plus"/g' package.json
npm publish --registry $PRIVATE_REGISTRY
cd -

# 6. 发布 eslint-config
echo "📤 Publishing @creso/eslint-config..."
cd internal/eslint-config
# 修改包名
sed -i 's/"name": "@element-plus\/eslint-config"/"name": "@creso\/eslint-config"/g' package.json
npm publish --registry $PRIVATE_REGISTRY
cd -

# 7. 发布 metadata
echo "📤 Publishing @creso/metadata..."
cd internal/metadata
pnpm build
# 修改包名
sed -i 's/"name": "@element-plus\/metadata"/"name": "@creso\/metadata"/g' package.json
npm publish --registry $PRIVATE_REGISTRY
cd -

# 8. 恢复 npm 源设置
npm config set registry "$ORIG_REGISTRY"

echo "✅ Private publish completed!"
