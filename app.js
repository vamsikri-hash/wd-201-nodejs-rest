const express = require("express");
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const flash = require("connect-flash");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

const saltRounds = 10;

const { Todo, User } = require("./models");

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: false }));

app.use(cookieParser("shh! some secret string"));

app.use(csrf("this_should_be_32_charcater_long", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "/public")));

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24H
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            done(null, false, {
              message: "Invalid Password, Please try again!",
            });
          }
        })
        .catch(() => {
          done(null, false, { message: "Email doesn't exist" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => done(null, user))
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async (request, response) => {
  try {
    response.render("index", {
      title: "Todo Application",
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    return response.status(422).json(error);
  }
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const loggedInUserId = request.user.id;
      const overdue = await Todo.overdue(loggedInUserId);
      const dueToday = await Todo.dueToday(loggedInUserId);
      const dueLater = await Todo.dueLater(loggedInUserId);
      const completed = await Todo.completed(loggedInUserId);
      const firstName = await User.getFirstName(loggedInUserId);
      if (request.accepts("html")) {
        response.render("todos", {
          title: "Todo Application",
          overdue,
          dueToday,
          dueLater,
          completed,
          firstName,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({ overdue, dueToday, dueLater, completed });
      }
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Signup",
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    return response.status(422).json(error);
  }
});

app.post("/users", async (request, response) => {
  if (request.body.password.length < 5) {
    request.flash("error", "Password should be minimum 5 charcters");
    return response.redirect("/signup");
  }
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPassword,
    });

    request.login(user, (err) => {
      if (err) console.log(err);
      request.flash("success", "Account created succesfully!");
      response.redirect("/todos");
    });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return redirectAndShowErrors(request, response, error, "/signup");
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return redirectAndShowErrors(request, response, error, "/signup");
    }
    return response.status(422).json(error);
  }
});

app.get("/login", (request, response) => {
  try {
    response.render("login", {
      title: "Login",
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    return response.status(422).json(error);
  }
});

app.get("/signout", (request, response, next) => {
  try {
    request.logout((err) => {
      if (err) {
        return next(err);
      }
      request.flash("success", "Signed out succesfully! See you again!");
      response.redirect("/");
    });
  } catch (error) {
    return response.status(422).json(error);
  }
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    try {
      response.redirect("/todos");
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("Looking for Todo with ID: ", request.params.id);

    try {
      const todo = await Todo.findByPk(request.params.id);
      return response.json(todo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("Creating new Todo: ", request.body);
    try {
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
      });
      request.flash("success", "Todo added succesfully!");
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);

      if (error.name === "SequelizeValidationError") {
        return redirectAndShowErrors(request, response, error, "/todos");
      }

      return response.status(422).json(error);
    }
  }
);

app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("We have to update a Todo with ID: ", request.params.id);

    try {
      const todo = await Todo.findByPk(request.params.id);
      const updatedTodo = await todo.setCompletionStatus(
        request.body.completed
      );
      request.flash("success", "Todo updated succesfully!");
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("We have to delete a Todo with ID: ", request.params.id);

    try {
      await Todo.remove(request.params.id, request.user.id);
      request.flash("success", "Todo deleted succesfully!");
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      return response.status(422).json({ success: false });
    }
  }
);

const redirectAndShowErrors = (request, response, error, redirectRoute) => {
  request.flash(
    "error",
    error.errors.map((err) => err.message)
  );
  response.redirect(redirectRoute);
};

module.exports = app;
