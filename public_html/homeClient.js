

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
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('homeBody').classList.toggle('active');
}

// update the function to fetch and display user's groups
function fetchUserGroups() {
    // send a request to the server to get user's groups
    fetch('/get/user/groups', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(userGroups => {
        // display user's groups in the My Study Groups section
        displayUserGroupNames('homeGroups', userGroups, 'Leave Group');
      })
      .catch(error => {
        console.error('Error fetching user groups:', error);
      });
}

// update the function to display each group name on a new line
function displayUserGroupNames(sectionId, groups) {
    const section = document.getElementById(sectionId);
    section.innerHTML = `<h2>${sectionId === 'suggested' ? 'Suggested Groups' : 'My Study Groups:'}</h2>`;
  
    if (groups.length === 0) {
      section.innerHTML += `<p>You are not enrolled in any groups.</p>`;
    } else {
      const groupNames = groups.map(group => `<p>- ${group.name}</p>`);
      section.innerHTML += groupNames.join('');
    }
}

// update the function to fetch and display user's sessions
function fetchUserSessions() {
    // send a request to the server to get user's sessions
    fetch('/get/sessions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(sessions => {
        // display user's sessions in the Upcoming Study Sessions section
        displayUserSessions('homeSchedule', sessions);
      })
      .catch(error => {
        console.error('Error fetching user sessions:', error);
      });
}

// update the function to display each session with formatted date
function displayUserSessions(sectionId, sessions) {
    const section = document.getElementById(sectionId);
    section.innerHTML = `<h2>${sectionId === 'suggested' ? 'Suggested Groups' : 'Upcoming Study Sessions:'}</h2>`;
  
    if (sessions.length === 0) {
      section.innerHTML += `<p>No upcoming study sessions.</p>`;
    } else {
      const sessionDetails = sessions.map(session => {
        // Check if 'creator' field exists
        const creatorUsername = session.creator ? session.creator.username : 'Unknown';
        
        // Check if 'buddy' field exists
        const buddyUsername = session.buddy ? session.buddy.username : 'Unknown';

        // Format the date
        const formattedDate = new Date(session.date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });

        return `<p>- ${session.location}, ${formattedDate} with ${creatorUsername} and ${buddyUsername}</p>`;
      });
      section.innerHTML += sessionDetails.join('');
    }
}

// main function for working with the DOM
document.addEventListener('DOMContentLoaded', function() {
    // start checking the session status when the page loads
    checkSessionStatus();

    // fetch and display user's study groups when the page loads
    fetchUserGroups();

    // fetch and display user's study sessions when the page loads
    fetchUserSessions();

    // function to get user details and courses and update the display
    function getUserDetails() {
        fetch('/check/session', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                // if the user is authenticated, fetch their details
                fetch('/get/user/details', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                .then(response => response.json())
                .then(userData => {
                    // update the greeting with the user's username
                    const greeting = document.getElementById('greeting');
                    greeting.innerText = `Hello, ${userData.username}! Let's get studying!`;

                    // display the user's courses
                    const coursesList = document.getElementById('coursesList');
                    coursesList.innerHTML = '';

                    if (userData.courses.length === 0) {
                        coursesList.innerHTML = "<p>No courses enrolled</p>";
                    } else {
                        userData.courses.forEach(course => {
                            coursesList.innerHTML += `<p>- ${course.name} - ${course.professor}</p>`;
                        });
                    }
                })
                .catch(error => {
                    console.error('Error fetching user details:', error);
                });
            } else {
                // if the user is not authenticated, redirect to the login page
                window.location.href = "login.html";
            }
        })
        .catch(error => {
            console.error('Error checking session:', error);
        });
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

    // call the function to get and display user details
    getUserDetails();

    // call the updateDateTime function every second
    setInterval(updateDateTime, 1000);
    
});