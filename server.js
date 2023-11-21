const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cookieParser());

// mongodb connection
mongoose.connect('mongodb://localhost/studybuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
// log error if connection to database fails
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// if connection to database is successful, log success messsage
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// mongoose user schema 
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  });

const User = mongoose.model('User', userSchema);

// mongoose course schema
const courseSchema = new mongoose.Schema({
  name: String,
  professor: String,
  enrolledUsers: { type: Number, default: 1 },
});

const Course = mongoose.model('Course', courseSchema);

// mongoose chat schema 
const chatSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  course: String,
});

const Chat = mongoose.model('Chat', chatSchema);

app.use(bodyParser.json());
app.use(express.static(__dirname + '/public_html'));

// route to add a user
app.post('/add/user', (req, res) => {
  const { username, password, courses } = req.body;
  // assign user as user json file 
  const user = new User({ username, password, courses });

  user.save()
  // promise for adding json object for user 
    .then(newUser => {
      // if successful create json object with user data
      res.status(201).json(newUser);
    })
    // if unsuccessful respond with error message
    .catch(error => {
      res.status(400).json({ error: error.message });
    });
});

// route to add course to user
app.post('/add/user/course', checkAuth, (req, res) => {
  const { name, professor } = req.body;
  const username = req.cookies.user;

  // check if the course already exists for any user
  Course.findOne({ name, professor })
      .then(existingCourse => {
          if (existingCourse) {
              // if the course exists increment the enrolledUsers count
              return Course.findByIdAndUpdate(
                  existingCourse._id,
                  { $inc: { enrolledUsers: 1 } },
                  { new: true }
              );
          } else {
              // if the course doesn't exist create a new one
              const newCourse = new Course({ name, professor });
              return newCourse.save();
          }
      })
      .then(updatedCourse => {
          // update the user's courses array with the existing or updated course
          return User.findOneAndUpdate(
              { username },
              { $addToSet: { courses: updatedCourse._id } },
              { new: true }
          );
      })
      .then(updatedUser => {
          res.status(200).json(updatedUser.courses);
      })
      .catch(error => {
          res.status(500).json({ error: error.message });
      });
});


// route to get all users
app.get('/get/users', (req, res) => {
    User.find({})
      .then(users => {
        // format long array of objects under path for readability
        const formattedJSON = JSON.stringify(users, null, 2);
        res.setHeader('Content-Type', 'application/json');
        // display objects 
        res.status(200).end(formattedJSON);
      })
      // display error message if unsuccessful
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
});

// route to get courses associated to user 
app.get('/get/user/courses', checkAuth, (req, res) => {
  const username = req.cookies.user;

  User.findOne({ username })
    .then(user => {
      if (user) {
        const courses = user.courses || [];
        res.status(200).json({ courses });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// route to search for users by username
app.get('/search/users/:keyword', (req, res) => {
    const { keyword } = req.params;
    // case sensitive search for users with keyword 
    User.find({ username: { $regex: keyword, $options: 'i' } })
      .then(users => {
        // format objects under path for readability
        const formattedJSON = JSON.stringify(users, null, 2);
        res.setHeader('Content-Type', 'application/json');
        // display objects
        res.status(200).end(formattedJSON);
      })
      // display error message if unsuccessful
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
});

// route to search courses
app.get('/search/courses/:keyword', (req, res) => {
  const { keyword } = req.params;

  Course.find({
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { professor: { $regex: keyword, $options: 'i' } },
    ],
  })
  .then(courses => {
    res.status(200).json(courses);
  })
  .catch(error => {
    res.status(500).json({ error: error.message });
  });
});

// route to handle user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // check the user's credentials
    User.findOne({ username })
      .then(user => {
        if (!user || user.password !== password) {
          // error if password doesnt match
          return res.status(401).json({ success: false, error: 'Incorrect credentials' });
        }
  
        // set a user identifier as a cookie
        res.cookie('user', user.username, { httpOnly: true });
        res.status(200).json({ success: true, message: 'Login successful' });
      })
      .catch(err => {
        console.error('Error during login:', err);
        res.status(500).json({ error: err.message });
      });
});

// route to add a chat message
app.post('/add/chat', checkAuth, (req, res) => {
  const { message, course } = req.body;
  const username = req.cookies.user;

  const chatMessage = new Chat({ username, message, course });

  chatMessage.save()
    .then(newMessage => {
      res.status(201).json(newMessage);
    })
    .catch(error => {
      res.status(400).json({ error: error.message });
    });
});

// route to get chat messages for a specific course
app.get('/get/chat/:course', checkAuth, (req, res) => {
  const { course } = req.params;

  Chat.find({ course })
    // sort by timestamp in ascending order
    .sort({ timestamp: 'asc' })  
    .then(messages => {
      const formattedJSON = JSON.stringify(messages, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.status(200).end(formattedJSON);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// middleware to check if the user is authenticated
function checkAuth(req, res, next) {
    if (req.cookies.user) {
      // update the cookie's expiration time
      res.cookie('user', req.cookies.user, { httpOnly: true, expires: new Date(Date.now() + 3 * 60 * 1000) });
      next();
    } else {
      // user is not authenticated
      res.status(403).json({ success: false, error: 'Not authenticated' });
    }
}

// route to check the session status
app.get('/check/session', checkAuth, (req, res) => {
    // if the middleware checkAuth allows the request to reach here, the user is authenticated
    res.json({ authenticated: true });
});

// start the server
const port = 80;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});