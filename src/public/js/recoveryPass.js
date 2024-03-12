console.log('Conectado')

document.getElementById('RecoveryForm').addEventListener('submit', function (event) {
    // Evita que el formulario se envíe automáticamente
    event.preventDefault();
    const data = new FormData(this);
    const obj = {};
    console.log('objeto: ', obj)
    data.forEach((value, key) => (obj[key] = value));
    if (obj.email === '') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor, ingresa un email',
            allowOutsideClick: false,
        });
        return;
    }
    fetch('/users/recoveryPass', {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(result => {
        console.log('result: ', result)
        if (result.status === 401) {
            throw new Error('Credenciales incorrectas');
        }
        return result.json();
    })
    .then(json => {
        console.log('json: ', json)
        if (json.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Correo Enviado Correctamente',
                showConfirmButton: true, // Mostrar un botón de confirmación
                confirmButtonText: 'Ir al login', // Texto del botón de confirmación
            }).then((result) => {
                if (result.isConfirmed) {
                    // Si el usuario hace clic en el botón de confirmación, redirigir al login
                    window.location.href = '/login';
                }
            });
        }
        if (json.statusCode === 404) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El usuario no existe, registrate',
                allowOutsideClick: false,
                showConfirmButton: true, // Mostrar un botón de confirmación
                confirmButtonText: 'Ir al Registro', 
            }).then((result) => {
                if (result.isConfirmed) {
                    // Si el usuario hace clic en el botón de confirmación, redirigir al login
                    window.location.href = '/register';
                }
            });
        }
    });
})