document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (event) => {
        const target = event.target;

        // Verifica si el clic proviene del botón de eliminación del carrito
        if (target.classList.contains('remove-from-cart-btn')) {
            const cartId = target.dataset.cartId;
            const productId = target.dataset.productId;
            // Llama a la función para eliminar del carrito
            removeFromCart(event, cartId, productId);
        }
        if (target.classList.contains('remove-all-from-cart-btn')) {
            const cartId = target.dataset.cartId;
            removeAllFromCart(event, cartId); // Llama a la función para eliminar del carrito
        }
    });
});


async function removeFromCart(event, cartId, productId) {
    event.preventDefault();
    try {
        const response = await fetch(`/api/carts/${cartId}/product/${productId}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            // La eliminación fue exitosa, actualizar la interfaz o mostrar una notificación
            Swal.fire({
                icon: 'success',
                title: 'Producto eliminado del carrito',
                showConfirmButton: false,
                timer: 1500,
            });
        } else {
            // Mostrar una notificación de error si la eliminación falló
            Swal.fire({
                icon: 'error',
                title: 'Error al eliminar el producto del carrito',
                text: 'Por favor, inténtalo de nuevo más tarde.',
            });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        // Mostrar notificación en caso de error
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al procesar la solicitud.',
        });
    }
}

async function removeAllFromCart(event, cartId) {
    event.preventDefault();
    try {
        const response = await fetch(`/api/carts/${cartId}/products`, {
            method: 'DELETE',
        });
        if (response.ok) {
            // La eliminación fue exitosa, actualizar la interfaz o mostrar una notificación
            Swal.fire({
                icon: 'success',
                title: 'Productos eliminados del carrito',
                showConfirmButton: false,
                timer: 1500,
            });
        } else {
            // Mostrar una notificación de error si la eliminación falló
            Swal.fire({
                icon: 'error',
                title: 'Error al eliminar los productos del carrito',
                text: 'Por favor, inténtalo de nuevo más tarde.',
            });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        // Mostrar notificación en caso de error
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al procesar la solicitud.',
        });
    }
}