# Login OTP Verification System

## Overview

The Login OTP Verification system requires employees to get an OTP from administrators to complete the login process. When an employee attempts to log in with valid credentials, an email containing a verification code is sent to configured admin emails, along with the employee's details.

The system also sends a notification to administrators when an employee logs out, providing visibility into employee session activities.

## How It Works

### Login Process

1. Employee enters login credentials (email and password)
2. System validates credentials and sends an OTP to admin emails
3. Admin provides the OTP to the employee
4. Employee enters the OTP to complete the login

### Logout Process

1. Employee clicks logout
2. System closes all active activities for the employee
3. System sends a notification email to administrators with employee details and logout time

## Required Environment Variables

Add the following variables to your `.env` file:

```
# Admin emails for login verification
SUPER_ADMIN_EMAIL=superadmin@example.com
ADMIN_EMAIL=admin@example.com
SUPERVISOR_EMAIL=supervisor@example.com
```

At least one of these email addresses must be set for the system to work properly.

## Email Templates

The system uses HTML email templates to send formatted emails:

### Login Verification Email

Contains:

- Employee details (name, employee ID, email, mobile)
- Login timestamp
- OTP code
- Security warning message

### Logout Notification Email

Contains:

- Employee details (name, employee ID, email, mobile)
- Logout timestamp
- Confirmation that all activities have been closed

## API Endpoints

### 1. Login Endpoint

**POST** `/api/auth/employee/login`

**Request Body:**

```json
{
  "email": "employee@example.com",
  "password": "employee_password"
}
```

**Response (Success):**

```json
{
  "message": "Credentials verified. Please enter the verification code sent to administrators.",
  "requiresOtp": true,
  "userId": "employee_id",
  "email": "employee@example.com"
}
```

### 2. OTP Verification Endpoint

**POST** `/api/auth/employee/verify-login-otp`

**Request Body:**

```json
{
  "userId": "employee_id",
  "otp": "123456"
}
```

**Response (Success):**

```json
{
  "message": "Login successful",
  "user": {
    /* user object */
  },
  "token": "jwt_token"
  // Additional details...
}
```

### 3. Logout Endpoint

**POST** `/api/auth/employee/logout`

This endpoint requires authentication via the JWT token.

**Response (Success):**

```json
{
  "success": true,
  "message": "Logout successful. All activities have been closed."
}
```

## Security Considerations

- OTP expires after 10 minutes by default (configurable via OTP_EXPIRY environment variable)
- Login attempts are rate-limited to prevent brute force attacks
- OTP is deleted after successful verification
- All verification attempts are logged
- Logout notifications provide audit trail of employee system access
