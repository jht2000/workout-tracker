// ─── Session Logger ──────────────────────────────────────────────
// Captures console output in memory so it can be viewed in-app.
// Must be loaded BEFORE all other scripts.

const Logger = {
  _logs: [],
  _maxEntries: 500,

  _timestamp() {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  },

  _add(level, args) {
    const msg = Array.from(args).map(a => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    this._logs.push({ time: this._timestamp(), level, msg });
    if (this._logs.length > this._maxEntries) this._logs.shift();
  },

  getAll() {
    return this._logs;
  },

  getText() {
    return this._logs.map(e => `[${e.time}] ${e.level}: ${e.msg}`).join('\n');
  }
};

// Wrap console methods to also capture into Logger
(function() {
  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = function() { Logger._add('LOG', arguments); origLog.apply(null, arguments); };
  console.warn = function() { Logger._add('WARN', arguments); origWarn.apply(null, arguments); };
  console.error = function() { Logger._add('ERR', arguments); origError.apply(null, arguments); };
})();
