# Notification System Documentation

## Overview

The notification system provides real-time notifications to employees when certain events occur in the CRM system. It uses Socket.io for real-time delivery and stores notifications in a MongoDB collection.

## Features

- Real-time notifications via Socket.io
- Storing notifications in the database
- Marking notifications as read/unread
- Notification cleanup for older notifications
- Duplicate candidate check notifications

## API Endpoints

All endpoints are prefixed with `/crm/api/notifications`.

| Endpoint                | Method | Description                                    |
| ----------------------- | ------ | ---------------------------------------------- |
| `/`                     | GET    | Get all notifications for the current employee |
| `/unread-count`         | GET    | Get count of unread notifications              |
| `/:notificationId/read` | PATCH  | Mark a specific notification as read           |
| `/mark-all-read`        | PATCH  | Mark all notifications as read                 |
| `/:notificationId`      | DELETE | Delete a specific notification                 |

## Socket.io Events

### Server-to-Client Events

| Event                    | Description                                | Payload                     |
| ------------------------ | ------------------------------------------ | --------------------------- |
| `new_notification`       | Sent when a new notification is created    | `{ notification: { ... } }` |
| `notification_read`      | Sent when a notification is marked as read | `{ notificationId: "..." }` |
| `all_notifications_read` | Sent when all notifications are read       | None                        |
| `notification_deleted`   | Sent when a notification is deleted        | `{ notificationId: "..." }` |

### Client-to-Server Events

| Event                    | Description                                | Payload                          |
| ------------------------ | ------------------------------------------ | -------------------------------- |
| `join-employee-room`     | Join employee's personal notification room | `employeeId`                     |
| `read_notification`      | Mark a notification as read                | `{ notificationId, employeeId }` |
| `read_all_notifications` | Mark all notifications as read             | `{ employeeId }`                 |

## Notification Types

1. `candidate_duplicity_check` - Sent when an employee checks a candidate who was registered by another employee
2. `system` - System notifications
3. `other` - Other notification types

## Frontend Integration

### Connecting to Socket.io

```javascript
// Connect to socket.io
const socket = io();

// Join employee room when user logs in
function joinEmployeeRoom(employeeId) {
  socket.emit("join-employee-room", employeeId);
}

// Listen for new notifications
socket.on("new_notification", (data) => {
  // Handle new notification
  console.log("New notification:", data.notification);
  // Update UI or show notification
});

// Mark notification as read
function markAsRead(notificationId, employeeId) {
  socket.emit("read_notification", { notificationId, employeeId });
}

// Mark all notifications as read
function markAllAsRead(employeeId) {
  socket.emit("read_all_notifications", { employeeId });
}
```

## Notification Model

```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref: 'Employee'),
  message: String,
  type: String (enum: ['candidate_duplicity_check', 'system', 'other']),
  status: String (enum: ['read', 'unread']),
  metadata: {
    candidateId: ObjectId (ref: 'Candidate'),
    candidateName: String,
    candidateContactNumber: String,
    employeeId: ObjectId (ref: 'Employee'),
    employeeName: String
  },
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Scheduled Tasks

The system automatically cleans up notifications older than 30 days. This task runs daily at 3:00 AM.

## Duplicity Check Notification Flow

1. When an employee searches for a candidate by mobile number, the system checks if that candidate exists
2. If the candidate exists and was registered by a different employee, a notification is sent to the original employee
3. The notification includes information about who is checking the candidate and the candidate's details
4. The original employee receives this notification in real-time via Socket.io
