#!/bin/bash
set -e

echo "Building Single Executable Application..."

# Check Node version (SEA requires Node 20+)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: SEA builds require Node.js 20 or later"
  echo "Current version: $(node -v)"
  echo "Please upgrade Node.js: https://nodejs.org/"
  exit 1
fi

# Build frontend first
echo "Building frontend..."
pnpm --filter frontend build

# Bundle with esbuild
echo "Bundling with esbuild..."
pnpm exec esbuild server.js --bundle --platform=node --outfile=dist/bundle.js \
  --external:dotenv

# Generate sea-config.json dynamically (to handle hashed asset filenames)
echo "Generating sea-config.json..."
FRONTEND_DIST="../frontend/dist"
ASSETS=""
for f in ${FRONTEND_DIST}/assets/*; do
  name=$(basename "$f")
  ASSETS="${ASSETS}    \"assets/${name}\": \"${f}\",
"
done

cat > sea-config.json << EOF
{
  "main": "dist/bundle.js",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "assets": {
    "index.html": "${FRONTEND_DIST}/index.html",
${ASSETS}    "sql-wasm.wasm": "node_modules/sql.js/dist/sql-wasm.wasm"
  }
}
EOF

# Generate the blob
node --experimental-sea-config sea-config.json

# Copy node binary
cp $(which node) dist/chat

# Remove signature on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  codesign --remove-signature dist/chat
fi

# Inject the blob
pnpm exec postject dist/chat NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA

# Re-sign on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  codesign --sign - dist/chat
fi

# Cleanup
rm sea-prep.blob

echo "Done! Binary at dist/chat"
ls -lh dist/chat
