// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function () {

  // Función para mostrar/ocultar contraseñas
  function togglePassword(idInput, idIcon) {
    const input = document.getElementById(idInput);
    const icon = document.getElementById(idIcon);
    if (input && icon) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !isPassword);
      icon.classList.toggle('fa-eye-slash', isPassword);
    }
  }

  // Asignar eventos solo si existen los elementos
  const toggleLogin = document.getElementById('toggleLoginPassword');
  const toggleRegister = document.getElementById('toggleRegisterPassword');
  if (toggleLogin) {
    toggleLogin.addEventListener('click', () =>
      togglePassword('loginPassword', 'toggleLoginPassword')
    );
  }
  if (toggleRegister) {
    toggleRegister.addEventListener('click', () =>
      togglePassword('registerPassword', 'toggleRegisterPassword')
    );
  }

  // Manejo de formularios
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const user = document.getElementById("loginUsername").value;
      // No se recomienda mostrar contraseñas
      alert(`Login exitoso\nUsuario: ${user}`);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const cedula = document.getElementById("registerCedula").value;
      alert(`Registro exitoso\nCédula: ${cedula}`);
    });
  }

});
