document.getElementById('ResetPasswordForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(this);
    const obj = {};
    data.forEach((value, key) => (obj[key] = value));
    console.log(obj);
    if (obj.password !== obj.confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Las contraseñas deben ser iguales',
            allowOutsideClick: false,
        });
        return;
    }
    if (obj.password === '') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor, completa el campo contraseña para avanzar',
            allowOutsideClick: false,
        });
        return;
    }
    fetch('/users/resetPass', {
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
        if (json.statusCode === 400){
            console.log('entro a user error')
            if(json.message ==='Invalid token'){
                console.log('El token no es valido o ya expiró')
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'El token no es valido o ya expiró',
                    allowOutsideClick: false,
                    confirmButtonText: 'Ir al login', // Texto del botón de confirmación
                }).then(() => {
                    window.location.href = '/login';
                });
            }
            if(json.message === 'Token expired'){
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'El token ya expiró',
                    allowOutsideClick: false,

                }).then(() => {
                    window.location.href = '/login';
                });
            }
            if(json.message === 'La contraseña no puede ser igual a la anterior.'){
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'La contraseña no puede ser igual a la anterior',
                    allowOutsideClick: false,
                });
            }
            if(json.message === 'Formato de contraseña invalido.'){
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Formato de contraseña invalido',
                    allowOutsideClick: false,
                });
            }
            }
        if (json.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Contraseña actualizada correctamente',
                allowOutsideClick: false,
            }).then(() => {
                window.location.href = '/login';
            });
        }
    })
    .catch(error => {
       
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error inesperado',
            allowOutsideClick: false,
        });
    });
});