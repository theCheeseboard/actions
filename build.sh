#!/bin/bash

set -e

export PATH=$(pwd)/node_modules/.bin:$PATH
OUTPUT=$(pwd)/build-output

mkdir -p "$OUTPUT"

for dir in *; do
    if [ -f "$dir/action.yml" ]; then
        if [ -f "$dir/index.ts" ]; then
            pushd "$dir"
            tsc
            rm -rf "$OUTPUT/$dir"
            mkdir -p "$OUTPUT/$dir/dist"
            esbuild tsc/$dir/index.js --bundle --platform=node --outfile="$OUTPUT/$dir/dist/index.js" --minify
            cp action.yml "$OUTPUT/$dir"
            rm -rf tsc

            if [ -f ".resources" ]; then
                while read -r resource; do
                    cp "$resource" "$OUTPUT/$dir/dist"
                done <.resources
            fi

            popd
        else
          cp -r "$dir" "$OUTPUT/"
        fi
    fi
done
