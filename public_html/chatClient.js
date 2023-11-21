// function to check session status
function checkSessionStatus() {
    // send a request to the server to check if the user is still authenticated
    fetch('/check/session', {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json',
       },
    })
        .then((response) => response.json())
        .then((data) => {
        if (data.authenticated) {
            // user is still authenticated, continue checking
            setTimeout(checkSessionStatus, 180000); 
        } else {
            // user is not authenticated, log them out 
            window.location.href = 'index.html';
        }
        })
        .catch((error) => {
        console.error('Error checking session:', error);
        });
}

function show() {
  document.getElementById('chatSidebar').classList.toggle('active');
  document.getElementById('footer').classList.toggle('active');
  document.getElementById('chatBody').classList.toggle('active');
}

async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;
    const course = 'Math101';  // Replace with the course associated with the chat
  
    fetch('/add/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, message, course }),
    })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to send message');
        throw new Error('Failed to send message');
      }
      return response.json();
    })
    .then(data => {
      displayMessage(data);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  
    // Clear the input field
    messageInput.value = '';
}
  
function displayMessage(data) {
    const chatBox = document.getElementById('chat-box');
    const formattedMessage = `<p>${data.username}: ${data.message}</p>`;
    chatBox.innerHTML += formattedMessage;
}

// main function for working with the DOM
document.addEventListener('DOMContentLoaded', function() {
    // start checking the session status when the page loads
    checkSessionStatus();

    // function to update the date and time
    function updateDateTime() {
        // create a new date object
        const now = new Date();

        // get the current date and time as a string
        const currentDateTime = now.toLocaleString();

        // update the textContent property of the span element
        document.querySelector('#chatDate').textContent = currentDateTime;
      }

      // call the `updateDateTime` function every second
      setInterval(updateDateTime, 1000);

    
});