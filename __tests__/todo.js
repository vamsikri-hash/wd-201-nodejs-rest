const request = require("supertest");
const cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

let server, agent;

const extractCsrfToken = (res) => {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
};

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("List the todo items", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("Should create a new user", async () => {
    const res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);

    const response = await agent.post("/users").send({
      firstName: "Rohit",
      lastName: "Sharma",
      email: "rohit@indiancricket.com",
      password: "209@Banglore",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Should signout loggedin user", async () => {
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);

    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);

    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

  test("Should create a new todo", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@indiancricket.com", "209@Banglore");

    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);

    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Should mark a todo as complete", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@indiancricket.com", "209@Banglore");

    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Buy vegetables",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({ _csrf: csrfToken, id: latestTodo.id, completed: true });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("Should mark a todo as incomplete", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@indiancricket.com", "209@Banglore");

    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Read book",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    // Mark todo as completed
    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({ _csrf: csrfToken, id: latestTodo.id, completed: true });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);

    const finalGroupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const finalParsedGroupedResponse = JSON.parse(
      finalGroupedTodosResponse.text
    );
    const completedCount = finalParsedGroupedResponse.completed.length;
    const latestCompletedTodo =
      finalParsedGroupedResponse.completed[completedCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    // Mark same todo as incompleted
    const markInCompleteResponse = await agent
      .put(`/todos/${latestCompletedTodo.id}`)
      .send({ _csrf: csrfToken, id: latestCompletedTodo.id, completed: false });
    const finalParsedUpdatedResponse = JSON.parse(markInCompleteResponse.text);
    expect(finalParsedUpdatedResponse.completed).toBe(false);
  });

  test("Should delete the todo", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@indiancricket.com", "209@Banglore");

    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Try ELM",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const deleteResponse = await agent
      .delete(`/todos/${latestTodo.id}`)
      .send({ _csrf: csrfToken });
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(true);
  });

  test("Should get a todo", async () => {
    const agent = request.agent(server);
    await login(agent, "rohit@indiancricket.com", "209@Banglore");

    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Try Anything",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    const actualTodoResponse = await agent
      .get(`/todos/${latestTodo.id}`)
      .set("Accept", "application/json");
    const parsedActualTodoResponse = JSON.parse(actualTodoResponse.text);

    expect(parsedActualTodoResponse.title).toBe("Try Anything");
  });
});
