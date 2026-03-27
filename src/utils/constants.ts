export const DEFAULT_JAVA_OPTIONS = [
  '-Xms4g',
  '-Xmx4g',
  '-XX:+UseZGC',
  '-Xss512k',
  '-XX:+UseContainerSupport',
  '-XX:MaxRAMPercentage=80',
  '-Dzap.session=/zap/wrk/session.data',
  '-Dzap.history.disabled=true',
  '-Dhsqldb.applog=2',
  '-Dhsqldb.cache_size=200000'
];
