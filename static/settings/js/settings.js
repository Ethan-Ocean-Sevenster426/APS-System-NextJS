        // Load background image after page loads for better performance
        window.addEventListener('load', function() {
            document.body.classList.add('bg-loaded');
        });

        // Theme management
        function initTheme() {
            const themeMode = document.getElementById('theme_mode');
            const savedTheme = localStorage.getItem('theme');
            const serverTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const serverDarkMode = window.DJANGO_CONFIG.serverDarkMode;
            
            // Determine the active theme
            let activeTheme = 'light';
            if (savedTheme) {
                activeTheme = savedTheme;
            } else if (serverDarkMode) {
                activeTheme = 'dark';
            } else if (serverTheme) {
                activeTheme = serverTheme;
            }
            
            // Set the theme on the document
            document.documentElement.setAttribute('data-theme', activeTheme);
            
            // Update the checkbox state
            if (themeMode) {
                themeMode.checked = activeTheme === 'dark';
            }
            
            // Save to localStorage if not already saved
            if (!savedTheme) {
                try { 
                    localStorage.setItem('theme', activeTheme); 
                } catch (e) {
                    console.log('Could not save theme to localStorage:', e);
                }
            }
        }
        
        function toggleTheme() {
            const themeMode = document.getElementById('theme_mode');
            if (themeMode) {
                const newTheme = themeMode.checked ? 'dark' : 'light';
                
                // Add a visual indicator
                document.body.style.transition = 'all 0.3s ease';
                
                // Set the theme on the document
                document.documentElement.setAttribute('data-theme', newTheme);
                
                // Force a repaint to ensure CSS variables are applied
                document.body.offsetHeight;
                
                try {
                    localStorage.setItem('theme', newTheme);
                } catch (e) {
                    console.log('Could not save theme to localStorage:', e);
                }
                
                // Auto-save to server
                saveThemeToServer(newTheme);
            }
        }
        

        
        // Handle theme change from the checkbox
        function handleThemeChange(checkbox) {
            console.log('Theme checkbox changed:', checkbox.checked);
            
            // Update the visual theme immediately
            const newTheme = checkbox.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            
            // Save to localStorage
            try {
                localStorage.setItem('theme', newTheme);
            } catch (e) {
                console.log('Could not save theme to localStorage:', e);
            }
            
            // Save theme setting via AJAX to prevent page reload
            saveThemeToServer(newTheme);
        }
        
        // Save theme preference to server
        async function saveThemeToServer(theme) {
            try {
                const response = await fetch(window.DJANGO_CONFIG.urls.settings, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=save_theme&theme_mode=${theme === 'dark' ? 'on' : ''}`
                });

                if (response.ok) {
                    console.log('Theme saved to server:', theme);
                }
            } catch (error) {
                console.log('Could not save theme to server:', error);
            }
        }

        // Handle unified data sync toggle
        function handleDataSyncToggle(checkbox) {
            console.log('Data sync toggle changed:', checkbox.checked);

            // Update hidden fields for both Google Sheets and SQL Server
            const googleSheetsInput = document.getElementById('google_sheets_enabled');
            const sqlServerInput = document.getElementById('sql_server_enabled');

            if (googleSheetsInput && sqlServerInput) {
                googleSheetsInput.value = checkbox.checked ? 'on' : '';
                sqlServerInput.value = checkbox.checked ? 'on' : '';
            }

            // Auto-save to server
            saveDataSyncToServer(checkbox.checked);
        }

        // Save data sync preference to server
        async function saveDataSyncToServer(enabled) {
            try {
                const response = await fetch(window.DJANGO_CONFIG.urls.settings, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=save_sync&google_sheets_enabled=${enabled ? 'on' : ''}&sql_server_enabled=${enabled ? 'on' : ''}`
                });

                if (response.ok) {
                    console.log('Data sync saved to server:', enabled);

                    // Show success message
                    const statusDiv = document.querySelector('.sync-status .status-item:first-child');
                    if (statusDiv) {
                        const icon = statusDiv.querySelector('i');
                        const text = statusDiv.querySelector('span');
                        if (icon && text) {
                            icon.style.color = enabled ? '#10b981' : '#6b7280';
                            text.textContent = `Data Sync: ${enabled ? 'Active' : 'Inactive'}`;
                        }
                    }
                }
            } catch (error) {
                console.log('Could not save data sync to server:', error);
            }
        }

        // Auto-save Auto Sync setting
        async function autoSaveAutoSync() {
            try {
                const autoSyncEnabled = document.getElementById('auto_sync').checked;
                
                const response = await fetch('/system-settings/save/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        'auto_sync_enabled': autoSyncEnabled
                    })
                });
                
                if (response.ok) {
                    console.log('Auto Sync setting saved:', autoSyncEnabled);
                    
                    // Control all services based on Auto Sync setting
                    if (autoSyncEnabled) {
                        // Start all services
                        startAllServices();
                    } else {
                        // Stop all services
                        stopAllServices();
                    }
                } else {
                    console.error('Failed to save Auto Sync setting');
                }
            } catch (error) {
                console.error('Error saving Auto Sync setting:', error);
            }
        }
        
        // Start all services when Auto Sync is enabled
        async function startAllServices() {
            try {
                // Start Scheduled Sync Service
                const syncResponse = await fetch('/scheduled-sync/start/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                
                // Start Scheduled Backup Service
                const backupResponse = await fetch('/scheduled-backup/start/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                
                // Start Daily Compliance Sync Service
                const dailySyncResponse = await fetch('/daily-sync/start/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                
                console.log('All services started');
            } catch (error) {
                console.error('Error starting services:', error);
            }
        }
        
        // Stop all services when Auto Sync is disabled
        async function stopAllServices() {
            try {
                // Stop Scheduled Sync Service
                const syncResponse = await fetch('/scheduled-sync/stop/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                
                // Stop Scheduled Backup Service
                const backupResponse = await fetch('/scheduled-backup/stop/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                
                // Stop Daily Compliance Sync Service
                const dailySyncResponse = await fetch('/daily-sync/stop/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                
                console.log('All services stopped');
            } catch (error) {
                console.error('Error stopping services:', error);
            }
        }
         

         async function processAllCompliance() {
             const btn = document.getElementById('processAllBtn');
             const originalText = btn.innerHTML;
             
             if (!confirm('🚀 Upload ALL Compliance Documents to OneDrive?\n\nThis will:\n• Pull ALL compliance documents from Google Drive\n• Upload them directly to OneDrive (no local storage)\n• Process all inspections from Jan 2025 onwards\n• Run in background to handle large volumes\n• Organize files in OneDrive folder structure\n\nThis may take several minutes. Continue?')) {
                 return;
             }
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to OneDrive...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/onedrive/start-direct-service/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert(`✅ OneDrive Direct Upload Started!\n\n🚀 The system is now:\n• Pulling ALL compliance documents from Google Drive\n• Uploading them directly to OneDrive\n• Processing all inspections from January 2025 onwards\n• Running every 10 minutes in the background\n\n📁 Files will be organized in OneDrive folder structure\n📊 Check the terminal/console for progress updates\n\n⏱️ This may take several minutes to complete.`);
                 } else {
                     alert(`❌ Error starting OneDrive upload: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         // OneDrive Service Management
         async function checkOneDriveStatus() {
             try {
                 const response = await fetch('/onedrive/direct-service-status/', {
                     method: 'GET',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 updateOneDriveStatus(result);
             } catch (error) {
                 console.error('Error checking OneDrive status:', error);
                 updateOneDriveStatus({ is_running: false, error: 'Connection failed' });
             }
         }
         
         function updateOneDriveStatus(data) {
             const statusText = document.getElementById('onedriveStatusText');
             const statsDiv = document.getElementById('onedriveStats');
             const startBtn = document.getElementById('startOneDriveBtn');
             const stopBtn = document.getElementById('stopOneDriveBtn');
             
             if (data.is_running) {
                 statusText.innerHTML = '<span style="color: #10b981;">🟢 Running</span>';
                 startBtn.disabled = true;
                 stopBtn.disabled = false;
                 statsDiv.style.display = 'block';
                 
                 // Update stats
                 document.getElementById('totalProcessed').textContent = data.total_processed || 0;
                 document.getElementById('totalUploaded').textContent = data.total_uploaded || 0;
                 document.getElementById('totalErrors').textContent = data.total_errors || 0;
                 document.getElementById('lastRun').textContent = data.last_run ? new Date(data.last_run).toLocaleString() : 'Never';
             } else {
                 statusText.innerHTML = '<span style="color: #ef4444;">🔴 Stopped</span>';
                 startBtn.disabled = false;
                 stopBtn.disabled = true;
                 statsDiv.style.display = 'none';
             }
         }
         
         async function startOneDriveService() {
             const btn = document.getElementById('startOneDriveBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/onedrive/start-direct-service/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert('✅ OneDrive Direct Upload Service started successfully!');
                     checkOneDriveStatus();
                 } else {
                     alert(`❌ Error starting service: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         async function stopOneDriveService() {
             const btn = document.getElementById('stopOneDriveBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/onedrive/stop-direct-service/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert('✅ OneDrive Direct Upload Service stopped successfully!');
                     checkOneDriveStatus();
                 } else {
                     alert(`❌ Error stopping service: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         // Upload all documents to OneDrive from Google Workspace
         async function uploadAllDocumentsToOneDrive() {
             const btn = document.getElementById('uploadAllDocsBtn');
             const originalText = btn.innerHTML;
             
             if (!confirm('🚀 Upload ALL Compliance Documents to OneDrive?\n\nThis will:\n• Pull ALL compliance documents from Google Drive\n• Upload them directly to OneDrive (no local storage)\n• Process all inspections from Jan 2025 onwards\n• Run in background to handle large volumes\n• Organize files in OneDrive folder structure\n\nThis may take several minutes. Continue?')) {
                 return;
             }
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to OneDrive...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/onedrive/start-direct-service/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert(`✅ OneDrive Direct Upload Started!\n\n🚀 The system is now:\n• Pulling ALL compliance documents from Google Drive\n• Uploading them directly to OneDrive\n• Processing all inspections from January 2025 onwards\n• Running every 10 minutes in the background\n\n📁 Files will be organized in OneDrive folder structure\n📊 Check the terminal/console for progress updates\n\n⏱️ This may take several minutes to complete.`);
                     
                     // Refresh the OneDrive status
                     checkOneDriveStatus();
                 } else {
                     alert(`❌ Error starting OneDrive upload: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         // Initialize page on load
         document.addEventListener('DOMContentLoaded', function() {
            // Add event listener for 6-month file population
            const populateSixMonthBtn = document.getElementById('populateSixMonthBtn');
            if (populateSixMonthBtn) {
                populateSixMonthBtn.addEventListener('click', populateSixMonthFiles);
            }
            
            // Add event listener for 6-month data pull from Google Drive
            const pullSixMonthDataBtn = document.getElementById('pullSixMonthDataBtn');
            if (pullSixMonthDataBtn) {
                pullSixMonthDataBtn.addEventListener('click', pullSixMonthDataFromGoogleDrive);
            }
         });
         
         // Populate files for all inspections in the last 6 months
         async function populateSixMonthFiles() {
             const btn = document.getElementById('populateSixMonthBtn');
             const originalText = btn.innerHTML;
             
             if (!confirm('🚀 Populate Files for All Inspections in Last 6 Months?\n\nThis will:\n• Create folder structure for all inspections\n• Fetch and store files locally\n• Process all inspections from the last 6 months\n• This may take several minutes\n\nContinue?')) {
                 return;
             }
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Populating Files...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/populate-four-month-files/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert(`✅ 6-Month File Population Complete!\n\n📁 Created ${result.folders_created} inspection folders\n📊 Files are now available for all inspections in the last 6 months\n\nYou can now use the View Files button on the inspections page!`);
                 } else {
                     alert(`❌ Error populating files: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
        // Pull 6-month data from Google Drive
        async function pullSixMonthDataFromGoogleDrive() {
            const btn = document.getElementById('pullSixMonthDataBtn');
            const originalText = btn.innerHTML;
            
            if (!confirm('🚀 Pull ALL 6-Month Data from Google Drive?\n\nThis will:\n• Connect to Google Drive folder\n• Download ALL compliance documents for last 6 months\n• Match files by commodity, account code, and date\n• Store files locally in organized structure\n• Process hundreds of inspections\n• This may take 10-30 minutes\n\nContinue?')) {
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pulling from Google Drive...';
            btn.disabled = true;
            
            try {
                // Show progress indicator
                const progressDiv = document.createElement('div');
                progressDiv.id = 'googleDriveProgress';
                progressDiv.style.cssText = 'margin-top: 1rem; padding: 1rem; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px;';
                progressDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-sync fa-spin" style="color: #0ea5e9;"></i>
                        <span style="font-weight: 500; color: #0369a1;">Pulling data from Google Drive...</span>
                    </div>
                    <div style="font-size: 0.875rem; color: #64748b;">
                        This process runs in the background. Check the server console for detailed progress.
                    </div>
                `;
                
                btn.parentNode.insertBefore(progressDiv, btn.nextSibling);
                
                // Call the actual 6-month data pull endpoint
                const response = await fetch('/pull-six-month-data/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Update progress message
                    progressDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span style="font-weight: 500; color: #059669;">6-Month Data Pull Complete!</span>
                        </div>
                        <div style="font-size: 0.875rem; color: #64748b;">
                            ✅ Downloaded ${result.files_downloaded || 0} files<br>
                            📁 Created ${result.folders_created || 0} folders<br>
                            📊 Processed ${result.inspections_processed || 0} inspections<br>
                            ${result.errors > 0 ? `⚠️ ${result.errors} errors occurred` : '🎉 No errors!'}
                        </div>
                    `;
                    
                    // Remove progress after 15 seconds
                    setTimeout(() => {
                        if (progressDiv.parentNode) {
                            progressDiv.parentNode.removeChild(progressDiv);
                        }
                    }, 15000);
                    
                    alert(`✅ 6-Month Google Drive Data Pull Complete!\n\n📁 Downloaded: ${result.files_downloaded || 0} files\n📂 Created: ${result.folders_created || 0} folders\n📊 Processed: ${result.inspections_processed || 0} inspections\n${result.errors > 0 ? `⚠️ Errors: ${result.errors}` : '🎉 No errors!'}\n\nFiles are now stored locally in your media/inspection/ folder!`);
                } else {
                    throw new Error(result.error || 'Failed to pull data from Google Drive');
                }
                
            } catch (error) {
                alert(`❌ Error pulling 6-month data: ${error.message}`);
                
                // Remove progress indicator on error
                const progressDiv = document.getElementById('googleDriveProgress');
                if (progressDiv && progressDiv.parentNode) {
                    progressDiv.parentNode.removeChild(progressDiv);
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
         
         

         async function checkSmartSyncStatus() {
             try {
                 const response = await fetch('/smart-sync/status/', {
                     method: 'GET',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 updateSmartSyncStatus(result);
             } catch (error) {
                 console.error('Error checking smart sync status:', error);
                 updateSmartSyncStatus({ is_running: false, error: 'Connection failed' });
             }
         }
         
         function updateSmartSyncStatus(data) {
             const statusText = document.getElementById('smartSyncStatusText');
             const statsDiv = document.getElementById('smartSyncStats');
             const startBtn = document.getElementById('startSmartSyncBtn');
             const stopBtn = document.getElementById('stopSmartSyncBtn');
             
             if (data.is_running) {
                 statusText.innerHTML = '<span style="color: #10b981;">🟢 Running</span>';
                 startBtn.disabled = true;
                 stopBtn.disabled = false;
                 statsDiv.style.display = 'block';
                 
                 // Update stats
                 document.getElementById('totalInspections').textContent = data.stats?.total_inspections || 0;
                 document.getElementById('inspectionsChecked').textContent = data.stats?.inspections_checked || 0;
                 document.getElementById('changesDetected').textContent = data.stats?.changes_detected || 0;
                 document.getElementById('lastFullScan').textContent = data.last_full_scan ? new Date(data.last_full_scan).toLocaleString() : 'Never';
                 document.getElementById('smartSyncLastRun').textContent = data.stats?.last_run_time ? new Date(data.stats.last_run_time).toLocaleString() : 'Never';
             } else {
                 statusText.innerHTML = '<span style="color: #ef4444;">🔴 Stopped</span>';
                 startBtn.disabled = false;
                 stopBtn.disabled = true;
                 statsDiv.style.display = 'none';
             }
         }
         
         async function startSmartSyncService() {
             const btn = document.getElementById('startSmartSyncBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/smart-sync/start/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert('✅ Smart Incremental Sync Service started successfully!');
                     checkSmartSyncStatus();
                 } else {
                     alert(`❌ Error starting service: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         async function stopSmartSyncService() {
             const btn = document.getElementById('stopSmartSyncBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/smart-sync/stop/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert('✅ Smart Incremental Sync Service stopped successfully!');
                     checkSmartSyncStatus();
                 } else {
                     alert(`❌ Error stopping service: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         async function forceStopSmartSyncService() {
             if (!confirm('🚨 FORCE STOP SMART SYNC SERVICE?\n\nThis will immediately terminate the service without waiting for it to finish current operations.\n\nUse this only if the normal stop button is not working.\n\nContinue?')) {
                 return;
             }
             
             const btn = document.getElementById('forceStopSmartSyncBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Force Stopping...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/smart-sync/force-stop/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json'
                     }
                 });
                 
                 const result = await response.json();
                 
                 if (result.success) {
                     alert('✅ Smart Incremental Sync Service force stopped successfully!');
                     checkSmartSyncStatus();
                 } else {
                     alert(`❌ Error force stopping service: ${result.message || result.error}`);
                 }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         function getCsrfToken() {
             const token = document.querySelector('[name=csrfmiddlewaretoken]');
             if (token) {
                 return token.value;
             }
             
             // Fallback: try to get from meta tag
             const metaToken = document.querySelector('meta[name="csrf-token"]');
             if (metaToken) {
                 return metaToken.getAttribute('content');
             }
             
             // Fallback: try to get from cookie
             const cookieValue = document.cookie
                 .split('; ')
                 .find(row => row.startsWith('csrftoken='))
                 ?.split('=')[1];
             
             if (cookieValue) {
                 return cookieValue;
             }
             
             console.error('CSRF token not found!');
             return '';
         }
         
         function toggleBatchOptions() {
             const batchMode = document.querySelector('select[name="compliance_batch_mode"]').value;
             const batchOptions = document.getElementById('batchOptions');
             
             if (batchMode === 'all') {
                 batchOptions.style.display = 'none';
             } else {
                 batchOptions.style.display = 'block';
             }
         }

         // Mobile Menu Toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const mobileBtn = document.getElementById('mobile-menu-btn');
            
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
                
            const icon = mobileBtn.querySelector('i');
            if (sidebar.classList.contains('show')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        }
        
        // Initialize theme on page load
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            
            // Mobile menu functionality
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            
            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener('click', toggleSidebar);
            }
            
            if (sidebarOverlay) {
                sidebarOverlay.addEventListener('click', toggleSidebar);
            }
            
            // Close sidebar when clicking on nav links on mobile
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 1024) {
                        toggleSidebar();
                    }
                });
            });
            
            // Initialize master service control
            refreshServiceStatus();
            
            // Initialize OneDrive service control
            refreshOneDriveStatus();
            
            // Daily sync button event listeners
            document.getElementById('startDailySyncBtn').addEventListener('click', startDailySync);
            document.getElementById('stopDailySyncBtn').addEventListener('click', stopDailySync);
             
             // Add event listener to theme toggle (only if not already handled by onchange)
             const themeMode = document.getElementById('theme_mode');
             if (themeMode) {
                 // Remove any existing event listeners to avoid conflicts
                 themeMode.removeEventListener('change', toggleTheme);
                 // Only add if not using onchange attribute
                 if (!themeMode.hasAttribute('onchange')) {
                     themeMode.addEventListener('change', toggleTheme);
                     console.log('Theme toggle event listener added');
                 } else {
                     console.log('Theme toggle using onchange attribute');
                 }
             } else {
                 console.log('Theme toggle checkbox not found');
             }
             
            // Add event listener for Process All button
            const processAllBtn = document.getElementById('processAllBtn');
            if (processAllBtn) {
                processAllBtn.addEventListener('click', processAllCompliance);
            }
            
            // Add event listener for Auto Sync toggle
            const autoSyncToggle = document.getElementById('auto_sync');
            if (autoSyncToggle) {
                autoSyncToggle.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveAutoSync, 1000);
                });
            }
             
             // Debug: Log current theme state
             console.log('Current theme:', document.documentElement.getAttribute('data-theme'));
             console.log('Theme checkbox checked:', themeMode?.checked);
             console.log('Settings dark_mode from server:', window.DJANGO_CONFIG.serverDarkMode);
             console.log('HTML data-theme attribute:', document.documentElement.getAttribute('data-theme'));
         });
         
         // Daily Sync Functions
         async function startDailySync() {
             const btn = document.getElementById('startDailySyncBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
             btn.disabled = true;
             
            try {
                const csrfToken = getCsrfToken();
                console.log('CSRF Token:', csrfToken ? 'Found' : 'Missing');
                
                const response = await fetch('/daily-sync/start/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json',
                    }
                });
                
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}...`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    alert(`✅ ${result.message}`);
                    // Force refresh all statuses to ensure UI is updated
                    forceRefreshAllStatuses();
                } else {
                    alert(`❌ Error: ${result.message || result.error}`);
                }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         async function stopDailySync() {
             const btn = document.getElementById('stopDailySyncBtn');
             const originalText = btn.innerHTML;
             
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
             btn.disabled = true;
             
             try {
                 const response = await fetch('/daily-sync/stop/', {
                     method: 'POST',
                     headers: {
                         'X-CSRFToken': getCsrfToken(),
                         'Content-Type': 'application/json',
                     }
                 });
                 
                const result = await response.json();
                
                if (result.success) {
                    alert(`✅ ${result.message}`);
                    // Force refresh all statuses to ensure UI is updated
                    forceRefreshAllStatuses();
                } else {
                    alert(`❌ Error: ${result.message || result.error}`);
                }
             } catch (error) {
                 alert(`❌ Network Error: ${error.message}`);
             } finally {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
         }
         
         
        function displayDailySyncStatus(status) {
            console.log('displayDailySyncStatus called with:', status);
            
            const statusDiv = document.getElementById('dailySyncStatus');
            const contentDiv = document.getElementById('dailySyncStatusContent');
            
            if (!statusDiv || !contentDiv) {
                console.error('Status display elements not found');
                return;
            }
            
            const statusText = status.is_running ? '🟢 Running' : '🔴 Stopped';
            const lastSync = status.last_sync_time ? new Date(status.last_sync_time).toLocaleString() : 'Never';
            
            console.log('Status display - is_running:', status.is_running, 'statusText:', statusText);
             
             contentDiv.innerHTML = `
                 <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
                     <div>
                         <strong>Status:</strong> ${statusText}<br>
                         <strong>Last Sync:</strong> ${lastSync}
                     </div>
                     <div>
                         <strong>Total Processed:</strong> ${status.total_documents_processed || 0}<br>
                         <strong>Documents Skipped:</strong> ${status.documents_skipped || 0}
                     </div>
                 </div>
             `;
             
             // Hide the loading spinner and show the content
             statusDiv.style.display = 'block';
             const spinner = statusDiv.querySelector('.spinner');
             const loadingText = statusDiv.querySelector('span');
             if (spinner) spinner.style.display = 'none';
             if (loadingText) loadingText.style.display = 'none';
         }
        
        // OneDrive reset function
        function resetToOneDriveDefaults() {
            if (confirm('Are you sure you want to reset OneDrive settings to defaults?')) {
                document.getElementById('onedrive_upload_delay_days').value = 3;
                document.getElementById('onedrive_upload_delay_unit').value = 'days';
            }
        }
        
        // Sync settings reset function
        function resetSyncSettings() {
            if (confirm('Are you sure you want to reset sync settings to defaults?')) {
                // Reset sync interval to 24 hours
                document.getElementById('sync_interval').value = 24;
                document.getElementById('sync_interval_unit').value = 'hours';
                
                // Reset toggles to default state
                document.getElementById('google_sheets_enabled').checked = false;
                document.getElementById('sql_server_enabled').checked = false;
                
                // Update display
                updateSyncIntervalDisplay();
                
                alert('Sync settings have been reset to defaults.');
            }
        }
        
        // Sync interval validation and formatting
        function validateSyncInterval() {
            const syncInterval = document.getElementById('sync_interval');
            const syncUnit = document.getElementById('sync_interval_unit');
            
            if (syncInterval && syncUnit) {
                const value = parseInt(syncInterval.value);
                const unit = syncUnit.value;
                
                // Validate based on unit
                if (unit === 'minutes' && value > 10080) {
                    alert('Minutes cannot exceed 10080 (1 week). Please use hours or days for longer intervals.');
                    syncInterval.value = 10080;
                } else if (unit === 'hours' && value > 168) {
                    alert('Hours cannot exceed 168 (1 week). Please use days for longer intervals.');
                    syncInterval.value = 168;
                } else if (unit === 'days' && value > 365) {
                    alert('Days cannot exceed 365 (1 year).');
                    syncInterval.value = 365;
                }
                
                // Update the status display
                updateSyncIntervalDisplay();
            }
        }
        
        function updateSyncIntervalDisplay() {
            const syncInterval = document.getElementById('sync_interval');
            const syncUnit = document.getElementById('sync_interval_unit');
            const statusElement = document.getElementById('syncIntervalDisplay');
            
            if (syncInterval && syncUnit && statusElement) {
                const value = syncInterval.value || 24;
                const unit = syncUnit.value || 'hours';
                statusElement.textContent = `${value} ${unit}`;
            }
        }
        
        // Load current sync settings from backend
        function loadSyncSettings() {
            fetch('/system-settings/get/')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const settings = data.settings;
                        
                        // Update form fields
                        if (settings.google_sheets_enabled !== undefined) {
                            document.getElementById('google_sheets_enabled').checked = settings.google_sheets_enabled;
                        }
                        if (settings.sql_server_enabled !== undefined) {
                            document.getElementById('sql_server_enabled').checked = settings.sql_server_enabled;
                        }
                        
                        // Update sync interval
                        if (settings.sync_interval_hours !== undefined) {
                            const hours = settings.sync_interval_hours;
                            let value, unit;
                            
                            // Convert to minutes first to check for clean minute values
                            const totalMinutes = Math.round(hours * 60);
                            
                            if (totalMinutes < 60) {
                                // Less than 1 hour, show as minutes
                                value = totalMinutes;
                                unit = 'minutes';
                            } else if (totalMinutes % 60 === 0 && totalMinutes < 1440) {
                                // Clean hour values (60, 120, 180, etc.), show as hours
                                value = totalMinutes / 60;
                                unit = 'hours';
                            } else if (totalMinutes >= 1440 && totalMinutes % 1440 === 0) {
                                // Clean day values (1440, 2880, etc.), show as days
                                value = totalMinutes / 1440;
                                unit = 'days';
                            } else {
                                // Otherwise show as minutes
                                value = totalMinutes;
                                unit = 'minutes';
                            }
                            
                            document.getElementById('sync_interval').value = value;
                            document.getElementById('sync_interval_unit').value = unit;
                            
                            // Update display
                            updateSyncIntervalDisplay();
                            
                            // Update status display
                            const statusElement = document.getElementById('currentSyncInterval');
                            if (statusElement) {
                                statusElement.textContent = `Sync Interval: ${value} ${unit}`;
                            }
                        }
                        
                        // Update compliance settings
                        if (settings.compliance_daily_sync_enabled !== undefined) {
                            const toggle = document.getElementById('compliance_daily_sync_enabled');
                            if (toggle) {
                                toggle.checked = settings.compliance_daily_sync_enabled;
                            }
                        }
                        if (settings.compliance_skip_processed !== undefined) {
                            const toggle = document.getElementById('compliance_skip_processed');
                            if (toggle) {
                                toggle.checked = settings.compliance_skip_processed;
                            }
                        }
                    }
                })
                .catch(error => {
                    console.error('Error loading sync settings:', error);
                });
        }
        
        // Add event listeners for sync interval changes
        document.addEventListener('DOMContentLoaded', function() {
            const syncInterval = document.getElementById('sync_interval');
            const syncUnit = document.getElementById('sync_interval_unit');
            
            // Load and convert sync_interval_hours to appropriate display format
            loadSyncIntervalDisplay();
            
            if (syncInterval) {
                syncInterval.addEventListener('change', function() {
                    validateSyncInterval();
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveSyncSettings, 1000);
                });
                syncInterval.addEventListener('input', updateSyncIntervalDisplay);
            }
            
            if (syncUnit) {
                syncUnit.addEventListener('change', function() {
                    validateSyncInterval();
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveSyncSettings, 1000);
                });
                syncUnit.addEventListener('change', updateSyncIntervalDisplay);
            }
            
            // Handle sync settings form submission
            const syncForm = document.getElementById('syncSettingsForm');
            if (syncForm) {
                syncForm.addEventListener('submit', handleSyncFormSubmit);
            }
            
            // Add event listeners for compliance toggles
            const complianceDailySyncToggle = document.getElementById('compliance_daily_sync_enabled');
            const complianceSkipProcessedToggle = document.getElementById('compliance_skip_processed');
            
            if (complianceDailySyncToggle) {
                complianceDailySyncToggle.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveSyncSettings, 1000);
                });
            }
            
            if (complianceSkipProcessedToggle) {
                complianceSkipProcessedToggle.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveSyncSettings, 1000);
                });
            }
            
            // Add event listeners for compliance sync frequency
            const complianceSyncInterval = document.getElementById('compliance_sync_interval');
            const complianceSyncUnit = document.getElementById('compliance_sync_interval_unit');
            
            if (complianceSyncInterval) {
                complianceSyncInterval.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveComplianceSettings, 1000);
                });
                complianceSyncInterval.addEventListener('input', function() {
                    // Auto-save on input for immediate feedback
                    setTimeout(autoSaveComplianceSettings, 1000);
                });
            }
            
            if (complianceSyncUnit) {
                complianceSyncUnit.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveComplianceSettings, 1000);
                });
            }
            
            // Add event listeners for OneDrive settings
            const onedriveDelayDays = document.getElementById('onedrive_upload_delay_days');
            const onedriveDelayUnit = document.getElementById('onedrive_upload_delay_unit');
            
            if (onedriveDelayDays) {
                onedriveDelayDays.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveOneDriveSettings, 1000);
                });
                onedriveDelayDays.addEventListener('input', function() {
                    // Auto-save on input for immediate feedback
                    setTimeout(autoSaveOneDriveSettings, 1000);
                });
            }
            
            if (onedriveDelayUnit) {
                onedriveDelayUnit.addEventListener('change', function() {
                    // Auto-save after a short delay to avoid too many requests
                    setTimeout(autoSaveOneDriveSettings, 1000);
                });
            }
            
            // Load sync service status
            loadSyncServiceStatus();
            
            // Load current sync settings
            loadSyncSettings();
            
            // Load backup service status
            checkBackupStatus();
            
            // Load last compliance sync time
            loadLastComplianceSyncTime();
            
            // Set up periodic status updates (every 2 minutes to reduce server load)
            setInterval(loadLastComplianceSyncTime, 120000); // Was 30000 (30s), now 120000 (2min)
        });
        
        // Load and convert sync interval to appropriate display format
        function loadSyncIntervalDisplay() {
            const syncInterval = document.getElementById('sync_interval');
            const syncUnit = document.getElementById('sync_interval_unit');
            
            if (!syncInterval || !syncUnit) {
                console.log('Sync interval elements not found');
                return;
            }
            
            console.log('Loading sync interval display...');
            
            // Fetch current settings from backend
            fetch('/system-settings/get/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                }
            })
            .then(response => {
                console.log('API response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('API response data:', data);
                if (data.sync_interval_hours !== undefined) {
                    const hours = data.sync_interval_hours || 24;
                    console.log('Sync interval hours from API:', hours);
                    
                    let displayValue, unit;
                    
                    if (hours < 1) {
                        displayValue = Math.round(hours * 60);
                        unit = 'minutes';
                    } else if (hours >= 24) {
                        displayValue = Math.round(hours / 24);
                        unit = 'days';
                    } else {
                        displayValue = Math.round(hours);
                        unit = 'hours';
                    }
                    
                    console.log('Converted to:', displayValue, unit);
                    
                    syncInterval.value = displayValue;
                    syncUnit.value = unit;
                    
                    // Update display
                    updateSyncIntervalDisplay();
                    
                    // Update status display
                    updateSyncIntervalStatus(displayValue, unit);
                } else {
                    console.log('API response missing sync_interval_hours');
                    // Fallback to template value
                    const hours = parseFloat(window.DJANGO_CONFIG.syncIntervalHours) || 24;
                    let displayValue, unit;
                    
                    if (hours < 1) {
                        displayValue = Math.round(hours * 60);
                        unit = 'minutes';
                    } else if (hours >= 24) {
                        displayValue = Math.round(hours / 24);
                        unit = 'days';
                    } else {
                        displayValue = Math.round(hours);
                        unit = 'hours';
                    }
                    
                    syncInterval.value = displayValue;
                    syncUnit.value = unit;
                    
                    // Update status display
                    updateSyncIntervalStatus(displayValue, unit);
                }
            })
            .catch(error => {
                console.log('Error loading sync interval:', error);
                // Fallback to template value
                const hours = parseFloat(window.DJANGO_CONFIG.syncIntervalHours) || 24;
                let displayValue, unit;
                
                if (hours < 1) {
                    displayValue = Math.round(hours * 60);
                    unit = 'minutes';
                } else if (hours >= 24) {
                    displayValue = Math.round(hours / 24);
                    unit = 'days';
                } else {
                    displayValue = Math.round(hours);
                    unit = 'hours';
                }
                
                syncInterval.value = displayValue;
                syncUnit.value = unit;
                
                // Update status display
                updateSyncIntervalStatus(displayValue, unit);
            });
        }
        
        // Update sync interval status display
        function updateSyncIntervalStatus(value, unit) {
            const statusElement = document.getElementById('syncIntervalDisplay');
            if (statusElement) {
                statusElement.textContent = `${value} ${unit}`;
            }
        }
        
        // Load and display last compliance sync time
        function loadLastComplianceSyncTime() {
            // Add cache-busting parameter to prevent stale data
            const timestamp = new Date().getTime();
            fetch(`/daily-sync/status/?t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log('Daily sync status response:', data);
                
                if (data.success && data.status.last_sync_time) {
                    const lastSyncTime = new Date(data.status.last_sync_time).toLocaleString();
                    document.getElementById('lastComplianceSyncTime').textContent = lastSyncTime;
                } else {
                    document.getElementById('lastComplianceSyncTime').textContent = 'Never';
                }
                
                // Also display the daily sync status
                if (data.success && data.status) {
                    console.log('Updating daily sync status display:', data.status);
                    displayDailySyncStatus(data.status);
                } else {
                    console.error('Invalid status response:', data);
                }
            })
            .catch(error => {
                console.log('Error loading compliance sync time:', error);
                document.getElementById('lastComplianceSyncTime').textContent = 'Never';
                
                // Show error status
                const statusDiv = document.getElementById('dailySyncStatus');
                if (statusDiv) {
                    statusDiv.style.display = 'block';
                    statusDiv.innerHTML = '<span style="color: var(--danger);">❌ Error loading daily sync status</span>';
                }
            });
        }
        
        // Auto-save sync settings when user changes values
        function autoSaveSyncSettings() {
            const syncInterval = document.getElementById('sync_interval');
            const syncUnit = document.getElementById('sync_interval_unit');
            
            if (syncInterval && syncUnit) {
                const intervalValue = parseInt(syncInterval.value) || 24;
                const unitValue = syncUnit.value || 'hours';
                
                // Convert sync interval to hours
                let syncIntervalHours = intervalValue;
                if (unitValue === 'minutes') {
                    syncIntervalHours = intervalValue / 60;
                } else if (unitValue === 'days') {
                    syncIntervalHours = intervalValue * 24;
                }
                
                // Ensure minimum interval of 1 minute (0.017 hours)
                if (syncIntervalHours < 0.017) {
                    syncIntervalHours = 0.017;
                }
                
                // Round to avoid floating point precision issues
                syncIntervalHours = Math.round(syncIntervalHours * 1000000) / 1000000;
                
                // Prepare data for backend
                const data = {
                    'google_sheets_enabled': document.getElementById('google_sheets_enabled')?.checked || false,
                    'sql_server_enabled': document.getElementById('sql_server_enabled')?.checked || false,
                    'sync_interval_hours': syncIntervalHours,
                    'auto_sync_enabled': true,
                    'compliance_daily_sync_enabled': document.getElementById('compliance_daily_sync_enabled')?.checked || false,
                    'compliance_skip_processed': document.getElementById('compliance_skip_processed')?.checked || false
                };
                
                // Send to backend
                fetch('/system-settings/save/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateSyncIntervalDisplay();
                        showNotification('Sync settings saved automatically', 'success');
                    }
                })
                .catch(error => {
                    console.log('Auto-save error:', error);
                });
            }
        }

        // Auto-save compliance settings when user changes values
        function autoSaveComplianceSettings() {
            const complianceSyncInterval = document.getElementById('compliance_sync_interval');
            const complianceSyncUnit = document.getElementById('compliance_sync_interval_unit');
            
            if (complianceSyncInterval && complianceSyncUnit) {
                const intervalValue = parseInt(complianceSyncInterval.value) || 5;
                const unitValue = complianceSyncUnit.value || 'days';
                
                // Prepare data for backend
                const data = {
                    'compliance_sync_interval': intervalValue,
                    'compliance_sync_interval_unit': unitValue,
                    'compliance_daily_sync_enabled': document.getElementById('compliance_daily_sync_enabled')?.checked || false,
                    'compliance_skip_processed': document.getElementById('compliance_skip_processed')?.checked || false
                };
                
                // Send to backend via form submission (to match existing Settings model)
                const formData = new FormData();
                formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);
                formData.append('compliance_sync_interval', intervalValue);
                formData.append('compliance_sync_interval_unit', unitValue);
                if (data.compliance_daily_sync_enabled) formData.append('compliance_daily_sync_enabled', 'on');
                if (data.compliance_skip_processed) formData.append('compliance_skip_processed', 'on');
                formData.append('onedrive_sync_interval_hours', '2'); // Required field
                formData.append('onedrive_upload_delay_days', '3'); // Required field
                formData.append('onedrive_upload_delay_unit', 'days'); // Required field
                
                fetch('/settings/', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (response.ok) {
                        console.log('Compliance settings saved automatically');
                        showNotification(`Compliance sync frequency saved: ${intervalValue} ${unitValue}`, 'success');
                    }
                })
                .catch(error => {
                    console.log('Auto-save compliance settings error:', error);
                });
            }
        }

        // Auto-save OneDrive settings when user changes values
        function autoSaveOneDriveSettings() {
            const onedriveDelayDays = document.getElementById('onedrive_upload_delay_days');
            const onedriveDelayUnit = document.getElementById('onedrive_upload_delay_unit');
            
            if (onedriveDelayDays && onedriveDelayUnit) {
                const delayValue = parseInt(onedriveDelayDays.value) || 3;
                const unitValue = onedriveDelayUnit.value || 'days';
                
                // Prepare data for backend
                const data = {
                    'onedrive_upload_delay_days': delayValue,
                    'onedrive_upload_delay_unit': unitValue,
                    'onedrive_enabled': true // Keep OneDrive enabled when saving settings
                };
                
                // Send to backend
                fetch('/system-settings/save/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification('OneDrive settings saved automatically', 'success');
                    }
                })
                .catch(error => {
                    console.log('OneDrive auto-save error:', error);
                });
            }
        }

        // Handle sync settings form submission
        function handleSyncFormSubmit(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const syncInterval = parseInt(formData.get('sync_interval')) || 24;
            const syncUnit = formData.get('sync_interval_unit') || 'hours';
            
            // Convert sync interval to hours
            let syncIntervalHours = syncInterval;
            if (syncUnit === 'minutes') {
                syncIntervalHours = syncInterval / 60; // Convert minutes to hours
            } else if (syncUnit === 'days') {
                syncIntervalHours = syncInterval * 24;
            }
            
            // Ensure minimum interval of 1 minute (0.017 hours)
            if (syncIntervalHours < 0.017) {
                syncIntervalHours = 0.017;
                showNotification('Sync interval set to minimum of 1 minute', 'warning');
            }
            
            // Round to avoid floating point precision issues
            syncIntervalHours = Math.round(syncIntervalHours * 1000000) / 1000000;
            
            // Prepare data for backend
            const data = {
                'google_sheets_enabled': formData.get('google_sheets_enabled') === 'on',
                'sql_server_enabled': formData.get('sql_server_enabled') === 'on',
                'sync_interval_hours': syncIntervalHours,
                'auto_sync_enabled': true, // Enable auto sync when saving sync settings
                'compliance_daily_sync_enabled': formData.get('compliance_daily_sync_enabled') === 'on',
                'compliance_skip_processed': formData.get('compliance_skip_processed') === 'on'
            };
            
            // Debug logging
            console.log('Sync settings data:', data);
            console.log(`Sync interval: ${syncInterval} ${syncUnit} = ${syncIntervalHours} hours`);
            
            // Send to backend
            fetch('/system-settings/save/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const intervalText = syncUnit === 'minutes' ? `${syncInterval} minutes` : 
                                       syncUnit === 'hours' ? `${syncInterval} hours` : 
                                       `${syncInterval} days`;
                    showNotification(`Sync settings saved successfully! Interval: ${intervalText}`, 'success');
                    updateSyncIntervalDisplay();
                    
                    // Update status display
                    const statusElement = document.getElementById('currentSyncInterval');
                    if (statusElement) {
                        statusElement.textContent = `Sync Interval: ${intervalText}`;
                    }
                } else {
                    showNotification('Error saving sync settings: ' + data.error, 'error');
                }
            })
            .catch(error => {
                showNotification('Error saving sync settings: ' + error.message, 'error');
            });
        }
        
        // Sync service control functions
        function loadSyncServiceStatus() {
            fetch('/scheduled-sync/status/')
                .then(response => response.json())
                .then(data => {
                    const statusElement = document.getElementById('syncServiceStatus');
                    if (data.is_running) {
                        // Check if service is truly alive via heartbeat
                        if (data.service_alive) {
                            statusElement.innerHTML = `
                                <div style="color: #10b981;">
                                    <i class="fas fa-circle" style="color: #10b981;"></i>
                                    Service Running (Active)
                                </div>
                            `;
                        } else {
                            // Service marked running but no heartbeat - might be stuck
                            statusElement.innerHTML = `
                                <div style="color: #f59e0b;">
                                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                                    Service Running (No Heartbeat - May Be Stuck)
                                </div>
                            `;
                        }
                    } else {
                        statusElement.innerHTML = `
                            <div style="color: #ef4444;">
                                <i class="fas fa-circle" style="color: #ef4444;"></i>
                                Service Stopped
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    const statusElement = document.getElementById('syncServiceStatus');
                    statusElement.innerHTML = `
                        <div style="color: #ef4444;">
                            <i class="fas fa-exclamation-circle"></i>
                            Error loading status
                        </div>
                    `;
                });
        }
        
        function startSyncService() {
            // Show loading state
            const statusElement = document.getElementById('syncServiceStatus');
            statusElement.innerHTML = `
                <div style="color: #6b7280;">
                    <div class="spinner" style="width: 16px; height: 16px; border: 2px solid var(--border); border-top: 2px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 0.5rem;"></div>
                    Starting service...
                </div>
            `;
            
            fetch('/scheduled-sync/start/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Sync service started successfully!', 'success');
                    // Wait a moment for the service to fully start, then check status
                    setTimeout(() => {
                        loadSyncServiceStatus();
                    }, 1000);
                } else {
                    const errorMsg = data.error || data.message || 'Unknown error';
                    showNotification(errorMsg, 'error');
                    loadSyncServiceStatus(); // Refresh status even on error
                }
            })
            .catch(error => {
                showNotification('Error starting sync service: ' + error.message, 'error');
                loadSyncServiceStatus(); // Refresh status even on error
            });
        }
        
        function stopSyncService() {
            // Show loading state
            const statusElement = document.getElementById('syncServiceStatus');
            statusElement.innerHTML = `
                <div style="color: #6b7280;">
                    <div class="spinner" style="width: 16px; height: 16px; border: 2px solid var(--border); border-top: 2px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 0.5rem;"></div>
                    Stopping service...
                </div>
            `;
            
            fetch('/scheduled-sync/stop/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Sync service stopped successfully!', 'success');
                    // Wait a moment for the service to fully stop, then check status
                    setTimeout(() => {
                        loadSyncServiceStatus();
                    }, 500);
                } else {
                    const errorMsg = data.error || data.message || 'Unknown error';
                    showNotification(errorMsg, 'error');
                    loadSyncServiceStatus(); // Refresh status even on error
                }
            })
            .catch(error => {
                showNotification('Error stopping sync service: ' + error.message, 'error');
                loadSyncServiceStatus(); // Refresh status even on error
            });
        }
        
        // Notification system
        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: var(--radius);
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            
            // Set background color based on type
            switch(type) {
                case 'success':
                    notification.style.backgroundColor = '#10b981';
                    break;
                case 'error':
                    notification.style.backgroundColor = '#ef4444';
                    break;
                case 'warning':
                    notification.style.backgroundColor = '#f59e0b';
                    break;
                default:
                    notification.style.backgroundColor = '#6b7280';
            }
            
            // Add icon based on type
            let icon = 'fas fa-info-circle';
            switch(type) {
                case 'success':
                    icon = 'fas fa-check-circle';
                    break;
                case 'error':
                    icon = 'fas fa-exclamation-circle';
                    break;
                case 'warning':
                    icon = 'fas fa-exclamation-triangle';
                    break;
            }
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="${icon}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            // Add to page
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        }
        
        // Backup service control functions
        function startBackupService() {
            fetch('/scheduled-backup/start/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Backup service started successfully!', 'success');
                    checkBackupStatus();
                } else {
                    const errorMsg = data.error || data.message || 'Unknown error';
                    showNotification('Error starting backup service: ' + errorMsg, 'error');
                }
            })
            .catch(error => {
                showNotification('Error starting backup service: ' + error.message, 'error');
            });
        }
        
        function stopBackupService() {
            fetch('/scheduled-backup/stop/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Backup service stopped successfully!', 'success');
                    checkBackupStatus();
                } else {
                    const errorMsg = data.error || data.message || 'Unknown error';
                    showNotification(errorMsg, 'error');
                }
            })
            .catch(error => {
                showNotification('Error stopping backup service: ' + error.message, 'error');
            });
        }
        
        // Master Service Control Functions
        function startAllServices() {
            fetch('/master-service/start-all/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('All services started successfully!', 'success');
                    refreshServiceStatus();
                    // Also refresh individual service statuses
                    loadSyncServiceStatus();
                    checkBackupStatus();
                    loadLastComplianceSyncTime();
                } else {
                    const errorMsg = data.message || 'Unknown error';
                    showNotification('Error starting services: ' + errorMsg, 'error');
                    displayServiceResults(data.results || {});
                }
            })
            .catch(error => {
                showNotification('Error starting services: ' + error.message, 'error');
            });
        }
        
        function stopAllServices() {
            fetch('/master-service/stop-all/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('All services stopped successfully!', 'success');
                    refreshServiceStatus();
                    // Also refresh individual service statuses
                    loadSyncServiceStatus();
                    checkBackupStatus();
                    loadLastComplianceSyncTime();
                } else {
                    const errorMsg = data.message || 'Unknown error';
                    showNotification('Error stopping services: ' + errorMsg, 'error');
                    displayServiceResults(data.results || {});
                }
            })
            .catch(error => {
                showNotification('Error stopping services: ' + error.message, 'error');
            });
        }
        
        function refreshServiceStatus() {
            fetch('/master-service/status/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateMasterServiceStatus(data);
                } else {
                    console.error('Error fetching service status:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching service status:', error);
            });
        }
        
        // Force refresh all service statuses
        function forceRefreshAllStatuses() {
            console.log('Force refreshing all service statuses...');
            loadSyncServiceStatus();
            checkBackupStatus();
            loadLastComplianceSyncTime();
            refreshServiceStatus();
        }
        
        function updateMasterServiceStatus(data) {
            const statusText = document.getElementById('masterServiceStatusText');
            const statusIcon = document.querySelector('#masterServiceStatusItem i');
            
            if (data.all_running) {
                statusText.textContent = 'All Running';
                statusIcon.style.color = '#10b981';
            } else if (data.any_running) {
                statusText.textContent = `${data.running_services}/${data.total_services} Running`;
                statusIcon.style.color = '#f59e0b';
            } else {
                statusText.textContent = 'All Stopped';
                statusIcon.style.color = '#6b7280';
            }
        }
        
        function displayServiceResults(results) {
            const statusDiv = document.getElementById('masterServiceStatus');
            const contentDiv = document.getElementById('masterServiceStatusContent');
            
            if (Object.keys(results).length > 0) {
                let html = '<h4 style="margin-bottom: 1rem; color: var(--text);">Service Results:</h4>';
                for (const [service, result] of Object.entries(results)) {
                    const statusClass = result.includes('Failed') ? 'error' : 'success';
                    html += `<div style="margin-bottom: 0.5rem;">
                        <strong>${service.replace(/_/g, ' ').toUpperCase()}:</strong>
                        <span class="${statusClass}" style="color: ${statusClass === 'error' ? '#ef4444' : '#10b981'};">
                            ${result}
                        </span>
                    </div>`;
                }
                contentDiv.innerHTML = html;
                statusDiv.style.display = 'block';
            }
        }
        
        // OneDrive Service Control Functions
        function startOneDriveService() {
            fetch('/onedrive-service/start/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('OneDrive service started successfully!', 'success');
                    refreshOneDriveStatus();
                } else {
                    const errorMsg = data.message || 'Unknown error';
                    showNotification('Error starting OneDrive service: ' + errorMsg, 'error');
                }
            })
            .catch(error => {
                showNotification('Error starting OneDrive service: ' + error.message, 'error');
            });
        }
        
        function stopOneDriveService() {
            fetch('/onedrive-service/stop/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('OneDrive service stopped successfully!', 'success');
                    refreshOneDriveStatus();
                } else {
                    const errorMsg = data.message || 'Unknown error';
                    showNotification('Error stopping OneDrive service: ' + errorMsg, 'error');
                }
            })
            .catch(error => {
                showNotification('Error stopping OneDrive service: ' + error.message, 'error');
            });
        }
        
        function testOneDriveConnection() {
            fetch('/onedrive-service/test-connection/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => {
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    // If not JSON, read as text to see what we got
                    return response.text().then(text => {
                        console.error('Non-JSON response received:', text);
                        throw new Error('Server returned non-JSON response. Check server logs.');
                    });
                }
            })
            .then(data => {
                if (data.success) {
                    showNotification('OneDrive connection test successful!', 'success');
                    refreshOneDriveStatus();
                } else {
                    const errorMsg = data.message || 'Connection test failed';
                    const needsReauth = data.needs_reauth || false;
                    
                    if (needsReauth) {
                        showNotification('OneDrive needs re-authentication. Please use the "Re-authenticate OneDrive" button.', 'warning');
                    } else {
                        showNotification('OneDrive connection test failed: ' + errorMsg, 'error');
                    }
                }
            })
            .catch(error => {
                console.error('OneDrive connection test error:', error);
                showNotification('Error testing OneDrive connection: ' + error.message, 'error');
            });
        }
        
        function refreshOneDriveStatus() {
            fetch('/onedrive-service/status/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateOneDriveStatus(data);
                } else {
                    console.error('Error fetching OneDrive status:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching OneDrive status:', error);
            });
        }
        
        function updateOneDriveStatus(data) {
            // Update service status
            const serviceStatusText = document.getElementById('onedriveServiceStatusText');
            const serviceStatusIcon = document.querySelector('#onedriveServiceStatusItem i');
            
            if (data.service_running) {
                serviceStatusText.textContent = 'Running';
                serviceStatusIcon.style.color = '#10b981';
            } else {
                serviceStatusText.textContent = 'Stopped';
                serviceStatusIcon.style.color = '#6b7280';
            }
            
            // Update connection status
            const connectionStatusText = document.getElementById('onedriveConnectionStatusText');
            const connectionStatusIcon = document.querySelector('#onedriveConnectionStatusItem i');
            
            if (data.connected) {
                connectionStatusText.textContent = 'Connected';
                connectionStatusIcon.style.color = '#10b981';
            } else {
                connectionStatusText.textContent = 'Disconnected';
                connectionStatusIcon.style.color = '#ef4444';
            }
            
            // Show detailed status if available
            if (data.status) {
                displayOneDriveStatusDetails(data.status);
            }
        }
        
        function displayOneDriveStatusDetails(status) {
            const statusDiv = document.getElementById('onedriveServiceStatus');
            const contentDiv = document.getElementById('onedriveServiceStatusContent');
            
            if (status && Object.keys(status).length > 0) {
                let html = '<h4 style="margin-bottom: 1rem; color: var(--text);">OneDrive Service Details:</h4>';
                
                if (status.total_processed !== undefined) {
                    html += `<div style="margin-bottom: 0.5rem;">
                        <strong>Total Processed:</strong> ${status.total_processed}
                    </div>`;
                }
                
                if (status.total_uploaded !== undefined) {
                    html += `<div style="margin-bottom: 0.5rem;">
                        <strong>Total Uploaded:</strong> ${status.total_uploaded}
                    </div>`;
                }
                
                if (status.total_errors !== undefined) {
                    html += `<div style="margin-bottom: 0.5rem;">
                        <strong>Total Errors:</strong> ${status.total_errors}
                    </div>`;
                }
                
                if (status.last_run_time) {
                    html += `<div style="margin-bottom: 0.5rem;">
                        <strong>Last Run:</strong> ${new Date(status.last_run_time).toLocaleString()}
                    </div>`;
                }
                
                if (status.error) {
                    html += `<div style="margin-bottom: 0.5rem; color: #ef4444;">
                        <strong>Error:</strong> ${status.error}
                    </div>`;
                }
                
                contentDiv.innerHTML = html;
                statusDiv.style.display = 'block';
            }
        }
        
        function reauthenticateOneDrive() {
            // Show loading state
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating URL...';
            button.disabled = true;
            
            fetch('/onedrive-service/reauthenticate/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Authorization URL generated! Please follow the instructions below.', 'success');
                    displayAuthStatus(data);
                    refreshOneDriveStatus();
                } else {
                    const errorMsg = data.message || 'Failed to generate authorization URL';
                    showNotification('OneDrive re-authentication failed: ' + errorMsg, 'error');
                    displayAuthStatus(data);
                }
            })
            .catch(error => {
                showNotification('Error during OneDrive re-authentication: ' + error.message, 'error');
            })
            .finally(() => {
                // Restore button state
                button.innerHTML = originalText;
                button.disabled = false;
            });
        }
        
        function displayAuthStatus(data) {
            const statusDiv = document.getElementById('onedriveAuthStatus');
            const contentDiv = document.getElementById('onedriveAuthStatusContent');
            
            let html = '<h4 style="margin-bottom: 1rem; color: var(--text);">Authentication Status:</h4>';
            
            if (data.success) {
                html += `<div style="margin-bottom: 0.5rem; color: #10b981;">
                    <i class="fas fa-check-circle"></i> <strong>Success:</strong> ${data.message}
                </div>`;
                
                if (data.auth_url) {
                    html += `<div style="margin-top: 1rem; padding: 1rem; background: var(--card-bg); border-radius: var(--radius); border: 1px solid var(--border);">
                        <h5 style="margin-bottom: 0.5rem; color: var(--text);">Authorization URL:</h5>
                        <div style="margin-bottom: 1rem;">
                            <a href="${data.auth_url}" target="_blank" style="color: var(--primary); text-decoration: none; word-break: break-all; font-size: 0.9rem;">
                                ${data.auth_url}
                            </a>
                        </div>
                        <button type="button" onclick="event.preventDefault(); navigator.clipboard.writeText('${data.auth_url}')" style="background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: var(--radius); cursor: pointer; font-size: 0.9rem;">
                            <i class="fas fa-copy"></i> Copy URL
                        </button>
                    </div>`;
                }
                
                if (data.instructions && Array.isArray(data.instructions)) {
                    html += `<div style="margin-top: 1rem;">
                        <h5 style="margin-bottom: 0.5rem; color: var(--text);">Instructions:</h5>
                        <ol style="margin: 0; padding-left: 1.5rem; color: var(--text-light); font-size: 0.9rem;">`;
                    data.instructions.forEach(instruction => {
                        html += `<li style="margin-bottom: 0.25rem;">${instruction}</li>`;
                    });
                    html += `</ol></div>`;
                }
                
                if (data.auto_refresh_enabled) {
                    html += `<div style="margin-bottom: 0.5rem; color: #10b981;">
                        <i class="fas fa-sync"></i> <strong>Auto-refresh:</strong> Enabled - tokens will refresh automatically
                    </div>`;
                }
            } else {
                html += `<div style="margin-bottom: 0.5rem; color: #ef4444;">
                    <i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${data.message}
                </div>`;
                
                if (data.requires_setup) {
                    html += `<div style="margin-bottom: 0.5rem; color: #f59e0b;">
                        <i class="fas fa-tools"></i> <strong>Action Required:</strong> OneDrive setup is required
                    </div>`;
                }
            }
            
            if (data.output) {
                html += `<div style="margin-top: 1rem;">
                    <details>
                        <summary style="cursor: pointer; color: var(--text-light);">Show Details</summary>
                        <pre style="background: var(--background); padding: 0.5rem; border-radius: var(--radius); margin-top: 0.5rem; font-size: 0.8rem; overflow-x: auto;">${data.output}</pre>
                    </details>
                </div>`;
            }
            
            contentDiv.innerHTML = html;
            statusDiv.style.display = 'block';
            
            // Don't auto-hide if there's an auth URL (user needs to see it)
            if (data.success && !data.auth_url) {
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 10000);
            }
        }
        
        function checkBackupStatus() {
            const statusDisplay = document.getElementById('backupServiceStatus');
            const statusContent = document.getElementById('backupServiceStatusContent');
            
            statusDisplay.style.display = 'block';
            statusContent.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="spinner" style="width: 16px; height: 16px; border: 2px solid var(--border); border-top: 2px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Loading backup status...</span>
                </div>
            `;
            
            fetch('/scheduled-backup/status/')
                .then(response => response.json())
                .then(data => {
                    if (data.is_running) {
                        statusContent.innerHTML = `
                            <div style="color: #10b981;">
                                <i class="fas fa-circle" style="color: #10b981;"></i>
                                Backup Service: Running
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                                Frequency: ${data.backup_frequency_days} days | 
                                Last Backup: ${data.last_backup_time ? new Date(data.last_backup_time).toLocaleString() : 'Never'} | 
                                Next Backup: ${data.next_backup_time ? new Date(data.next_backup_time).toLocaleString() : 'Not scheduled'}
                            </div>
                        `;
                    } else {
                        statusContent.innerHTML = `
                            <div style="color: #ef4444;">
                                <i class="fas fa-circle" style="color: #ef4444;"></i>
                                Backup Service: Stopped
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                                Frequency: ${data.backup_frequency_days} days | 
                                Last Backup: ${data.last_backup_time ? new Date(data.last_backup_time).toLocaleString() : 'Never'}
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    statusContent.innerHTML = `
                        <div style="color: #ef4444;">
                            <i class="fas fa-exclamation-circle"></i>
                            Error loading backup status: ${error.message}
                        </div>
                    `;
                });
        }
        
        // Add CSS for spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
