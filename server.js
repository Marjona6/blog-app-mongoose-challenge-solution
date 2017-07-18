'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var mongoose = require('mongoose');
var morgan = require('morgan');

var _require = require('./config'),
    DATABASE_URL = _require.DATABASE_URL,
    PORT = _require.PORT;

var _require2 = require('./models'),
    BlogPost = _require2.BlogPost;

var app = express();

app.use(morgan('common'));
app.use(bodyParser.json());

mongoose.Promise = global.Promise;

app.get('/posts', function (req, res) {
  BlogPost.find().exec().then(function (posts) {
    res.json(posts.map(function (post) {
      return post.apiRepr();
    }));
  }).catch(function (err) {
    console.error(err);
    res.status(500).json({ error: 'something went terribly wrong' });
  });
});

app.get('/posts/:id', function (req, res) {
  BlogPost.findById(req.params.id).exec().then(function (post) {
    return res.json(post.apiRepr());
  }).catch(function (err) {
    console.error(err);
    res.status(500).json({ error: 'something went horribly awry' });
  });
});

app.post('/posts', function (req, res) {
  var requiredFields = ['title', 'content', 'author'];
  for (var i = 0; i < requiredFields.length; i++) {
    var field = requiredFields[i];
    if (!(field in req.body)) {
      var message = 'Missing `' + field + '` in request body';
      console.error(message);
      return res.status(400).send(message);
    }
  }

  BlogPost.create({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author
  }).then(function (blogPost) {
    return res.status(201).json(blogPost.apiRepr());
  }).catch(function (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });
});

app.delete('/posts/:id', function (req, res) {
  BlogPost.findByIdAndRemove(req.params.id).exec().then(function () {
    res.status(204).json({ message: 'success' });
  }).catch(function (err) {
    console.error(err);
    res.status(500).json({ error: 'something went terribly wrong' });
  });
});

app.put('/posts/:id', function (req, res) {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    res.status(400).json({
      error: 'Request path id and request body id values must match'
    });
  }

  var updated = {};
  var updateableFields = ['title', 'content', 'author'];
  updateableFields.forEach(function (field) {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  BlogPost.findByIdAndUpdate(req.params.id, { $set: updated }, { new: true }).exec().then(function (updatedPost) {
    return res.status(201).json(updatedPost.apiRepr());
  }).catch(function (err) {
    return res.status(500).json({ message: 'Something went wrong' });
  });
});

app.delete('/:id', function (req, res) {
  BlogPosts.findByIdAndRemove(req.params.id).exec().then(function () {
    console.log('Deleted blog post with id `' + req.params.ID + '`');
    res.status(204).end();
  });
});

app.use('*', function (req, res) {
  res.status(404).json({ message: 'Not Found' });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
var server = void 0;

// this function connects to our database, then starts the server
function runServer() {
  var databaseUrl = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DATABASE_URL;
  var port = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : PORT;

  return new Promise(function (resolve, reject) {
    mongoose.connect(databaseUrl, function (err) {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, function () {
        console.log('Your app is listening on port ' + port);
        resolve();
      }).on('error', function (err) {
        mongoose.disconnect();
        reject(err);
      });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(function () {
    return new Promise(function (resolve, reject) {
      console.log('Closing server');
      server.close(function (err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(function (err) {
    return console.error(err);
  });
};

module.exports = { runServer: runServer, app: app, closeServer: closeServer };