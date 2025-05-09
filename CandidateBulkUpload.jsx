import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  Typography, 
  Alert, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const CandidateBulkUpload = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
    setUploadResult(null);
    
    if (selectedFile) {
      readExcel(selectedFile);
    }
  };

  const readExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Map the data to match the expected format
        const candidates = jsonData.map(row => {
          // Check for different possible column names
          const name = row.Name || row.name || row.CANDIDATE_NAME || row.candidate_name || row.CandidateName || '';
          const mobileNo = row['Contact Number'] || row.Mobile || row.mobile || row.MOBILE || row.Phone || row.phone || row.mobileNo || '';
          
          return { name, mobileNo };
        });
        
        // Preview the first 5 entries
        setPreview(candidates.slice(0, 5));

        if (candidates.length === 0) {
          setError('No data found in the Excel file.');
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        setError('Could not parse the Excel file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Map the data to match the expected format
          const candidates = jsonData.map(row => {
            // Check for different possible column names
            const name = row.Name || row.name || row.CANDIDATE_NAME || row.candidate_name || row.CandidateName || '';
            const mobileNo = row['Contact Number'] || row.Mobile || row.mobile || row.MOBILE || row.Phone || row.phone || row.mobileNo || '';
            
            return { name, mobileNo };
          });

          if (candidates.length === 0) {
            setError('No data found in the Excel file.');
            setIsUploading(false);
            return;
          }

          // Send to backend
          const response = await axios.post('/api/candidates/bulk-upload', { candidates }, {
            headers: {
              'Content-Type': 'application/json',
              // Include auth token if needed
              // 'Authorization': `Bearer ${yourAuthToken}`
            }
          });

          setUploadResult(response.data);
        } catch (error) {
          console.error('Error processing or uploading:', error);
          setError(error.response?.data?.message || 'Error uploading candidates. Please try again.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError('Error reading file. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <Typography variant="h5" gutterBottom>
          Bulk Upload Candidates
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Upload an Excel file with candidate data. The file must include columns for Name and Contact Number.
        </Typography>

        <Box sx={{ my: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2 }}
          >
            Select Excel File
            <input
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
          </Button>
          
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected file: {file.name}
            </Typography>
          )}
        </Box>

        {preview.length > 0 && (
          <Box sx={{ my: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Preview (first 5 entries):
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Contact Number</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name || <span style={{color: 'red'}}>Missing</span>}</TableCell>
                      <TableCell>{row.mobileNo || <span style={{color: 'red'}}>Missing</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || isUploading}
            sx={{ minWidth: 150 }}
          >
            {isUploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </Box>

        {uploadResult && (
          <Box sx={{ mt: 4 }}>
            <Alert 
              severity={uploadResult.status === 'success' ? 'success' : 'warning'}
              sx={{ mb: 2 }}
            >
              {uploadResult.message}
            </Alert>
            
            <Typography variant="subtitle1" gutterBottom>
              Upload Results:
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Paper sx={{ p: 2, flex: 1, bgcolor: '#e8f5e9', textAlign: 'center' }}>
                <Typography variant="h6">{uploadResult.results.successful}</Typography>
                <Typography variant="body2">Successful</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, flex: 1, bgcolor: '#ffebee', textAlign: 'center' }}>
                <Typography variant="h6">{uploadResult.results.failed}</Typography>
                <Typography variant="body2">Failed</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, flex: 1, bgcolor: '#e3f2fd', textAlign: 'center' }}>
                <Typography variant="h6">{uploadResult.results.total}</Typography>
                <Typography variant="body2">Total</Typography>
              </Paper>
            </Box>
            
            {uploadResult.results.details.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadResult.results.details.map((item, index) => (
                      <TableRow key={index} sx={{ 
                        bgcolor: item.status === 'Success' ? '#f1f8e9' : '#ffebee'
                      }}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.mobileNo}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>{item.reason || (item.status === 'Success' ? 'Added successfully' : '')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default CandidateBulkUpload; 