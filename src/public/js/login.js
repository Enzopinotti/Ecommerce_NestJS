document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const data = new FormData(this);
    const credentials = {};
    data.forEach((value, key) => (credentials[key] = value));

    if (credentials.email === '' || credentials.password === '') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor, completa email y contraseña para avanzar',
            allowOutsideClick: false,
        });
        return;
    }

    try {
        const response = await fetch('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const body = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Credenciales incorrectas');
            }
            const message = Array.isArray(body.message)
                ? body.message.join('. ')
                : body.message;
            throw new Error(message || 'No se pudo iniciar sesión');
        }

        if (body.status === 'success') {
            window.location.href = '/products';
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error inesperado',
            allowOutsideClick: false,
        });
    }
});
