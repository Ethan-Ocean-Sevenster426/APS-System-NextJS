        // Toggle password visibility
        document.getElementById('password-toggle').addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
        
        // Form validation and error handling
        document.getElementById('login-form').addEventListener('submit', function(e) {
            const usernameInput = document.getElementById('username');
            usernameInput.value = usernameInput.value.trim();
            const username = usernameInput.value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            const errorText = document.getElementById('error-text');

            // Clear previous errors
            errorMessage.style.display = 'none';

            // Basic validation
                if (!username || !password) {
                    e.preventDefault();
                errorText.textContent = 'Username and password are required';
                errorMessage.style.display = 'flex';
                    return;
                }
            
            // Show loading state
            const loginButton = document.getElementById('login-button');
            const originalText = loginButton.innerHTML;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            loginButton.disabled = true;
            
            // Re-enable button after 3 seconds (in case of network issues)
            setTimeout(() => {
                loginButton.innerHTML = originalText;
                loginButton.disabled = false;
            }, 3000);
        });
        
        // Handle URL parameters for error messages
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        if (error) {
            const errorMessage = document.getElementById('error-message');
            const errorText = document.getElementById('error-text');
            errorText.textContent = decodeURIComponent(error);
            errorMessage.style.display = 'flex';
        }
        
        // Auto-focus username field
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('username').focus();
        });
