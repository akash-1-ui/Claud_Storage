// app.js - Handles register, login, and dashboard interactions

document.addEventListener('DOMContentLoaded', function () {
	// Helper: Redirect to another page
	function goTo(page) {
		window.location.href = page;
	}

	// Register Page Logic
	if (document.getElementById('registerForm')) {
		document.getElementById('registerForm').addEventListener('submit', async function (e) {
			e.preventDefault();
			const username = document.getElementById('username').value;
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			try {
               const response = await fetch("http://localhost:5000/api/auth/register", {
                  method: "POST",
                   headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ username, email, password })
               });

                const result = await response.json();

                if (response.ok && result.success) {
                 alert("Registration successful");
                  goTo("login.html");
                } else {
              alert(result.message || "Registration failed");
                 }

			} catch (err) {
				alert('Registration failed: Server error.');
			}
		});
	}

	// Login Page Logic
	if (document.getElementById('loginForm')) {
		document.getElementById('loginForm').addEventListener('submit', function (e) {
			e.preventDefault();
			// Collect form data
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			// TODO: Send data to backend API
			alert('Login submitted!');
			goTo('dashboard.html');
		});
	}

	// Dashboard Page Logic
	if (document.getElementById('welcomeMsg')) {
		const username = localStorage.getItem('username');
		if (username) {
			document.getElementById('welcomeMsg').textContent = `Welcome, ${username}!`;
		}
	}
	if (document.getElementById('logoutBtn')) {
		document.getElementById('logoutBtn').addEventListener('click', function () {
			localStorage.removeItem('username');
			alert('Logged out!');
			goTo('login.html');
		});
	}

	// Example: Navigation buttons (if present)
	if (document.getElementById('toRegister')) {
		document.getElementById('toRegister').addEventListener('click', function () {
			goTo('register.html');
		});
	}
	if (document.getElementById('toLogin')) {
		document.getElementById('toLogin').addEventListener('click', function () {
			goTo('login.html');
		});
	}
});
