document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const data = new FormData(this);
    const obj = {};
    
    data.forEach((value, key) => (obj[key] = value));
    
    fetch('/users/register', {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(result => result.json())
    .then(data => {
        console.log(data)
        if (data.status === 'success') {
            window.location.href = '/login';
        } else if (data.statusCode === 401) {
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Error inesperado', // Cambiado para usar la propiedad 'error' directamente
                allowOutsideClick: false,
            });
        } else {
            console.error('Error inesperado:', data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error inesperado',
            allowOutsideClick: false,
        });
    });
});