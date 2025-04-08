const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const mongoURI = process.env.MONGO_URI
mongoose.connect(mongoURI)

const userSchema = new mongoose.Schema({
  username: String,
  exercises: [{
    description: String,
    duration: Number,
    date: Date
  }]
  
})

const User = mongoose.model("User", userSchema)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async function (req,res) {
  try {
    const { username } = req.body
    console.log({ username })
    const newUser = new User({ username })
    const savedUser = await newUser.save()
    const user = {
      username: savedUser.username,
      _id: savedUser._id
    }
    res.json(user)
    
  } catch (error) {
    console.error("Error creating user:", err);
    
  }
})

app.get('/api/users', async(req,res) => {
  try {
    const users = await User.find({}, '_id username __v')
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error);
  }
})

app.get('/api/users/:_id/logs', async(req,res) => {
  const { _id } = req.params
  const { from, to, limit } = req.query
  let fromDate = null
  let toDate = null
  const isValidDate = (date) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(date);
  }
  if (from) {
    if(isValidDate(from)){
      fromDate = new Date(from)
      console.log(fromDate)
    }
  }

  if (to) {
    if(isValidDate(to)){
      toDate = new Date(to)
      console.log(toDate)
    }
  }

  const user = await User.findById(_id)
  let filterEx = user.exercises
  if (fromDate) {
    filterEx = filterEx.filter(ex => new Date(ex.date) >= fromDate);
  }

  // Apply 'to' filter if provided
  if (toDate) {
    filterEx = filterEx.filter(ex => new Date(ex.date) <= toDate);
  }

  // Apply limit if provided
  const exerciseLimit = limit ? parseInt(limit) : filterEx.length;

  // Slice the exercises to the limit
  filterEx = filterEx.slice(0, exerciseLimit);
  console.log(filterEx)
  const log = filterEx.map(ex => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date.toDateString()
  }))

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log: log
  })


})

app.post('/api/users/:_id/exercises', async (req,res) => {
  const { _id } = req.params
  const { description, duration, date } = req.body
  console.log({ _id, description, duration, date })
  const dur = parseInt(duration)
  let formattedDate;
  if (!date) {
    formattedDate = new Date().toDateString()
  } else {
    const parsedDate = new Date(date)
    formattedDate = parsedDate.toDateString()
  }
  const user = await User.findByIdAndUpdate(_id,
    {
      $push: {
        exercises: {
          description,
          duration: dur,
          date: formattedDate
        }
      }
    },
    { new: true }
  )
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    _id: _id,
    username: user.username,
    date: formattedDate,
    duration: dur,
    description,
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})