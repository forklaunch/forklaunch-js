# @forklaunch/testing

## 0.0.7

### Patch Changes

- update packages, make OpenTelemetryCollector type more transparent, attempt to fix error loggings

## 0.0.6

### Patch Changes

- Change database cleanup function to accept object style parameter

## 0.0.5

### Minor Changes

- Add Kafka testcontainer support
- Add S3/MinIO testcontainer support
- Add environment variable setup for Kafka (KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID)
- Add environment variable setup for S3 (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET)
- Update BlueprintTestHarness to support `needsKafka` and `needsS3` options
- Export new config types: KafkaConfig and S3Config

## 0.0.4

### Patch Changes

- Make database options optional

## 0.0.3

### Patch Changes

- Internal fixes

## 0.0.2

### Patch Changes

- Introduce testing package and deepclone openapi objects

## 0.0.1

### Patch Changes

- Introduce testing package and deepclone openapi objects
