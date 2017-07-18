'use strict';

var mongoose = require('mongoose');

var blogPostSchema = mongoose.Schema({
  author: {
    firstName: String,
    lastName: String
  },
  title: { type: String, required: true },
  content: { type: String },
  created: { type: Date, default: Date.now }
});

blogPostSchema.virtual('authorName').get(function () {
  return (this.author.firstName + ' ' + this.author.lastName).trim();
});

blogPostSchema.methods.apiRepr = function () {
  return {
    id: this._id,
    author: this.authorName,
    content: this.content,
    title: this.title,
    created: this.created
  };
};

var BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = { BlogPost: BlogPost };