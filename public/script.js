document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileStatus = document.getElementById('fileStatus');
    const transcriptInput = document.getElementById('transcriptInput');
    const customPrompt = document.getElementById('customPrompt');
    const generateBtn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const summaryOutput = document.getElementById('summaryOutput');
    const outputCard = document.getElementById('outputCard');
    const emailCard = document.getElementById('emailCard');
    const emailInput = document.getElementById('emailInput');
    const shareBtn = document.getElementById('shareBtn');
    const emailStatus = document.getElementById('emailStatus');

    // Enhanced file input handling with drag and drop
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelection(files[0]);
        }
    });

    // File input change handler
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileSelection(file);
        }
    });

    function handleFileSelection(file) {
        const fileType = file.type;
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
        
        // Update upload zone text
        document.querySelector('.upload-text').textContent = `Selected: ${fileName} (${fileSize} MB)`;
        
        // Show file status
        if (fileType.startsWith('audio/') || 
            fileName.toLowerCase().match(/\.(mp3|wav|m4a|mp4|webm|ogg)$/)) {
            fileStatus.innerHTML = `<i class="fas fa-microphone"></i> Audio file ready for transcription: ${fileName}`;
            fileStatus.className = 'file-status info';
        } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
            fileStatus.innerHTML = `<i class="fas fa-file-pdf"></i> PDF document ready for text extraction: ${fileName}`;
            fileStatus.className = 'file-status info';
        } else if (fileType.includes('wordprocessingml') || fileName.toLowerCase().match(/\.(doc|docx)$/)) {
            fileStatus.innerHTML = `<i class="fas fa-file-word"></i> Word document ready for text extraction: ${fileName}`;
            fileStatus.className = 'file-status info';
        } else {
            fileStatus.innerHTML = `<i class="fas fa-file-text"></i> Text file ready for processing: ${fileName}`;
            fileStatus.className = 'file-status info';
        }
    }

    // Generate summary with enhanced UI
    generateBtn.addEventListener('click', async function() {
        const transcriptText = transcriptInput.value.trim();
        const promptText = customPrompt.value.trim();
        const file = fileInput.files[0];

        if (!transcriptText && !file) {
            alert('Please provide a transcript either by uploading a file or pasting text.');
            return;
        }

        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            let response;
            
            if (file) {
                // Handle file upload
                const formData = new FormData();
                formData.append('transcript', file);
                if (promptText) {
                    formData.append('customPrompt', promptText);
                }
                
                response = await fetch('/api/generate-summary', {
                    method: 'POST',
                    body: formData
                });
            } else {
                // Handle text input
                response = await fetch('/api/generate-summary', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        transcriptText: transcriptText,
                        customPrompt: promptText
                    })
                });
            }

            // Check if response is ok and has content
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText || 'Unknown error'}`);
            }

            // Check if response has content before parsing JSON
            const responseText = await response.text();
            if (!responseText.trim()) {
                throw new Error('Server returned empty response');
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text:', responseText);
                throw new Error('Invalid response from server. Please check server logs.');
            }
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Display the summary
            summaryOutput.value = data.summary;
            
            // Show output and email cards with animation
            outputCard.style.display = 'block';
            emailCard.style.display = 'block';
            
            // Hide loading state
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-sparkles"></i> Generate AI Summary';
            
            // Scroll to summary
            outputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        } catch (error) {
            console.error('Error:', error);
            
            // More detailed error message for debugging
            let errorMessage = error.message;
            if (errorMessage.includes('Server error')) {
                errorMessage += '\n\nThis appears to be a server-side issue. Please check:\n1. Server logs in Render dashboard\n2. Environment variables are set correctly\n3. Server is running properly';
            } else if (errorMessage.includes('Invalid response')) {
                errorMessage += '\n\nThe server returned an invalid response. This usually means:\n1. Server crashed or timed out\n2. Missing environment variables\n3. API rate limits exceeded';
            }
            
            alert('Error generating summary: ' + errorMessage);
            
            // Hide loading state
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-sparkles"></i> Generate AI Summary';
        }
    });

    // Share summary via email
    shareBtn.addEventListener('click', async function() {
        const summary = summaryOutput.value.trim();
        const recipients = emailInput.value.trim();
        const subject = 'Meeting Summary'; // Default subject

        if (!summary) {
            emailStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please generate a summary first.';
            emailStatus.className = 'email-status error';
            emailStatus.style.display = 'block';
            return;
        }

        if (!recipients) {
            emailStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter recipient email addresses.';
            emailStatus.className = 'email-status error';
            emailStatus.style.display = 'block';
            return;
        }
        
        // Show loading state
        shareBtn.disabled = true;
        shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        emailStatus.style.display = 'none';

        try {
            const response = await fetch('/api/share-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    summary: summary,
                    recipients: recipients.split(',').map(email => email.trim()),
                    subject: subject
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Show success message
            emailStatus.innerHTML = '<i class="fas fa-check-circle"></i> Mails sent successfully!';
            emailStatus.className = 'email-status success';
            emailStatus.style.display = 'block';
            
            // Clear email input after successful send
            emailInput.value = '';
            
        } catch (error) {
            console.error('Error:', error);
            emailStatus.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error sending email: ${error.message}`;
            emailStatus.className = 'email-status error';
            emailStatus.style.display = 'block';
        } finally {
            // Reset button state
            shareBtn.disabled = false;
            shareBtn.innerHTML = '<i class="fas fa-send"></i> Send Email';
        }
    });
});
