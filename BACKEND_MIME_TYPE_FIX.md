# Backend MIME Type Fix untuk Google GenAI

## Masalah
Backend error yang terjadi:
```
ERROR    Error processing file APLIKASI AI.docx: Unknown mime type: Could not   
         determine the mimetype for your file                                   
             please set the `mime_type` argument
```

## Root Cause
Google GenAI API memerlukan explicit `mime_type` parameter untuk file upload, terutama untuk file DOCX yang MIME type-nya tidak selalu ter-detect dengan benar oleh sistem.

## Solusi Backend (Python)

### 1. MIME Type Mapping untuk File Extensions
```python
import mimetypes
from pathlib import Path

# Mapping eksplisit untuk file types yang didukung Google GenAI
GENAI_MIME_TYPE_MAP = {
    # Document formats
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.xml': 'text/xml',
    '.rtf': 'application/rtf',
    
    # Code formats
    '.js': 'application/javascript',
    '.py': 'text/x-python',
    
    # Office formats (yang sering bermasalah)
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    # Image formats
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
}

def get_mime_type_for_genai(file_path: str) -> str:
    """
    Get MIME type untuk Google GenAI dengan fallback yang reliable
    """
    # Get file extension
    extension = Path(file_path).suffix.lower()
    
    # Check mapping eksplisit dulu
    if extension in GENAI_MIME_TYPE_MAP:
        mime_type = GENAI_MIME_TYPE_MAP[extension]
        print(f"Using explicit mapping for {extension}: {mime_type}")
        return mime_type
    
    # Fallback ke mimetypes.guess_type
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type:
        print(f"Using mimetypes.guess_type for {extension}: {mime_type}")
        return mime_type
    
    # Last resort: berdasarkan extension saja
    print(f"Warning: Could not determine MIME type for {file_path}")
    return 'application/octet-stream'
```

### 2. Upload ke Google GenAI dengan Explicit MIME Type
```python
import google.generativeai as genai

def upload_file_to_genai(file_path: str, display_name: str = None):
    """
    Upload file ke Google GenAI dengan explicit MIME type
    """
    # Determine MIME type
    mime_type = get_mime_type_for_genai(file_path)
    
    try:
        # Upload dengan explicit MIME type
        uploaded_file = genai.upload_file(
            path=file_path,
            mime_type=mime_type,  # KUNCI: explicit MIME type
            display_name=display_name or Path(file_path).name
        )
        
        print(f"Successfully uploaded {file_path} with MIME type: {mime_type}")
        return uploaded_file
        
    except Exception as e:
        print(f"Error uploading {file_path}: {e}")
        print(f"File extension: {Path(file_path).suffix}")
        print(f"Attempted MIME type: {mime_type}")
        raise
```

### 3. Error Handling yang Robust
```python
def process_uploaded_file(temp_file_path: str, original_filename: str):
    """
    Process uploaded file dengan error handling yang robust
    """
    try:
        # Log detail file
        file_size = Path(temp_file_path).stat().st_size
        extension = Path(original_filename).suffix.lower()
        mime_type = get_mime_type_for_genai(temp_file_path)
        
        print(f"Processing file: {original_filename}")
        print(f"Extension: {extension}")
        print(f"Size: {file_size / (1024*1024):.2f}MB")
        print(f"MIME type: {mime_type}")
        
        # Special handling untuk file Office
        if extension in ['.docx', '.xlsx', '.doc', '.xls']:
            print(f"Office file detected: {extension}")
            # Verify file is not corrupted
            if file_size < 100:  # File terlalu kecil
                raise ValueError(f"File {original_filename} appears to be corrupted (too small)")
        
        # Upload dengan explicit MIME type
        uploaded_file = upload_file_to_genai(
            file_path=temp_file_path,
            display_name=original_filename
        )
        
        return uploaded_file
        
    except Exception as e:
        print(f"Failed to process {original_filename}: {e}")
        # Provide specific error messages
        if "Unknown mime type" in str(e):
            raise ValueError(f"Unsupported file format: {extension}. Please use PDF, DOCX, TXT, or image files.")
        raise
```

## Frontend Enhancement (Sudah Diimplementasi)

Frontend sudah diupdate untuk:
1. ✅ Log detailed MIME type information untuk debugging
2. ✅ Detect MIME type issues dan provide expected MIME type
3. ✅ Enhanced error messages untuk user
4. ✅ Comprehensive file validation

Frontend akan log seperti ini untuk membantu debugging:
```
⚠️ MIME type issue for APLIKASI AI.docx:
   Browser detected: ""
   Expected for .docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
   Backend should use: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" for Google GenAI
📋 Backend Note: APLIKASI AI.docx should use MIME type "application/vnd.openxmlformats-officedocument.wordprocessingml.document" for Google GenAI
```

## Testing

Test dengan berbagai file types:
```python
# Test file upload
test_files = [
    "test.docx",
    "test.pdf", 
    "test.txt",
    "test.xlsx",
    "test.png"
]

for file_path in test_files:
    try:
        mime_type = get_mime_type_for_genai(file_path)
        print(f"{file_path}: {mime_type}")
        # Test upload jika file exists
        if Path(file_path).exists():
            uploaded = upload_file_to_genai(file_path)
            print(f"✅ {file_path} uploaded successfully")
    except Exception as e:
        print(f"❌ {file_path} failed: {e}")
```

## Summary

Key changes needed di backend:
1. **Implement explicit MIME type mapping** untuk semua supported file types
2. **Use explicit `mime_type` parameter** saat call `genai.upload_file()`
3. **Enhanced error handling** dengan specific error messages
4. **Detailed logging** untuk debugging file upload issues

Dengan implementasi ini, masalah "Unknown mime type" untuk file DOCX dan file lainnya akan teratasi. 