"use strict";

var chai = require('chai');
var chaiHttp = require('chai-http');
var faker = require('faker');
var mongoose = require('mongoose');

var should = chai.should();

// requiring in the js files from this app
var _require = require('../models'),
	BlogPost = _require.BlogPost;

var _require2 = require('../server'),
	app = _require2.app,
	runServer = _require2.runServer,
	closeServer = _require2.closeServer;

var _require3 = require('../config'),
	TEST_DATABASE_URL = _require3.TEST_DATABASE_URL;

chai.use(chaiHttp);

// generate fake blog post data to work with
function seedBlogPostData() {
	console.info('seeding blog post data');
	var seedData = [];

	for (var i = 1; i <= 10; i++) {
		seedData.push(generateBlogPostData());
	}
	// console.log(seedData);
	// returns a promise
	return BlogPost.insertMany(seedData);
}

function generateAuthor() {
	var fName = ['Engelbert', 'Throckmorton', 'Phineas', 'Amelia', 'Gertrude', 'Myrtle'];
	var lName = ['Rockefeller', 'Washington', 'Lincoln', 'Truth', 'Yusufzai', 'Clinton'];
	return {
		firstName : fName[Math.floor(Math.random() * fName.length)],
		lastName : lName[Math.floor(Math.random() * lName.length)]
	};
}

function generateTitle() {
	var fakeTitle = ['Much Ado About JavaScript', 'The Picture of Dorian Mongoose', 'Pride and Prototypes', 'Fifty Shades of False'];
	return fakeTitle[Math.floor(Math.random() * fakeTitle.length)];
}

function generateContent() {
	var fakeContent = ['Lorem ipsum dolor sit amet, an sonet tibique appetere est. Has iuvaret fabulas molestie at, no quo nostrud intellegat. Ut eros mandamus cum, timeam quaeque no duo. Eu mei utinam aliquam urbanitas, tractatos suscipiantur necessitatibus per et. Ut nam principes neglegentur.',
						'Mel scripta iudicabit philosophia et, has imperdiet gubergren ad. Et ius novum suscipit, mel ne iisque noluisse signiferumque, ut pro ubique bonorum consetetur. Ea vel lorem petentium, ius et alterum vivendum consulatu, maiorum accusamus appellantur has te. Ut sea nostrum erroribus, vel iusto lobortis at, alii eripuit commune mel cu. Mel te possit offendit salutatus, id alia denique theophrastus sed.',
						'Tantas mentitum maiestatis sed ei, diam tation bonorum sed ei. At vidit essent nam. Sea ea conceptam adversarium ullamcorper, eos an aperiam vituperata. Augue eligendi hendrerit vis te, ad nobis solet interpretaris pro. Ea has erroribus concludaturque. Te nec ullum probatus interpretaris. Eum in quidam dicunt ocurreret, vel summo persequeris ut, ut vel tamquam suavitate.'];
	return fakeContent[Math.floor(Math.random() * fakeContent.length)];
}

function generateCreated() {
	return faker.date.past();
}

function generateBlogPostData() {
	return {
		author: generateAuthor(),
		title: generateTitle(),
		content: generateContent(),
		created: generateCreated()
	};
}

function tearDownDb() {
	console.warn('Deleting database!');
	// what is this below?
	return mongoose.connection.dropDatabase();
}

