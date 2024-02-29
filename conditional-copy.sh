#!/bin/bash

# Create a directory to hold files we know will exist
mkdir -p ./temp_optional_files

# Check for each optional file and copy it to the temp directory if it exists
if [ -f packages/database/node_modules/prisma/libquery_engine-linux-arm64-openssl-3.0.x.so.node ]; then
  cp packages/database/node_modules/prisma/libquery_engine-linux-arm64-openssl-3.0.x.so.node ./temp_optional_files/
fi

if [ -f packages/database/node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node ]; then
  cp packages/database/node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node ./temp_optional_files/
fi