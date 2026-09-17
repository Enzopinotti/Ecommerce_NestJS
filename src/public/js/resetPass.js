document.getElementById('ResetPasswordForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const data = new FormData(this);
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');
    const token = String(data.get('token') || '');

    if (password !== confirmPassword) {
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Las contraseñas deben ser iguales',
            allowOutsideClick: false,
        });
        return;
    }

    try {
        const response = await fetch('/users/resetPass', {
            method: 'POST',
            body: JSON.stringify({ token, password }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const body = await response.json();

        if (!response.ok) {
            if (body.message === 'La contraseña no puede ser igual a la anterior.') {
                throw new Error('La contraseña no puede ser igual a la anterior.');
            }
            if (body.message === 'Formato de contraseña invalido.') {
                throw new Error('Formato de contraseña invalido.');
            }
            throw new Error('El enlace de recuperación no es válido o ya expiró.');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Contraseña actualizada correctamente',
            allowOutsideClick: false,
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
