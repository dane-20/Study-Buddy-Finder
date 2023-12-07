
// fetch and display user's groups with members
function fetchUserGroups() {
    // make get request to retrieve user groups
    fetch('/get/user/groups')
      .then(response => response.json())
      .then(groups => {
        displayUserGroups(groups);
      })
      .catch(error => {
        console.error('Error fetching user groups:', error);
      });
  }
  
// display user's groups with members
function displayUserGroups(groups) {
    const myGroupSection = document.getElementById('myGroup');
  
    if (groups.length === 0) {
      myGroupSection.innerHTML = '<p>You are not a member of any groups.</p>';
    } else {
      groups.forEach(group => {
        // display group name
        myGroupSection.innerHTML += `<h3>${group.name}</h3>`;
        
        // display group members
        if (group.members.length === 0) {
          myGroupSection.innerHTML += '<p>No members in this group.</p>';
        } else {
          const membersList = group.members.map(member => `<p>@${member.username}</p>`);
          myGroupSection.innerHTML += membersList.join('');
        }
      });
    }
}

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

function logoutUser() {
    // make post request to the server logout endpoint
    fetch('/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Logout failed');
        }
        // clear the user session or token on the client side
        localStorage.removeItem('authToken');
  
        // redirect user to the index.html or login page
        window.location.href = 'index.html';
      })
      .catch((error) => {
        console.error(error);
      });
}

function show() {
    document.getElementById('meetSidebar').classList.toggle('active');
    document.getElementById('meetBody').classList.toggle('active');
}

// main function for working with the DOM
document.addEventListener('DOMContentLoaded', async function () {
    // start checking the session status when the page loads
    checkSessionStatus();

    // Function to create a session on the server
    async function addSession(sessionData) {
        try {
            const response = await fetch('/add/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData),
            });

            if (!response.ok) {
                throw new Error('Failed to add session');
            }
        } catch (error) {
            console.error('Error creating session:', error);
            // Handle error if needed
            throw error; // Rethrow the error to propagate it to the next catch block
        }
    }

    // Fetch and display user's groups with members
    async function fetchUserGroups() {
        try {
            // Make get request to retrieve user groups
            const response = await fetch('/get/user/groups');
            const groups = await response.json();
            displayUserGroups(groups);
        } catch (error) {
            console.error('Error fetching user groups:', error);
        }
    }

    // Display user's groups with members
    function displayUserGroups(groups) {
        const myGroupSection = document.getElementById('myGroup');

        if (groups.length === 0) {
            myGroupSection.innerHTML = '<p>You are not a member of any groups.</p>';
        } else {
            groups.forEach(group => {
                // Display group name
                myGroupSection.innerHTML += `<h3>${group.name}</h3>`;

                // Display group members
                if (group.members.length === 0) {
                    myGroupSection.innerHTML += '<p>No members in this group.</p>';
                } else {
                    const membersList = group.members.map(member => `<p>@${member.username}</p>`);
                    myGroupSection.innerHTML += membersList.join('');
                }
            });
        }
    }

    // add button click event listener
    document.getElementById('sessionCreation').addEventListener('click', async function () {
        // assume you have retrieved session data, replace this with actual data
        const sessionData = {
            buddy: document.getElementById('buddy').value,
            location: document.getElementById('location').value,
            date: document.getElementById('date').value,
        };

        const rawDate = new Date(sessionData.date);

        // format the date
        const formattedDate = rawDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        });

        // display the formatted date inside the datetime-local input
        document.getElementById('date').value = formattedDate;
        console.log(sessionData.buddy);
        try {
            // assume a function to create the session on the server
            await addSession(sessionData);

            // session successfully created, update the UI
            const sessionElement = document.createElement('div');
            sessionElement.innerHTML = `
                <p>Buddy: ${sessionData.buddy}</p>
                <p>Location: ${sessionData.location}</p>
                <p>Date: ${formattedDate}</p>
                <button id="markCompletedBtn" data-session-buddy="${sessionData.buddy}">Mark as Completed</button>
            `;

            // append the session element to the sessionList
            document.getElementById('sessionList').appendChild(sessionElement);

            // clear the input fields and display success message
            document.getElementById('buddy').value = '';
            document.getElementById('location').value = '';
            document.getElementById('sessionSuccess').textContent = 'Session Successfully Created';
        } catch (error) {
            // error if session creation fails
            console.error('Error creating session:', error);
        }
    });

    // fetch sessions from the server when the page loads
    try {
        const response = await fetch('/get/sessions');
        const sessions = await response.json();

        // loop through sessions and display them
        const sessionList = document.getElementById('sessionList');
        sessions.forEach(sessionData => {
            const sessionElement = document.createElement('div');

            // extract usernames from user and buddy objects
            const creatorUsername = sessionData.creator ? sessionData.creator.username : 'Unknown User';
            const buddyUsername = sessionData.buddy ? sessionData.buddy.username : 'Unknown Buddy';

            // format date
            const formattedDate = new Date(sessionData.date).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
            });

            sessionElement.innerHTML = `
            <p>Buddy 1: ${creatorUsername}</p>
            <p>Buddy 2: ${buddyUsername}</p>
            <p>Location: ${sessionData.location}</p>
            <p>Date: ${formattedDate}</p>
            <button id="markCompletedBtn" data-session-id="${sessionData._id}" data-session-buddy="${buddyUsername}">Mark as Completed</button>
            `;
            sessionList.appendChild(sessionElement);
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
    }

    document.getElementById('sessionList').addEventListener('click', async function (event) {
        // Assuming you have set the "Mark As Completed" button as an id
        if (event.target.id === 'markCompletedBtn') {
            const sessionId = event.target.dataset.sessionId;
    
            try {
                // Assume a function to mark the session as completed on the server
                await markSessionAsCompleted(sessionId);
    
                // Remove the session element from the UI
                event.target.parentElement.remove();
            } catch (error) {
                console.error('Error marking session as completed:', error);
                // Handle error if needed
            }
        }
    });
    
    async function markSessionAsCompleted(sessionId) {
        try {
            const response = await fetch(`/mark/session/completed/${sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error('Failed to mark session as completed');
            }
        } catch (error) {
            console.error('Error marking session as completed:', error);
            // Handle error if needed
            throw error; // Rethrow the error to propagate it to the next catch block
        }
    }

    // function to update the date and time
    function updateDateTime() {
        // create a new date object
        const now = new Date();

        // get the current date and time as a string
        const currentDateTime = now.toLocaleString();

        // update the textContent property of the span element
        document.querySelector('.date').textContent = currentDateTime;
    }

    // call the updateDateTime function every second
    setInterval(updateDateTime, 1000);

    // fetch and display user groups when the page loads
    fetchUserGroups();
});