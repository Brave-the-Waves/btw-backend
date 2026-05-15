const fs = require('fs').promises;
const path = require('path');

/**
 * Log sensitive admin operations to file
 * @param {Object} event - Event details
 * @param {string} event.action - What happened (e.g., 'DELETE_MEMBER')
 * @param {string} event.adminId - Who did it
 * @param {string} event.targetId - What was affected (optional)
 * @param {string} event.details - Additional context (optional)
 */
const auditLog = async (event) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event
    };

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }

    // Write to audit log file
    const logFile = path.join(logsDir, 'audit.log');
    await fs.appendFile(
      logFile,
      JSON.stringify(logEntry) + '\n'
    );

    // Also log action and admin ID to console
    console.log(
      `[AUDIT] ${event.action} by ${event.adminId} on ${event.targetId || 'N/A'}`
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

module.exports = auditLog;
