#!/bin/bash

INPUT_DIR="./images"
LOW_DIR="$INPUT_DIR/low"

mkdir -p "$LOW_DIR"

for img in "$INPUT_DIR"/*; do

  # skip directories
  [ -d "$img" ] && continue

  filename=$(basename "$img")
  name="${filename%.*}"
  ext="${filename##*.}"

  # skip already jpg files if desired
  # [ "$ext" == "jpg" ] && continue

  # convert main image
  magick "$img" \
    -background white \
    -alpha remove -alpha off \
    -strip \
    -interlace Plane \
    -quality 80 \
    "$INPUT_DIR/$name.jpg"

  # create low resolution version
  magick "$img" \
    -background white \
    -alpha remove -alpha off \
    -resize 300x \
    -quality 40 \
    "$LOW_DIR/$name.jpg"

  # remove original file
  rm "$img"

done