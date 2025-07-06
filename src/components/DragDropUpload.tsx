import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Paper,
  Fade,
  Zoom,
  SvgIcon,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  CheckCircle,
  Error,
  Close,
  Refresh,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface DragDropUploadProps {
  uploadType: string;
  title: string;
  description?: string;
  accept?: string;
  maxSize?: number;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  loading?: boolean;
  disabled?: boolean;
  message?: string;
  error?: boolean;
  onFileUpload: (file: File) => void;
  onClear?: () => void;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  uploadType,
  title,
  description,
  accept = '.csv,.tsv',
  maxSize = 10 * 1024 * 1024, // 10MB default
  icon,
  color = 'primary',
  loading = false,
  disabled = false,
  message = '',
  error = false,
  onFileUpload,
  onClear,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const onDragEnter = useCallback(() => {
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    onDragEnter,
    onDragLeave,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'text/plain': ['.txt'],
    },
    maxSize,
    multiple: false,
    disabled: disabled || loading,
  });

  const handleClear = () => {
    setSelectedFile(null);
    if (onClear) {
      onClear();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDropZoneStyles = () => {
    const baseStyles = {
      border: '2px dashed',
      borderRadius: 2,
      padding: 3,
      textAlign: 'center' as const,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease-in-out',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      minHeight: 200,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (disabled || loading) {
      return {
        ...baseStyles,
        borderColor: 'grey.300',
        backgroundColor: alpha('#000', 0.02),
        color: 'text.disabled',
      };
    }

    if (isDragReject) {
      return {
        ...baseStyles,
        borderColor: 'error.main',
        backgroundColor: alpha('#f44336', 0.08),
        color: 'error.main',
      };
    }

    if (isDragAccept || dragActive) {
      return {
        ...baseStyles,
        borderColor: `${color}.main`,
        backgroundColor: alpha(`${color}.main` === 'primary.main' ? '#1976d2' : '#1976d2', 0.08),
        color: `${color}.main`,
        transform: 'scale(1.02)',
      };
    }

    return {
      ...baseStyles,
      borderColor: 'grey.400',
      backgroundColor: 'background.paper',
      '&:hover': {
        borderColor: `${color}.main`,
        backgroundColor: alpha(`${color}.main` === 'primary.main' ? '#1976d2' : '#1976d2', 0.04),
      },
    };
  };

  return (
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon || <CloudUpload sx={{ fontSize: 48, color: `${color}.main`, mr: 1 }} />}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {message && onClear && (
          <IconButton onClick={handleClear} size="small" color="inherit">
            <Refresh />
          </IconButton>
        )}
      </Box>

      {/* Loading Progress */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Processing file...
          </Typography>
        </Box>
      )}

      {/* Drag & Drop Zone */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          {...getRootProps()}
          sx={getDropZoneStyles()}
        >
          <input {...getInputProps()} />
          
          {/* Drop Zone Content */}
          <Zoom in={!loading}>
            <Box sx={{ textAlign: 'center' }}>
              {isDragActive ? (
                <Fade in={isDragActive}>
                  <Box>
                    <CloudUpload sx={{ fontSize: 64, color: `${color}.main`, mb: 2 }} />
                    <Typography variant="h6" color={`${color}.main`}>
                      Drop your file here!
                    </Typography>
                  </Box>
                </Fade>
              ) : (
                <Box>
                  <CloudUpload sx={{ fontSize: 48, color: 'action.active', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Drag & drop your CSV file here
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    or click to browse files
                  </Typography>
                  <Button
                    variant="outlined"
                    color={color}
                    component="span"
                    disabled={disabled || loading}
                    sx={{ mb: 2 }}
                  >
                    Choose File
                  </Button>
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                      <Chip label="CSV" size="small" variant="outlined" />
                      <Chip label="TSV" size="small" variant="outlined" />
                      <Chip label={`Max ${formatFileSize(maxSize)}`} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                </Box>
              )}
            </Box>
          </Zoom>
        </Box>

        {/* Selected File Info */}
        {selectedFile && (
          <Fade in={!!selectedFile}>
            <Box sx={{ mt: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Description sx={{ color: 'text.secondary', mr: 1 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(selectedFile.size)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={handleClear} size="small" color="inherit">
                    <Close />
                  </IconButton>
                </Box>
              </Paper>
            </Box>
          </Fade>
        )}

        {/* Status Messages */}
        {message && (
          <Fade in={!!message}>
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity={error ? 'error' : 'success'}
                icon={error ? <Error /> : <CheckCircle />}
                sx={{ textAlign: 'left' }}
              >
                {message}
              </Alert>
            </Box>
          </Fade>
        )}
      </Box>
    </Paper>
  );
};

export default DragDropUpload; 