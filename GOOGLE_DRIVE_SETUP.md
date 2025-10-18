# Google Drive Setup Guide for PDF Library

## 🚀 Setting Up Google Drive Integration

To enable Google Drive storage for your PDF library, follow these steps:

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `pdf-library-drive` (or any name you prefer)
4. Click **"Create"**

### 2. Enable Google Drive API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click on it and press **"Enable"**

### 3. Create Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy the API key
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. Choose **"Web application"**
6. Add authorized origins:
   - `https://ha5him97.github.io`
   - `http://localhost:3000` (for testing)
7. Copy the Client ID

### 4. Update Your Website

Replace the configuration in `index.html` with your actual credentials:

```javascript
const GOOGLE_CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'your-actual-api-key';
```

### 5. How It Works

✅ **Google Sign-in**: Users sign in with their Google account  
✅ **Drive Storage**: PDFs are stored in a "PDF Library" folder in your Drive  
✅ **Cross-Device**: Access PDFs from any device with your Google account  
✅ **Automatic Sync**: Changes sync instantly across all devices  
✅ **Secure**: Uses Google's secure authentication  

## 🎯 Benefits of Google Drive

- **Free Storage**: 15GB free with Google account
- **Familiar Interface**: Uses your existing Google account
- **Mobile Access**: Access via Google Drive app on phone
- **Sharing**: Easy to share PDFs with others
- **Backup**: Automatic cloud backup
- **Search**: Google's powerful search within PDFs

## 📱 Usage

1. **First Visit**: Sign in with your Google account
2. **Upload PDFs**: Drag & drop or click to upload
3. **Access Anywhere**: Open Google Drive app or website
4. **Sync**: Changes appear instantly on all devices

## 🔧 File Organization

- All PDFs are stored in a "PDF Library" folder in your Google Drive
- Files are named: `Title - Category - Description.pdf`
- Easy to find and organize in Google Drive

## 🆘 Troubleshooting

**"Failed to sign in"**
- Check your Client ID and API key
- Ensure Google Drive API is enabled
- Check authorized origins in OAuth settings

**"Permission denied"**
- Make sure you're signed in with Google
- Check if Google Drive API is enabled
- Verify OAuth client configuration

**"PDF not loading"**
- Check if file was uploaded successfully
- Verify you have access to the PDF Library folder
- Try refreshing the page

## 💡 Pro Tips

- **Mobile**: Use Google Drive app for easy mobile access
- **Sharing**: Share individual PDFs or entire folder
- **Search**: Use Google Drive's search to find PDFs quickly
- **Offline**: Enable offline access in Google Drive app
- **Backup**: Google Drive automatically backs up your files
