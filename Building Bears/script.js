document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('exploreBtn');
    
    // Add micro-interactions for the button
    btn.addEventListener('click', () => {
        const originalText = btn.textContent;
        btn.textContent = 'Awesome Bears! 🐻';
        
        // Brief scale-up animation effect
        btn.style.transform = 'scale(1.05)';
        
        // Revert back after 2 seconds
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.transform = '';
        }, 2000);
    });
});
