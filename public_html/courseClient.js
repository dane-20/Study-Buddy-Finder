
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
    document.getElementById('courseSidebar').classList.toggle('active');
    document.getElementById('courseBody').classList.toggle('active');
}

// main function for working with the DOM
document.addEventListener('DOMContentLoaded', function() {
    // start checking the session status when the page loads
    checkSessionStatus();

    // start checking course list when page loads
    refreshCourseList();

    const addButton = document.getElementById('addButton');
    const removeButtons = document.querySelectorAll('.removeButton');

    // add event listener to buttons
    addButton.addEventListener('click', addCourse);
    removeButtons.forEach(button => button.addEventListener('click', removeCourse));

    // function to add a course
    function addCourse() {
        const name = document.getElementById('courseSearch').value;
        const professor = document.getElementById('profSearch').value;

        fetch('/add/user/course', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, professor }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Course added:', data);
            document.getElementById('addResult').innerText = 'Course added successfully';
            // clear input fields
            document.getElementById('courseSearch').value = '';
            document.getElementById('profSearch').value = '';
            // refresh the course list
            refreshCourseList();
        })
        .catch(error => {
            console.error('Error adding course:', error);
        });
    }

    // function for removing a course
    function removeCourse(courseId) {
        console.log("clicked")
        fetch(`/remove/user/course/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok. Status: ${response.status}, ${response.statusText}`);
            }
            return response.json();
        })
        .then(updatedCourses => {
            console.log('Course removed. Updated Courses:', updatedCourses);
            // update the display with the new list of courses
            refreshCourseList();
        })
        .catch(error => {
            console.error('Error removing course:', error);
        });
    }

    // function for refreshing the list of courses
    function refreshCourseList() {
        // fetch and update the list of courses after adding or removing
        fetch('/get/user/details', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            const delCourseDiv = document.getElementById('delCourse');
            delCourseDiv.innerHTML = '<h3>Your Courses</h3>';

            if (data.courses.length === 0) {
                delCourseDiv.innerHTML += '<p>No courses added yet.</p>';
            } else {
                data.courses.forEach(course => {
                    const courseDiv = document.createElement('div');
                    courseDiv.innerHTML = `<p>${course.name} - ${course.professor}</p>`;
                    
                    const removeButton = document.createElement('button');
                    removeButton.innerText = 'Remove Course';
                    removeButton.classList.add('removeButton');
                    removeButton.dataset.courseId = course._id;

                    // call removeCourse() when button is clicked
                    removeButton.addEventListener('click', function () {
                        removeCourse(course._id);
                    });

                    courseDiv.appendChild(removeButton);
                    delCourseDiv.appendChild(courseDiv);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching user courses:', error);
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

      // call the updateDateTime function every second
      setInterval(updateDateTime, 1000);
    
});