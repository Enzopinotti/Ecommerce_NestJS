document.addEventListener('DOMContentLoaded', () => {
    const logoutControl = document.getElementById('logout-btn');
    if (!logoutControl) return;

    logoutControl.addEventListener('click', async (event) => {
        event.preventDefault();

        try {
            const response = await fetch('/logout', {
                method: 'POST',
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('No se pudo cerrar la sesión');
            }

            window.location.assign('/login');
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo cerrar la sesión',
                allowOutsideClick: false,
            });
        }
    });
});
