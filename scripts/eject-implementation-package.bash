rm -rf lib/eject
mkdir -p lib/eject/domain

cp -r schemas/zod lib/eject/domain/schemas
cp schemas/index.ts lib/eject/domain/schemas

if [ -d "services" ]; then
  cp -r services lib/eject/services
fi

if [ -d "types" ]; then
  cp -r types lib/eject/types
fi

if [ -d "interfaces" ]; then
  cp -r interfaces lib/eject/interfaces
fi

if [ -d "consumers" ]; then
  cp -r consumers lib/eject/consumers
fi

if [ -d "producers" ]; then
  cp -r producers lib/eject/producers
fi

find lib/eject -type f -name '*.ts' -exec sh -c \
  'for f do \
    sed "s|@forklaunch/validator/zod|@{{app_name}}/core|g" "$f" > "$f.tmp" && \
    mv "$f.tmp" "$f"; \
  done' sh {} +