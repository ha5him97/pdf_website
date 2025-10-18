// PDF Library Application with Google Drive Storage
class PDFLibrary {
    constructor() {
        this.pdfs = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.selectedFile = null;
        this.currentPreviewId = null;
        this.isAuthenticated = false;
        this.driveFolderId = null;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadPDFs();
        this.renderPDFs();
        this.updatePDFCount();
    }
    
    bindEvents() {
        // Upload button events
        document.getElementById('uploadBtn').addEventListener('click', () => this.openUploadModal());
        document.getElementById('emptyUploadBtn').addEventListener('click', () => this.openUploadModal());
        
        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeUploadModal());
        document.getElementById('cancelUpload').addEventListener('click', () => this.closeUploadModal());
        document.getElementById('confirmUpload').addEventListener('click', () => this.uploadPDF());
        
        // Preview modal events
        document.getElementById('closePreviewModal').addEventListener('click', () => this.closePreviewModal());
        document.getElementById('downloadPdf').addEventListener('click', () => this.downloadPDF());
        document.getElementById('deletePdf').addEventListener('click', () => this.deletePDF());
        
        // Search and filter events
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderPDFs();
        });
        
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.category;
                this.renderPDFs();
            });
        });
        
        // File upload events
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // Form validation
        document.getElementById('pdfTitle').addEventListener('input', () => this.validateForm());
        document.getElementById('pdfCategory').addEventListener('change', () => this.validateForm());
        
        // Close modals when clicking outside
        document.getElementById('uploadModal').addEventListener('click', (e) => {
            if (e.target.id === 'uploadModal') {
                this.closeUploadModal();
            }
        });
        
        document.getElementById('previewModal').addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreviewModal();
            }
        });
    }
    
    async authenticateWithGoogle() {
        return new Promise((resolve, reject) => {
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                    return;
                }
                
                this.isAuthenticated = true;
                await this.createPDFLibraryFolder();
                resolve(resp);
            };
            
            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }
    
    async createPDFLibraryFolder() {
        try {
            // Check if folder already exists
            const response = await gapi.client.drive.files.list({
                q: "name='PDF Library' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: 'files(id, name)'
            });
            
            if (response.result.files.length > 0) {
                this.driveFolderId = response.result.files[0].id;
            } else {
                // Create new folder
                const folderMetadata = {
                    name: 'PDF Library',
                    mimeType: 'application/vnd.google-apps.folder'
                };
                
                const folder = await gapi.client.drive.files.create({
                    resource: folderMetadata,
                    fields: 'id'
                });
                
                this.driveFolderId = folder.result.id;
            }
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    }
    
    async loadPDFs() {
        try {
            // Try to authenticate first
            if (!this.isAuthenticated) {
                await this.authenticateWithGoogle();
            }
            
            if (!this.driveFolderId) {
                await this.createPDFLibraryFolder();
            }
            
            // Load PDFs from Google Drive
            const response = await gapi.client.drive.files.list({
                q: `'${this.driveFolderId}' in parents and mimeType='application/pdf' and trashed=false`,
                fields: 'files(id, name, size, createdTime, webViewLink, webContentLink)',
                orderBy: 'createdTime desc'
            });
            
            this.pdfs = [];
            
            for (const file of response.result.files) {
                // Get metadata from file name or description
                const metadata = this.parseFileName(file.name);
                
                this.pdfs.push({
                    id: file.id,
                    title: metadata.title,
                    category: metadata.category,
                    description: metadata.description,
                    fileName: file.name,
                    fileSize: parseInt(file.size) || 0,
                    uploadDate: file.createdTime,
                    url: file.webViewLink,
                    downloadUrl: file.webContentLink
                });
            }
            
        } catch (error) {
            console.error('Error loading PDFs:', error);
            this.showMessage('Failed to load PDFs from Google Drive. Please sign in.', 'error');
            // Fallback to localStorage
            this.pdfs = JSON.parse(localStorage.getItem('pdfLibrary')) || [];
        }
    }
    
    parseFileName(fileName) {
        // Parse filename format: "Title - Category - Description.pdf"
        const parts = fileName.replace('.pdf', '').split(' - ');
        
        return {
            title: parts[0] || fileName.replace('.pdf', ''),
            category: parts[1] || 'academic',
            description: parts[2] || ''
        };
    }
    
    formatFileName(title, category, description) {
        return `${title} - ${category}${description ? ' - ' + description : ''}.pdf`;
    }
    
    async uploadPDF() {
        if (!this.selectedFile) {
            this.showMessage('Please select a PDF file.', 'error');
            return;
        }
        
        const title = document.getElementById('pdfTitle').value.trim();
        const category = document.getElementById('pdfCategory').value;
        const description = document.getElementById('pdfDescription').value.trim();
        
        if (!title) {
            this.showMessage('Please enter a title.', 'error');
            return;
        }
        
        // Show loading state
        const confirmBtn = document.getElementById('confirmUpload');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<span class="spinner"></span> Uploading...';
        confirmBtn.disabled = true;
        
        try {
            // Authenticate if needed
            if (!this.isAuthenticated) {
                await this.authenticateWithGoogle();
            }
            
            if (!this.driveFolderId) {
                await this.createPDFLibraryFolder();
            }
            
            // Create file metadata
            const fileName = this.formatFileName(title, category, description);
            const metadata = {
                name: fileName,
                parents: [this.driveFolderId]
            };
            
            // Upload file to Google Drive
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', this.selectedFile);
            
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + gapi.client.getToken().access_token
                },
                body: form
            });
            
            const result = await response.json();
            
            // Get file details
            const fileResponse = await gapi.client.drive.files.get({
                fileId: result.id,
                fields: 'id, name, size, createdTime, webViewLink, webContentLink'
            });
            
            const file = fileResponse.result;
            
            // Add to local list
            const pdf = {
                id: file.id,
                title: title,
                category: category,
                description: description,
                fileName: file.name,
                fileSize: parseInt(file.size) || 0,
                uploadDate: file.createdTime,
                url: file.webViewLink,
                downloadUrl: file.webContentLink
            };
            
            this.pdfs.unshift(pdf);
            this.renderPDFs();
            this.updatePDFCount();
            this.closeUploadModal();
            this.showMessage('PDF uploaded successfully to Google Drive!', 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('Failed to upload PDF. Please try again.', 'error');
        } finally {
            // Reset button
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
    
    async deletePDF() {
        if (this.currentPreviewId) {
            if (confirm('Are you sure you want to delete this PDF?')) {
                try {
                    if (this.isAuthenticated) {
                        // Delete from Google Drive
                        await gapi.client.drive.files.delete({
                            fileId: this.currentPreviewId
                        });
                    }
                    
                    // Remove from local list
                    this.pdfs = this.pdfs.filter(p => p.id !== this.currentPreviewId);
                    this.renderPDFs();
                    this.updatePDFCount();
                    this.closePreviewModal();
                    this.showMessage('PDF deleted successfully!', 'success');
                    
                } catch (error) {
                    console.error('Delete error:', error);
                    this.showMessage('Failed to delete PDF. Please try again.', 'error');
                }
            }
        }
    }
    
    openUploadModal() {
        document.getElementById('uploadModal').classList.add('show');
        document.body.style.overflow = 'hidden';
        this.resetUploadForm();
    }
    
    closeUploadModal() {
        document.getElementById('uploadModal').classList.remove('show');
        document.body.style.overflow = '';
        this.resetUploadForm();
    }
    
    openPreviewModal(pdfId) {
        this.currentPreviewId = pdfId;
        const pdf = this.pdfs.find(p => p.id === pdfId);
        if (pdf) {
            document.getElementById('previewTitle').textContent = pdf.title;
            document.getElementById('pdfFrame').src = pdf.url;
            document.getElementById('previewModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closePreviewModal() {
        document.getElementById('previewModal').classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('pdfFrame').src = '';
        this.currentPreviewId = null;
    }
    
    handleFileSelect(file) {
        if (file.type !== 'application/pdf') {
            this.showMessage('Please select a PDF file.', 'error');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            this.showMessage('File size must be less than 50MB.', 'error');
            return;
        }
        
        this.selectedFile = file;
        document.getElementById('pdfTitle').value = file.name.replace('.pdf', '');
        this.validateForm();
        
        // Show file info
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <h4>${file.name}</h4>
            <p>Size: ${this.formatFileSize(file.size)}</p>
        `;
    }
    
    validateForm() {
        const title = document.getElementById('pdfTitle').value.trim();
        const hasFile = this.selectedFile !== null;
        const confirmBtn = document.getElementById('confirmUpload');
        
        confirmBtn.disabled = !(title && hasFile);
    }
    
    async downloadPDF() {
        if (this.currentPreviewId) {
            const pdf = this.pdfs.find(p => p.id === this.currentPreviewId);
            if (pdf) {
                const link = document.createElement('a');
                link.href = pdf.downloadUrl;
                link.download = pdf.fileName;
                link.click();
            }
        }
    }
    
    renderPDFs() {
        const grid = document.getElementById('pdfGrid');
        const emptyState = document.getElementById('emptyState');
        
        // Filter PDFs
        let filteredPDFs = this.pdfs;
        
        // Apply category filter
        if (this.currentFilter !== 'all') {
            filteredPDFs = filteredPDFs.filter(pdf => pdf.category === this.currentFilter);
        }
        
        // Apply search filter
        if (this.searchTerm) {
            filteredPDFs = filteredPDFs.filter(pdf => 
                pdf.title.toLowerCase().includes(this.searchTerm) ||
                pdf.description.toLowerCase().includes(this.searchTerm) ||
                pdf.category.toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Clear grid
        grid.innerHTML = '';
        
        if (filteredPDFs.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Render PDF cards
        filteredPDFs.forEach(pdf => {
            const card = this.createPDFCard(pdf);
            grid.appendChild(card);
        });
    }
    
    createPDFCard(pdf) {
        const card = document.createElement('div');
        card.className = 'pdf-card';
        card.addEventListener('click', () => this.openPreviewModal(pdf.id));
        
        const categoryIcon = this.getCategoryIcon(pdf.category);
        const uploadDate = new Date(pdf.uploadDate).toLocaleDateString();
        
        card.innerHTML = `
            <div class="pdf-card-header">
                <div class="pdf-icon">
                    <i class="${categoryIcon}"></i>
                </div>
                <div class="pdf-info">
                    <h3>${pdf.title}</h3>
                    <span class="pdf-category">${pdf.category}</span>
                </div>
            </div>
            ${pdf.description ? `<div class="pdf-description">${pdf.description}</div>` : ''}
            <div class="pdf-meta">
                <span class="pdf-size">${this.formatFileSize(pdf.fileSize)}</span>
                <span class="pdf-date">${uploadDate}</span>
            </div>
        `;
        
        return card;
    }
    
    getCategoryIcon(category) {
        const icons = {
            academic: 'fas fa-graduation-cap',
            research: 'fas fa-microscope',
            notes: 'fas fa-sticky-note',
            books: 'fas fa-book'
        };
        return icons[category] || 'fas fa-file-pdf';
    }
    
    updatePDFCount() {
        const count = this.pdfs.length;
        document.getElementById('pdfCount').textContent = `${count} PDF${count !== 1 ? 's' : ''}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    resetUploadForm() {
        document.getElementById('pdfTitle').value = '';
        document.getElementById('pdfCategory').value = 'academic';
        document.getElementById('pdfDescription').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('confirmUpload').disabled = true;
        this.selectedFile = null;
        
        // Reset upload area
        document.getElementById('uploadArea').innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <h4>Drag & drop your PDF here</h4>
            <p>or click to browse files</p>
            <input type="file" id="fileInput" accept=".pdf" multiple>
        `;
        
        // Re-bind file input event
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }
    
    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        // Insert at the top of the main content
        const main = document.querySelector('.main .container');
        main.insertBefore(messageDiv, main.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PDFLibrary();
});