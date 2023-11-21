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
    document.getElementById('courseSidebar').classList.toggle('active');
}

// main function for working with the DOM
document.addEventListener('DOMContentLoaded', function() {
    // start checking the session status when the page loads
    checkSessionStatus();

    const addButton = document.getElementById('addButton');

    // add event listener to button
    addButton.addEventListener('click', addCourse);

    // function to add a course
    function addCourse() {
        const courseName = document.getElementById('courseSearch').value;
        const professorName = document.getElementById('profSearch').value;

        // send a POST request to add the course
        fetch('/add/user/course', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: courseName, professor: professorName }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Course added:', data);
            document.getElementById("addResult").innerText = 'Course added Successfully'
            updateCourseList(data.name, data.professor);
        })
        .catch(error => {
            console.error('Error adding course:', error);
        });
    }

    // function to update the course list on the page
    function updateCourseList(courseName, professorName) {
        const courseList = document.getElementById('delCourse');
        const courseItem = document.createElement('div');
        courseItem.innerHTML = `<p>${courseName} - ${professorName}</p>`;
        courseList.appendChild(courseItem);
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