#!/usr/bin/env bash
mkdir -p Build/Docs
rm -rf Build/Docs
mkdir -p Build/Docs
./node_modules/.bin/jsdoc Code README.md -u Code/tutorials -t Compiler/node_modules/ink-docstrap/template -c Compiler/config_documents.json -d Build/Docs