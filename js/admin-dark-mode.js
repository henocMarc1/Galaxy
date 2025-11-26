window.initDarkMode = function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const savedTheme = localStorage.getItem('admin-theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (darkModeToggle) darkModeToggle.querySelector('.material-icons').textContent = 'light_mode';
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('admin-theme', newTheme);
            darkModeToggle.querySelector('.material-icons').textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
        });
    }
};
window.initDarkMode();
