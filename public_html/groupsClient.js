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
    document.getElementById('groupsSidebar').classList.toggle('active');
    document.getElementById('groupsBody').classList.toggle('active');
}

// main function for working with the DOM
document.addEventListener('DOMContentLoaded', function() {
    
    // start checking the session status when the page loads
    checkSessionStatus();

    // function to fetch and display suggested groups
    function fetchSuggestedGroups() {
        // send a request to the server to get suggested groups based on user's courses
        fetch('/get/suggested/groups', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(suggestedGroups => {
                // Fetch user's groups to check which suggested groups they have already joined
                fetch('/get/user/groups', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                    .then(response => response.json())
                    .then(userGroups => {
                        // Remove user's groups from the suggested groups
                        const filteredGroups = suggestedGroups.filter(group => !userGroups.some(userGroup => userGroup._id === group._id));
                        
                        // Display the filtered suggested groups
                        displayGroups('suggested', filteredGroups, 'Join Group');
                    })
                    .catch(error => {
                        console.error('Error fetching user groups:', error);
                    });
            })
            .catch(error => {
                console.error('Error fetching suggested groups:', error);
            });
    }

    // function to fetch and display user's groups
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
                // display user's groups in the user groups section
                displayGroups('groupList', userGroups, 'Leave Group');
            })
            .catch(error => {
                console.error('Error fetching user groups:', error);
                console.log('Response:', error.response);
            });
    }

    // function to display groups in a specific section
    function displayGroups(sectionId, groups, buttonLabel) {
        const section = document.getElementById(sectionId);
        section.innerHTML = `<h2>${sectionId === 'suggested' ? 'Suggested Groups' : 'Your Groups'}</h2>`;
    
        if (groups.length === 0) {
            section.innerHTML += sectionId === 'groupList' ? `<p>You are not enrolled in any groups.</p>` : `<p>No groups available.</p>`;
        } else {
            groups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.innerHTML = `<p>${group.name}</p>`;
    
                const actionButton = document.createElement('button');
                actionButton.innerText = buttonLabel;
                actionButton.dataset.groupId = group._id;
    
                // add event listener to the button based on the action
                actionButton.addEventListener('click', () => {
                    if (buttonLabel === 'Join Group') {
                        joinGroup(group._id);
                    } else {
                        leaveGroup(group._id);
                    }
    
                    // Remove the group from the suggested section
                    section.removeChild(groupDiv);
                });
    
                groupDiv.appendChild(actionButton);
                section.appendChild(groupDiv);
            });
        }
    }

    // function to handle joining a group
    function joinGroup(groupId) {
        console.log('Join Group button clicked');
        
        // send a request to the server to join the group
        fetch(`/join/group/${groupId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(updatedGroups => {
            console.log('Updated groups:', updatedGroups);
            // refresh the displayed groups
            fetchSuggestedGroups();
            fetchUserGroups();
        })
        .catch(error => {
            console.error('Error joining group:', error);
        });
    }

    // function to handle leaving a group
    function leaveGroup(groupId) {
        // send a request to the server to leave the group
        fetch(`/leave/group/${groupId}`, {
            method: 'POST', // Change the method to POST as your server route is using POST
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(updatedGroups => {
                // refresh the displayed groups
                fetchSuggestedGroups();
                fetchUserGroups();
            })
            .catch(error => {
                console.error('Error leaving group:', error);
            });
    }

    // fetch and display suggested groups when the page loads
    fetchSuggestedGroups();

    // fetch and display user's groups when the page loads
    fetchUserGroups();

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
    
});