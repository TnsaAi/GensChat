document.addEventListener('DOMContentLoaded', () => {
    // Main layout elements
    const sidebar = document.querySelector('.sidebar');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const newChatSidebarBtn = document.getElementById('sidebarNewChat');

    // Chat area elements
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const mainNewChatButton = document.getElementById('mainNewChatButton');
    const chatUserNameSpan = document.getElementById('chatUserName');
    const userInitialsSidebarSpan = document.getElementById('userInitialsSidebar');
    const userNameSidebarSpan = document.getElementById('userNameSidebar');

    // Model loading overlay elements
    const modelLoadingOverlay = document.getElementById('modelLoadingOverlay');
    const modelLoadingStatus = document.getElementById('modelLoadingStatus');
    
    // Show model loading overlay initially
    if (modelLoadingOverlay) {
        modelLoadingOverlay.style.display = 'flex';
        checkModelStatus();
    }
    
    // Function to check if the model is loaded
    async function checkModelStatus() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (data.model_loaded) {
                // Model is loaded, hide the overlay with a slight delay
                if (modelLoadingStatus) modelLoadingStatus.textContent = "Model loaded successfully! Starting chat...";
                setTimeout(() => {
                    if (modelLoadingOverlay) modelLoadingOverlay.style.display = 'none';
                }, 1000);
            } else {
                // Model is still loading, check again after a delay
                if (modelLoadingStatus) modelLoadingStatus.textContent = "Still loading model... This may take a minute.";
                setTimeout(checkModelStatus, 2000);
            }
        } catch (error) {
            console.error("Error checking model status:", error);
            // If error, still try again
            if (modelLoadingStatus) modelLoadingStatus.textContent = "Checking model status...";
            setTimeout(checkModelStatus, 3000);
        }
    }

    const webSearchToggleBtn = document.getElementById('webSearchToggleBtn');
    const webSearchStatusIndicator = document.getElementById('webSearchStatusIndicator');

    const conversationHistoryList = document.getElementById('conversationHistoryList');

    // New container for search button below input
    const inputAreaFooter = document.createElement('div');
    inputAreaFooter.className = 'input-area-footer';
    // Find the chat input container outer and append the new footer
    const chatInputContainerOuter = document.querySelector('.chat-input-container-outer');
    if (chatInputContainerOuter) {
        chatInputContainerOuter.appendChild(inputAreaFooter);
    }

    // Account Settings Modal elements
    const accountSettingsBtn = document.getElementById('accountSettingsBtn');
    const accountSettingsModal = document.getElementById('accountSettingsModal');
    const closeAccountSettingsModalBtn = document.getElementById('closeAccountSettingsModal');
    const modalUserNameSpan = document.getElementById('modalUserName');
    const modalUserDoBSpan = document.getElementById('modalUserDoB');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const logoutButtonAccountModal = document.getElementById('logoutButtonAccountModal');

    // Theme and Custom Instructions elements (New)
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const customInstructionsTextarea = document.getElementById('customInstructionsTextarea');
    const saveCustomInstructionsBtn = document.getElementById('saveCustomInstructionsBtn');

    // Modal handling
    const settingsModal = document.getElementById('settingsModal');
    const searchModal = document.getElementById('searchModal');
    const settingsBtn = document.getElementById('settingsBtn');
    const searchBtn = document.getElementById('searchBtn');
    const closeButtons = document.querySelectorAll('.close-button');

    // State variables
    let conversationHistory = [];
    let allConversations = [];
    let currentConversationId = null;
    let currentAccessToken = localStorage.getItem('ngen3_access_token');
    let currentUserName = localStorage.getItem('ngen3_user_name');
    let currentUserDob = localStorage.getItem('ngen3_dob_string');
    let isAdult = localStorage.getItem('ngen3_is_adult') === 'true';
    let isWebSearchActive = false;
    let currentTheme = 'dark'; // Default theme
    let customInstructions = ''; // Default custom instructions
    let isGenerating = false;
    let currentGenerationId = null;
    const abortControllers = {}; // Store AbortControllers by message ID

    // Initial checks
    if (!currentAccessToken || !currentUserName || !isAdult) {
        window.location.href = '/login';
        return;
    }
    if (userInitialsSidebarSpan && currentUserName) {
        userInitialsSidebarSpan.textContent = currentUserName.substring(0, 1).toUpperCase();
    }
    if (userNameSidebarSpan && currentUserName) {
        userNameSidebarSpan.textContent = currentUserName;
    }
    if (chatUserNameSpan) {
        chatUserNameSpan.textContent = currentUserName;
    }
    if (modalUserNameSpan) modalUserNameSpan.textContent = currentUserName;
    if (modalUserDoBSpan) modalUserDoBSpan.textContent = currentUserDob || 'Not set';

    // --- Theme Management (New/Enhanced) ---
    function applyTheme(themeName) {
        document.body.classList.remove('theme-light', 'theme-dark'); // Remove any existing theme class
        document.body.classList.add(`theme-${themeName}`);
        currentTheme = themeName;
        // Update the checked state of radio buttons
        themeRadios.forEach(radio => {
            if (radio.value === themeName) {
                radio.checked = true;
            }
        });
    }

    function saveThemePreference(themeName) {
        localStorage.setItem('ngen3_theme', themeName);
    }

    function loadThemePreference() {
        const savedTheme = localStorage.getItem('ngen3_theme') || 'dark'; // Default to dark if nothing saved
        applyTheme(savedTheme);
    }

    if (themeRadios) {
        themeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    applyTheme(radio.value);
                    saveThemePreference(radio.value);
                }
            });
        });
    }

    // --- Custom Instructions (New) ---
    function loadCustomInstructions() {
        customInstructions = localStorage.getItem('ngen3_custom_instructions') || '';
        if (customInstructionsTextarea) {
            customInstructionsTextarea.value = customInstructions;
        }
    }

    function saveCustomInstructions() {
        if (customInstructionsTextarea) {
            customInstructions = customInstructionsTextarea.value.trim();
            localStorage.setItem('ngen3_custom_instructions', customInstructions);
            alert('Custom instructions saved!'); // Optional: provide user feedback
        }
    }

    if (saveCustomInstructionsBtn) {
        saveCustomInstructionsBtn.addEventListener('click', saveCustomInstructions);
    }

    // --- Sidebar Functionality (New) ---
    function updateSidebarState(isCollapsed) {
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            if (openSidebarBtn) openSidebarBtn.style.display = 'flex';
            if (closeSidebarBtn) closeSidebarBtn.style.display = 'none';
            document.body.classList.add('sidebar-collapsed-app-state');
        } else {
            sidebar.classList.remove('collapsed');
            if (openSidebarBtn) openSidebarBtn.style.display = 'none';
            if (closeSidebarBtn) closeSidebarBtn.style.display = 'flex';
            document.body.classList.remove('sidebar-collapsed-app-state');
        }
        localStorage.setItem('ngen3_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }

    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => updateSidebarState(false));
    }
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => updateSidebarState(true));
    }

    // Initial sidebar state restoration
    const savedSidebarState = localStorage.getItem('ngen3_sidebar_collapsed');
    let initialSidebarCollapsed = false; // Default to open
    if (savedSidebarState !== null) {
        initialSidebarCollapsed = savedSidebarState === 'true';
    }
    updateSidebarState(initialSidebarCollapsed); // Apply initial state
    // Ensure correct button visibility after initial state application through updateSidebarState
    // The updateSidebarState function already handles button display.

    // --- Web Search Toggle Functionality ---
    if (webSearchToggleBtn) {
        // Move the existing button to the new footer container
        if (inputAreaFooter) {
            inputAreaFooter.appendChild(webSearchToggleBtn);
        }

        webSearchToggleBtn.addEventListener('click', () => {
            isWebSearchActive = !isWebSearchActive;
            webSearchToggleBtn.classList.toggle('active', isWebSearchActive);
            if (isWebSearchActive) {
                webSearchStatusIndicator.classList.remove('hidden');
                // Keep placeholder general, status indicator shows search is on
                // userInput.placeholder = 'Ask anything... (Web search active)';
            } else {
                webSearchStatusIndicator.classList.add('hidden');
                userInput.placeholder = 'Ask anything...';
            }
            console.log('Web search active:', isWebSearchActive);
        });
    }

    // --- Account Settings Modal Functionality ---
    if (accountSettingsBtn) {
        accountSettingsBtn.addEventListener('click', () => {
            if (accountSettingsModal) accountSettingsModal.classList.remove('hidden');
        });
    }
    if (closeAccountSettingsModalBtn) {
        closeAccountSettingsModalBtn.addEventListener('click', () => {
            if (accountSettingsModal) accountSettingsModal.classList.add('hidden');
        });
    }
    if (accountSettingsModal) {
        accountSettingsModal.addEventListener('click', (event) => {
            if (event.target === accountSettingsModal) {
                accountSettingsModal.classList.add('hidden');
            }
        });
    }
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                allConversations = [];
                localStorage.removeItem('ngen3_all_conversations');
                renderConversationHistory();
                startNewConversation();
                alert('Chat history cleared.');
                if (accountSettingsModal) accountSettingsModal.classList.add('hidden');
            }
        });
    }

    if (logoutButtonAccountModal) {
        logoutButtonAccountModal.addEventListener('click', () => {
            localStorage.removeItem('ngen3_user_name');
            localStorage.removeItem('ngen3_access_token');
            localStorage.removeItem('ngen3_dob_string');
            localStorage.removeItem('ngen3_is_adult');
            localStorage.removeItem('ngen3_all_conversations');
            localStorage.removeItem('ngen3_current_conversation_id');
            window.location.href = '/login';
        });
    }

    // --- Core Chat Logic (Adapted) ---
    function formatMessageContent(text) {
        if (!text) return '';

        let resultHtml = '';
        const parts = text.split(/(```(?:\w*)\n[\s\S]*?```)/g); // Split by full code block, keeping delimiters

        parts.forEach(part => {
            if (part.startsWith('```')) {
                const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                if (match) {
                    const language = match[1] || 'plaintext';
                    const code = match[2].trim();
                    
                    // Ensure hljs is available before trying to use it
                    const highlightedCode = (typeof hljs !== 'undefined' && hljs.highlight)
                        ? hljs.highlight(code, { language: language, ignoreIllegals: true }).value
                        : escapeHtml(code); // Fallback to just escaped code

                    resultHtml += `<div class="code-block-container">
                                     <div class="code-block-header">
                                         <span class="language">${escapeHtml(language)}</span>
                                         <button class="copy-code-btn" title="Copy code">
                                             <span class="material-symbols-outlined">content_copy</span>
                                             <span class="copy-status-text" style="display:none;">Copied!</span>
                                         </button>
                                     </div>
                                     <pre><code class="language-${escapeHtml(language)}">${highlightedCode}</code></pre>
                                 </div>`;
                } else {
                    // If it starts with ``` but doesn't match the full structure, treat as escaped literal text
                    resultHtml += escapeHtml(part);
                }
            } else {
                // This part is not a code block, so process for inline code and newlines
                let nonCodePart = escapeHtml(part);
                nonCodePart = nonCodePart.replace(/`([^`]+)`/g, (match, inlineCode) => `<code>${escapeHtml(inlineCode)}</code>`);
                nonCodePart = nonCodePart.replace(/\n/g, '<br>'); 
                resultHtml += nonCodePart;
            }
        });

        return resultHtml;
    }

    // Helper function to escape HTML characters
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function addMessageToChatBox(role, content, isLoading = false, messageId = null) {
        const existingMessageDiv = messageId ? document.getElementById(messageId) : null;
        let messageDiv = existingMessageDiv;
        let contentDiv;
        let actionsDiv;
        let stopButton;

        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.classList.add('message', role.toLowerCase());
            messageDiv.id = messageId || `msg-${role}-${Date.now()}`;

            const roleDiv = document.createElement('div');
            roleDiv.classList.add('message-role');
            roleDiv.textContent = role === 'assistant' ? 'NGen3' : 'You';
            messageDiv.appendChild(roleDiv);

            contentDiv = document.createElement('div');
            contentDiv.classList.add('message-content');
            messageDiv.appendChild(contentDiv);

            if (role.toLowerCase() === 'assistant') {
                actionsDiv = document.createElement('div');
                actionsDiv.classList.add('message-actions');
                
                // Stream control buttons container
                const streamControlContainer = document.createElement('div');
                streamControlContainer.className = 'stream-controls';

                stopButton = document.createElement('button');
                stopButton.className = 'stop-button';
                stopButton.innerHTML = '<span class="material-symbols-outlined">stop_circle</span> Stop';
                stopButton.style.display = 'none';

                const continueButton = document.createElement('button');
                continueButton.className = 'continue-button';
                continueButton.innerHTML = '<span class="material-symbols-outlined">play_circle</span> Continue';
                continueButton.style.display = 'none';

                streamControlContainer.appendChild(stopButton);
                streamControlContainer.appendChild(continueButton);
                
                // Add event listeners for stream control buttons
                stopButton.addEventListener('click', () => {
                    if (messageDiv.id === currentGenerationId) {
                        const controller = abortControllers[messageDiv.id];
                        if (controller) {
                            controller.abort();
                            delete abortControllers[messageDiv.id];
                        }
                        isGenerating = false;
                        stopButton.style.display = 'none';
                        continueButton.style.display = 'flex';
                    }
                });
                
                continueButton.addEventListener('click', async () => {
                    if (!isGenerating) {
                        continueButton.style.display = 'none';
                        stopButton.style.display = 'flex';
                        isGenerating = true;
                        currentGenerationId = messageDiv.id;
                        
                        // Get the current content
                        const currentContent = contentDiv.textContent;
                        
                        // Create new abort controller
                        const controller = new AbortController();
                        abortControllers[messageDiv.id] = controller;
                        
                        // Call API with force_generation flag
                        await triggerAssistantResponse(messageDiv.id, true, currentContent);
                    }
                });
                
                // Add other action buttons
                actionsDiv.innerHTML += `
                    <button class="action-btn copy-msg-btn" title="Copy Message"><span class="material-symbols-outlined">content_copy</span></button>
                    <button class="action-btn thumb-up-btn" title="Good Response"><span class="material-symbols-outlined">thumb_up</span></button>
                    <button class="action-btn thumb-down-btn" title="Bad Response"><span class="material-symbols-outlined">thumb_down</span></button>
                    <button class="action-btn read-aloud-btn" title="Read Aloud"><span class="material-symbols-outlined">volume_up</span></button>
                    <button class="action-btn edit-response-btn" title="Edit Response"><span class="material-symbols-outlined">edit</span></button>
                    <button class="action-btn regenerate-btn" title="Regenerate"><span class="material-symbols-outlined">refresh</span></button>
                `;
                
                actionsDiv.appendChild(streamControlContainer);
                messageDiv.appendChild(actionsDiv);
            }

            chatBox.appendChild(messageDiv);
            requestAnimationFrame(() => { messageDiv.classList.add('visible'); });
        } else {
            contentDiv = messageDiv.querySelector('.message-content');
            actionsDiv = messageDiv.querySelector('.message-actions');
            stopButton = messageDiv.querySelector('.stop-button');
        }

        // Handle loading state and content
        if (isLoading) {
            contentDiv.innerHTML = '<div class="spinner"></div>';
                messageDiv.classList.add('streaming');
                if (stopButton) stopButton.style.display = 'flex';
        } else {
                messageDiv.classList.remove('streaming');
                if (stopButton) stopButton.style.display = 'none';
            
            // Format content with proper line breaks and code blocks
            if (content) {
            contentDiv.innerHTML = formatMessageContent(content);
                // Highlight code blocks if any
                const codeBlocks = contentDiv.querySelectorAll('pre code');
                codeBlocks.forEach(block => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }
        }

        chatBox.scrollTop = chatBox.scrollHeight;
        return messageDiv;
    }

    // --- Event Delegation for Message Actions (New/Modified) ---
    chatBox.addEventListener('click', async (event) => {
        const codeCopyButton = event.target.closest('.copy-code-btn');
        const msgCopyButton = event.target.closest('.copy-msg-btn');
        const thumbUpButton = event.target.closest('.thumb-up-btn');
        const thumbDownButton = event.target.closest('.thumb-down-btn');
        const readAloudButton = event.target.closest('.read-aloud-btn');
        const editButton = event.target.closest('.edit-response-btn');
        const regenerateButton = event.target.closest('.regenerate-btn');
        const stopButton = event.target.closest('.stop-button'); // Capture stop button click
        const continueButton = event.target.closest('.continue-button'); // Capture continue button click

        if (stopButton) {
            console.log('Stop button clicked');
            // Find the corresponding fetch controller and abort
            const messageDiv = stopButton.closest('.message.assistant');
            if (messageDiv && messageDiv.dataset.controllerId) {
                const controllerId = messageDiv.dataset.controllerId;
                if (abortControllers[controllerId]) {
                    abortControllers[controllerId].abort();
                    console.log(`Aborted fetch with controller ID: ${controllerId}`);
                    // Update UI state after stopping
                    addMessageToChatBox('assistant', 'Generation stopped.', false, messageDiv.id);
                } else {
                    console.warn(`No active controller found for ID: ${controllerId}`);
                }
            }
            return; // Stop processing further if stop button was clicked
        } else if (continueButton) {
            console.log('Continue button clicked');
            const messageDiv = continueButton.closest('.message.assistant');
            if (messageDiv) {
                // Hide continue button and show loading state
                continueButton.style.display = 'none';
                addMessageToChatBox('assistant', messageDiv.querySelector('.message-content').innerHTML, true, messageDiv.id); // Show loading on existing content

                // Re-trigger generation using the conversation history up to this point
                // The triggerAssistantResponse function uses the current conversationHistory array
                // We need to ensure the history is correct *before* this assistant message
                // Find the index of this message in history
                const messageIndex = conversationHistory.findIndex(msg => msg.content === messageDiv.querySelector('.message-content').textContent.trim());
                if (messageIndex > 0) {
                    // Temporarily truncate history to the user message before this one
                    const historyUntilUserMessage = conversationHistory.slice(0, messageIndex);
                    // Call triggerAssistantResponse with this truncated history
                    // This requires modifying triggerAssistantResponse or how it uses history
                    // For simplicity now, let's rely on conversationHistory being correct up to the last full turn
                    // A more robust approach would involve passing a subset or modifying the global history temporarily
                    
                    // Simple approach: Assume conversationHistory is already correct up to the message before this.
                    // This works if 'Stop' simply aborted the last stream without modifying history.
                    // If 'Stop' added a 'Generation stopped' message to history, we'd need to remove it.
                    
                    // Let's ensure conversationHistory is in a state ready for regeneration from the last user message.
                    // The 'Stop' handler adds 'Generation stopped.' to history. We need to remove it.
                    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].content === 'Generation stopped.') {
                        conversationHistory.pop(); // Remove the 'stopped' message
                    }
                    
                    // Now, conversationHistory should end with the last user message that prompted the generation.
                    // Call triggerAssistantResponse with the existing conversationHistory
                    triggerAssistantResponse(messageDiv.id); // Reuse the same message ID
                } else {
                    console.error('Could not find message in history to continue from.');
                    addMessageToChatBox('assistant', messageDiv.querySelector('.message-content').innerHTML + '<br>Error: Could not continue generation.', false, messageDiv.id);
                }
            }
            return; // Stop processing further if continue button was clicked
        }

        if (codeCopyButton) {
            const preElement = codeCopyButton.closest('.code-block-container').querySelector('pre code');
            const copyStatusText = codeCopyButton.querySelector('.copy-status-text');

            if (preElement) {
                try {
                    await navigator.clipboard.writeText(preElement.textContent);
                    codeCopyButton.querySelector('.material-symbols-outlined').textContent = 'check';
                    if (copyStatusText) {
                        copyStatusText.textContent = 'Copied!';
                        copyStatusText.style.display = 'inline'; // Show it
                        setTimeout(() => {
                           copyStatusText.style.display = 'none'; // Hide after a bit
                        }, 1800); // slightly less than the icon change timeout
                    }
                    codeCopyButton.classList.add('copied');
                    setTimeout(() => {
                        codeCopyButton.querySelector('.material-symbols-outlined').textContent = 'content_copy';
                        // copyStatusText element is handled by its own timeout if it exists
                        codeCopyButton.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy code:', err);
                    if (copyStatusText) {
                        copyStatusText.textContent = 'Error';
                        copyStatusText.style.display = 'inline';
                         setTimeout(() => {
                           copyStatusText.style.display = 'none';
                        }, 2000);
                    }
                }
            }
        } else if (msgCopyButton) {
            const messageContentElement = msgCopyButton.closest('.message').querySelector('.message-content');
            if (messageContentElement) {
                let textToCopy = '';
                messageContentElement.querySelectorAll('p, pre code, br').forEach(el => {
                    if (el.tagName === 'BR') textToCopy += '\n';
                    else textToCopy += el.textContent + '\n';
                });
                textToCopy = textToCopy.trim();
                 if (!textToCopy && messageContentElement.textContent) {
                    textToCopy = messageContentElement.textContent.trim();
                }

                try {
                    await navigator.clipboard.writeText(textToCopy);
                    msgCopyButton.innerHTML = '<span class="material-symbols-outlined">check</span>';
                    setTimeout(() => { msgCopyButton.innerHTML = '<span class="material-symbols-outlined">content_copy</span>'; }, 2000);
                } catch (err) {
                    console.error('Failed to copy message:', err);
                }
            }
        } else if (thumbUpButton) {
            console.log('Thumb up clicked');
            thumbUpButton.classList.toggle('active');
            const correspondingThumbDown = thumbUpButton.closest('.message-actions').querySelector('.thumb-down-btn');
            if(correspondingThumbDown) correspondingThumbDown.classList.remove('active');
        } else if (thumbDownButton) {
            console.log('Thumb down clicked');
            thumbDownButton.classList.toggle('active');
            const correspondingThumbUp = thumbDownButton.closest('.message-actions').querySelector('.thumb-up-btn');
            if(correspondingThumbUp) correspondingThumbUp.classList.remove('active');
        } else if (readAloudButton) {
            console.log('Read Aloud clicked');
            const messageDiv = readAloudButton.closest('.message');
            const contentDiv = messageDiv.querySelector('.message-content');
            if (contentDiv && window.speechSynthesis) {
                // Extract text, trying to be smart about code blocks
                let textToSpeak = '';
                contentDiv.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        textToSpeak += node.textContent;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList.contains('code-block-container')) {
                            textToSpeak += ' Code block: ' + (node.querySelector('pre code')?.textContent || '');
                        } else if (node.tagName === 'BR') {
                            textToSpeak += ' \n '; // Add a pause for line breaks
                        } else {
                            textToSpeak += node.textContent;
                        }
                    }
                });
                textToSpeak = textToSpeak.replace(/\s+/g, ' ').trim(); // Clean up whitespace

                if (textToSpeak) {
                    const utterance = new SpeechSynthesisUtterance(textToSpeak);
                    window.speechSynthesis.cancel(); // Cancel any previous speech
                    window.speechSynthesis.speak(utterance);
                } else {
                    alert('Nothing to read aloud.');
                }
            } else {
                alert('Read Aloud is not supported by your browser or there is no content.');
            }
        } else if (editButton) {
            console.log('Edit Response clicked');
            const assistantMessageDiv = editButton.closest('.message.assistant');
            if (!assistantMessageDiv) return;

            // Find this assistant message in history to locate the preceding user message
            const assistantMsgId = assistantMessageDiv.id;
            let assistantMsgIndex = -1;
            let userMsgToEditIndex = -1;
            let userMsgContentToEdit = '';

            // Iterate backwards to find the assistant message and then the user message before it
            for (let i = conversationHistory.length - 1; i >= 0; i--) {
                // This relies on a convention that UI message IDs might be stored in history or a similar ID system
                // For simplicity, let's assume we find the assistant message by content or a more robust ID if available.
                // The current regeneration logic just pops, so this edit needs to be more precise.
                // Let's find the assistant message by its content for now, assuming IDs aren't perfectly synced for this operation yet.
                // A better way would be to ensure messages in history have the same IDs as in the DOM.
                
                // Simplified: Find the assistant message in history by its content, then get the user message before it.
                // This is not ideal if messages are identical. A unique ID on history items would be best.
                // For now, let's work with indices assuming the DOM order reflects history order for the last few messages.

                if (conversationHistory[i].role === 'assistant') {
                    // This is a candidate. If multiple edit buttons exist, we need a way to map assistantMessageDiv to history item.
                    // For now, assume we are editing the interaction that LED to THIS assistant message.
                    // The user message is therefore at i-1.
                    if (i > 0 && conversationHistory[i-1].role === 'user') {
                        // This is a rough match. If assistantMessageDiv.id matched an ID in history, it would be better.
                        // Let's assume we're editing the last user/assistant pair if the button is on the last assistant msg.
                        // Or, if we had a data-message-index on the div.

                        // Find the actual DOM element for the user message preceding this assistant message
                        let userMessageDiv = null;
                        let currentDiv = assistantMessageDiv.previousElementSibling;
                        while(currentDiv) {
                            if (currentDiv.classList.contains('message') && currentDiv.classList.contains('user')) {
                                userMessageDiv = currentDiv;
                                break;
                            }
                            currentDiv = currentDiv.previousElementSibling;
                        }

                        if (userMessageDiv) {
                            const userMsgContentDiv = userMessageDiv.querySelector('.message-content');
                            // To get raw text, might need to reverse formatMessageContent or store raw text somewhere
                            // For now, using textContent is a simplification.
                            userMsgContentToEdit = conversationHistory[conversationHistory.length - 2].content; // Assuming last user message
                            assistantMsgIndex = conversationHistory.length -1;
                            userMsgToEditIndex = conversationHistory.length - 2;
                            
                            // If we are editing the very last interaction:
                            if (assistantMsgIndex === conversationHistory.length -1 && userMsgToEditIndex === conversationHistory.length -2) {
                                userInput.value = userMsgContentToEdit;
                                userInput.focus();
                                adjustTextareaHeight(userInput);

                                // Remove from UI
                                assistantMessageDiv.remove();
                                userMessageDiv.remove(); 

                                // Remove from history
                                conversationHistory.pop(); // Remove assistant
                                conversationHistory.pop(); // Remove user

                                saveCurrentConversation(); // Update storage
                                renderConversationHistory(); // Update sidebar if needed
                                return; // Done
                            } else {
                                alert('Editing older messages is not yet supported in this simple version.');
                                return;
                            }
                        }
                    }
                }
            }
            alert('Could not find the message pair to edit. This feature currently only supports editing the very last user message that led to an assistant response.');

        } else if (regenerateButton) {
            console.log('Regenerate clicked');
            const assistantMessageDiv = regenerateButton.closest('.message.assistant');
            if (!assistantMessageDiv) return;

            const assistantMessageId = assistantMessageDiv.id;

            // Find the index of this assistant message in the conversation history
            const lastMessageIndex = conversationHistory.length - 1;
            if (lastMessageIndex < 0 || conversationHistory[lastMessageIndex].role !== 'assistant') {
                alert("Cannot regenerate: Last message is not from the assistant or history is empty.");
                return;
            }
            // Check if the message to regenerate is indeed the last one in history based on UI coupling
            // This simple version assumes regeneration is always for the VERY LAST assistant message.
            // More complex logic would be needed to regenerate an arbitrary earlier message.

            // Remove the last assistant message from history
            conversationHistory.pop();

            // The conversationHistory now ends with the user message that prompted the response.
            // We can now re-send this history to get a new response for that last user prompt.
            
            // Clear the old assistant message content from UI, show loading state
            // The addMessageToChatBox function will handle this if called with existing ID and isLoading=true
            // First, remove the old content and actions, prepare for new loading state
            const contentDiv = assistantMessageDiv.querySelector('.message-content');
            const actionsDiv = assistantMessageDiv.querySelector('.message-actions');
            if(contentDiv) contentDiv.innerHTML = ''; // Clear old content
            if(actionsDiv) actionsDiv.remove(); // Remove old actions, will be re-added
            
            // Reuse addMessageToChatBox to put it in loading state
            addMessageToChatBox('assistant', '', true, assistantMessageId);
            
            // Call the internal logic of sendMessage, but without getting user input from the textarea
            // This assumes conversationHistory is now correctly set up.
            triggerAssistantResponse(assistantMessageId); 
        }
    });

    async function triggerAssistantResponse(targetAssistantMessageId, forceContinue = false, previousContent = '') {
        if (isGenerating && !forceContinue) return;
        
        isGenerating = true;
        currentGenerationId = targetAssistantMessageId;
        
            const controller = new AbortController();
            const signal = controller.signal;
            abortControllers[targetAssistantMessageId] = controller;
        
        try {
            const messagesToSend = [...conversationHistory];
            if (forceContinue && previousContent) {
                const lastAssistantIndex = messagesToSend.findIndex(msg => 
                    msg.role === 'assistant' && msg.content === previousContent
                );
                if (lastAssistantIndex !== -1) {
                    messagesToSend.splice(lastAssistantIndex, 1);
                }
            }

            const response = await fetch('/api/custom_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentAccessToken}`
                },
                body: JSON.stringify({
                    messages: messagesToSend,
                    use_web_search: isWebSearchActive,
                    force_generation: forceContinue,
                    temperature: 0.7,
                    max_new_tokens: 500
                }),
                signal: signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';
            let assistantMessageDiv = document.getElementById(targetAssistantMessageId);
            let contentDiv = assistantMessageDiv.querySelector('.message-content');
            contentDiv.innerHTML = ''; // Clear any existing content

            let streamingCursor = document.createElement('span');
            streamingCursor.classList.add('streaming-cursor');
            streamingCursor.textContent = '▋';
            contentDiv.appendChild(streamingCursor);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.token) {
                                accumulatedResponse += data.token;
                                
                                // Remove the cursor before updating content
                                if (contentDiv.contains(streamingCursor)) {
                                    streamingCursor.remove();
                                }
                                
                                // Format and update the content
                                contentDiv.innerHTML = formatMessageContent(accumulatedResponse);
                                
                                // Add the cursor back
                                contentDiv.appendChild(streamingCursor);
                                
                                // Scroll to bottom smoothly
                                    chatBox.scrollTop = chatBox.scrollHeight;
                            }
                        } catch (e) {
                            console.warn('Error parsing streaming data:', e);
                        }
                    }
                }
            }

            // Final cleanup
            if (contentDiv.contains(streamingCursor)) {
                streamingCursor.remove();
            }
            contentDiv.innerHTML = formatMessageContent(accumulatedResponse);
            
            // Update conversation history
            conversationHistory.push({
                role: 'assistant',
                content: accumulatedResponse
            });
            
            saveCurrentConversation();

        } catch (error) {
            console.error('Error:', error);
            const errorMessage = 'An error occurred while generating the response.';
            const assistantMessageDiv = document.getElementById(targetAssistantMessageId);
            if (assistantMessageDiv) {
                const contentDiv = assistantMessageDiv.querySelector('.message-content');
                if (contentDiv) {
                    contentDiv.innerHTML = errorMessage;
                }
            }
        } finally {
            isGenerating = false;
            currentGenerationId = null;
            delete abortControllers[targetAssistantMessageId];
        }
    }

    // --- New function to generate and set chat title ---
    async function generateAndSetChatTitle(convId) {
        const conversation = allConversations.find(c => c.id === convId);
        if (!conversation || conversation.title !== "New Chat") {
            // Only generate if conversation exists and still has the default title
            return;
        }

        // Get messages for summarization (avoid sending too many)
        const messagesForSummary = conversation.messages.slice(-6); // Use last few messages

        try {
            const response = await fetch('/api/summarize_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentAccessToken}`
                },
                body: JSON.stringify({ messages: messagesForSummary })
            });

            if (!response.ok) {
                console.error('Error fetching summary:', response.status, response.statusText);
                return;
            }

            const data = await response.json();
            if (data && data.title) {
                // Update the conversation title
                conversation.title = data.title;
                localStorage.setItem('ngen3_all_conversations', JSON.stringify(allConversations));
                renderConversationHistory(); // Re-render history to show new title
                console.log(`Updated title for ${convId} to: ${data.title}`);
            }
        } catch (error) {
            console.error('Error generating chat title:', error);
        }
    }

    // --- Conversation History Logic ---
    function loadConversationsFromStorage() {
        const stored = localStorage.getItem('ngen3_all_conversations');
        if (stored) {
            allConversations = JSON.parse(stored);
        } else {
            allConversations = [];
        }
        allConversations.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    function saveCurrentConversation(isUpdate = false) {
        if (!currentConversationId && conversationHistory.length > 0) {
            currentConversationId = `conv_${Date.now()}`;
        }

        if (currentConversationId && conversationHistory.length > 0) {
            const existingConvIndex = allConversations.findIndex(c => c.id === currentConversationId);
            
            // Auto-generate title based on first user message if it's a new conversation and title is default
            let conversationTitle = conversationHistory[0]?.content.substring(0, 50) || "New Chat";
            if (existingConvIndex > -1 && allConversations[existingConvIndex].title !== "New Chat") {
                // If updating an existing conversation that already had a custom title, keep the existing title
                conversationTitle = allConversations[existingConvIndex].title;
            } else if (conversationHistory.length > 0 && conversationHistory[0].role === 'user') {
                 // If it's a new chat or an old 'New Chat', generate from the first user message
                conversationTitle = conversationHistory[0].content.substring(0, 50).replace(/\n/g, ' '); // Use first 50 chars, remove newlines
                if (conversationHistory[0].content.length > 50) conversationTitle += '...';
            } else {
                 // Default title if no user message yet
                 conversationTitle = "New Chat";
            }

            const conversationData = {
                id: currentConversationId,
                title: conversationTitle,
                messages: [...conversationHistory],
                timestamp: Date.now()
            };

            if (existingConvIndex > -1) {
                allConversations[existingConvIndex] = conversationData;
            } else {
                allConversations.unshift(conversationData);
            }
            localStorage.setItem('ngen3_all_conversations', JSON.stringify(allConversations));
            localStorage.setItem('ngen3_current_conversation_id', currentConversationId);
            renderConversationHistory();
        }
    }

    function renderConversationHistory() {
        conversationHistoryList.innerHTML = '';
        if (allConversations.length === 0) {
            conversationHistoryList.innerHTML = '<p class="no-history">No past conversations.</p>';
            return;
        }

        const groupedConversations = groupConversationsByDate(allConversations);

        for (const groupTitle in groupedConversations) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'history-group';
            const titleEl = document.createElement('h4');
            titleEl.className = 'history-group-title';
            titleEl.textContent = groupTitle;
            groupDiv.appendChild(titleEl);

            groupedConversations[groupTitle].forEach(conv => {
                const itemWrapper = document.createElement('div'); // Wrapper for button and actions
                itemWrapper.className = 'history-item-wrapper';

                const itemButton = document.createElement('button');
                itemButton.className = 'history-item';
                itemButton.textContent = conv.title;
                itemButton.dataset.conversationId = conv.id;
                if (conv.id === currentConversationId) {
                    itemButton.classList.add('active');
                }
                itemButton.addEventListener('click', () => loadConversation(conv.id));

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'history-item-actions';
                actionsDiv.innerHTML = `
                    <button class="history-action-btn rename-conv-btn" data-conv-id="${conv.id}" title="Rename Chat"><span class="material-symbols-outlined">edit</span></button>
                    <button class="history-action-btn delete-conv-btn" data-conv-id="${conv.id}" title="Delete Chat"><span class="material-symbols-outlined">delete</span></button>
                `;

                itemWrapper.appendChild(itemButton);
                itemWrapper.appendChild(actionsDiv);
                groupDiv.appendChild(itemWrapper);
            });
            conversationHistoryList.appendChild(groupDiv);
        }
    }
    
    function groupConversationsByDate(conversations) {
        const groups = {
            Today: [],
            Yesterday: [],
            "Previous 7 Days": [],
            "Previous 30 Days": [],
            Older: []
        };
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

        conversations.forEach(conv => {
            const convDate = new Date(conv.timestamp);
            if (convDate >= todayStart) groups.Today.push(conv);
            else if (convDate >= yesterdayStart) groups.Yesterday.push(conv);
            else if (convDate >= sevenDaysAgo) groups["Previous 7 Days"].push(conv);
            else if (convDate >= thirtyDaysAgo) groups["Previous 30 Days"].push(conv);
            else groups.Older.push(conv);
        });
        
        for (const groupTitle in groups) {
            if (groups[groupTitle].length === 0) {
                delete groups[groupTitle];
            }
        }
        return groups;
    }

    function loadConversation(convId) {
        const conversation = allConversations.find(c => c.id === convId);
        if (conversation) {
            currentConversationId = convId;
            conversationHistory = [...conversation.messages];
            chatBox.innerHTML = '';
            conversation.messages.forEach(msg => addMessageToChatBox(msg.role, msg.content));
            userInput.focus();
            renderConversationHistory();
            localStorage.setItem('ngen3_current_conversation_id', currentConversationId); // Save loaded conversation ID
        } else {
             // If conversation not found, start a new one
             startNewConversation(false);
             localStorage.removeItem('ngen3_current_conversation_id');
        }
    }

    function startNewConversation(forked = false) {
        if (!forked) {
            currentConversationId = `conv_${Date.now()}`;
        }
        conversationHistory = [];
        chatBox.innerHTML = '';
        chatBox.scrollTop = 0;
        // Show static welcome message
        const welcomeTag = document.createElement('div');
        welcomeTag.className = 'welcome-message';
        welcomeTag.innerHTML = `<h2>Welcome to NGen3</h2><p>Type a message to start chatting.</p>`;
        chatBox.appendChild(welcomeTag);
        userInput.value = '';
        userInput.focus();
        adjustTextareaHeight(userInput);
        localStorage.removeItem('ngen3_current_conversation_id');
        renderConversationHistory();
    }

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        // Remove any welcome message if present
        const welcomeMessage = chatBox.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        addMessageToChatBox('user', userMessage, false, `msg-user-${Date.now()}`);
        conversationHistory.push({ role: 'user', content: userMessage });
        userInput.value = '';
        userInput.focus();
        adjustTextareaHeight(userInput);

        const assistantMessageId = `msg-assistant-${Date.now()}`;
        addMessageToChatBox('assistant', '', true, assistantMessageId);

        saveCurrentConversation(true);
        triggerAssistantResponse(assistantMessageId);
        
        const assistantMessageDiv = document.getElementById(assistantMessageId);
        if(assistantMessageDiv) {
            assistantMessageDiv.classList.add('streaming');
            const stopButton = assistantMessageDiv.querySelector('.stop-button');
            if(stopButton) stopButton.style.display = 'flex';
        }
    }

    if (sendButton) {
        sendButton.addEventListener('click', () => {
            if (userInput.value.trim()) {
                sendButton.classList.add('sending');
                sendMessage();
                setTimeout(() => sendButton.classList.remove('sending'), 300);
            }
        });
        
        // Add hover effect
        sendButton.addEventListener('mouseenter', () => {
            if (userInput.value.trim()) {
                sendButton.classList.add('hover');
            }
        });
        
        sendButton.addEventListener('mouseleave', () => {
            sendButton.classList.remove('hover');
        });
    }

    if (userInput) {
        // Initial setup
        userInput.setAttribute('rows', '1');
        userInput.style.minHeight = '40px';
        userInput.style.maxHeight = '200px';
        userInput.style.resize = 'none';
        userInput.style.transition = 'height 0.2s ease-out, box-shadow 0.2s ease-out';
        
        // Add placeholder animation class
        userInput.classList.add('animated-placeholder');
        
        // Enhanced input event handling
        userInput.addEventListener('input', () => {
            adjustTextareaHeight(userInput);
            
            // Add typing indicator
            if (userInput.value.trim()) {
                document.body.classList.add('is-typing');
            } else {
                document.body.classList.remove('is-typing');
            }
        });
        
        // Focus/blur effects
        userInput.addEventListener('focus', () => {
            userInput.parentElement.classList.add('focused');
            document.body.classList.add('input-focused');
        });
        
        userInput.addEventListener('blur', () => {
            userInput.parentElement.classList.remove('focused');
            document.body.classList.remove('input-focused');
        });
        
        // Enhanced enter key handling
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (userInput.value.trim()) {
                sendMessage();
                    // Add a subtle animation to the send button
                    if (sendButton) {
                        sendButton.classList.add('sending');
                        setTimeout(() => sendButton.classList.remove('sending'), 300);
                    }
                }
            }
        });
    }

    if (newChatSidebarBtn) {
        newChatSidebarBtn.addEventListener('click', () => startNewConversation(false));
    }
    if (mainNewChatButton) {
        mainNewChatButton.addEventListener('click', () => startNewConversation(false));
    }

    function adjustTextareaHeight(textarea) {
        // Reset height to auto first to get correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate new height (min 40px, max 200px)
        const minHeight = 40;
        const maxHeight = 200;
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        
        // Apply new height
        textarea.style.height = `${newHeight}px`;
        
        // Handle overflow
        if (newHeight >= maxHeight) {
            textarea.style.overflowY = 'auto';
            // Add a subtle shadow to indicate more content
            textarea.style.boxShadow = '0 -4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            textarea.style.overflowY = 'hidden';
            textarea.style.boxShadow = 'none';
        }
        
        // Update placeholder visibility based on content
        if (textarea.value.trim()) {
            textarea.classList.add('has-content');
        } else {
            textarea.classList.remove('has-content');
        }
    }

    // Initial load functions
    loadThemePreference();
    loadCustomInstructions();
    loadConversationsFromStorage();
    renderConversationHistory();
    const lastConvId = localStorage.getItem('ngen3_current_conversation_id');
    if (lastConvId && allConversations.some(conv => conv.id === lastConvId)) {
        loadConversation(lastConvId);
    } else {
        startNewConversation(false);
    }
    adjustTextareaHeight(userInput);

    if (sidebar && openSidebarBtn && closeSidebarBtn) {
        // This block might be redundant now as initial state is set from localStorage
        // updateSidebarState(sidebar.classList.contains('collapsed')); 
        // However, ensure button visibility is correct based on the class applied by updateSidebarState
        if (sidebar.classList.contains('collapsed')) {
            if (openSidebarBtn) openSidebarBtn.style.display = 'flex';
            if (closeSidebarBtn) closeSidebarBtn.style.display = 'none';
        } else {
            if (openSidebarBtn) openSidebarBtn.style.display = 'none';
            if (closeSidebarBtn) closeSidebarBtn.style.display = 'flex';
        }
    }

    // Show settings modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    // Add a custom modal for search warning if not present
    if (!document.getElementById('searchDevModal')) {
        const modal = document.createElement('div');
        modal.id = 'searchDevModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.45)';
        modal.style.display = 'none';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div style="background:rgba(30,34,54,0.97);border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.35);padding:32px 36px;text-align:center;max-width:350px;width:90%;border:1.5px solid rgba(255,255,255,0.08);color:#e0e0e0;">
                <h2 style='color:#4A90E2;margin-bottom:12px;font-size:1.3em;'>Search Feature</h2>
                <p style='font-size:1.08em;margin-bottom:22px;'>Search is an <b>under development</b> feature and may not work as expected.</p>
                <button id='closeSearchDevModal' style='background:#4A90E2;color:#fff;border:none;border-radius:18px;padding:10px 28px;font-size:1em;cursor:pointer;'>OK</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closeSearchDevModal').onclick = function() {
            modal.style.display = 'none';
        };
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };
    }
    const searchDevModal = document.getElementById('searchDevModal');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (searchDevModal) searchDevModal.style.display = 'flex';
    });
    }

    // Close modals
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            settingsModal.style.display = 'none';
            searchModal.style.display = 'none';
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
        }
    });

    // New chat functionality
    document.getElementById('newChatBtn').addEventListener('click', () => {
        // Clear chat messages
        chatBox.innerHTML = `
            <div class="welcome-message">
                <h2>I'm NGen3</h2>
                <p>How Can I Help You Today?</p>
            </div>
        `;
        
        // Clear input
        userInput.value = '';
        
        // Reset chat history
        conversationHistory = [];
        
        // Update UI
        updateChatUI();
    });

    // Helper to update welcome state (fix: hide greeting if any .message exists)
    function updateWelcomeState() {
        const chatMessages = document.getElementById('chatMessages');
        const welcome = document.querySelector('.welcome-message');
        const inputContainer = document.querySelector('.chat-input-container');
        const hasMessages = chatMessages && chatMessages.querySelectorAll('.message').length > 0;
        if (welcome && inputContainer) {
            if (hasMessages) {
                welcome.classList.add('hide');
                inputContainer.classList.remove('centered');
                inputContainer.classList.add('bottom');
            } else {
                welcome.classList.remove('hide');
                inputContainer.classList.remove('bottom');
                inputContainer.classList.add('centered');
            }
        }
    }
    // Call on load
    updateWelcomeState();
    // Call after sending/receiving a message
    const origAddMessageToChatBox = window.addMessageToChatBox || addMessageToChatBox;
    window.addMessageToChatBox = function(...args) {
        const result = origAddMessageToChatBox.apply(this, args);
        updateWelcomeState();
        return result;
    };
    // Also call after clearing chat (new chat)
    if (typeof startNewConversation === 'function') {
        const origStartNewConversation = startNewConversation;
        window.startNewConversation = function(...args) {
            const result = origStartNewConversation.apply(this, args);
            setTimeout(updateWelcomeState, 10);
            return result;
        };
    }

    // Mic button: show recording animation, do voice-to-text, send as message
    const micBtn = document.getElementById('micBtn');
    let recognition, isRecording = false;
    if (micBtn && window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Create and style the neural net/waveform overlay
        let recAnim = document.getElementById('recordingAnimation');
        if (!recAnim) {
            recAnim = document.createElement('div');
            recAnim.id = 'recordingAnimation';
            recAnim.style.position = 'fixed';
            recAnim.style.left = '0';
            recAnim.style.top = '0';
            recAnim.style.width = '100vw';
            recAnim.style.height = '100vh';
            recAnim.style.background = 'rgba(0,0,0,0.25)';
            recAnim.style.display = 'none';
            recAnim.style.alignItems = 'center';
            recAnim.style.justifyContent = 'center';
            recAnim.style.zIndex = '9999';
            recAnim.innerHTML = `<div style="background:rgba(30,34,54,0.97);border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.35);padding:32px 36px;text-align:center;max-width:350px;width:90%;border:1.5px solid rgba(255,255,255,0.08);color:#e0e0e0;display:flex;flex-direction:column;align-items:center;">
                <div class='neural-wave' style='width:80px;height:40px;display:flex;align-items:end;gap:3px;margin-bottom:18px;'>
                    <div style='width:8px;height:30px;background:#4A90E2;border-radius:4px;animation:w1 1s infinite;'></div>
                    <div style='width:8px;height:18px;background:#3578c6;border-radius:4px;animation:w2 1s infinite;'></div>
                    <div style='width:8px;height:38px;background:#4A90E2;border-radius:4px;animation:w3 1s infinite;'></div>
                    <div style='width:8px;height:22px;background:#3578c6;border-radius:4px;animation:w4 1s infinite;'></div>
                    <div style='width:8px;height:30px;background:#4A90E2;border-radius:4px;animation:w5 1s infinite;'></div>
                </div>
                <span style='font-size:1.1em;'>Listening... Speak now</span>
            </div>
            <style>@keyframes w1{0%{height:30px}50%{height:10px}100%{height:30px}}@keyframes w2{0%{height:18px}50%{height:38px}100%{height:18px}}@keyframes w3{0%{height:38px}50%{height:18px}100%{height:38px}}@keyframes w4{0%{height:22px}50%{height:30px}100%{height:22px}}@keyframes w5{0%{height:30px}50%{height:38px}100%{height:30px}}</style>`;
            document.body.appendChild(recAnim);
        }

        micBtn.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
                return;
            }
            isRecording = true;
            recAnim.style.display = 'flex';
            recognition.start();
        });
        recognition.onresult = function(event) {
            isRecording = false;
            recAnim.style.display = 'none';
            const transcript = event.results[0][0].transcript;
            if (transcript && userInput) {
                userInput.value = transcript;
                // Optionally, auto-send:
                if (typeof sendMessage === 'function') sendMessage();
            }
        };
        recognition.onerror = function() {
            isRecording = false;
            recAnim.style.display = 'none';
        };
        recognition.onend = function() {
            isRecording = false;
            recAnim.style.display = 'none';
        };
    }

    // --- New History Item Actions (Rename and Delete) ---
    conversationHistoryList.addEventListener('click', (event) => {
        const renameButton = event.target.closest('.rename-conv-btn');
        const deleteButton = event.target.closest('.delete-conv-btn');

        if (renameButton) {
            const convId = renameButton.dataset.convId;
            handleRenameConversation(convId);
        } else if (deleteButton) {
            const convId = deleteButton.dataset.convId;
            handleDeleteConversation(convId);
        }
    });

    function handleRenameConversation(convId) {
        const conversation = allConversations.find(c => c.id === convId);
        if (conversation) {
            const newTitle = prompt('Enter new title for this chat:', conversation.title);
            if (newTitle !== null && newTitle.trim() !== '') {
                conversation.title = newTitle.trim();
                localStorage.setItem('ngen3_all_conversations', JSON.stringify(allConversations));
                renderConversationHistory(); // Update sidebar with new title
            }
        }
    }

    function handleDeleteConversation(convId) {
        if (confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
            const initialCount = allConversations.length;
            allConversations = allConversations.filter(c => c.id !== convId);
            
            if (allConversations.length < initialCount) { // Check if a conversation was actually removed
                localStorage.setItem('ngen3_all_conversations', JSON.stringify(allConversations));
                renderConversationHistory(); // Update sidebar

                // If the deleted conversation was the currently active one, start a new chat
                if (currentConversationId === convId) {
                    startNewConversation(false); // Start a fresh new chat
                }
                 alert('Chat deleted.');
            } else {
                 alert('Error: Chat not found.'); // Should not happen if button was present
            }
        }
    }

    function renderMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Parse and render markdown content
        let content = message.content;
        
        // Handle tables with enhanced parsing
        const tableRegex = /\|(.+)\|[\r\n]+\|([^\n]+)\|/g;
        content = content.replace(tableRegex, (match, row1, row2) => {
            // Check if this is a complete table with headers and separator
            const hasSeparator = row2.includes('-');
            const rows = [row1, row2];
            
            // If no separator, treat as data rows and add default headers
            if (!hasSeparator) {
                const cells1 = row1.split('|').filter(c => c.trim());
                const cells2 = row2.split('|').filter(c => c.trim());
                
                if (cells1.length === cells2.length) {
                    let tableHtml = '<div class="table-container"><table class="message-table"><thead><tr>';
                    // Add default headers based on column count
                    for (let i = 0; i < cells1.length; i++) {
                        tableHtml += `<th>Column ${i + 1}</th>`;
                    }
                    tableHtml += '</tr></thead><tbody>';
                    
                    // Add data rows
                    [cells1, cells2].forEach(cells => {
                        tableHtml += '<tr>';
                        cells.forEach(cell => {
                            tableHtml += `<td>${cell.trim()}</td>`;
                        });
                        tableHtml += '</tr>';
                    });
                    
                    tableHtml += '</tbody></table></div>';
                    return tableHtml;
                }
            }
            
            // If it has a separator, use the original table parsing
            const tableRegex = /\|(.+)\|[\r\n]+\|([-|]+)\|[\r\n]+((?:\|.+\|[\r\n]+)+)/g;
            return match.replace(tableRegex, (match, header, separator, rows) => {
                const headers = header.split('|').filter(h => h.trim());
                const dataRows = rows.split('\n').filter(r => r.trim());
                let tableHtml = '<div class="table-container"><table class="message-table"><thead><tr>';
                headers.forEach(h => tableHtml += `<th>${h.trim()}</th>`);
                tableHtml += '</tr></thead><tbody>';
                dataRows.forEach(row => {
                    const cells = row.split('|').filter(c => c.trim());
                    if (cells.length === headers.length) {
                        tableHtml += '<tr>';
                        cells.forEach(cell => {
                            tableHtml += `<td>${cell.trim()}</td>`;
                        });
                        tableHtml += '</tr>';
                    }
                });
                tableHtml += '</tbody></table></div>';
                return tableHtml;
            });
        });
        
        // Convert remaining markdown to HTML
        content = marked.parse(content);
        contentDiv.innerHTML = content;
        
        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    // Add function to convert table to graph
    window.convertTableToGraph = async function(tableId, chartType = 'bar') {
        const tableContainer = document.getElementById(tableId);
        if (!tableContainer) return;
        
        const table = tableContainer.querySelector('table');
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        // Extract data
        const data = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            return {
                label: cells[0].textContent,
                value: parseFloat(cells[1].textContent.replace(/[^0-9.-]+/g, ''))
            };
        });
        
        // Create CSV data
        const csvData = data.map(d => `${d.label},${d.value}`).join('\n');
        
        try {
            // Show loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'graph-loading';
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Generating ${chartType} chart...</span>
            `;
            tableContainer.innerHTML = '';
            tableContainer.appendChild(loadingDiv);
            
            const response = await fetch('/api/generate_graph', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'table_csv': `Label,Value\n${csvData}`,
                    'title': headers[1] || 'Data Visualization',
                    'chart_type': chartType
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate graph');
            }
            
            const result = await response.json();
            
            // Create graph container with download button and chart type selector
            const graphContainer = document.createElement('div');
            graphContainer.className = 'graph-container';
            graphContainer.innerHTML = `
                <div class="graph-actions">
                    <div class="graph-controls">
                        <button class="back-to-table-btn" onclick="showTable('${tableId}')">
                            <span class="material-symbols-outlined">table_chart</span>
                            Back to Table
                        </button>
                        <div class="chart-type-selector">
                            <button class="chart-type-btn ${chartType === 'bar' ? 'active' : ''}" 
                                    onclick="convertTableToGraph('${tableId}', 'bar')">
                                <span class="material-symbols-outlined">bar_chart</span>
                            </button>
                            <button class="chart-type-btn ${chartType === 'line' ? 'active' : ''}" 
                                    onclick="convertTableToGraph('${tableId}', 'line')">
                                <span class="material-symbols-outlined">show_chart</span>
                            </button>
                            <button class="chart-type-btn ${chartType === 'pie' ? 'active' : ''}" 
                                    onclick="convertTableToGraph('${tableId}', 'pie')">
                                <span class="material-symbols-outlined">pie_chart</span>
                            </button>
                        </div>
                        <button class="download-graph-btn" onclick="downloadGraph('${result.image_url}', '${headers[1] || 'graph'}_${chartType}')">
                            <span class="material-symbols-outlined">download</span>
                            Download
                        </button>
                    </div>
                </div>
                <img src="${result.image_url}?t=${Date.now()}" alt="Generated Graph" class="generated-graph">
            `;
            
            // Replace loading with graph
            tableContainer.innerHTML = '';
            tableContainer.appendChild(graphContainer);
            
        } catch (error) {
            console.error('Error generating graph:', error);
            tableContainer.innerHTML = `
                <div class="graph-error">
                    <span class="material-symbols-outlined">error</span>
                    <p>Failed to generate graph: ${error.message}</p>
                    <button class="retry-btn" onclick="convertTableToGraph('${tableId}', '${chartType}')">
                        <span class="material-symbols-outlined">refresh</span>
                        Retry
                    </button>
                </div>
            `;
        }
    };

    // Function to show table again
    window.showTable = function(tableId) {
        const tableContainer = document.getElementById(tableId);
        if (!tableContainer) return;
        
        // Recreate the table HTML
        const table = tableContainer.querySelector('table');
        if (table) {
            tableContainer.innerHTML = `
                <div class="table-actions">
                    <button class="convert-to-graph-btn" onclick="convertTableToGraph('${tableId}')">
                        <span class="material-symbols-outlined">bar_chart</span>
                        Convert to Graph
                    </button>
                </div>
                ${table.outerHTML}
            `;
        }
    };

    // Function to download graph
    window.downloadGraph = async function(imageUrl, title) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_graph.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading graph:', error);
            alert('Failed to download graph. Please try again.');
        }
    };

    // Add styles for the enhanced graph functionality
    const graphStyles = document.createElement('style');
    graphStyles.textContent = `
        .graph-container {
            position: relative;
            margin: 1rem 0;
            text-align: center;
        }
        
        .graph-actions {
            position: absolute;
            top: -40px;
            right: 0;
            display: flex;
            gap: 8px;
            z-index: 100;
        }
        
        .graph-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.9);
            padding: 4px 8px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .chart-type-selector {
            display: flex;
            gap: 4px;
            padding: 0 8px;
            border-left: 1px solid rgba(0, 0, 0, 0.1);
            border-right: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .chart-type-btn {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            border-radius: 4px;
            color: #666;
            transition: all 0.2s ease;
        }
        
        .chart-type-btn:hover {
            background: rgba(74, 144, 226, 0.1);
            color: #4A90E2;
        }
        
        .chart-type-btn.active {
            background: rgba(74, 144, 226, 0.2);
            color: #4A90E2;
        }
        
        .generated-graph {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }
        
        .back-to-table-btn,
        .download-graph-btn {
            background: rgba(74, 144, 226, 0.1);
            border: 1px solid rgba(74, 144, 226, 0.2);
            color: #4A90E2;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9em;
            transition: all 0.2s ease;
        }
        
        .back-to-table-btn:hover,
        .download-graph-btn:hover {
            background: rgba(74, 144, 226, 0.2);
            transform: translateY(-1px);
        }
        
        .graph-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            gap: 1rem;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(74, 144, 226, 0.1);
            border-top-color: #4A90E2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .graph-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            gap: 1rem;
            color: #e74c3c;
        }
        
        .retry-btn {
            background: rgba(231, 76, 60, 0.1);
            border: 1px solid rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9em;
            transition: all 0.2s ease;
        }
        
        .retry-btn:hover {
            background: rgba(231, 76, 60, 0.2);
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @media (prefers-color-scheme: dark) {
            .graph-controls {
                background: rgba(30, 30, 30, 0.9);
            }
            
            .chart-type-selector {
                border-color: rgba(255, 255, 255, 0.1);
            }
            
            .chart-type-btn {
                color: #999;
            }
            
            .chart-type-btn:hover {
                background: rgba(53, 120, 198, 0.1);
                color: #3578c6;
            }
            
            .chart-type-btn.active {
                background: rgba(53, 120, 198, 0.2);
                color: #3578c6;
            }
            
            .back-to-table-btn,
            .download-graph-btn {
                background: rgba(53, 120, 198, 0.1);
                border-color: rgba(53, 120, 198, 0.2);
                color: #3578c6;
            }
            
            .back-to-table-btn:hover,
            .download-graph-btn:hover {
                background: rgba(53, 120, 198, 0.2);
            }
            
            .generated-graph {
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
            }
            
            .loading-spinner {
                border-color: rgba(53, 120, 198, 0.1);
                border-top-color: #3578c6;
            }
        }
    `;
    document.head.appendChild(graphStyles);

    // Add test button for graph generation
    const testButton = document.createElement('button');
    testButton.className = 'test-graph-btn';
    testButton.innerHTML = `
        <span class="material-symbols-outlined">bar_chart</span>
        Test Graph Generator
    `;
    testButton.onclick = async () => {
        // Sample data for testing
        const sampleData = `Label,Value
Sales Q1,1200
Sales Q2,1800
Sales Q3,1500
Sales Q4,2100`;
        
        try {
            const response = await fetch('/api/generate_graph', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'table_csv': sampleData,
                    'title': 'Quarterly Sales Performance',
                    'chart_type': 'bar'
                })
            });
            
            if (!response.ok) throw new Error('Failed to generate graph');
            
            const result = await response.json();
            
            // Create a message with the graph
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="graph-container">
                        <img src="${result.image_url}?t=${Date.now()}" alt="Generated Graph" class="generated-graph">
                    </div>
                </div>
            `;
            
            chatBox.appendChild(messageDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
            
        } catch (error) {
            console.error('Error generating test graph:', error);
            alert('Failed to generate test graph. Please check the console for details.');
        }
    };
    
    // Add the button to the chat input area
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (chatInputContainer) {
        chatInputContainer.appendChild(testButton);
    }
    
    // Add styles for the test button
    const testButtonStyles = document.createElement('style');
    testButtonStyles.textContent = `
        .test-graph-btn {
            background: rgba(74, 144, 226, 0.1);
            border: 1px solid rgba(74, 144, 226, 0.2);
            color: #4A90E2;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9em;
            transition: all 0.2s ease;
            margin-left: 8px;
        }
        
        .test-graph-btn:hover {
            background: rgba(74, 144, 226, 0.2);
            transform: translateY(-1px);
        }
        
        @media (prefers-color-scheme: dark) {
            .test-graph-btn {
                background: rgba(53, 120, 198, 0.1);
                border-color: rgba(53, 120, 198, 0.2);
                color: #3578c6;
            }
            
            .test-graph-btn:hover {
                background: rgba(53, 120, 198, 0.2);
            }
        }
    `;
    document.head.appendChild(testButtonStyles);

    // Add styles for the table and graph functionality
    const tableStyles = document.createElement('style');
    tableStyles.textContent = `
        .table-container {
            position: relative;
            margin: 2rem 0;
            padding-top: 40px;
        }
        
        .table-actions {
            position: absolute;
            top: 0;
            right: 0;
            z-index: 100;
            display: flex;
            gap: 8px;
        }
        
        .convert-to-graph-btn {
            background: rgba(74, 144, 226, 0.1);
            border: 1px solid rgba(74, 144, 226, 0.2);
            color: #4A90E2;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9em;
            transition: all 0.2s ease;
            white-space: nowrap;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        .convert-to-graph-btn:hover {
            background: rgba(74, 144, 226, 0.2);
            transform: translateY(-1px);
        }
        
        .convert-to-graph-btn .material-symbols-outlined {
            font-size: 1.2em;
        }
        
        @media (prefers-color-scheme: dark) {
            .convert-to-graph-btn {
                background: rgba(53, 120, 198, 0.1);
                border-color: rgba(53, 120, 198, 0.2);
                color: #3578c6;
            }
            
            .convert-to-graph-btn:hover {
                background: rgba(53, 120, 198, 0.2);
            }
        }
    `;
    document.head.appendChild(tableStyles);

    // Add function to generate chat link
    async function generateChatLink() {
        try {
            const messages = chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await fetch('/api/generate_chat_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('betaCode')}`
                },
                body: JSON.stringify({ messages })
            });

            if (!response.ok) {
                throw new Error('Failed to generate chat link');
            }

            const data = await response.json();
            
            // Create a modal to show the link
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Share Chat Link</h3>
                    <p>Copy this link to share your chat:</p>
                    <div class="link-container">
                        <input type="text" value="${data.chat_link}" readonly id="chatLinkInput">
                        <button onclick="copyChatLink()" class="copy-btn">
                            <span class="material-symbols-outlined">content_copy</span>
                            Copy
                        </button>
                    </div>
                    <button onclick="closeModal()" class="close-btn">Close</button>
                </div>
            `;
            document.body.appendChild(modal);

            // Add styles for the modal
            const style = document.createElement('style');
            style.textContent = `
                .modal {
                    display: flex;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background-color: white;
                    padding: 20px;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                }
                .link-container {
                    display: flex;
                    gap: 10px;
                    margin: 15px 0;
                }
                .link-container input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .copy-btn {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 8px 15px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .close-btn {
                    width: 100%;
                    padding: 10px;
                    background-color: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                }
            `;
            document.head.appendChild(style);

        } catch (error) {
            console.error('Error generating chat link:', error);
            alert('Failed to generate chat link. Please try again.');
        }
    }

    // Add function to copy chat link
    function copyChatLink() {
        const input = document.getElementById('chatLinkInput');
        input.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    }

    // Add function to close modal
    function closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    }

    // Add function to load chat from link
    async function loadChatFromLink(linkId) {
        try {
            const response = await fetch(`/api/chat/${linkId}`);
            if (!response.ok) {
                throw new Error('Failed to load chat');
            }

            const data = await response.json();
            
            // Clear existing chat
            chatHistory = [];
            chatContainer.innerHTML = '';
            
            // Load messages from the link
            for (const msg of data.messages) {
                await appendMessage(msg.role, msg.content);
            }
            
        } catch (error) {
            console.error('Error loading chat:', error);
            alert('Failed to load chat. The link may be invalid or expired.');
        }
    }

    // Add share button to the chat interface
    function addShareButton() {
        const shareButton = document.createElement('button');
        shareButton.className = 'share-btn';
        shareButton.innerHTML = `
            <span class="material-symbols-outlined">share</span>
            Share Chat
        `;
        shareButton.onclick = generateChatLink;
        
        // Add the button to the chat controls
        const chatControls = document.querySelector('.chat-controls');
        if (chatControls) {
            chatControls.appendChild(shareButton);
        }
    }

    // Add styles for the share button
    const shareButtonStyle = document.createElement('style');
    shareButtonStyle.textContent = `
        .share-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 8px 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
        }
        .share-btn:hover {
            background-color: #218838;
        }
    `;
    document.head.appendChild(shareButtonStyle);

    // Initialize share button when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        addShareButton();
        
        // Check if we're loading a chat from a link
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] === 'chat' && pathParts[2]) {
            loadChatFromLink(pathParts[2]);
        }
    });

    // Add database button and functionality
    function addDatabaseButton() {
        const databaseButton = document.createElement('button');
        databaseButton.className = 'database-btn';
        databaseButton.innerHTML = `
            <span class="material-symbols-outlined">database</span>
            Database
        `;
        databaseButton.onclick = showDatabaseModal;

        // Add the button to the chat input secondary controls
        // const chatControls = document.querySelector('.input-toggles'); // Comment out or remove old placement logic
        // if (chatControls) {
        //     chatControls.appendChild(databaseButton);
        // }

        // Add the button to the new input area footer
        if (inputAreaFooter) { // Use the inputAreaFooter defined earlier
            inputAreaFooter.appendChild(databaseButton);
        }
    }

    // Initialize database button
    addDatabaseButton();

    // Add database modal
    function showDatabaseModal() {
        const modal = document.createElement('div');
        modal.className = 'modal database-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Custom Database</h3>
                <div class="database-tabs">
                    <button class="tab-btn active" data-tab="search">Search</button>
                    <button class="tab-btn" data-tab="add">Add Data</button>
                    <button class="tab-btn" data-tab="table">Generate Table</button>
                </div>
                <div class="tab-content" id="search-tab">
                    <input type="text" id="databaseSearch" placeholder="Search in database...">
                    <div id="searchResults" class="search-results"></div>
                </div>
                <div class="tab-content hidden" id="add-tab">
                    <input type="text" id="dataCategory" placeholder="Category">
                    <input type="text" id="dataTitle" placeholder="Title">
                    <textarea id="dataContent" placeholder="Content"></textarea>
                    <button onclick="addToDatabase()" class="add-btn">Add to Database</button>
                </div>
                <div class="tab-content hidden" id="table-tab">
                    <div class="table-generator">
                        <div class="table-inputs">
                            <input type="text" id="tableTitle" placeholder="Table Title">
                            <div id="columnInputs">
                                <div class="column-input">
                                    <input type="text" placeholder="Column 1" class="column-name">
                                    <select class="column-type">
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                    </select>
                                </div>
                            </div>
                            <button onclick="addColumn()" class="add-column-btn">
                                <span class="material-symbols-outlined">add</span>
                                Add Column
                            </button>
                            <div id="tablePreview" class="table-preview"></div>
                            <button onclick="generateTable()" class="generate-btn">Generate Table</button>
                        </div>
                    </div>
                </div>
                <button onclick="closeDatabaseModal()" class="close-btn">Close</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Add tab switching functionality
        const tabs = modal.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabContents = modal.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.add('hidden'));
                modal.querySelector(`#${tab.dataset.tab}-tab`).classList.remove('hidden');
            });
        });

        // Add search functionality
        const searchInput = modal.querySelector('#databaseSearch');
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                await searchDatabase(query);
            }
        }, 300));
    }

    // Add column to table generator
    function addColumn() {
        const columnInputs = document.querySelector('#columnInputs');
        const columnCount = columnInputs.children.length + 1;
        
        const columnInput = document.createElement('div');
        columnInput.className = 'column-input';
        columnInput.innerHTML = `
            <input type="text" placeholder="Column ${columnCount}" class="column-name">
            <select class="column-type">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
            </select>
            <button onclick="removeColumn(this)" class="remove-column-btn">
                <span class="material-symbols-outlined">remove</span>
            </button>
        `;
        
        columnInputs.appendChild(columnInput);
        updateTablePreview();
    }

    // Remove column from table generator
    function removeColumn(button) {
        const columnInput = button.parentElement;
        columnInput.remove();
        updateTablePreview();
    }

    // Update table preview
    function updateTablePreview() {
        const preview = document.querySelector('#tablePreview');
        const columns = Array.from(document.querySelectorAll('.column-name')).map(input => input.value || input.placeholder);
        
        if (columns.length === 0) {
            preview.innerHTML = '<p class="preview-placeholder">Add columns to see preview</p>';
            return;
        }
        
        const tableHTML = `
            <table class="preview-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${columns.map(() => '<td>Sample data</td>').join('')}
                    </tr>
                </tbody>
            </table>
        `;
        
        preview.innerHTML = tableHTML;
    }

    // Generate table and add to database
    async function generateTable() {
        const title = document.querySelector('#tableTitle').value.trim();
        const columns = Array.from(document.querySelectorAll('.column-input')).map(input => ({
            name: input.querySelector('.column-name').value.trim() || input.querySelector('.column-name').placeholder,
            type: input.querySelector('.column-type').value
        }));
        
        if (!title || columns.length === 0) {
            alert('Please add a title and at least one column');
            return;
        }
        
        // Create table markdown
        const tableMarkdown = generateTableMarkdown(title, columns);
        
        try {
            const response = await fetch('/api/custom_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: 'tables',
                    title: title,
                    content: tableMarkdown
                })
            });
            
            if (!response.ok) throw new Error('Failed to add table');
            
            alert('Table added successfully');
            document.querySelector('#tableTitle').value = '';
            document.querySelector('#columnInputs').innerHTML = `
                <div class="column-input">
                    <input type="text" placeholder="Column 1" class="column-name">
                    <select class="column-type">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                    </select>
                </div>
            `;
            updateTablePreview();
            
            // Switch to search tab and refresh results
            document.querySelector('[data-tab="search"]').click();
            const searchInput = document.querySelector('#databaseSearch');
            if (searchInput.value.trim()) {
                await searchDatabase(searchInput.value.trim());
            }
        } catch (error) {
            console.error('Error adding table:', error);
            alert('Failed to add table');
        }
    }

    // Generate markdown table
    function generateTableMarkdown(title, columns) {
        const header = columns.map(col => col.name).join(' | ');
        const separator = columns.map(() => '---').join(' | ');
        const sampleRow = columns.map(col => {
            switch (col.type) {
                case 'number': return '0';
                case 'date': return 'YYYY-MM-DD';
                default: return 'Text';
            }
        }).join(' | ');
        
        return `# ${title}\n\n| ${header} |\n| ${separator} |\n| ${sampleRow} |`;
    }

    // Add glowing search effect
    function showGlowingSearch(query) {
        const searchEffect = document.createElement('div');
        searchEffect.className = 'glowing-search';
        searchEffect.innerHTML = `
            <div class="glow-container">
                <div class="glow-text">Searching Database...</div>
                <div class="glow-pulse"></div>
            </div>
        `;
        document.body.appendChild(searchEffect);
        return searchEffect;
    }

    // Database search function
    async function searchDatabase(query) {
        const searchEffect = showGlowingSearch(query);
        
        try {
            const response = await fetch(`/api/custom_data/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            const resultsDiv = document.querySelector('#searchResults');
            
            if (data.results.length === 0) {
                resultsDiv.innerHTML = '<p class="no-results">No results found</p>';
            } else {
                resultsDiv.innerHTML = data.results.map(result => `
                    <div class="result-item">
                        <h4>${result.title}</h4>
                        <p class="category">${result.category}</p>
                        <p class="content">${result.content}</p>
                        <div class="result-actions">
                            <button onclick="useInChat(${result.id})" class="use-btn">
                                <span class="material-symbols-outlined">chat</span>
                                Use in Chat
                            </button>
                            <button onclick="deleteFromDatabase(${result.id})" class="delete-btn">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Database search error:', error);
            document.querySelector('#searchResults').innerHTML = 
                '<p class="error">Error searching database</p>';
        } finally {
            searchEffect.remove();
        }
    }

    // Add to database function
    async function addToDatabase() {
        const category = document.querySelector('#dataCategory').value.trim();
        const title = document.querySelector('#dataTitle').value.trim();
        const content = document.querySelector('#dataContent').value.trim();
        
        if (!category || !title || !content) {
            alert('Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch('/api/custom_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ category, title, content })
            });
            
            if (!response.ok) throw new Error('Failed to add data');
            
            alert('Data added successfully');
            document.querySelector('#dataCategory').value = '';
            document.querySelector('#dataTitle').value = '';
            document.querySelector('#dataContent').value = '';
            
            // Switch to search tab and refresh results
            document.querySelector('[data-tab="search"]').click();
            const searchInput = document.querySelector('#databaseSearch');
            if (searchInput.value.trim()) {
                await searchDatabase(searchInput.value.trim());
            }
        } catch (error) {
            console.error('Error adding to database:', error);
            alert('Failed to add data');
        }
    }

    // Use data in chat
    function useInChat(dataId) {
        const resultItem = document.querySelector(`[data-id="${dataId}"]`);
        if (resultItem) {
            const content = resultItem.querySelector('.content').textContent;
            userInput.value = content;
            closeDatabaseModal();
            userInput.focus();
        }
    }

    // Delete from database
    async function deleteFromDatabase(dataId) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        try {
            const response = await fetch(`/api/custom_data/${dataId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete data');
            
            // Refresh search results
            const searchInput = document.querySelector('#databaseSearch');
            if (searchInput.value.trim()) {
                await searchDatabase(searchInput.value.trim());
            }
        } catch (error) {
            console.error('Error deleting from database:', error);
            alert('Failed to delete data');
        }
    }

    // Close database modal
    function closeDatabaseModal() {
        const modal = document.querySelector('.database-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Add styles for database functionality
    const databaseStyles = document.createElement('style');
    databaseStyles.textContent = `
        .database-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 8px 15px;
            background-color: #6f42c1;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
        }
        
        .database-btn:hover {
            background-color: #5a32a3;
        }
        
        .database-modal .modal-content {
            max-width: 600px;
        }
        
        .database-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .tab-btn {
            padding: 8px 16px;
            border: none;
            background: #f0f0f0;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .tab-btn.active {
            background: #6f42c1;
            color: white;
        }
        
        .tab-content {
            margin-bottom: 20px;
        }
        
        .tab-content.hidden {
            display: none;
        }
        
        .search-results {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 10px;
        }
        
        .result-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .result-item h4 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .result-item .category {
            color: #6f42c1;
            font-size: 0.9em;
            margin: 0 0 10px 0;
        }
        
        .result-item .content {
            margin: 0 0 10px 0;
            white-space: pre-wrap;
        }
        
        .result-actions {
            display: flex;
            gap: 10px;
        }
        
        .use-btn, .delete-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .use-btn {
            background: #28a745;
            color: white;
        }
        
        .delete-btn {
            background: #dc3545;
            color: white;
        }
        
        .glowing-search {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        
        .glow-container {
            text-align: center;
        }
        
        .glow-text {
            color: white;
            font-size: 1.5em;
            margin-bottom: 20px;
            text-shadow: 0 0 10px #6f42c1;
        }
        
        .glow-pulse {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #6f42c1;
            margin: 0 auto;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% {
                transform: scale(0.8);
                opacity: 0.5;
            }
            50% {
                transform: scale(1.2);
                opacity: 0.8;
            }
            100% {
                transform: scale(0.8);
                opacity: 0.5;
            }
        }
        
        @media (prefers-color-scheme: dark) {
            .result-item {
                background: #2d2d2d;
            }
            
            .result-item h4 {
                color: #fff;
            }
            
            .tab-btn {
                background: #2d2d2d;
                color: #fff;
            }
            
            .tab-btn.active {
                background: #6f42c1;
            }
        }
    `;
    document.head.appendChild(databaseStyles);

    // Initialize database button when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        addDatabaseButton();
    });

    // Add event listeners for table generator
    document.addEventListener('DOMContentLoaded', () => {
        // Add event listeners for column inputs
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('column-name')) {
                updateTablePreview();
            }
        });

        // Add event listeners for column type changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('column-type')) {
                updateTablePreview();
            }
        });
    });
});

// Add a simple CSS for the streaming cursor if you want one
// Example: in style.css add: .streaming-cursor { display: inline-block; animation: blink 1s step-end infinite; } @keyframes blink { 50% { opacity: 0; }} 
// Example: in style.css add: .streaming-cursor { display: inline-block; animation: blink 1s step-end infinite; } @keyframes blink { 50% { opacity: 0; }} 