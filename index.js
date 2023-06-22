const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Error connecting to the database', err);
  });
  
const { Schema } = mongoose;

const userSchema = new Schema({
  username: String,
});

const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: String,
  date: Date,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await User.create({ username: req.body.username });
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'An error occurred while creating a user' });
  }
});


app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('_id username');
    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'An error occurred while retrieving users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;
  const exerciseDate = date ? new Date(date) : new Date();

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.send('Could not find user');
    }

    const exercise = new Exercise({
      user_id: _id,
      description,
      duration,
      date: exerciseDate,
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: savedExercise.user_id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'An error occurred while saving the exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const query = Exercise.find({ user_id: _id });

  if (from) {
    const fromDate = new Date(from);
    query.where('date').gte(fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    query.where('date').lte(toDate);
  }

  if (limit) {
    const limitValue = parseInt(limit, 10);
    query.limit(limitValue);
  }

  try {
    const exercises = await query.exec();
    const exerciseCount = exercises.length;
    const exerciseLog = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    res.json({
      _id,
      username: 'user-username',
      count: exerciseCount,
      log: exerciseLog,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'An error occurred while retrieving the exercise log' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
