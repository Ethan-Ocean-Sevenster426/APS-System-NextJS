function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

// Load background image after page loads
window.addEventListener('load', function() {
    document.body.classList.add('bg-loaded');
});
