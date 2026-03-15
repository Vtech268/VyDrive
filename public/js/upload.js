/* ============================================
   VyDrive Cloud 0.2 - Upload Page JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const removeFile = document.getElementById('removeFile');
  const uploadForm = document.getElementById('uploadForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const uploadResult = document.getElementById('uploadResult');
  const uploadAnother = document.getElementById('uploadAnother');
  
  let selectedFile = null;
  
  // Drag & Drop events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('dragover');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('dragover');
    }, false);
  });
  
  dropZone.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }
  
  fileInput.addEventListener('change', function() {
    handleFiles(this.files);
  });
  
  function handleFiles(files) {
    if (files.length > 0) {
      selectedFile = files[0];
      showFileInfo(selectedFile);
    }
  }
  
  function showFileInfo(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    fileInfo.style.display = 'flex';
    uploadBtn.disabled = false;
  }
  
  removeFile.addEventListener('click', function() {
    selectedFile = null;
    fileInfo.style.display = 'none';
    fileInput.value = '';
    uploadBtn.disabled = true;
  });
  
  // Form submission
  uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!selectedFile) {
      showToast('Please select a file', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('expiresIn', document.querySelector('input[name="expiresIn"]:checked').value);
    
    // Hide form, show progress
    uploadForm.style.display = 'none';
    uploadProgress.style.display = 'block';
    
    try {
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width = percentComplete + '%';
          progressText.textContent = `Uploading... ${percentComplete}%`;
        }
      });
      
      xhr.addEventListener('load', function() {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            showUploadResult(response.data);
          } else {
            showError(response.message);
          }
        } else {
          showError('Upload failed. Please try again.');
        }
      });
      
      xhr.addEventListener('error', function() {
        showError('Upload failed. Please check your connection.');
      });
      
      xhr.open('POST', '/file/upload');
      xhr.send(formData);
      
    } catch (error) {
      showError('An error occurred during upload.');
    }
  });
  
  function showUploadResult(data) {
    uploadProgress.style.display = 'none';
    uploadResult.style.display = 'block';
    
    // Set links
    const baseUrl = window.location.origin;
    document.getElementById('directLink').value = data.directUrl;
    document.getElementById('viewLink').value = data.viewUrl;
    document.getElementById('downloadLink').value = data.downloadUrl;
    
    // Set preview and download buttons
    document.getElementById('previewBtn').href = data.viewUrl;
    document.getElementById('downloadBtn').href = data.downloadUrl;
  }
  
  function showError(message) {
    uploadProgress.style.display = 'none';
    uploadForm.style.display = 'block';
    showToast(message, 'error');
  }
  
  // Copy buttons
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', function() {
      const targetId = this.dataset.target;
      const input = document.getElementById(targetId);
      copyToClipboard(input.value);
      
      // Change icon temporarily
      const icon = this.querySelector('i');
      icon.classList.remove('fa-copy');
      icon.classList.add('fa-check');
      setTimeout(() => {
        icon.classList.remove('fa-check');
        icon.classList.add('fa-copy');
      }, 2000);
    });
  });
  
  // Upload another
  uploadAnother.addEventListener('click', function() {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadBtn.disabled = true;
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading... 0%';
    
    uploadResult.style.display = 'none';
    uploadForm.style.display = 'block';
  });
  
  // Format bytes
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
});
