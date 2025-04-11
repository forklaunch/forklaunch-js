rm -rf lib/eject
mkdir -p lib/eject/domain

cp -r schemas/zod lib/eject/domain/schemas
cp schemas/index.ts lib/eject/domain/schemas

cp -r services lib/eject/services

find lib/eject -type f -name '*.ts' -exec sh -c \
  'for f do \
    sed "s|@forklaunch/validator/zod|@{{app_name}}/core|g" "$f" > "$f.tmp" && \
    mv "$f.tmp" "$f"; \
  done' sh {} +