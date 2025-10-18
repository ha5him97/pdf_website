// PDF Library Application with Firebase Cloud Storage
class PDFLibrary {
    constructor() {
        this.pdfs = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.selectedFile = null;
        this.currentPreviewId = null;
        this.userId = null;
        
        this.init();
    }
    
    async init() {
        await this.initializeAuth();
        this.bindEvents();
        await this.loadPDFs();
        this.renderPDFs();
        this.updatePDFCount();
    }
    
    async initializeAuth() {
        try {
            // Sign in anonymously for cloud storage
            const userCredential = await auth.signInAnonymously();
            this.userId = userCredential.user.uid;
            console.log('Signed in anonymously:', this.userId);
        } catch (error) {
            console.error('Authentication error:', error);
            this.showMessage('Failed to connect to cloud storage. Using local storage instead.', 'error');
            // Fallback to localStorage
            this.useLocalStorage = true;
        }
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
    
    async loadPDFs() {
        if (this.useLocalStorage) {
            // Fallback to localStorage
            this.pdfs = JSON.parse(localStorage.getItem('pdfLibrary')) || [];
            return;
        }
        
        try {
            const snapshot = await db.collection('pdfs').where('userId', '==', this.userId).get();
            this.pdfs = [];
            
            for (const doc of snapshot.docs) {
                const pdfData = doc.data();
                // Get download URL from storage
                try {
                    const storageRef = storage.ref(`pdfs/${this.userId}/${pdfData.fileName}`);
                    pdfData.url = await storageRef.getDownloadURL();
                } catch (error) {
                    console.error('Error getting download URL:', error);
                    continue; // Skip this PDF if we can't get the URL
                }
                
                this.pdfs.push({
                    id: doc.id,
                    ...pdfData
                });
            }
            
            // Sort by upload date (newest first)
            this.pdfs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            
        } catch (error) {
            console.error('Error loading PDFs:', error);
            this.showMessage('Failed to load PDFs from cloud storage.', 'error');
            // Fallback to localStorage
            this.pdfs = JSON.parse(localStorage.getItem('pdfLibrary')) || [];
        }
    }
    
    async savePDFToCloud(pdfData) {
        try {
            // Upload file to Firebase Storage
            const storageRef = storage.ref(`pdfs/${this.userId}/${pdfData.fileName}`);
            const uploadTask = await storageRef.put(this.selectedFile);
            
            // Save metadata to Firestore
            const docRef = await db.collection('pdfs').add({
                ...pdfData,
                userId: this.userId,
                storagePath: `pdfs/${this.userId}/${pdfData.fileName}`
            });
            
            return docRef.id;
        } catch (error) {
            console.error('Error saving to cloud:', error);
            throw error;
        }
    }
    
    async deletePDFFromCloud(pdfId) {
        try {
            const pdf = this.pdfs.find(p => p.id === pdfId);
            if (!pdf) return;
            
            // Delete from Firestore
            await db.collection('pdfs').doc(pdfId).delete();
            
            // Delete from Storage
            if (pdf.storagePath) {
                const storageRef = storage.ref(pdf.storagePath);
                await storageRef.delete();
            }
            
        } catch (error) {
            console.error('Error deleting from cloud:', error);
            throw error;
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
            // Create PDF object
            const pdfData = {
                title: title,
                category: category,
                description: description,
                fileName: this.selectedFile.name,
                fileSize: this.selectedFile.size,
                uploadDate: new Date().toISOString()
            };
            
            if (this.useLocalStorage) {
                // Fallback to localStorage
                const pdf = {
                    id: Date.now().toString(),
                    ...pdfData,
                    url: URL.createObjectURL(this.selectedFile)
                };
                this.pdfs.unshift(pdf);
                localStorage.setItem('pdfLibrary', JSON.stringify(this.pdfs));
            } else {
                // Upload to cloud
                const pdfId = await this.savePDFToCloud(pdfData);
                const pdf = {
                    id: pdfId,
                    ...pdfData,
                    url: await storage.ref(`pdfs/${this.userId}/${pdfData.fileName}`).getDownloadURL()
                };
                this.pdfs.unshift(pdf);
            }
            
            this.renderPDFs();
            this.updatePDFCount();
            this.closeUploadModal();
            this.showMessage('PDF uploaded successfully to cloud storage!', 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('Failed to upload PDF. Please try again.', 'error');
        } finally {
            // Reset button
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
    
    async downloadPDF() {
        if (this.currentPreviewId) {
            const pdf = this.pdfs.find(p => p.id === this.currentPreviewId);
            if (pdf) {
                const link = document.createElement('a');
                link.href = pdf.url;
                link.download = pdf.fileName;
                link.click();
            }
        }
    }
    
    async deletePDF() {
        if (this.currentPreviewId) {
            if (confirm('Are you sure you want to delete this PDF?')) {
                try {
                    if (this.useLocalStorage) {
                        // Fallback to localStorage
                        const index = this.pdfs.findIndex(p => p.id === this.currentPreviewId);
                        if (index !== -1) {
                            URL.revokeObjectURL(this.pdfs[index].url);
                            this.pdfs.splice(index, 1);
                            localStorage.setItem('pdfLibrary', JSON.stringify(this.pdfs));
                        }
                    } else {
                        // Delete from cloud
                        await this.deletePDFFromCloud(this.currentPreviewId);
                        this.pdfs = this.pdfs.filter(p => p.id !== this.currentPreviewId);
                    }
                    
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