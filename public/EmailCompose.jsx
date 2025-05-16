import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Container,
  Snackbar,
  Alert
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// Note: This component assumes you've installed:
// - @mui/material @emotion/react @emotion/styled
// - @tinymce/tinymce-react (for the rich text editor)
// - axios (for API calls)

const EmailCompose = () => {
  // Editor reference
  const editorRef = useRef(null);
  
  // Email state
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    content: '',
    isHtml: true
  });
  
  // File attachments
  const [attachments, setAttachments] = useState([]);
  const [totalAttachmentSize, setTotalAttachmentSize] = useState(0);
  const maxAttachmentSize = 10 * 1024 * 1024; // 10MB (should match backend limit)
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [emailConfig, setEmailConfig] = useState({
    senderName: 'CRM System',
    senderEmail: ''
  });
  
  // File input reference
  const fileInputRef = useRef(null);

  // Fetch email configuration on component mount
  useEffect(() => {
    const fetchEmailConfig = async () => {
      try {
        const response = await axios.get('/crm/api/email/config');
        if (response.data.success) {
          setEmailConfig(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching email configuration:', error);
      }
    };

    fetchEmailConfig();
  }, []);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    let newTotalSize = totalAttachmentSize;
    
    // Check if adding these files would exceed the size limit
    files.forEach(file => {
      newTotalSize += file.size;
    });
    
    if (newTotalSize > maxAttachmentSize) {
      setAlert({
        open: true,
        message: 'Total attachment size exceeds 10MB limit',
        severity: 'error'
      });
      return;
    }
    
    // Add files to attachments
    const newAttachments = [
      ...attachments,
      ...files.map(file => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type
      }))
    ];
    
    setAttachments(newAttachments);
    setTotalAttachmentSize(newTotalSize);
    
    // Reset file input
    e.target.value = '';
  };

  // Remove an attachment
  const removeAttachment = (index) => {
    const removedFile = attachments[index];
    setTotalAttachmentSize(prevSize => prevSize - removedFile.size);
    
    setAttachments(prevAttachments => 
      prevAttachments.filter((_, i) => i !== index)
    );
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmailData({
      ...emailData,
      [name]: value
    });
  };

  // Handle rich text editor changes
  const handleEditorChange = () => {
    if (editorRef.current) {
      setEmailData({
        ...emailData,
        content: editorRef.current.getContent()
      });
    }
  };

  // Toggle HTML/Plain text
  const toggleHtmlMode = (e) => {
    setEmailData({
      ...emailData,
      isHtml: e.target.checked
    });
  };

  // Send email
  const sendEmail = async () => {
    // Basic validation
    if (!emailData.to) {
      setAlert({
        open: true,
        message: 'Please specify at least one recipient',
        severity: 'error'
      });
      return;
    }

    if (!emailData.subject) {
      setAlert({
        open: true,
        message: 'Please add a subject',
        severity: 'warning'
      });
      return;
    }

    // Get content from editor if in HTML mode
    let finalContent = emailData.content;
    if (emailData.isHtml && editorRef.current) {
      finalContent = editorRef.current.getContent();
    }

    if (!finalContent) {
      setAlert({
        open: true,
        message: 'Email content cannot be empty',
        severity: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      // Create form data for sending files
      const formData = new FormData();
      
      // Add email fields
      formData.append('to', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('content', finalContent);
      formData.append('isHtml', emailData.isHtml);
      
      // Add optional fields if present
      if (emailData.cc) formData.append('cc', emailData.cc);
      if (emailData.bcc) formData.append('bcc', emailData.bcc);
      
      // Add attachments
      attachments.forEach((attachment, index) => {
        formData.append(`attachment_${index}`, attachment.file);
      });

      // Send API request
      const response = await axios.post('/crm/api/email/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setAlert({
          open: true,
          message: 'Email sent successfully',
          severity: 'success'
        });
        
        // Reset form
        setEmailData({
          to: '',
          cc: '',
          bcc: '',
          subject: '',
          content: '',
          isHtml: true
        });
        setAttachments([]);
        setTotalAttachmentSize(0);
        
        if (editorRef.current) {
          editorRef.current.setContent('');
        }
      } else {
        throw new Error(response.data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setAlert({
        open: true,
        message: error.message || 'Failed to send email. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Close alert
  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      open: false
    });
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Compose Email
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">
            From: {emailConfig.senderName} &lt;{emailConfig.senderEmail}&gt;
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Recipients */}
        <TextField
          fullWidth
          label="To"
          name="to"
          value={emailData.to}
          onChange={handleChange}
          margin="normal"
          placeholder="recipient@example.com (separate multiple emails with commas)"
          required
        />
        
        <TextField
          fullWidth
          label="CC"
          name="cc"
          value={emailData.cc}
          onChange={handleChange}
          margin="normal"
          placeholder="cc@example.com (separate multiple emails with commas)"
        />
        
        <TextField
          fullWidth
          label="BCC"
          name="bcc"
          value={emailData.bcc}
          onChange={handleChange}
          margin="normal"
          placeholder="bcc@example.com (separate multiple emails with commas)"
        />
        
        {/* Subject */}
        <TextField
          fullWidth
          label="Subject"
          name="subject"
          value={emailData.subject}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        {/* HTML/Plain text toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={emailData.isHtml}
              onChange={toggleHtmlMode}
              color="primary"
            />
          }
          label="HTML Mode"
          sx={{ mb: 1 }}
        />
        
        {/* Email content */}
        {emailData.isHtml ? (
          <Box sx={{ mb: 2, mt: 2, border: '1px solid #ddd', minHeight: '300px' }}>
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js" 
              onInit={(evt, editor) => editorRef.current = editor}
              initialValue=""
              init={{
                height: 300,
                menubar: true,
                plugins: [
                  'advlist autolink lists link image charmap print preview anchor',
                  'searchreplace visualblocks code fullscreen',
                  'insertdatetime media table paste code help wordcount'
                ],
                toolbar:
                  'undo redo | formatselect | bold italic backcolor | \
                  alignleft aligncenter alignright alignjustify | \
                  bullist numlist outdent indent | removeformat | help'
              }}
              onEditorChange={handleEditorChange}
            />
          </Box>
        ) : (
          <TextField
            fullWidth
            label="Content"
            name="content"
            value={emailData.content}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={12}
            required
          />
        )}
        
        {/* Attachments section */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Attachments 
            <Typography variant="body2" component="span" color="textSecondary" sx={{ ml: 1 }}>
              ({formatFileSize(totalAttachmentSize)} / 10 MB)
            </Typography>
          </Typography>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <Button
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ mb: 2 }}
            disabled={loading}
          >
            Attach Files
          </Button>
          
          {/* Display attached files */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {attachments.map((file, index) => (
              <Chip
                key={index}
                label={`${file.name} (${formatFileSize(file.size)})`}
                onDelete={() => removeAttachment(index)}
                deleteIcon={<DeleteIcon />}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => {
              if (window.confirm('Are you sure you want to discard this email?')) {
                setEmailData({
                  to: '',
                  cc: '',
                  bcc: '',
                  subject: '',
                  content: '',
                  isHtml: true
                });
                setAttachments([]);
                setTotalAttachmentSize(0);
                if (editorRef.current) {
                  editorRef.current.setContent('');
                }
              }
            }}
            disabled={loading}
          >
            Discard
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={sendEmail}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </Box>
      </Paper>
      
      {/* Alert/Notification */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailCompose; 