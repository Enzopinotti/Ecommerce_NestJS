document.getElementById('registerForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const data = new FormData(this);
    const registration = {};
    data.forEach((value, key) => (registration[key] = value));

    try {
        const response = await fetch('/users/register', {
            method: 'POST',
            body: JSON.stringify(registration),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const body = await response.json();

        if (!response.ok) {
            const message = Array.isArray(body.message)
                ? body.message.join('. ')
                : body.message;

            if (response.status === 409) {
                throw new Error('Ya existe una cuenta con ese correo electrónico');
            }

            throw new Error(message || 'No se pudo completar el registro');
        }

        if (body.status === 'success') {
            window.location.href = '/login';
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
