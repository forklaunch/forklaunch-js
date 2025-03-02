import { OpenTelemetryCollector } from '../src/http';

const openTelemetryCollector = new OpenTelemetryCollector('test', 'info', {
  test: 'counter',
  test2: 'gauge',
  test3: 'histogram',
  test4: 'upDownCounter',
  test5: 'observableCounter',
  test6: 'observableGauge',
  test7: 'observableUpDownCounter'
});

it('should be able to get a counter metric', () => {
  const metric = openTelemetryCollector.getMetric('test');
  expect(metric.add).toBeDefined();
});

it('should be able to get a guage metric', () => {
  const metric = openTelemetryCollector.getMetric('test2');
  expect(metric.record).toBeDefined();
});

it('should be able to get a histogram metric', () => {
  const metric = openTelemetryCollector.getMetric('test3');
  expect(metric.record).toBeDefined();
});

it('should be able to get an upDownCounter metric', () => {
  const metric = openTelemetryCollector.getMetric('test4');
  expect(metric.add).toBeDefined();
});

it('should be able to get an observableCounter metric', () => {
  const metric = openTelemetryCollector.getMetric('test5');
  expect(metric.addCallback).toBeDefined();
  expect(metric.removeCallback).toBeDefined();
});

it('should be able to get an observableGauge metric', () => {
  const metric = openTelemetryCollector.getMetric('test6');
  expect(metric.addCallback).toBeDefined();
  expect(metric.removeCallback).toBeDefined();
});

it('should be able to get an observableUpDownCounter metric', () => {
  const metric = openTelemetryCollector.getMetric('test7');
  expect(metric.addCallback).toBeDefined();
  expect(metric.removeCallback).toBeDefined();
});
