        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#007890',
                        'primary-light': '#e6f3f7',
                        'primary-dark': '#005a6b',
                        secondary: '#EC343C',
                        danger: '#EC343C',
                        warning: '#f59e0b',
                        background: '#f9fafb',
                        'card-bg': '#ffffff',
                        text: '#1f2937',
                        'text-light': '#6b7280',
                        border: '#e5e7eb',
                        'light-black': '#333333',
                        'import-color': '#446f1e',
                        grey: '#777777',
                        analytics: '#7c3aed'
                    },
                    borderRadius: {
                        'custom': '6px'
                    },
                    boxShadow: {
                        'custom': '0 1px 3px rgba(0,0,0,0.05)',
                        'custom-lg': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                    }
                }
            }
        }

        // Global toggleSidebar function - available immediately for onclick
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const mobileBtn = document.getElementById('mobile-menu-btn');

            if (sidebar && overlay && mobileBtn) {
                sidebar.classList.toggle('show');
                overlay.classList.toggle('show');

                const isNowOpen = sidebar.classList.contains('show');
                const icon = mobileBtn.querySelector('i');

                if (isNowOpen) {
                    if (icon) icon.className = 'fas fa-times';
                } else {
                    if (icon) icon.className = 'fas fa-bars';
                }
            }
        }
