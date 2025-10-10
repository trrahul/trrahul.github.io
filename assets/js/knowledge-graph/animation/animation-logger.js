import { CONFIG } from '../config.js';

/**
 * Provides structured logging for animation workflow while respecting debug configuration.
 * Depends on CONFIG module for runtime settings and accepts a timestamp provider for testability.
 */
export class AnimationLogger {
  /**
   * @param {() => number} getTimestamp - Function returning high-resolution timestamp.
   */
  constructor(getTimestamp) {
    this.getTimestamp = typeof getTimestamp === 'function' ? getTimestamp : Date.now;
    this.startTime = 0;
  }

  /**
   * Sets the reference start time used when rendering elapsed timestamps in debug logs.
   * @param {number} timestamp
   */
  setStartTime(timestamp) {
    if (Number.isFinite(timestamp)) {
      this.startTime = timestamp;
    }
  }

  /**
   * Reads animation debug configuration from CONFIG.
   * @returns {{enabled: boolean, includeTimestamp: boolean, groupCollapsed: boolean, showPayload: boolean}}
   */
  getDebugConfig() {
    const animationDebug = CONFIG.debug?.animation;
    if (typeof animationDebug === 'boolean') {
      return {
        enabled: animationDebug,
        includeTimestamp: false,
        groupCollapsed: false,
        showPayload: false,
      };
    }

    return {
      enabled: Boolean(animationDebug?.enabled),
      includeTimestamp: animationDebug?.includeTimestamp ?? false,
      groupCollapsed: animationDebug?.groupCollapsed ?? false,
      showPayload: animationDebug?.showPayload ?? true,
    };
  }

  /**
   * Indicates whether debug logging is enabled.
   * @returns {boolean}
   */
  isEnabled() {
    return this.getDebugConfig().enabled;
  }

  /**
   * Formats milliseconds into a human readable duration string.
   * @param {number} milliseconds
   * @returns {string}
   */
  formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds)) {
      return '0ms';
    }
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }

  /**
   * Builds a prefix for log entries.
   * @param {string} scope
   * @returns {string}
   */
  getPrefix(scope) {
    return scope ? `[Animation|${scope}]` : '[Animation]';
  }

  /**
   * Writes a debug log if enabled.
   * @param {string} scope
   * @param {string} message
   * @param {unknown} payload
   */
  debug(scope, message, payload) {
    if (!this.isEnabled()) {
      return;
    }

    const config = this.getDebugConfig();
    const elapsed = this.startTime
      ? this.formatDuration(this.getTimestamp() - this.startTime)
      : null;

    const prefix = this.getPrefix(scope);
    const timestampSegment = config.includeTimestamp && elapsed ? ` ${elapsed}` : '';
    const entry = `${prefix}${timestampSegment} ${message}`;

    if (payload !== undefined && config.showPayload) {
      console.log(entry, payload);
    } else {
      console.log(entry);
    }
  }

  /**
   * Writes a warning message regardless of debug flag.
   * @param {string} scope
   * @param {string} message
   * @param {unknown} payload
   */
  warn(scope, message, payload) {
    const prefix = this.getPrefix(scope);
    if (payload !== undefined) {
      console.warn(`${prefix} ${message}`, payload);
    } else {
      console.warn(`${prefix} ${message}`);
    }
  }
}
