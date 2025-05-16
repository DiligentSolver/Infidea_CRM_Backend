import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  Container,
  Snackbar,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const LineupEmailForm = ({ lineupData, lineupId }) => {
  // Editor reference for additional content
  const editorRef = useRef(null);
  
  // Email state
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: `Lineup Details - ${new Date().toLocaleDateString()}`,
    additionalContent: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [emailConfig, setEmailConfig] = useState({
    senderName: 'CRM System',
    senderEmail: ''
  });

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
    
    // If lineupData was provided, set it for preview
    if (lineupData) {
      setPreviewData(lineupData);
    } else if (lineupId) {
      // If only lineupId was provided, fetch the lineup data
      fetchLineupData(lineupId);
    }
  }, [lineupData, lineupId]);

  // Fetch lineup data if only ID was provided
  const fetchLineupData = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`/crm/api/lineups/${id}`);
      if (response.data.success) {
        setPreviewData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching lineup data:', error);
      setAlert({
        open: true,
        message: 'Failed to fetch lineup data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
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
        additionalContent: editorRef.current.getContent()
      });
    }
  };

  // Toggle preview
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  // Send lineup email
  const sendLineupEmail = async () => {
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

    if (!previewData) {
      setAlert({
        open: true,
        message: 'No lineup data available to send',
        severity: 'error'
      });
      return;
    }

    // Get additional content from editor
    let additionalContent = '';
    if (editorRef.current) {
      additionalContent = editorRef.current.getContent();
    }

    setLoading(true);

    try {
      // Prepare the request data
      const requestData = {
        to: emailData.to,
        subject: emailData.subject,
        lineupData: previewData,
        additionalContent
      };
      
      // Add optional fields if present
      if (emailData.cc) requestData.cc = emailData.cc;
      if (emailData.bcc) requestData.bcc = emailData.bcc;

      // Send API request
      const response = await axios.post('/crm/api/email/send-lineup', requestData);

      if (response.data.success) {
        setAlert({
          open: true,
          message: 'Lineup email sent successfully',
          severity: 'success'
        });
        
        // Reset form
        setEmailData({
          to: '',
          cc: '',
          bcc: '',
          subject: `Lineup Details - ${new Date().toLocaleDateString()}`,
          additionalContent: ''
        });
        
        if (editorRef.current) {
          editorRef.current.setContent('');
        }
      } else {
        throw new Error(response.data.message || 'Failed to send lineup email');
      }
    } catch (error) {
      console.error('Error sending lineup email:', error);
      setAlert({
        open: true,
        message: error.message || 'Failed to send lineup email. Please try again.',
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

  // Format the lineup data for preview (simple version)
  const renderPreview = () => {
    if (!previewData) return <Typography>No lineup data available</Typography>;
    
    // For a single object
    if (!Array.isArray(previewData)) {
      return (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            {Object.entries(previewData)
              .filter(([key]) => !['__v', 'password', 'createdAt', 'updatedAt'].includes(key))
              .map(([key, value]) => (
                <Box key={key} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" component="span">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                  </Typography>{' '}
                  <Typography variant="body2" component="span">
                    {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                  </Typography>
                </Box>
              ))}
          </CardContent>
        </Card>
      );
    }
    
    // For an array of objects
    return previewData.map((item, index) => (
      <Card key={index} variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Item {index + 1}
          </Typography>
          {Object.entries(item)
            .filter(([key]) => !['__v', 'password', 'createdAt', 'updatedAt'].includes(key))
            .map(([key, value]) => (
              <Box key={key} sx={{ mb: 1 }}>
                <Typography variant="subtitle2" component="span">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                </Typography>{' '}
                <Typography variant="body2" component="span">
                  {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                </Typography>
              </Box>
            ))}
        </CardContent>
      </Card>
    ));
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Send Lineup Email
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
        
        {/* Additional content editor */}
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
          Additional Message (Optional)
        </Typography>
        
        <Box sx={{ mb: 3, border: '1px solid #ddd', minHeight: '200px' }}>
          <Editor
            tinymceScriptSrc="/tinymce/tinymce.min.js" 
            onInit={(evt, editor) => editorRef.current = editor}
            initialValue=""
            init={{
              height: 200,
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
        
        {/* Lineup data preview toggle */}
        <Button 
          variant="outlined" 
          onClick={togglePreview} 
          sx={{ mb: 2 }}
        >
          {showPreview ? 'Hide Preview' : 'Show Lineup Data Preview'}
        </Button>
        
        {/* Lineup data preview */}
        {showPreview && (
          <Box sx={{ mb: 3, mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Lineup Data Preview
            </Typography>
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              renderPreview()
            )}
          </Box>
        )}
        
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
                  subject: `Lineup Details - ${new Date().toLocaleDateString()}`,
                  additionalContent: ''
                });
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
            onClick={sendLineupEmail}
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

export default LineupEmailForm; 