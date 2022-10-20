const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");

const { Todo } = require("./models");

app.use(bodyParser.json());

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "/public")));

app.get("/", async (request, response) => {
  const allTodos = await Todo.getAllTodos();
  if (request.accepts("html")) {
    response.render("index", { allTodos });
  } else {
    response.json({ allTodos });
  }
});

app.get("/todos", async function (request, response) {
  console.log("Processing list of all Todos ...");
  try {
    const todos = await Todo.getAllTodos();
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/todos/:id", async function (request, response) {
  console.log("Looking for Todo with ID: ", request.params.id);

  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async function (request, response) {
  console.log("Creating new Todo: ", request.body);
  try {
    const todo = await Todo.addTodo(request.body);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id/markAsCompleted", async function (request, response) {
  console.log("We have to update a Todo with ID: ", request.params.id);

  try {
    const todo = await Todo.findByPk(request.params.id);
    const updatedTodo = await todo.markAsCompleted();
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("We have to delete a Todo with ID: ", request.params.id);

  try {
    const todo = await Todo.findByPk(request.params.id);
    if (todo) {
      await todo.delete();
      return response.json(true);
    } else {
      return response.json(false);
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(false);
  }
});

module.exports = app;
