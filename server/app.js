const express = require('express');
const app = express();
const postsRouter = require('./routes/posts');

app.use('/api/posts', postsRouter); 