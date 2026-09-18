document.getElementById('RecoveryForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const data = new FormData(this);
    const email = String(data.get('email') || '').trim();

    if (!email) {
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor, ingresa un email',
            allowOutsideClick: false,
        });
        return;
    }

    try {
        const response = await fetch('/users/recoveryPass', {
            method: 'POST',
            body: JSON.stringify({ email }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('No se pudo procesar la solicitud de recuperación.');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Solicitud recibida',
            text: 'Si la cuenta existe, recibirás instrucciones para restablecer la contraseña.',
            confirmButtonText: 'Ir al login',
        });
        window.location.href = '/login';
    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error inesperado',
            allowOutsideClick: false,
        });
    }
});
