# Email Feature with Attachments

This documentation explains the email feature implementation in the CRM system, including the ability to send emails with file attachments and specialized lineup emails.

## Overview

The email feature allows users to:

- Compose and send emails with a rich text editor
- Add multiple file attachments (up to 10MB total)
- Use CC and BCC fields
- Toggle between HTML and plain text modes
- Send lineup data directly as HTML tables (without Excel attachments)

## API Endpoints

### 1. Get Email Configuration

**Endpoint**: `GET /crm/api/email/config`  
**Authentication**: Required  
**Description**: Returns the email configuration (sender name, email, max attachment size)

**Response Example**:

```json
{
  "success": true,
  "data": {
    "senderName": "CRM System",
    "senderEmail": "crm@example.com",
    "maxAttachmentSize": 10485760
  }
}
```

### 2. Send Email with Attachments

**Endpoint**: `POST /crm/api/email/send`  
**Authentication**: Required  
**Content-Type**: `multipart/form-data`

**Request Parameters**:

- `to` (required): Recipient email addresses (comma-separated)
- `subject` (required): Email subject
- `content` (required): Email body content
- `isHtml` (optional): Boolean flag for HTML content (default: true)
- `cc` (optional): CC recipients (comma-separated)
- `bcc` (optional): BCC recipients (comma-separated)
- `attachment_*` (optional): File attachments

**Response Example (Success)**:

```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "<message-id>"
}
```

### 3. Send Lineup Email with HTML Table

**Endpoint**: `POST /crm/api/email/send-lineup`  
**Authentication**: Required  
**Content-Type**: `application/json`

**Request Parameters**:

- `to` (required): Recipient email addresses (comma-separated)
- `subject` (required): Email subject
- `lineupData` (required): Object or array of lineup data to be formatted as an HTML table
- `additionalContent` (optional): Additional HTML content to include in the email
- `cc` (optional): CC recipients (comma-separated)
- `bcc` (optional): BCC recipients (comma-separated)

**Response Example (Success)**:

```json
{
  "success": true,
  "message": "Lineup email sent successfully",
  "messageId": "<message-id>"
}
```

**Response Example (Error)**:

```json
{
  "success": false,
  "message": "Failed to send email",
  "error": "Error details"
}
```

## Frontend Implementation

The frontend implementation includes two primary components:

### 1. General Email Component

Uses React with Material-UI and includes:

- Email compose form with recipients (To, CC, BCC)
- Subject field
- Rich text editor using TinyMCE (with HTML/plain text toggle)
- File attachment section with size tracking
- Send and discard buttons

### 2. Lineup Email Component

Specialized component for sending lineup data as HTML tables:

- Email compose form with recipients (To, CC, BCC)
- Subject field
- Rich text editor for additional content
- Preview of lineup data
- Automatic HTML table generation from lineup data

### Required Dependencies

The frontend components require:

- `@mui/material`, `@emotion/react`, `@emotion/styled`
- `@tinymce/tinymce-react` for the rich text editor
- `axios` for API communication

## Backend Implementation

The backend implementation uses:

- `nodemailer` for email sending
- `express-fileupload` for handling file attachments
- Temporary file storage for processing attachments

### Email Service

The email service includes two main functions:

1. **sendEmail**: For general emails with attachments

   - Validates required fields (recipient, subject, content)
   - Creates a nodemailer transporter with Gmail
   - Processes attachments from the request
   - Sends the email with all configured options
   - Cleans up temporary files after sending

2. **sendLineupEmail**: For sending lineup data as HTML tables
   - Validates required fields (recipient, subject, lineupData)
   - Automatically generates an HTML table from the lineup data
   - Combines additional content with the generated table
   - Sends the email with the HTML content

## Environment Variables

Required environment variables:

- `EMAIL_ID`: The Gmail email address used for sending
- `EMAIL_PASSWORD`: The Gmail app password (not regular password)
- `APP_NAME`: The name to display as the sender

## Usage Examples

### Regular Email with Attachments

Use the `EmailCompose.jsx` component for general-purpose emails with attachments.

### Lineup Email with HTML Table

Use the `LineupEmailForm.jsx` component when you need to send lineup data as an HTML table:

```jsx
// Example usage in a lineup details page
import LineupEmailForm from "../components/LineupEmailForm";

function LineupDetailsPage() {
  const lineupData = {
    // Your lineup data from API or state
    id: "L12345",
    name: "Project Alpha",
    client: "ABC Corporation",
    // ... other lineup fields
  };

  return (
    <div>
      <h1>Lineup Details</h1>
      {/* Other lineup details */}

      <LineupEmailForm lineupData={lineupData} />
    </div>
  );
}
```

## Security Considerations

1. Authentication is required for all email endpoints
2. File size limits are enforced to prevent abuse
3. Temporary files are cleaned up after sending
4. Email credentials are stored in environment variables

## Troubleshooting

1. If lineup data is not appearing in the email:

   - Check the format of the lineupData object being passed
   - Ensure all required fields are present
   - Verify the HTML table generation function is working correctly

2. If attachments aren't working:
   - Check that the temporary directory exists and is writable
   - Ensure total file size is under the limit
   - Verify that the content type is being properly set

## Installation

1. Ensure nodemailer is installed:

   ```
   npm install nodemailer
   ```

2. Configure environment variables in your .env file:

   ```
   EMAIL_ID=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   APP_NAME="CRM System"
   ```

3. For Gmail, you need to:
   - Enable 2-Step Verification
   - Generate an App Password specifically for this application

## Usage Tips

1. For HTML emails, ensure proper HTML formatting
2. Use plain text mode for simple messages
3. Keep total attachment size under 10MB
4. Use commas to separate multiple email addresses in To, CC, and BCC fields
