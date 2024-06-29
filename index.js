const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');

const app = express();
const uploadMiddleware = multer({ dest: 'uploads/' });
const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkj';

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect('mongodb://localhost:27017/Techblogs')
.then(() => console.log('MongoDB Connected...'))
.catch((err) => console.error(err));

app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const userDoc = await User.create({
      username,
      email,
      password: bcrypt.hashSync(password, salt),
    });
    if(res.status === 200){
      res.json(userDoc);
    }
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  if (!userDoc) {
    return res.status(400).json('User not found');
  }
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    const token = jwt.sign({ username, id: userDoc._id }, secret);
    res.cookie('token', token, { httpOnly: true }).json({
      id: userDoc._id,
      username,
    });
  } else {
    res.status(400).json('Wrong credentials');
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json('Unauthorized');
  }
  jwt.verify(token, secret, (err, info) => {
    if (err) {
      return res.status(401).json('Unauthorized');
    }
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  res.clearCookie('token').json('Logged out');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, async (err, info) => {
    if (err) {
      return res.status(401).json('Unauthorized');
    }
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, async (err, info) => {
    if (err) {
      return res.status(401).json('Unauthorized');
    }
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    if (!postDoc) {
      return res.status(404).json('Post not found');
    }
    if (String(postDoc.author) !== String(info.id)) {
      return res.status(403).json('You are not the author');
    }
    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });
    res.json(postDoc);
  });
});

app.get('/post', async (req, res) => {
  const posts = await Post.find()
    .populate('author', ['username'])
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(posts);
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  if (!postDoc) {
    return res.status(404).json('Post not found');
  }
  res.json(postDoc);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