describe ('Blog posts API resource', function() {
	// all of the below return promises instead of using callbacks
	before(function() {
		return runServer(TEST_DATABASE_URL);
	});
	beforeEach(function() {
		return seedBlogPostData();
	});
	afterEach(function() {
		return tearDownDb();
	});
	after(function() {
		return closeServer();
	}


);describe('GET endpoint', function() {
	it('should return all existing blog posts', function() {
		// strategy:
		// 1. retrieve all blog posts returned by GET request to /posts
		// 2. check that res has the right status and data type
		// 3. check that the number of posts returned is equal to the number in the DB

		var res = void 0;
		return chai.request(app).get('/posts').then(function(_res) {
			res = _res;
			res.should.have.status(200);
			// below: TypeError: Cannot read property 'should' of undefined
			res.body.posts.should.have.length.of.at.least(1);
			return BlogPost.count();
		}).then(function(count) {
			res.body.posts.should.have.length.of(count);
		});
	});
	it('should return blog posts with the right fields', function() {
		// retrieve all posts and ensure they have the expected keys
		var resBlogPost = void 0;
		return chai.request(app).get('/posts').then(function(res) {
			res.should.have.status(200);
			// below: TypeError: Cannot read property 'should' of undefined
			res.should.be.json;
			res.body.posts.should.be.a('array');
			res.body.posts.should.have.length.of.at.least(1);
			res.body.posts.forEach(function(post) {
				post.should.be.a('object');
				post.should.include.keys('author', 'title', 'content', 'created');
			});
			resBlogPost = res.body.posts[0];
			return BlogPost.findById(resBlogPost.id);
		}).then(function(post) {
			resBlogPost.id.should.equal(post.id);
			resBlogPost.author.should.equal(post.author);
			resBlogPost.title.should.equal(post.title);
			resBlogPost.content.should.equal(post.content);
			resBlogPost.created.should.equal(post.created);
		});
	});
});

describe('POST endpoint', function() {
	// strategy:
	// 1. make a POST request with data
	// 2. check that blog post returned has the right keys
	// 3. check that blog post returned has an id (meaning the data was inserted into DB)
	it('should add a new blog post', function() {
		var newBlogPost = generateBlogPostData();
		console.log(newBlogPost.created);

		return chai.request(app).post('/posts').send(newBlogPost).then(function(res) {
			res.should.have.status(201);
			res.should.be.json;
			res.body.should.be.a('object');
			res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
			res.body.id.should.not.be.null;
			// below: AssertionError: expected 'Phineas Clinton' to equal { Object (firstName, lastName) }
			res.body.author.should.equal((newBlogPost.author.firstName) + ' ' + newBlogPost.author.lastName);
			res.body.title.should.equal(newBlogPost.title);
			res.body.content.should.equal(newBlogPost.content);
			res.body.created.should.equal(newBlogPost.created);
			return BlogPost.findById(res.body.id);
		}).then(function(post) {
			post.author.should.equal(newBlogPost.author);
			post.title.should.equal(newBlogPost.title);
			post.content.should.equal(newBlogPost.content);
			post.created.should.equal(newBlogPost.created);
		});
	});
});

describe('PUT endpoint', function() {
	// strategy:
	// 1. get an existing blog post from DB
	// 2. send a PUT request to update that blog post
	// 3. check that blog post returned by req includes the data we sent
	// 4. check that blog post in the DB was updated correctly
	it('should update fields we send', function() {
		var updateData = {
			author: {
				firstName: 'Samantha',
				lastName: 'Sassafras'
			},
			title: 'Twelve Angry Data Types'
		};
		return BlogPost.findOne().exec().then(function(post) {
			updateData.id = post.id;
			return chai.request(app).put('/posts/', + post.id).send(updateData);
		}).then(function(res) {
			res.should.have.status(204);
			return BlogPost.findById(updateData.id).exec();
		}).then(function(post) {
			post.author.should.equal(updateData.author);
			post.title.should.equal(updateData.title);
			//	console.log('updateData.id is ' + updateData.id + ' and post.id is ' + post.id);
		});
	});
});

describe('DELETE endpoint', function() {
	// strategy:
	// 1. retrieve one blog post
	// 2. send a DELETE request for that post's ID
	// 3. check that response has the right status code
	// 4. check that the blog post with that ID doesn't exist in DB anymore
	it('should delete a blog post by ID', function() {
		var post = void 0;
		return BlogPost.findOne().exec().then(function(_post) {
			post = _post;
			return chai.request(app).delete('/posts/' + post.id);
		}).then(function(res) {
			res.should.have.status(204);
			return BlogPost.findById(post.id).exec();
		}).then(function(_post) {
			should.not.exist(_post);
		});
	});
});
});

// When you come back: change all .js files to ES5 using Babeljs.io