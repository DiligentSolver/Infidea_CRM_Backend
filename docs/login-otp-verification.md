# Login OTP Verification System

## Overview

The Login OTP Verification system requires employees to get an OTP from administrators to complete the login process. When an employee attempts to log in with valid credentials, an email containing a verification code is sent to configured admin emails, along with the employee's details.

## How It Works

1. Employee enters login credentials (email and password)
2. System validates credentials and sends an OTP to admin emails
3. Admin provides the OTP to the employee
4. Employee enters the OTP to complete the login

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

The system uses HTML email templates to send a formatted email to administrators containing:

- Employee details (name, employee ID, email, mobile)
- Login timestamp
- OTP code
- Security warning message

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

## Security Considerations

- OTP expires after 10 minutes by default (configurable via OTP_EXPIRY environment variable)
- Login attempts are rate-limited to prevent brute force attacks
- OTP is deleted after successful verification
- All verification attempts are logged
