const globalConfig = window.__TERMINAL_PROMPT_CONFIG || {};

const timeConfigSource = globalConfig.time || {};
const fallbackModes = ['24h', '12h'];
const config = {
  time: {
    modes: Array.isArray(timeConfigSource.modes) && timeConfigSource.modes.length
      ? timeConfigSource.modes
      : fallbackModes,
    refreshSeconds: Number.isFinite(Number(timeConfigSource.refresh_seconds))
      ? Number(timeConfigSource.refresh_seconds)
      : 30,
    locale: typeof timeConfigSource.locale === 'string' && timeConfigSource.locale.length > 0
      ? timeConfigSource.locale
      : undefined,
  },
};

const CLOCK_SELECTOR = '.terminal-clock';
let initialized = false;

function init() {
  if (initialized) {
    return;
  }
  initialized = true;
  setupClocks();
  observeMutations();
}

function setupClocks(root = document) {
  const clocks = root.querySelectorAll(CLOCK_SELECTOR);
  clocks.forEach((clock) => setupClock(clock));
}

function setupClock(clock) {
  if (clock.dataset.terminalClockInit === 'true') {
    return;
  }

  const modes = resolveModes(clock);
  const valueEl = clock.querySelector('.terminal-clock-value');
  if (!valueEl) {
    return;
  }

  let index = normalizeIndex(clock.dataset.activeIndex, modes.length);
  const refresh = normalizeRefresh(clock.dataset.timeRefresh, config.time.refreshSeconds);
  const locale = clock.dataset.timeLocale || config.time.locale || undefined;

  const render = () => {
    const now = new Date();
    const mode = modes[index] || modes[0];
    valueEl.textContent = formatTime(now, mode, locale);
    valueEl.dataset.mode = mode;
    clock.dataset.activeIndex = String(index);
    updateClockTitle(clock, mode);
  };

  clock.addEventListener('click', () => {
    index = (index + 1) % modes.length;
    render();
  });

  render();

  if (refresh > 0) {
    const interval = Math.max(refresh * 1000, 1000);
    setInterval(render, interval);
  }

  clock.dataset.terminalClockInit = 'true';
}

function resolveModes(clock) {
  const raw = clock.dataset.timeModes;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn('terminal-prompt: invalid time modes', error);
    }
  }
  clock.dataset.timeModes = JSON.stringify(config.time.modes);
  return config.time.modes;
}

function normalizeIndex(value, length) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed < length) {
    return parsed;
  }
  return 0;
}

function normalizeRefresh(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

function formatTime(date, mode, locale) {
  const options = { hour: 'numeric', minute: '2-digit' };
  switch (mode) {
    case '12h':
      options.hour12 = true;
      break;
    case '24h':
      options.hour12 = false;
      break;
    default:
      options.hour12 = false;
      break;
  }
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    console.warn('terminal-prompt: failed to format time', error);
    return date.toLocaleTimeString();
  }
}

function updateClockTitle(clock, mode) {
  const baseTitle = clock.getAttribute('data-time-label') || clock.getAttribute('title') || '';
  if (baseTitle) {
    clock.title = `${baseTitle} (mode: ${mode})`;
  }
}

function observeMutations() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (node.matches && node.matches(CLOCK_SELECTOR)) {
          setupClock(node);
        } else if (node.querySelectorAll) {
          setupClocks(node);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', init);

if (document.readyState !== 'loading') {
  init();
}

export {}; // keep module scope clean
