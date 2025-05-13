/**
 * Socket Manager Utility
 * Provides helper functions for emitting WebSocket events
 */

/**
 * Emit a new feed item to all connected clients
 * @param {Object} feedItem - Feed item to broadcast
 */
const emitNewFeed = (feedItem) => {
  if (global.io) {
    // Broadcast to all connected clients
    global.io.emit("new-feed", feedItem);
    console.log("Emitted new feed:", feedItem.action);
  }
};

/**
 * Emit a feed update to all connected clients
 * @param {String} feedId - ID of the feed item being updated
 * @param {Object} update - Updated data
 */
const emitFeedUpdate = (feedId, update) => {
  if (global.io) {
    global.io.emit("feed-update", { id: feedId, ...update });
    console.log("Emitted feed update for:", feedId);
  }
};

/**
 * Emit dashboard stats updates to a specific employee
 * @param {String} employeeId - ID of the employee
 * @param {Object} stats - Updated dashboard stats
 */
const emitDashboardUpdate = (employeeId, stats) => {
  if (global.io) {
    global.io.to(`employee-${employeeId}`).emit("dashboard-update", stats);
    console.log("Emitted dashboard update to employee:", employeeId);
  }
};

/**
 * Emit a notification to a specific employee
 * @param {String} employeeId - ID of the recipient employee
 * @param {Object} notification - Notification object to send
 */
const emitNotification = (employeeId, notification) => {
  if (global.io) {
    global.io.to(`employee-${employeeId}`).emit("new_notification", {
      notification,
    });
    console.log("Emitted notification to employee:", employeeId);
  }
};

module.exports = {
  emitNewFeed,
  emitFeedUpdate,
  emitDashboardUpdate,
  emitNotification,
};
