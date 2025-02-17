const express = require('express');
const path = require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('./models/user');
const cookieParser = require('cookie-parser'); 
const crypto = require('crypto');
const multer = require('multer');
const upload = require('./config/multerConfig');

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser()); 

app.get("/", (req, res) => {
    res.render("index");
})

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/register", async (req, res) => {
    let {username, name, password, email, age} = req.body;

    let user = await userModel.findOne({email});
    if (user) return res.send("User already exists");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let newUser = await userModel.create({
                username,
                name,
                password: hash,
                email,
                age
            });

            let token = await jwt.sign({email}, "shhhh");
            res.cookie("token", token);
            res.send("User Registered");
        })
    })
});

app.post("/login", async (req, res) => {
    let {email, password} = req.body;

    // Use await to get the user object
    let user = await userModel.findOne({email});
    if (!user) return res.send("Something went wrong");

    // Compare the password
    bcrypt.compare(password, user.password, async (err, result) => {
        if (result) {
            res.redirect("/profile");
        }
        else {
            console.log("Incorrect password");
            res.redirect("/"); // You can redirect to the login page again
        }
    })
});

app.get("/profile", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile", {user});
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect("/profile");
});


app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    
    let {content} = req.body;

    let newPost = await postModel.create({
        user: user._id,
        content: content
    });

    user.posts.push(newPost._id);
    await user.save();
    res.redirect("/profile");
})

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    res.render("edit", {post});
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});

    res.redirect("/profile");
});

app.get("/profile/upload", (req, res) => {
    res.render("dpupload");
})

app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
})

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/");
});

function isLoggedIn(req, res, next) {
    if (!req.cookies || !req.cookies.token) {
        return res.redirect("/login");  // Token is missing, redirect to login page
    } 

    try {
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;  // Store the user data if the token is valid
        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        // If token verification fails (expired, invalid, etc.)
        console.error("Invalid token:", error);
        return res.redirect("/login");  // Redirect to login page
    }
}

app.listen(3000);