// main function for working with the DOM
document.addEventListener('DOMContentLoaded', function() {
    // call appropriate function when button is clicked
    const loginButton = document.getElementById('loginButton');
    const createUserButton = document.getElementById('createUserButton');

    loginButton.addEventListener('click', loginUser);
    createUserButton.addEventListener('click', addUser);

    // function for adding user
    function addUser() {
        const username = document.getElementById('createUser').value;
        const password = document.getElementById('createPass').value;
    
        fetch('/add/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, courses: [] }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('User added:', data);
            // Check if the response contains an 'error' field
            if (data.error) {
                // If there's an error, display the error message
                document.getElementById("userFail").innerText = "Username already exists";
            } else {
                // If no error, display the success message
                document.getElementById("userFail").innerText = "";
                document.getElementById("userSuccess").innerText = "Successfully created user";
            }
        })
        .catch(error => {
            console.error('Error adding user:', error);
        });
    }

    // function for login function 
    function loginUser() {
        const username = document.getElementById('user').value;
        const password = document.getElementById('pass').value;
        console.log("Clicked")

        // Debugging: Log the credentials before sending the request
        console.log('Sending credentials:', { username, password });

        // send a post request to check if the user can log in
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Login response:', data);

            if (data.success) {
                // redirect to the home page on successful login
                window.location.href = "home.html";
            } else {
                // display an error message if login fails
                document.getElementById("loginFail").innerText = "Issue logging in with that info";
            }
        })
        .catch(error => {
            console.error('Error during login:', error);
        });
    }
});