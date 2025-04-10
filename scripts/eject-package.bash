rm -rf lib/eject
mkdir -p lib/eject

cp -r schemas/zod lib/eject/schemas
cp schemas/index.ts lib/eject/schemas

cp -r services lib/eject/services

find lib/eject -type f -name '*.ts' -exec sh -c \
  'for f do \
    sed "s|@forklaunch/validator/zod|@{{app_name}}/core|g" "$f" > "$f.tmp" && \
    mv "$f.tmp" "$f"; \
  done' sh {} +