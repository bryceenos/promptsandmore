// Engine expand/collapse functionality
document.addEventListener('DOMContentLoaded', function() {
    const engineToggles = document.querySelectorAll('.engine-toggle');
    
    engineToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const engineId = this.getAttribute('data-engine');
            const details = document.getElementById(engineId);
            
            // Close all other open engines
            document.querySelectorAll('.engine-details').forEach(detail => {
                if (detail.id !== engineId && detail.classList.contains('expanded')) {
                    detail.classList.remove('expanded');
                    detail.style.maxHeight = null;
                }
            });
            
            // Toggle current engine
            if (details.classList.contains('expanded')) {
                details.classList.remove('expanded');
                details.style.maxHeight = null;
            } else {
                details.classList.add('expanded');
                details.style.maxHeight = details.scrollHeight + 'px';
            }
        });
    });
});

