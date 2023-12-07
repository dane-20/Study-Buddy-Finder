const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
app.use(cookieParser());

// use express-session middleware
app.use(session({
  secret: 'imsotired',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 180000 },
}));

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
  salt: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
});

const User = mongoose.model('User', userSchema);

// mongoose course schema
const courseSchema = new mongoose.Schema({
  name: String,
  professor: String,
  enrolledUsers: { type: Number, default: 1 },
});

const Course = mongoose.model('Course', courseSchema);

// mongoose group schema 
const groupSchema = new mongoose.Schema({
  name: String,
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const Group = mongoose.model('Group', groupSchema);

// mongoose session schema
const sessionSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buddy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: String,
  date: Date,
});

const Session = mongoose.model('Session', sessionSchema);

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

  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');

  // Hash the password with the generated salt
  const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex');

  // Create a new user with the hashed password and salt
  const user = new User({
      username,
      password: hashedPassword,
      salt,
      courses,
  });

  user.save()
      .then(newUser => {
          res.status(201).json(newUser);
      })
      .catch(error => {
          res.status(400).json({ error: error.message });
      });
});

// route to add course to user
app.post('/add/user/course', checkAuth, async (req, res) => {
  try {
    const { name, professor } = req.body;
    const username = req.cookies.user;

    // check if the course already exists for any user
    const existingCourse = await Course.findOne({ name, professor });

    if (existingCourse) {
      // if the course exists, increment the enrolledUsers count
      const updatedCourse = await Course.findByIdAndUpdate(
        existingCourse._id,
        { $inc: { enrolledUsers: 1 } },
        { new: true }
      );

      // check if a group already exists for the course
      const existingGroup = await Group.findOne({ course: existingCourse._id });

      if (existingGroup) {
        // if a group already exists, return the existing group without creating a new one
        const updatedUser = await User.findOneAndUpdate(
          { username },
          { $addToSet: { courses: updatedCourse._id } },
          { new: true }
        );

        return res.status(200).json(updatedUser.courses);
      } else {
        // create a new group for the course
        const newGroup = new Group({ name: `Study Group for ${name}, ${professor}`, members: [], course: existingCourse._id });
        await newGroup.save();

        // update the user's courses array with the existing or updated course
        const updatedUser = await User.findOneAndUpdate(
          { username },
          { $addToSet: { courses: updatedCourse._id } },
          { new: true }
        );

        return res.status(200).json(updatedUser.courses);
      }
    } else {
      // if the course doesn't exist, create a new one
      const newCourse = new Course({ name, professor });
      const updatedCourse = await newCourse.save();

      // create a new group for the course
      const newGroup = new Group({ name: `Study Group for ${name}, ${professor}`, members: [], course: updatedCourse._id });
      await newGroup.save();

      // update the user's courses array with the existing or updated course
      const updatedUser = await User.findOneAndUpdate(
        { username },
        { $addToSet: { courses: updatedCourse._id } },
        { new: true }
      );

      return res.status(200).json(updatedUser.courses);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// route to remove a course from user profile
app.delete('/remove/user/course/:courseId', checkAuth, (req, res) => {
  const { courseId } = req.params;
  const username = req.cookies.user;

  // initialize variable
  let updatedUser;

  // find user and pull course from courses array
  User.findOneAndUpdate(
      { username },
      { $pull: { courses: courseId } },
      { new: true }
  )
  .then(user => {
      // assign user to updatedUser
      updatedUser = user;
      if (!updatedUser) {
          console.error('User not found.');
          return res.status(404).json({ error: 'User not found.' });
      }

      // decrement the enrolledUsers count in the Course schema
      return Course.findByIdAndUpdate(
          courseId,
          { $inc: { enrolledUsers: -1 } },
          { new: true }
      );
  })
  .then(updatedCourse => {
      if (!updatedCourse) {
          console.error('Course not found.');
          return res.status(404).json({ error: 'Course not found.' });
      }

      res.status(200).json(updatedUser.courses);
  })
  .catch(error => {
      console.error('Error removing course:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  });
});

// route to get suggested groups based on user's courses
app.get('/get/suggested/groups', checkAuth, (req, res) => {
  const username = req.cookies.user;

  // find user based on the username
  User.findOne({ username })
      .populate('courses')
      .exec()
      .then(user => {
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }

          // extract user's enrolled course IDs
          const userCourses = user.courses.map(course => course._id);

          // find suggested groups based on user's courses
          return Group.find({ course: { $in: userCourses } });
      })
      .then(suggestedGroups => {
          // respond with the suggested groups
          res.status(200).json(suggestedGroups);
      })
      .catch(error => {
          console.error('Error getting suggested groups:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      });
});

/// route to get user's groups
app.get('/get/user/groups', checkAuth, async (req, res) => {
  try {
      const username = req.cookies.user;

      // fetch the user's groups and populate the 'members' field with 'username'
      const user = await User.findOne({ username }).populate({
        path: 'groups',
        populate: {
          path: 'members',
          select: 'username',
        },
      });

      // filter out the current user's username from the members list
      const userGroups = user.groups.map(group => ({
        ...group.toJSON(),
        members: group.members.filter(member => member.username !== username),
      }));

      // send the user's groups to the client
      res.status(200).json(userGroups);
  } catch (error) {
      console.error('Error fetching user groups:', error);
      res.status(500).json({ error: error.message });
  }
});

// route for joining a group
app.post('/join/group/:groupId', checkAuth, async (req, res) => {
  const { groupId } = req.params;
  const username = req.cookies.user;

  try {
    console.log('Joining group. GroupId:', groupId, 'Username:', username);

    // Find the user based on the username
    const user = await User.findOne({ username });

    if (!user) {
      console.error('User not found:', username);
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user's groups array with the joined group
    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $addToSet: { groups: groupId } },
      { new: true }
    );

    if (!updatedUser) {
      console.error('User not found in the update result:', username);
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the updated user
    console.log('Updated User:', updatedUser);

    // Update the group's members array with the joined user
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId },
      { $addToSet: { members: updatedUser._id } },
      { new: true }
    );

    if (!updatedGroup) {
      console.error('Group not found or user not added to members array:', groupId);
      return res.status(404).json({ error: 'Group not found or user not added to members array' });
    }

    // Log the updated group
    console.log('Updated Group:', updatedGroup);

    // Respond with a success message
    res.status(200).json({ message: 'Join group successful' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// route to leave a group
app.post('/leave/group/:groupId', checkAuth, (req, res) => {
  const { groupId } = req.params;
  const username = req.cookies.user;
  let updatedUser;

  console.log(`Leave Group - User: ${username}, Group ID: ${groupId}`);

  // update the user's groups array by removing the group
  User.findOneAndUpdate(
      { username },
      { $pull: { groups: groupId } },
      { new: true }
  )
      .then(user => {
          updatedUser = user;

          // update the group's members array by removing the user
          return Group.findByIdAndUpdate(
              groupId,
              { $pull: { members: updatedUser._id } },
              { new: true }
          );
      })
      .then(() => {
          // send the updated user's groups to the client
          return res.status(200).json(updatedUser.groups);
      })
      .catch(error => {
          console.error('Error leaving group:', error);
          return res.status(500).json({ error: error.message });
      });
});

// route to add a session
app.post('/add/session', checkAuth, async (req, res) => {
  try {
    const { buddy, location, date } = req.body;
    const username = req.cookies.user;

    // Find the user based on the username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // find the buddy based on the provided username
    const buddyUser = await User.findOne({ username: buddy });

    if (!buddyUser) {
      return res.status(404).json({ error: 'Buddy not found' });
    }

    // create a new session with both creator and buddy information
    const newSession = new Session({
      creator: user._id,
      buddy: buddyUser._id,
      location,
      date,
    });

    // save the new session
    const savedSession = await newSession.save();

    res.status(201).json(savedSession);
  } catch (error) {
    console.error('Error adding session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// route to get sessions
app.get('/get/sessions', checkAuth, async (req, res) => {
  try {
    const username = req.cookies.user;

    // Find the user based on the username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Retrieve sessions where the user is either the creator or the buddy
    const sessions = await Session.find({
      $or: [{ creator: user._id }, { buddy: user._id }],
    })
      .populate('creator', 'username')
      .populate('buddy', 'username')
      .exec();

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// route to mark a session as completed
app.post('/mark/session/completed/:sessionId', checkAuth, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Use Mongoose's deleteOne method to remove the session from the database
    const result = await Session.deleteOne({ _id: sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(204).end(); // No content, operation successful
  } catch (error) {
    console.error('Error marking session as completed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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

// route to get firm details on user's
app.get('/get/user/details', checkAuth, (req, res) => {
  const username = req.cookies.user;

  User.findOne({ username })
    // populate the courses array with actual course documents
    .populate('courses')  
    .then((user) => {
      if (!user) {
        console.error('User not found:', username);
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        username: user.username,
        courses: user.courses,
      });
    })
    .catch((error) => {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
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

  // For debugging purposes, log the received credentials
  console.log('Received credentials:', { username, password });

  // Find the user based on the provided username
  User.findOne({ username })
      .then(user => {
          // For debugging purposes, log the user found in the database
          console.log('User found in the database:', user);

          if (!user) {
              return res.status(401).json({ success: false, error: 'Incorrect credentials' });
          }

          // Hash the provided password using the stored salt
          const hashedPassword = crypto.createHash('sha256').update(password + user.salt).digest('hex');

          // For debugging purposes, log the hashed password
          console.log('Hashed password:', hashedPassword);

          // Compare the hashed passwords
          if (hashedPassword === user.password) {
              // Passwords match, set a user identifier as a cookie
              res.cookie('user', user.username, { httpOnly: true });
              res.status(200).json({ success: true, message: 'Login successful' });
          } else {
              // Passwords do not match
              res.status(401).json({ success: false, error: 'Incorrect credentials' });
          }
      })
      .catch(err => {
          console.error('Error during login:', err);
          res.status(500).json({ error: err.message });
      });
});

// Logout route
app.post('/logout', (req, res) => {
  // Clear the session on the server side
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      // Clear any existing cookies on the client side
      res.clearCookie('user');
      res.json({ message: 'Logout successful' });
    }
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

app.get('/check/session', checkAuth, (req, res) => {
  // Log the session information
  console.log(req.session);
  res.json({ authenticated: true });
});

// start the server
const port = 80;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});